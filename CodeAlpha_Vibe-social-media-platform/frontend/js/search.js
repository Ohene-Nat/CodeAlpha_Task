// ============================================================
// Vibe — Search View & Live Search Dropdown
// ============================================================

function userResultHtml(u, { compact = false } = {}) {
  const me = Auth.getUser();
  const showFollow = me && Number(me.id) !== Number(u.id);
  return `
  <div class="suggest-item" style="padding: ${compact ? '8px' : '12px'} 4px;">
    <a href="#/profile/${u.username}">${avatarHtml({ profileImage: u.profile_image, fullname: u.fullname, size: compact ? 'sm' : 'md' })}</a>
    <div class="name-block">
      <a href="#/profile/${u.username}"><strong>${escapeHtml(u.fullname)} ${verifiedBadge(u.is_verified)}</strong></a>
      <span>@${escapeHtml(u.username)}</span>
    </div>
    ${showFollow ? `
      <button class="btn ${u.is_following ? 'btn-glass' : 'btn-primary'} btn-sm" data-follow-btn="${u.id}" data-following="${u.is_following}">
        ${u.is_following ? 'Following' : 'Follow'}
      </button>` : ''}
  </div>`;
}

async function renderSearchView() {
  const main = document.getElementById('main-view');
  main.innerHTML = `
    <div class="glass card fade-in" style="margin-bottom:16px;">
      <h2 style="font-size:1.2rem; margin-bottom:14px;">Search People</h2>
      <div class="topbar-search" style="max-width:100%; margin:0;">
        <i class="fa-solid fa-search"></i>
        <input type="text" id="page-search-input" placeholder="Search by name or username...">
      </div>
    </div>
    <div id="page-search-results"></div>
  `;

  const input = document.getElementById('page-search-input');
  const results = document.getElementById('page-search-results');

  const doSearch = debounce(async (term) => {
    if (!term.trim()) {
      results.innerHTML = emptyStateHtml({ icon: 'fa-magnifying-glass', title: 'Find people', message: 'Search by name or username to discover people on Vibe.' });
      return;
    }
    results.innerHTML = `<div class="glass card">${postCardSkeleton()}</div>`;
    try {
      const res = await API.searchUsers(term.trim());
      if (!res.data.users.length) {
        results.innerHTML = emptyStateHtml({ icon: 'fa-user-slash', title: 'No results', message: `No one found matching "${escapeHtml(term)}".` });
        return;
      }
      results.innerHTML = `<div class="glass card">${res.data.users.map((u) => userResultHtml(u)).join('')}</div>`;
    } catch (err) {
      results.innerHTML = `<p style="text-align:center; color:var(--danger);">${escapeHtml(err.message)}</p>`;
    }
  }, 350);

  input.addEventListener('input', () => doSearch(input.value));
  results.innerHTML = emptyStateHtml({ icon: 'fa-magnifying-glass', title: 'Find people', message: 'Search by name or username to discover people on Vibe.' });
  input.focus();
}

// ---- Global topbar live search dropdown ----
function initGlobalSearch() {
  const input = document.getElementById('global-search-input');
  const dropdown = document.getElementById('search-results-dropdown');
  if (!input) return;

  const doSearch = debounce(async (term) => {
    if (!term.trim()) { dropdown.classList.add('hidden'); return; }
    dropdown.classList.remove('hidden');
    dropdown.innerHTML = `<div class="text-center" style="padding:16px;"><div class="spinner"></div></div>`;
    try {
      const res = await API.searchUsers(term.trim());
      if (!res.data.users.length) {
        dropdown.innerHTML = `<p style="text-align:center; padding:16px; color:var(--text-tertiary); font-size:0.85rem;">No users found.</p>`;
        return;
      }
      dropdown.innerHTML = res.data.users.map((u) => userResultHtml(u, { compact: true })).join('');
    } catch {
      dropdown.innerHTML = `<p style="text-align:center; padding:16px; color:var(--danger); font-size:0.85rem;">Search failed. Try again.</p>`;
    }
  }, 300);

  input.addEventListener('input', () => doSearch(input.value));
  input.addEventListener('focus', () => { if (input.value.trim()) dropdown.classList.remove('hidden'); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar-search')) dropdown.classList.add('hidden');
  });
  dropdown.addEventListener('click', () => dropdown.classList.add('hidden'));
}
