const jwt = require('jsonwebtoken');

// In-memory room state. Fine for a single server instance / demo purposes.
// For multi-instance deployments, back this with Redis (socket.io-redis adapter)
// and a shared store for whiteboard strokes.
const rooms = new Map(); // roomId -> Map<socketId, { id, name }>
const whiteboards = new Map(); // roomId -> array of stroke events (for late joiners)

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function attachSocketHandlers(io) {
  // Every socket connection must present a valid JWT (issued at login/register)
  // via the client's `auth: { token }` option. This keeps signaling, chat, and
  // whiteboard traffic scoped to authenticated users only.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.id, name: payload.name };
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('join-room', (roomId) => {
      if (!roomId || typeof roomId !== 'string') return;
      currentRoom = roomId;
      socket.join(roomId);

      getRoom(roomId).set(socket.id, { id: socket.user.id, name: socket.user.name });

      // Tell the new joiner who's already here — they'll initiate a WebRTC offer to each.
      socket.emit('room-state', {
        participants: Array.from(getRoom(roomId).entries())
          .filter(([sid]) => sid !== socket.id)
          .map(([sid, u]) => ({ socketId: sid, id: u.id, name: u.name })),
        whiteboard: whiteboards.get(roomId) || [],
      });

      // Tell everyone already in the room that someone new joined.
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        id: socket.user.id,
        name: socket.user.name,
      });
    });

    // --- WebRTC signaling relay (mesh topology: every pair negotiates directly) ---
    socket.on('webrtc-offer', ({ to, offer }) => {
      if (!to) return;
      io.to(to).emit('webrtc-offer', { from: socket.id, offer, name: socket.user.name });
    });

    socket.on('webrtc-answer', ({ to, answer }) => {
      if (!to) return;
      io.to(to).emit('webrtc-answer', { from: socket.id, answer });
    });

    socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
      if (!to) return;
      io.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate });
    });

    // --- Screen share presence (actual track swap happens over the existing peer connection) ---
    socket.on('screen-share-started', () => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('screen-share-started', { socketId: socket.id });
    });
    socket.on('screen-share-stopped', () => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('screen-share-stopped', { socketId: socket.id });
    });

    // --- Whiteboard sync ---
    socket.on('whiteboard-draw', (stroke) => {
      if (!currentRoom) return;
      const strokes = whiteboards.get(currentRoom) || [];
      strokes.push(stroke);
      // Cap history so long sessions don't grow memory unbounded.
      if (strokes.length > 5000) strokes.shift();
      whiteboards.set(currentRoom, strokes);
      socket.to(currentRoom).emit('whiteboard-draw', stroke);
    });

    socket.on('whiteboard-clear', () => {
      if (!currentRoom) return;
      whiteboards.set(currentRoom, []);
      io.to(currentRoom).emit('whiteboard-clear');
    });

    // --- Chat ---
    socket.on('chat-message', (text) => {
      if (!currentRoom || typeof text !== 'string' || !text.trim()) return;
      const message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: text.slice(0, 2000),
        senderId: socket.user.id,
        senderName: socket.user.name,
        sentAt: new Date().toISOString(),
      };
      io.to(currentRoom).emit('chat-message', message);
    });

    // --- File share notifications (upload itself goes over REST; this just pings the room) ---
    socket.on('file-shared', (fileMeta) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('file-shared', fileMeta);
    });

    socket.on('disconnect', () => {
      if (!currentRoom) return;
      getRoom(currentRoom).delete(socket.id);
      socket.to(currentRoom).emit('user-left', { socketId: socket.id });
      if (getRoom(currentRoom).size === 0) {
        rooms.delete(currentRoom);
        whiteboards.delete(currentRoom);
      }
    });
  });
}

module.exports = { attachSocketHandlers };
