// ============================================================
// Vibe — Profile View
// ============================================================

let profileState = { username: null, tab: 'posts', page: 1, loading: false, hasMore: true, userId: null };

async function renderProfileView(username) {
  const main = document.getElementById('main-view');
  main.innerHTML = `<div class="route-loader"><div class="spinner spinner-lg"></div></div>`;

  try {
    const res = await API.getProfile(username);
    const user = res.data.user;
    const me = Auth.getUser();
    const isOwnProfile = me && Number(me.id) === Number(user.id);

    profileState = { username, tab: 'posts', page: 1, loading: false, hasMore: true, userId: user.id };

    main.innerHTML = `
      <div class="profile-card glass fade-in">
        <div class="profile-cover">
          ${user.cover_image ? `<img src="${resolveUpload(user.cover_image)}" alt="Cover">` : ''}
        </div>
        <div class="profile-header">
          ${avatarHtml({ profileImage: user.profile_image, fullname: user.fullname, size: 'xl', online: user.is_online })}
          <div>
            ${isOwnProfile
              ? `<button class="btn btn-glass" id="edit-profile-open-btn"><i class="fa-solid fa-pen"></i> Edit Profile</button>`
              : `<button class="btn ${user.is_following ? 'btn-glass' : 'btn-primary'}" data-follow-btn="${user.id}" data-following="${user.is_following}" id="profile-follow-btn">
                   ${user.is_following ? 'Following' : 'Follow'}
                 </button>`
            }
          </div>
        </div>
        <div class="profile-body">
          <h2>${escapeHtml(user.fullname)} ${verifiedBadge(user.is_verified)}</h2>
          <div class="profile-username">@${escapeHtml(user.username)}</div>
          ${user.bio ? `<div class="profile-bio">${escapeHtml(user.bio)}</div>` : ''}
          <div class="profile-meta">
            <span><i class="fa-solid fa-envelope"></i> ${escapeHtml(user.email)}</span>
            <span><i class="fa-solid fa-calendar"></i> Joined ${formatJoinDate(user.created_at)}</span>
          </div>
          <div class="profile-stats">
            <button><strong>${user.posts_count}</strong><span>Posts</span></button>
            <button data-open-follow-list="followers"><strong>${user.followers_count}</strong><span>Followers</span></button>
            <button data-open-follow-list="following"><strong>${user.following_count}</strong><span>Following</span></button>
          </div>
        </div>
        <div class="profile-tabs">
          <button class="profile-tab active" data-profile-tab="posts">Posts</button>
        </div>
      </div>
      <div id="profile-posts-list"></div>
      <div class="scroll-sentinel" id="profile-sentinel"></div>
    `;

    document.getElementById('edit-profile-open-btn')?.addEventListener('click', () => openEditProfileModal(user));
    document.getElementById('profile-follow-btn')?.addEventListener('click', function () {
      // handled by global delegated handler in main.js; nothing extra needed here
    });
    document.querySelectorAll('[data-open-follow-list]').forEach((btn) => {
      btn.addEventListener('click', () => openFollowListModal(user.id, btn.dataset.openFollowList, user.username));
    });

    loadProfilePosts();
    setupProfileInfiniteScroll();
  } catch (err) {
    main.innerHTML = emptyStateHtml({ icon: 'fa-user-slash', title: 'User not found', message: err.message || 'This profile does not exist.' });
  }
}

async function loadProfilePosts() {
  if (profileState.loading || !profileState.hasMore) return;
  profileState.loading = true;
  const list = document.getElementById('profile-posts-list');
  if (!list) { profileState.loading = false; return; }

  const skeletons = document.createElement('div');
  skeletons.innerHTML = postCardSkeleton();
  list.appendChild(skeletons);

  try {
    const res = await API.getUserPosts(profileState.userId, profileState.page);
    skeletons.remove();

    if (profileState.page === 1 && res.data.posts.length === 0) {
      list.innerHTML = emptyStateHtml({ icon: 'fa-note-sticky', title: 'No posts yet', message: 'When this person posts, it will show up here.' });
      profileState.hasMore = false;
      profileState.loading = false;
      return;
    }

    res.data.posts.forEach((post) => list.insertAdjacentHTML('beforeend', postCardHtml(post)));
    profileState.hasMore = res.data.hasMore;
    profileState.page += 1;
  } catch (err) {
    skeletons.remove();
    showToast(err.message, 'error');
  } finally {
    profileState.loading = false;
  }
}

function setupProfileInfiniteScroll() {
  const sentinel = document.getElementById('profile-sentinel');
  if (!sentinel) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadProfilePosts();
  }, { rootMargin: '400px' });
  observer.observe(sentinel);
}

