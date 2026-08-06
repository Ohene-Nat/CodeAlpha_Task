const session = Session.requireOrRedirect();

const params = new URLSearchParams(window.location.search);
const roomCode = (params.get('code') || '').toUpperCase();
if (!roomCode) window.location.href = 'lobby.html';

document.getElementById('room-code-display').textContent = roomCode;

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------
const videoGrid = document.getElementById('video-grid');
const tileTemplate = document.getElementById('tile-template');
const tiles = new Map(); // socketId ('local' for self) -> { el, video, nameEl, muteIcon, stopMeter }

let localStream = null;
let cameraTrack = null;
let screenTrack = null;
let micEnabled = true;
let camEnabled = true;
let sharingScreen = false;

// ---------------------------------------------------------------------
// Tile rendering
// ---------------------------------------------------------------------
function createTile(id, name, { isLocal = false, isScreen = false } = {}) {
  const frag = tileTemplate.content.cloneNode(true);
  const el = frag.querySelector('.tile');
  const video = frag.querySelector('video');
  const nameEl = frag.querySelector('.name-text');
  const muteIcon = frag.querySelector('.tile-mute-icon');

  video.muted = isLocal; // avoid echoing our own audio back to ourselves
  nameEl.textContent = isLocal ? `${name} (you)` : name;
  if (isScreen) el.classList.add('screen-tile');

  videoGrid.appendChild(el);
  tiles.set(id, { el, video, nameEl, muteIcon, stopMeter: null });
  updateParticipantCount();
  return tiles.get(id);
}

function removeTile(id) {
  const tile = tiles.get(id);
  if (!tile) return;
  if (tile.stopMeter) tile.stopMeter();
  tile.el.remove();
  tiles.delete(id);
  updateParticipantCount();
}

function updateParticipantCount() {
  const n = tiles.size;
  document.getElementById('participant-count').textContent = `${n} in room`;
}

function setTileStream(id, stream) {
  const tile = tiles.get(id);
  if (!tile) return;
  tile.video.srcObject = stream;
  if (tile.stopMeter) tile.stopMeter();
  tile.stopMeter = attachLevelMeter(stream, tile.el.querySelector('.level-meter'));
}

// ---------------------------------------------------------------------
// Audio level meter (the "pulse" under each tile)
// ---------------------------------------------------------------------
function attachLevelMeter(stream, container) {
  const bars = Array.from(container.querySelectorAll('span'));
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) return () => {};

  let audioCtx, analyser, source, dataArray, rafId;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  } catch (err) {
    return () => {};
  }

  function tick() {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const level = Math.min(1, avg / 90);
    bars.forEach((bar, i) => {
      const threshold = (i + 1) / bars.length;
      const active = level >= threshold * 0.6;
      bar.style.height = active ? `${8 + i * 2}px` : '4px';
      bar.style.opacity = active ? '1' : '0.35';
    });
    rafId = requestAnimationFrame(tick);
  }
  tick();

  return () => {
    cancelAnimationFrame(rafId);
    source && source.disconnect();
    audioCtx && audioCtx.close();
  };
}

