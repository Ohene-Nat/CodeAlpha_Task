// ============================================================
// Vibe — Shared Utilities
// ============================================================

const API_BASE = window.location.origin.includes('5500') || window.location.protocol === 'file:'
  ? 'http://localhost:5000/api'
  : 'http://localhost:5000/api';

// ---- Escape HTML to prevent XSS when injecting user text ----
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ---- Linkify hashtags in post content (after escaping) ----
function renderPostContent(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/(#[A-Za-z0-9_]+)/g, '<span class="hashtag">$1</span>');
}

// ---- Relative time formatting ("2h", "3d", "just now") ----
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatJoinDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ---- Initials for fallback avatars ----
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

// ---- Build an <img> or initials-avatar HTML snippet ----
function avatarHtml({ profileImage, fullname, size = 'md', online = false }) {
  const sizeClass = `avatar-${size}`;
  const inner = profileImage
    ? `<img src="${resolveUpload(profileImage)}" alt="${escapeHtml(fullname)}" class="avatar ${sizeClass}" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<div class=\\'avatar ${sizeClass}\\'>${getInitials(fullname)}</div>')">`
    : `<div class="avatar ${sizeClass}">${getInitials(fullname)}</div>`;
  const dot = online ? '<span class="online-dot"></span>' : '';
  return `<div class="avatar-wrap">${inner}${dot}</div>`;
}

// ---- Resolve uploaded file paths against the API host ----
function resolveUpload(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = API_BASE.replace(/\/api$/, '');
  return base + path;
}

function verifiedBadge(isVerified) {
  return isVerified ? '<i class="fa-solid fa-circle-check verified-badge" title="Verified"></i>' : '';
}

// ---- Toast notifications ----
function showToast(message, type = 'info') {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 260);
  }, 3400);
}

// ---- Button ripple effect ----
function attachRipple(root = document) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn, .nav-item, .post-action-btn, .feed-tab, .auth-tab');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    const prevPosition = getComputedStyle(btn).position;
    if (prevPosition === 'static') btn.style.position = 'relative';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 620);
  });
}

// ---- Debounce helper (used for live search) ----
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---- Simple emoji set for the composer's emoji picker ----
const EMOJI_LIST = [
  '😀','😂','🥰','😎','🤔','😢','😡','👍','👎','🙏','🔥','✨',
  '🎉','💯','❤️','💜','🚀','👀','😴','🤯','🥳','😇','🤝','👏',
  '💡','📸','🎶','☕','🌟','😏','🙌','😅'
];

// ---- Top loading bar ----
function startTopLoader() {
  const bar = document.getElementById('top-loader');
  if (!bar) return;
  bar.style.width = '0%';
  requestAnimationFrame(() => { bar.style.width = '70%'; });
}
function finishTopLoader() {
  const bar = document.getElementById('top-loader');
  if (!bar) return;
  bar.style.width = '100%';
  setTimeout(() => { bar.style.width = '0%'; }, 300);
}

// ---- Theme (dark/light) ----
function initTheme() {
  const saved = localStorage.getItem('Vibe_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  return saved;
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('Vibe_theme', next);
  return next;
}

// ---- Auth token storage ----
const Auth = {
  getToken() {
    return localStorage.getItem('Vibe_token') || sessionStorage.getItem('Vibe_token');
  },
  setToken(token, remember) {
    if (remember) {
      localStorage.setItem('Vibe_token', token);
    } else {
      sessionStorage.setItem('Vibe_token', token);
    }
  },
  clearToken() {
    localStorage.removeItem('Vibe_token');
    sessionStorage.removeItem('Vibe_token');
  },
  getUser() {
    const raw = localStorage.getItem('Vibe_user') || sessionStorage.getItem('Vibe_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user, remember) {
    const store = remember || localStorage.getItem('Vibe_token') ? localStorage : sessionStorage;
    store.setItem('Vibe_user', JSON.stringify(user));
  },
  isLoggedIn() {
    return !!this.getToken();
  },
};
