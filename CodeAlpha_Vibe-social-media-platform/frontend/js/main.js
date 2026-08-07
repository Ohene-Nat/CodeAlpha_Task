// ============================================================
// Vibe — App Entry Point: router, global handlers, modals
// ============================================================

(function () {
  // ---- Auth guard ----
  if (!Auth.isLoggedIn()) {
    window.location.href = 'auth.html';
    return;
  }

  initTheme();
  attachRipple();
  document.getElementById('theme-toggle-btn').querySelector('i').className =
    (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';

  // ============================================================
  // ROUTER
  // ============================================================
  const routes = {
    home: renderHomeView,
    search: renderSearchView,
    notifications: renderNotificationsView,
    bookmarks: renderBookmarksView,
    settings: renderSettingsView,
  };

  function setActiveNav(routeName) {
    document.querySelectorAll('[data-route]').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === routeName);
    });
  }

  async function router() {
    const hash = window.location.hash || '#/home';
    const parts = hash.replace('#/', '').split('/');
    const routeName = parts[0] || 'home';
    startTopLoader();
    closeSidebarMobile();

    if (routeName === 'profile') {
      const username = parts[1] || Auth.getUser()?.username;
      setActiveNav('profile');
      await renderProfileView(username);
    } else if (routes[routeName]) {
      setActiveNav(routeName);
      await routes[routeName]();
    } else {
      setActiveNav('home');
      window.location.hash = '#/home';
    }
    finishTopLoader();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  window.addEventListener('hashchange', router);

  // ============================================================
  // SIDEBAR / TOPBAR SETUP
  // ============================================================
  function updateSidebarUserCard() {
    const user = Auth.getUser();
    if (!user) return;
    document.getElementById('sidebar-user-avatar').innerHTML = avatarHtml({ profileImage: user.profile_image, fullname: user.fullname, size: 'md' });
    document.getElementById('sidebar-user-name').textContent = user.fullname;
    document.getElementById('sidebar-user-username').textContent = `@${user.username}`;
    document.getElementById('sidebar-profile-link').href = `#/profile/${user.username}`;
    document.getElementById('mobile-profile-link').href = `#/profile/${user.username}`;
  }
  window.updateSidebarUserCard = updateSidebarUserCard;
  updateSidebarUserCard();

  // Hamburger / mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  function openSidebarMobile() { sidebar.classList.add('open'); backdrop.classList.add('open'); }
  function closeSidebarMobile() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }
  document.getElementById('hamburger-btn').addEventListener('click', openSidebarMobile);
  backdrop.addEventListener('click', closeSidebarMobile);
  document.querySelectorAll('.sidebar .nav-item').forEach((el) => el.addEventListener('click', closeSidebarMobile));

  // Theme toggle button (topbar)
  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    const newTheme = toggleTheme();
    document.getElementById('theme-toggle-btn').querySelector('i').className =
      newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  });

  // Notification bell -> go to notifications page
  document.getElementById('notif-bell-btn').addEventListener('click', () => { window.location.hash = '#/notifications'; });

  // Sidebar "more" dropdown (logout)
  const moreBtn = document.getElementById('sidebar-more-btn');
  const moreMenu = document.getElementById('sidebar-more-menu');
  moreBtn.addEventListener('click', (e) => { e.stopPropagation(); moreMenu.classList.toggle('hidden'); });
  document.addEventListener('click', () => moreMenu.classList.add('hidden'));

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await API.logout(); } catch { /* proceed with client-side logout regardless */ }
    Auth.clearToken();
    localStorage.removeItem('Vibe_user');
    sessionStorage.removeItem('Vibe_user');
    window.location.href = 'auth.html';
  });

  // New Post buttons
  document.getElementById('sidebar-post-btn').addEventListener('click', () => openPostModal());
  document.getElementById('mobile-post-btn').addEventListener('click', () => openPostModal());

  // Global + page search
  initGlobalSearch();
  initEditProfileModalHandlers();

  // ============================================================
  // MODAL HELPERS
  // ============================================================
  function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }
  window.closeModal = closeModal;

  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal(el.dataset.closeModal);
    });
  });
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
  });

  // ---- Confirm dialog (generic) ----
  function openConfirmModal({ title, message, actionLabel = 'Delete', onConfirm }) {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    const actionBtn = document.getElementById('confirm-modal-action-btn');
    actionBtn.textContent = actionLabel;
    const overlay = document.getElementById('confirm-modal-overlay');
    overlay.classList.remove('hidden');

    const handler = async () => {
      actionBtn.disabled = true;
      await onConfirm();
      actionBtn.disabled = false;
      overlay.classList.add('hidden');
      actionBtn.removeEventListener('click', handler);
    };
    actionBtn.addEventListener('click', handler);
  }
  window.openConfirmModal = openConfirmModal;

  // ---- Image lightbox ----
  document.addEventListener('click', (e) => {
    const img = e.target.closest('[data-lightbox-img]');
    if (!img) return;
    document.getElementById('lightbox-img').src = img.src;
    document.getElementById('lightbox-overlay').classList.remove('hidden');
  });

  // ============================================================
  // POST CREATE / EDIT MODAL
  // ============================================================
  let postFormImageFile = null;
  let postFormRemovingImage = false;

  function openPostModal(existingPost = null) {
    const me = Auth.getUser();
    postFormImageFile = null;
    postFormRemovingImage = false;

    document.getElementById('post-modal-title').textContent = existingPost ? 'Edit Post' : 'Create Post';
    document.getElementById('post-form-id').value = existingPost ? existingPost.postId : '';
    document.getElementById('post-form-content').value = existingPost ? existingPost.content : '';
    document.getElementById('post-form-avatar').innerHTML = avatarHtml({ profileImage: me.profile_image, fullname: me.fullname, size: 'md' });
    document.getElementById('post-form-submit-btn').textContent = existingPost ? 'Save' : 'Post';

    const preview = document.getElementById('post-form-image-preview');
    const previewImg = document.getElementById('post-form-image-img');
    if (existingPost && existingPost.image) {
      preview.classList.remove('hidden');
      previewImg.src = resolveUpload(existingPost.image);
    } else {
      preview.classList.add('hidden');
      previewImg.src = '';
    }

    updateCharCounter();
    document.getElementById('post-modal-overlay').classList.remove('hidden');
    document.getElementById('post-form-content').focus();
  }
  window.openPostModal = openPostModal;

  function updateCharCounter() {
    const len = document.getElementById('post-form-content').value.length;
    const counter = document.getElementById('post-form-char-counter');
    counter.textContent = `${len} / 500`;
    counter.classList.toggle('warn', len > 400 && len <= 500);
    counter.classList.toggle('over', len > 500);
  }
  document.getElementById('post-form-content').addEventListener('input', updateCharCounter);

  document.getElementById('post-form-image-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB.', 'error'); return; }
    postFormImageFile = file;
    postFormRemovingImage = false;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('post-form-image-preview').classList.remove('hidden');
      document.getElementById('post-form-image-img').src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('post-form-remove-image').addEventListener('click', () => {
    postFormImageFile = null;
    postFormRemovingImage = true;
    document.getElementById('post-form-image-preview').classList.add('hidden');
    document.getElementById('post-form-image-input').value = '';
  });

  // Emoji picker
  const emojiBtn = document.getElementById('post-form-emoji-btn');
  const emojiPopover = document.getElementById('post-form-emoji-popover');
  emojiPopover.innerHTML = `
    <div class="emoji-popover-label">Pick an emoji</div>
    <div class="emoji-popover-grid">${EMOJI_LIST.map((e) => `<button type="button">${e}</button>`).join('')}</div>
  `;
  emojiBtn.addEventListener('click', (e) => { e.stopPropagation(); emojiPopover.classList.toggle('hidden'); });
  emojiPopover.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const textarea = document.getElementById('post-form-content');
    textarea.value += btn.textContent;
    updateCharCounter();
  });
  document.addEventListener('click', () => emojiPopover.classList.add('hidden'));

  document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const postId = document.getElementById('post-form-id').value;
    const content = document.getElementById('post-form-content').value.trim();

    if (!content && !postFormImageFile && document.getElementById('post-form-image-preview').classList.contains('hidden')) {
      showToast('Write something or add an image before posting.', 'error');
      return;
    }
    if (content.length > 500) {
      showToast('Posts cannot exceed 500 characters.', 'error');
      return;
    }

    const btn = document.getElementById('post-form-submit-btn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>`;

    try {
      const formData = new FormData();
      formData.append('content', content);
      if (postFormImageFile) formData.append('image', postFormImageFile);

      if (postId) {
        await API.updatePost(postId, formData);
        showToast('Post updated successfully.', 'success');
      } else {
        await API.createPost(formData);
        showToast('Post published!', 'success');
      }

      closeModal('post-modal-overlay');
      document.getElementById('post-form').reset();
      refreshCurrentView();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  function refreshCurrentView() {
    // Re-run the router to reflect newly created/edited/deleted posts
    router();
  }

  // ============================================================
  // GLOBAL DELEGATED EVENT HANDLERS (work across all views)
  // ============================================================
  document.addEventListener('click', async (e) => {
    // ---- Like / unlike ----
    const likeBtn = e.target.closest('[data-like-btn]');
    if (likeBtn) {
      const postId = likeBtn.dataset.likeBtn;
      const wasLiked = likeBtn.classList.contains('liked');
      likeBtn.classList.toggle('liked');
      const icon = likeBtn.querySelector('i');
      icon.className = `fa-${wasLiked ? 'regular' : 'solid'} fa-heart`;
      const countEl = likeBtn.querySelector('[data-like-count]');
      countEl.textContent = Number(countEl.textContent) + (wasLiked ? -1 : 1);
      try {
        const res = await API.toggleLike(postId);
        countEl.textContent = res.data.likesCount;
        likeBtn.classList.toggle('liked', res.data.isLiked);
        icon.className = `fa-${res.data.isLiked ? 'solid' : 'regular'} fa-heart`;
      } catch (err) {
        // revert optimistic update on failure
        likeBtn.classList.toggle('liked', wasLiked);
        icon.className = `fa-${wasLiked ? 'solid' : 'regular'} fa-heart`;
        countEl.textContent = Number(countEl.textContent) + (wasLiked ? 1 : -1);
        showToast(err.message, 'error');
      }
      return;
    }

    // ---- Bookmark ----
    const bookmarkBtn = e.target.closest('[data-bookmark-btn]');
    if (bookmarkBtn) {
      const postId = bookmarkBtn.dataset.bookmarkBtn;
      const wasBookmarked = bookmarkBtn.classList.contains('bookmarked');
      bookmarkBtn.classList.toggle('bookmarked');
      bookmarkBtn.querySelector('i').className = `fa-${wasBookmarked ? 'regular' : 'solid'} fa-bookmark`;
      try {
        const res = await API.toggleBookmark(postId);
        bookmarkBtn.classList.toggle('bookmarked', res.data.isBookmarked);
        bookmarkBtn.querySelector('i').className = `fa-${res.data.isBookmarked ? 'solid' : 'regular'} fa-bookmark`;
        showToast(res.data.isBookmarked ? 'Post saved.' : 'Removed from saved posts.', 'success');
      } catch (err) {
        bookmarkBtn.classList.toggle('bookmarked', wasBookmarked);
        showToast(err.message, 'error');
      }
      return;
    }

    // ---- Toggle comments section ----
    const commentToggle = e.target.closest('[data-toggle-comments]');
    if (commentToggle) {
      const postId = commentToggle.dataset.toggleComments;
      const section = document.getElementById(`comments-${postId}`);
      section.classList.toggle('open');
      if (section.classList.contains('open') && !section.dataset.loaded) {
        section.dataset.loaded = '1';
        await loadCommentsForPost(postId);
      }
      return;
    }

    // ---- Submit comment ----
    const submitCommentBtn = e.target.closest('[data-submit-comment]');
    if (submitCommentBtn) {
      const postId = submitCommentBtn.dataset.submitComment;
      await submitComment(postId);
      return;
    }

    // ---- Delete comment ----
    const deleteCommentBtn = e.target.closest('[data-delete-comment]');
    if (deleteCommentBtn) {
      const commentId = deleteCommentBtn.dataset.deleteComment;
      const postId = deleteCommentBtn.dataset.postId;
      openConfirmModal({
        title: 'Delete comment?',
        message: 'This comment will be permanently removed.',
        actionLabel: 'Delete',
        onConfirm: async () => {
          try {
            await API.deleteComment(commentId);
            deleteCommentBtn.closest('.comment-item').remove();
            const countEl = document.querySelector(`[data-toggle-comments="${postId}"] [data-comment-count]`);
            if (countEl) countEl.textContent = Math.max(0, Number(countEl.textContent) - 1);
            showToast('Comment deleted.', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      });
      return;
    }

    // ---- Share / copy link ----
    const shareBtn = e.target.closest('[data-share-btn]');
    if (shareBtn) {
      const postId = shareBtn.dataset.shareBtn;
      const url = `${window.location.origin}${window.location.pathname}#/post/${postId}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast('Post link copied to clipboard.', 'success');
      } catch {
        showToast('Could not copy link.', 'error');
      }
      return;
    }

    // ---- Toggle post owner menu ----
    const menuToggle = e.target.closest('[data-toggle-post-menu]');
    if (menuToggle) {
      e.stopPropagation();
      const menu = document.getElementById(`post-menu-${menuToggle.dataset.togglePostMenu}`);
      document.querySelectorAll('[id^="post-menu-"]').forEach((m) => { if (m !== menu) m.classList.add('hidden'); });
      menu.classList.toggle('hidden');
      return;
    }

    // ---- Edit post ----
    const editPostBtn = e.target.closest('[data-edit-post]');
    if (editPostBtn) {
      const postId = editPostBtn.dataset.editPost;
      try {
        const res = await API.getPost(postId);
        openPostModal({ postId, content: res.data.post.content, image: res.data.post.image });
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    // ---- Delete post ----
    const deletePostBtn = e.target.closest('[data-delete-post]');
    if (deletePostBtn) {
      const postId = deletePostBtn.dataset.deletePost;
      openConfirmModal({
        title: 'Delete post?',
        message: 'This post, along with its likes and comments, will be permanently removed.',
        actionLabel: 'Delete',
        onConfirm: async () => {
          try {
            await API.deletePost(postId);
            document.querySelector(`[data-post-id="${postId}"]`)?.remove();
            showToast('Post deleted.', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      });
      return;
    }

    // ---- Follow / unfollow (works everywhere: profile, search, suggestions, follow-list modal) ----
    const followBtn = e.target.closest('[data-follow-btn]');
    if (followBtn) {
      const userId = followBtn.dataset.followBtn;
      const wasFollowing = followBtn.dataset.following === 'true';
      followBtn.disabled = true;
      try {
        const res = await API.toggleFollow(userId);
        const nowFollowing = res.data.isFollowing;
        followBtn.dataset.following = String(nowFollowing);
        followBtn.textContent = nowFollowing ? 'Following' : 'Follow';
        followBtn.classList.toggle('btn-primary', !nowFollowing);
        followBtn.classList.toggle('btn-glass', nowFollowing);

        // Update profile stats live if we're on that profile page
        const statsBtn = document.querySelector('[data-open-follow-list="followers"] strong');
        if (statsBtn && profileState.userId == userId) {
          statsBtn.textContent = res.data.followers_count;
        }
        showToast(nowFollowing ? 'You are now following this user.' : 'Unfollowed.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        followBtn.disabled = false;
      }
      return;
    }

    // ---- Trending hashtag click -> search view seeded with tag ----
    const trendItem = e.target.closest('[data-search-tag]');
    if (trendItem) {
      window.location.hash = '#/search';
      setTimeout(() => {
        const input = document.getElementById('page-search-input');
        if (input) { input.value = trendItem.dataset.searchTag; input.dispatchEvent(new Event('input')); }
      }, 150);
      return;
    }
  });

  // ---- Comment input: submit on Enter ----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-comment-input]')) {
      submitComment(e.target.dataset.commentInput);
    }
  });

  async function loadCommentsForPost(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    list.innerHTML = `<div class="text-center" style="padding:12px;"><div class="spinner"></div></div>`;
    try {
      const res = await API.getComments(postId);
      const me = Auth.getUser();
      if (!res.data.comments.length) {
        list.innerHTML = `<p style="color:var(--text-tertiary); font-size:0.85rem; padding:8px 0;">No comments yet. Be the first to reply.</p>`;
        return;
      }
      list.innerHTML = res.data.comments.map((c) => commentItemHtml(c, postId, me)).join('');
    } catch (err) {
      list.innerHTML = `<p style="color:var(--danger); font-size:0.85rem;">${escapeHtml(err.message)}</p>`;
    }
  }

  function commentItemHtml(c, postId, me) {
    const isOwner = me && Number(me.id) === Number(c.user_id);
    return `
    <div class="comment-item">
      ${avatarHtml({ profileImage: c.profile_image, fullname: c.fullname, size: 'sm' })}
      <div class="comment-bubble">
        <div class="comment-head">
          <strong>${escapeHtml(c.fullname)}</strong> ${verifiedBadge(c.is_verified)}
        </div>
        <div class="comment-text">${escapeHtml(c.comment)}</div>
        <div class="comment-time">${timeAgo(c.created_at)}</div>
        ${isOwner ? `<button class="comment-delete-btn" data-delete-comment="${c.id}" data-post-id="${postId}">Delete</button>` : ''}
      </div>
    </div>`;
  }

  async function submitComment(postId) {
    const input = document.querySelector(`[data-comment-input="${postId}"]`);
    const text = input.value.trim();
    if (!text) return;
    input.disabled = true;
    try {
      const res = await API.addComment(postId, text);
      const me = Auth.getUser();
      const list = document.getElementById(`comments-list-${postId}`);
      if (list.querySelector('p')) list.innerHTML = ''; // clear "no comments yet" message
      list.insertAdjacentHTML('beforeend', commentItemHtml(res.data.comment, postId, me));
      const countEl = document.querySelector(`[data-toggle-comments="${postId}"] [data-comment-count]`);
      if (countEl) countEl.textContent = Number(countEl.textContent) + 1;
      input.value = '';
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  // ============================================================
  // BOOT
  // ============================================================
  router();
  refreshNotifBadge();
  setInterval(refreshNotifBadge, 30000); // poll unread count every 30s
})();