// ---------------------------------------------------------------------
// Media + Socket + WebRTC bootstrap
// ---------------------------------------------------------------------
async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    alert('Camera/microphone access is required to join the call. Please allow access and reload.');
    return;
  }
  cameraTrack = localStream.getVideoTracks()[0] || null;

  const local = createTile('local', session.user.name, { isLocal: true });
  setTileStream('local', localStream);

  const socket = io({ auth: { token: session.token } });
  window.__socket = socket; // used by whiteboard/chat/files wiring below

  const peers = new PeerManager({
    onRemoteStream: (socketId, stream) => {
      if (!tiles.has(socketId)) createTile(socketId, tiles.get(socketId)?.nameEl?.textContent || 'Participant');
      setTileStream(socketId, stream);
    },
    onPeerClosed: (socketId) => removeTile(socketId),
    onIceCandidate: (socketId, candidate) => {
      socket.emit('webrtc-ice-candidate', { to: socketId, candidate });
    },
  });
  peers.setLocalStream(localStream);
  window.__peers = peers;

  socket.on('connect_error', (err) => {
    console.error('Socket auth failed', err.message);
    Session.clear();
    window.location.href = 'index.html';
  });

  socket.on('connect', () => {
    socket.emit('join-room', roomCode);
  });

  socket.on('room-state', async ({ participants, whiteboard }) => {
    // We're the newcomer: initiate an offer to everyone already present.
    for (const p of participants) {
      createTile(p.socketId, p.name);
      const offer = await peers.createOffer(p.socketId);
      socket.emit('webrtc-offer', { to: p.socketId, offer });
    }
    if (whiteboardInstance && whiteboard?.length) {
      whiteboardInstance.replayHistory(whiteboard);
    }
    refreshFileList();
  });

  socket.on('user-joined', ({ socketId, name }) => {
    // Existing member: just render a placeholder tile and wait for their offer.
    createTile(socketId, name);
  });

  socket.on('webrtc-offer', async ({ from, offer, name }) => {
    if (!tiles.has(from)) createTile(from, name || 'Participant');
    const answer = await peers.handleOffer(from, offer);
    socket.emit('webrtc-answer', { to: from, answer });
  });

  socket.on('webrtc-answer', ({ from, answer }) => {
    peers.handleAnswer(from, answer);
  });

  socket.on('webrtc-ice-candidate', ({ from, candidate }) => {
    peers.addIceCandidate(from, candidate);
  });

  socket.on('user-left', ({ socketId }) => {
    peers.closePeer(socketId);
  });

  socket.on('screen-share-started', ({ socketId }) => {
    tiles.get(socketId)?.el.classList.add('screen-tile');
  });
  socket.on('screen-share-stopped', ({ socketId }) => {
    tiles.get(socketId)?.el.classList.remove('screen-tile');
  });

  socket.on('whiteboard-draw', (seg) => whiteboardInstance?.applyRemoteSegment(seg));
  socket.on('whiteboard-clear', () => whiteboardInstance?.clear());

  socket.on('chat-message', appendChatMessage);
  socket.on('file-shared', (file) => addFileToList(file, { silent: true }));

  window.addEventListener('beforeunload', () => {
    socket.emit('leave-room');
    peers.closeAll();
  });
}

// ---------------------------------------------------------------------
// Mic / camera / screen share / leave controls
// ---------------------------------------------------------------------
document.getElementById('btn-mic').addEventListener('click', (e) => {
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
  e.currentTarget.classList.toggle('active', micEnabled);
  e.currentTarget.classList.toggle('danger-active', !micEnabled);
  e.currentTarget.textContent = micEnabled ? '🎤' : '🔇';
  const localTile = tiles.get('local');
  if (localTile) localTile.muteIcon.classList.toggle('hidden', micEnabled);
});

document.getElementById('btn-cam').addEventListener('click', (e) => {
  camEnabled = !camEnabled;
  localStream.getVideoTracks().forEach((t) => (t.enabled = camEnabled));
  e.currentTarget.classList.toggle('active', camEnabled);
  e.currentTarget.classList.toggle('danger-active', !camEnabled);
  e.currentTarget.textContent = camEnabled ? '🎥' : '📷';
});

document.getElementById('btn-screen').addEventListener('click', async (e) => {
  if (!sharingScreen) {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenTrack = displayStream.getVideoTracks()[0];
      await window.__peers.replaceVideoTrack(screenTrack);
      setTileStream('local', displayStream);
      tiles.get('local').el.classList.add('screen-tile');
      sharingScreen = true;
      e.currentTarget.classList.add('active');
      window.__socket.emit('screen-share-started');

      screenTrack.addEventListener('ended', () => stopScreenShare(e.currentTarget));
    } catch (err) {
      // user cancelled the share picker — nothing to do
    }
  } else {
    stopScreenShare(e.currentTarget);
  }
});

async function stopScreenShare(btn) {
  if (!sharingScreen) return;
  sharingScreen = false;
  screenTrack && screenTrack.stop();
  await window.__peers.replaceVideoTrack(cameraTrack);
  setTileStream('local', localStream);
  tiles.get('local').el.classList.remove('screen-tile');
  btn.classList.remove('active');
  window.__socket.emit('screen-share-stopped');
}

document.getElementById('btn-leave').addEventListener('click', () => {
  window.__peers?.closeAll();
  localStream?.getTracks().forEach((t) => t.stop());
  window.__socket?.disconnect();
  window.location.href = 'lobby.html';
});

document.getElementById('copy-link-btn').addEventListener('click', async (e) => {
  const url = `${window.location.origin}${window.location.pathname}?code=${roomCode}`;
  try {
    await navigator.clipboard.writeText(url);
    const original = e.currentTarget.textContent;
    e.currentTarget.textContent = 'Copied!';
    setTimeout(() => (e.currentTarget.textContent = original), 1500);
  } catch {
    prompt('Copy this invite link:', url);
  }
});