// ---- Followers / Following modal ----
async function openFollowListModal(userId, type, username) {
  const overlay = document.getElementById('follow-list-modal-overlay');
  const title = document.getElementById('follow-list-modal-title');
  const content = document.getElementById('follow-list-modal-content');
  title.textContent = type === 'followers' ? 'Followers' : 'Following';
  content.innerHTML = `<div class="text-center" style="padding:30px;"><div class="spinner"></div></div>`;
  overlay.classList.remove('hidden');

  try {
    const res = type === 'followers' ? await API.getFollowers(userId) : await API.getFollowing(userId);
    const users = res.data.users;
    const me = Auth.getUser();

    if (!users.length) {
      content.innerHTML = emptyStateHtml({
        icon: 'fa-user-group',
        title: type === 'followers' ? 'No followers yet' : 'Not following anyone',
        message: `@${username} ${type === 'followers' ? 'has no followers yet.' : 'isn\'t following anyone yet.'}`,
      });
      return;
    }

    content.innerHTML = users.map((u) => `
      <div class="follow-list-item">
        <a href="#/profile/${u.username}" data-close-modal="follow-list-modal-overlay">${avatarHtml({ profileImage: u.profile_image, fullname: u.fullname, size: 'md' })}</a>
        <div class="name-block">
          <a href="#/profile/${u.username}" data-close-modal="follow-list-modal-overlay"><strong>${escapeHtml(u.fullname)} ${verifiedBadge(u.is_verified)}</strong></a>
          <span>@${escapeHtml(u.username)}</span>
        </div>
        ${me && Number(me.id) !== Number(u.id) ? `
          <button class="btn ${u.is_following ? 'btn-glass' : 'btn-primary'} btn-sm" data-follow-btn="${u.id}" data-following="${u.is_following}">
            ${u.is_following ? 'Following' : 'Follow'}
          </button>` : ''}
      </div>`).join('');
  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger); text-align:center;">${escapeHtml(err.message)}</p>`;
  }
}

// ---- Edit Profile modal ----
let editProfileAvatarFile = null;
let editProfileCoverFile = null;

function openEditProfileModal(user) {
  editProfileAvatarFile = null;
  editProfileCoverFile = null;

  document.getElementById('edit-fullname').value = user.fullname;
  document.getElementById('edit-username').value = user.username;
  document.getElementById('edit-bio').value = user.bio || '';
  document.getElementById('edit-bio-counter').textContent = `${(user.bio || '').length} / 280`;

  const coverPreview = document.getElementById('edit-cover-preview');
  coverPreview.querySelectorAll('img').forEach((img) => img.remove());
  if (user.cover_image) {
    coverPreview.insertAdjacentHTML('afterbegin', `<img src="${resolveUpload(user.cover_image)}" alt="Cover">`);
  }

  const avatarPreview = document.getElementById('edit-avatar-preview');
  avatarPreview.querySelectorAll('.avatar').forEach((el) => el.remove());
  avatarPreview.insertAdjacentHTML('afterbegin', avatarHtml({ profileImage: user.profile_image, fullname: user.fullname, size: 'xl' }));

  document.getElementById('edit-profile-modal-overlay').classList.remove('hidden');
}

function initEditProfileModalHandlers() {
  document.getElementById('edit-cover-preview').addEventListener('click', () => document.getElementById('edit-cover-input').click());
  document.getElementById('edit-avatar-preview').addEventListener('click', () => document.getElementById('edit-avatar-input').click());

  document.getElementById('edit-cover-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    editProfileCoverFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById('edit-cover-preview');
      preview.querySelectorAll('img').forEach((img) => img.remove());
      preview.insertAdjacentHTML('afterbegin', `<img src="${ev.target.result}" alt="Cover preview">`);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('edit-avatar-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    editProfileAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById('edit-avatar-preview');
      preview.querySelectorAll('.avatar').forEach((el) => el.remove());
      preview.insertAdjacentHTML('afterbegin', `<img src="${ev.target.result}" class="avatar avatar-xl" alt="Avatar preview">`);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('edit-bio').addEventListener('input', (e) => {
    document.getElementById('edit-bio-counter').textContent = `${e.target.value.length} / 280`;
  });

  document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('edit-profile-submit-btn');
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span>`;

    try {
      const formData = new FormData();
      formData.append('fullname', document.getElementById('edit-fullname').value.trim());
      formData.append('username', document.getElementById('edit-username').value.trim());
      formData.append('bio', document.getElementById('edit-bio').value.trim());
      if (editProfileAvatarFile) formData.append('profileImage', editProfileAvatarFile);
      if (editProfileCoverFile) formData.append('coverImage', editProfileCoverFile);

      const res = await API.updateProfile(formData);
      Auth.setUser(res.data.user, !!localStorage.getItem('Vibe_token'));
      showToast('Profile updated successfully.', 'success');
      closeModal('edit-profile-modal-overlay');
      updateSidebarUserCard();
      renderProfileView(res.data.user.username);
      window.location.hash = `#/profile/${res.data.user.username}`;
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}
