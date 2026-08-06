const session = Session.requireOrRedirect();

if (session) {
  document.getElementById('me-name').textContent = session.user.name;
}

document.getElementById('logout-btn').addEventListener('click', () => {
  Session.clear();
  window.location.href = 'index.html';
});

// --- tab switching ---
const tabCreate = document.getElementById('tab-create');
const tabJoin = document.getElementById('tab-join');
const createView = document.getElementById('create-view');
const joinView = document.getElementById('join-view');

tabCreate.addEventListener('click', () => {
  tabCreate.classList.add('active');
  tabJoin.classList.remove('active');
  createView.classList.remove('hidden');
  joinView.classList.add('hidden');
});
tabJoin.addEventListener('click', () => {
  tabJoin.classList.add('active');
  tabCreate.classList.remove('active');
  joinView.classList.remove('hidden');
  createView.classList.add('hidden');
});

// --- room code generation: WORD-###, easy to say out loud / type ---
const WORDS = [
  'FALCON', 'ORBIT', 'ATLAS', 'ZEPHYR', 'CIPHER', 'VECTOR', 'NOVA',
  'HARBOR', 'GRANITE', 'ECHO', 'SUMMIT', 'RELAY', 'BEACON', 'DRIFT',
];

function generateRoomCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${word}-${num}`;
}

let pendingCode = generateRoomCode();
document.getElementById('new-room-code').textContent = pendingCode;

document.getElementById('start-room-btn').addEventListener('click', () => {
  window.location.href = `room.html?code=${encodeURIComponent(pendingCode)}`;
});

document.getElementById('join-room-btn').addEventListener('click', () => {
  const input = document.getElementById('join-code');
  const code = input.value.trim().toUpperCase();
  const errorEl = document.getElementById('join-error');
  errorEl.classList.remove('visible');

  if (!code) {
    errorEl.textContent = 'Enter a room code to join.';
    errorEl.classList.add('visible');
    return;
  }
  window.location.href = `room.html?code=${encodeURIComponent(code)}`;
});

document.getElementById('join-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('join-room-btn').click();
});
