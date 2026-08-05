# Signal — Real-Time Video Conferencing & Collaboration App

A video calling + screen sharing + whiteboard + file sharing app built with
WebRTC and Socket.io. Built as a learning project spanning frontend, backend,
media streaming, and security.

## Features

- **Multi-user video calling** — WebRTC mesh (each participant connects
  directly to every other participant; good for small rooms, roughly up to
  6-8 people)
- **Screen sharing** — swaps your outgoing video track live, no renegotiation
- **Shared whiteboard** — freehand drawing, synced in real time, replayed for
  anyone who joins late
- **File sharing** — upload/download per room, **encrypted at rest** with
  AES-256-GCM
- **User authentication** — JWT-based, passwords hashed with bcrypt
- **Real-time chat** — per room

## Stack

- **Backend:** Node.js, Express, Socket.io, JWT, bcrypt, multer
- **Frontend:** Vanilla HTML/CSS/JS (no build step), native WebRTC APIs,
  socket.io-client
- **Data:** JSON-file storage for users/file metadata (swap for a real DB in
  production — see `server/utils/userStore.js` and `server/utils/fileStore.js`)

## Project structure

```
realtime-app/
  server/                  Node/Express + Socket.io backend
    index.js               entry point — starts HTTP + Socket.io server
    routes/auth.js          register / login / me
    routes/files.js         upload / list / download (encrypted at rest)
    sockets/index.js        WebRTC signaling, whiteboard sync, chat, presence
    middleware/auth.js       JWT verification for REST routes
    utils/encryption.js      AES-256-GCM helpers for file at-rest encryption
    utils/userStore.js       JSON-file user "database"
    utils/fileStore.js       JSON-file file-metadata "database"
    data/                    users.json / files.json (created automatically)
    uploads/                 encrypted file blobs live here
    .env.example             copy to .env and fill in
  client/                  static frontend, served by the same server
    index.html               login / register
    lobby.html                create or join a room
    room.html                 the actual call: video grid, controls, panel
    css/style.css              all styling / design tokens
    js/api.js                  fetch wrapper + session storage
    js/auth.js                  login/register page logic
    js/lobby.js                  room code generation / join
    js/webrtc.js                  RTCPeerConnection manager (mesh)
    js/whiteboard.js              canvas drawing + sync
    js/call.js                    ties it all together (the big one)
```

## Setup

Requires Node.js 18+.

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and fill in two secrets:

```bash
# generates a random JWT signing secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# generates the 64-hex-char AES-256 key used to encrypt uploaded files
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste those into `JWT_SECRET` and `FILE_ENCRYPTION_KEY` in `.env`.

## Run it

```bash
cd server
npm start
```

Then open **http://localhost:4000** in a couple of different browser tabs
(or browsers/devices) — the server serves both the API and the static
client from the same origin, so there's nothing else to run.

1. Register an account (or two, in separate tabs/incognito windows, to
   simulate two people).
2. From the lobby, start a new room or join one with a code.
3. Grant camera/microphone permissions when prompted.
4. Share the room code or "Copy invite link" with the other tab/person.

## How the pieces fit together

- **Signaling** happens entirely over Socket.io (`sockets/index.js` on the
  server, `call.js` on the client): when you join a room, the server tells
  you who's already there, you create a WebRTC offer for each of them, and
  they answer. ICE candidates are relayed the same way.
- **Media** (audio/video/screen) flows peer-to-peer over WebRTC once
  connections are established — the server never touches your video/audio
  stream. WebRTC encrypts all of that in transit automatically via DTLS-SRTP.
- **Screen sharing** works by swapping the outgoing video track
  (`RTCRtpSender.replaceTrack`) rather than opening a new connection, so it's
  seamless for everyone already on the call.
- **Whiteboard** strokes are sent as small line segments over Socket.io and
  redrawn on every client; the server also keeps the current board in memory
  per room so late joiners get caught up.
- **Files** are uploaded over a normal REST POST, encrypted with
  AES-256-GCM before they're written to disk, and decrypted on download.
  Everyone in the room gets a live notification when someone shares a file.
- **Auth** is JWT-based: the same token is used both to call the REST API
  (`Authorization: Bearer <token>`) and to authenticate the Socket.io
  connection (`socket.handshake.auth.token`), so an unauthenticated client
  can't join a room or see anyone's signaling traffic.

## Notes on security & production readiness

This is built to be a solid, working starting point, not a hardened
production deployment. Before shipping this for real, you'd want to:

- Run behind HTTPS/WSS (e.g. via a reverse proxy like nginx or Caddy) —
  browsers require a secure context for camera/microphone access on any
  origin other than `localhost` anyway.
- Add a TURN server (see the comment in `client/js/webrtc.js`) — the public
  STUN servers configured here won't get you through every corporate
  firewall or symmetric NAT.
- Swap the JSON-file stores for a real database, and consider rate-limiting
  the auth endpoints.
- Add file-type validation and antivirus scanning for uploads if this is
  ever exposed to the public internet.
- For larger rooms, replace the WebRTC mesh with an SFU (e.g. mediasoup,
  LiveKit, Janus) — mesh topology doesn't scale much past 6-8 participants
  because every client uploads its stream N-1 times.

## License

Use it, learn from it, break it, rebuild it — it's yours.