// ---------------------------------------------------------------------
// Side panel: tabs + show/hide
// ---------------------------------------------------------------------
const stageEl = document.getElementById('stage');
const sidePanel = document.getElementById('side-panel');

document.querySelectorAll('.panel-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.panel-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel-body').forEach((b) => b.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
  });
});

document.getElementById('btn-panel-toggle').addEventListener('click', (e) => {
  const hidden = sidePanel.hasAttribute('hidden');
  if (hidden) {
    sidePanel.removeAttribute('hidden');
    stageEl.classList.add('with-panel');
  } else {
    sidePanel.setAttribute('hidden', '');
    stageEl.classList.remove('with-panel');
  }
  e.currentTarget.classList.toggle('active', hidden);
});

// ---------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------
function appendChatMessage(msg) {
  const list = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg' + (msg.senderId === session.user.id ? ' mine' : '');
  const time = new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `
    <div class="who">${escapeHtml(msg.senderName)}<span class="when">${time}</span></div>
    <div class="body"></div>
  `;
  div.querySelector('.body').textContent = msg.text; // textContent to avoid HTML injection
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  window.__socket.emit('chat-message', text);
  input.value = '';
});

// ---------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function addFileToList(file, { silent = false } = {}) {
  const list = document.getElementById('file-list');
  const div = document.createElement('div');
  div.className = 'file-item';
  div.innerHTML = `
    <div>
      <div class="file-name"></div>
      <div class="file-meta"></div>
    </div>
    <a href="#" data-id="${file.id}">Download</a>
  `;
  div.querySelector('.file-name').textContent = file.originalName;
  div.querySelector('.file-meta').textContent = `${file.uploaderName} · ${formatBytes(file.size)}`;
  div.querySelector('a').addEventListener('click', (e) => {
    e.preventDefault();
    downloadFile(file.id, file.originalName);
  });
  list.prepend(div);
}

async function downloadFile(id, filename) {
  const res = await fetch(`/api/files/download/${id}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!res.ok) {
    alert('Could not download that file.');
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function refreshFileList() {
  try {
    const { files } = await apiRequest(`/files/room/${encodeURIComponent(roomCode)}`);
    document.getElementById('file-list').innerHTML = '';
    files.forEach((f) => addFileToList(f));
  } catch (err) {
    console.warn('Could not load file list', err);
  }
}

document.getElementById('file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) {
    alert('Files are limited to 50MB.');
    e.target.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('room', roomCode);

  try {
    const { file: meta } = await apiRequest('/files/upload', {
      method: 'POST',
      isForm: true,
      body: formData,
    });
    addFileToList(meta);
    window.__socket.emit('file-shared', meta);
  } catch (err) {
    alert(`Upload failed: ${err.message}`);
  } finally {
    e.target.value = '';
  }
});

// ---------------------------------------------------------------------
// Whiteboard
// ---------------------------------------------------------------------
let whiteboardInstance = null;

function initWhiteboard() {
  const canvas = document.getElementById('whiteboard-canvas');
  whiteboardInstance = new Whiteboard(canvas, {
    onLocalSegment: (seg) => window.__socket?.emit('whiteboard-draw', seg),
  });

  document.getElementById('wb-color').addEventListener('input', (e) => whiteboardInstance.setColor(e.target.value));
  document.getElementById('wb-size').addEventListener('input', (e) => whiteboardInstance.setSize(e.target.value));
  document.getElementById('wb-eraser').addEventListener('click', (e) => {
    whiteboardInstance.setEraser(true);
    e.currentTarget.classList.add('active');
  });
  document.getElementById('wb-color').addEventListener('click', () => {
    document.getElementById('wb-eraser').classList.remove('active');
  });
  document.getElementById('wb-clear').addEventListener('click', () => {
    whiteboardInstance.clear();
    window.__socket?.emit('whiteboard-clear');
  });
  document.getElementById('wb-fullscreen').addEventListener('click', (e) => {
    stageEl.classList.toggle('whiteboard-fullscreen');
    const isFull = stageEl.classList.contains('whiteboard-fullscreen');
    e.currentTarget.textContent = isFull ? 'Collapse' : 'Expand';
  });
}

initWhiteboard();
init();
