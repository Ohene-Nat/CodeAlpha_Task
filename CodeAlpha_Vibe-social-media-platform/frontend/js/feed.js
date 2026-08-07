// ============================================================
// Vibe — Feed & Post Card Rendering
// ============================================================

let feedState = {
  tab: 'all',
  page: 1,
  loading: false,
  hasMore: true,
};

// ---- Build the HTML for a single post card ----
function postCardHtml(post) {
  const me = Auth.getUser();
  const isOwner = me && Number(me.id) === Number(post.user_id);
  const imageHtml = post.image
    ? `<div class="post-image"><img src="${resolveUpload(post.image)}" alt="Post image" data-lightbox-img loading="lazy"></div>`
    : '';

  return `
  <article class="post-card glass fade-in" data-post-id="${post.id}">
    <div class="post-head">
      <div class="post-head-left">
        <a href="#/profile/${post.username}">${avatarHtml({ profileImage: post.profile_image, fullname: post.fullname, size: 'md' })}</a>
        <div class="post-author-info">
          <div class="name-line">
            <a href="#/profile/${post.username}"><strong>${escapeHtml(post.fullname)}</strong></a>
            ${verifiedBadge(post.is_verified)}
          </div>
          <div class="meta-line">
            <span>@${escapeHtml(post.username)}</span> &middot; <span>${timeAgo(post.created_at)}</span>
            ${post.updated_at !== post.created_at ? '<span>&middot; edited</span>' : ''}
          </div>
        </div>
      </div>
      ${isOwner ? `
      <div class="dropdown">
        <button class="btn-icon post-menu-btn" data-toggle-post-menu="${post.id}"><i class="fa-solid fa-ellipsis"></i></button>
        <div class="dropdown-menu glass hidden" id="post-menu-${post.id}">
          <button class="dropdown-item" data-edit-post="${post.id}"><i class="fa-solid fa-pen"></i> Edit post</button>
          <button class="dropdown-item danger" data-delete-post="${post.id}"><i class="fa-solid fa-trash"></i> Delete post</button>
        </div>
      </div>` : ''}
    </div>

    ${post.content ? `<div class="post-content">${renderPostContent(post.content)}</div>` : ''}
    ${imageHtml}

    <div class="post-actions">
      <button class="post-action-btn ${post.is_liked ? 'liked' : ''}" data-like-btn="${post.id}">
        <i class="fa-${post.is_liked ? 'solid' : 'regular'} fa-heart"></i>
        <span data-like-count>${post.likes_count}</span>
      </button>
      <button class="post-action-btn" data-toggle-comments="${post.id}">
        <i class="fa-regular fa-comment"></i>
        <span data-comment-count>${post.comments_count}</span>
      </button>
      <button class="post-action-btn" data-share-btn="${post.id}">
        <i class="fa-solid fa-share"></i>
      </button>
      <button class="post-action-btn spacer ${post.is_bookmarked ? 'bookmarked' : ''}" data-bookmark-btn="${post.id}">
        <i class="fa-${post.is_bookmarked ? 'solid' : 'regular'} fa-bookmark"></i>
      </button>
    </div>

    <div class="comments-section" id="comments-${post.id}">
      <div class="comments-list" id="comments-list-${post.id}"></div>
      <div class="comment-input-row">
        ${avatarHtml({ profileImage: me?.profile_image, fullname: me?.fullname, size: 'sm' })}
        <input type="text" placeholder="Write a comment..." maxlength="300" data-comment-input="${post.id}">
        <button class="btn-icon" data-submit-comment="${post.id}" style="color:var(--primary-light);"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>
  </article>`;
}

function postCardSkeleton() {
  return `
  <div class="post-card glass">
    <div style="display:flex; gap:12px; margin-bottom:14px;">
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1;">
        <div class="skeleton skeleton-line" style="width:40%"></div>
        <div class="skeleton skeleton-line" style="width:25%"></div>
      </div>
    </div>
    <div class="skeleton skeleton-line" style="width:95%"></div>
    <div class="skeleton skeleton-line" style="width:70%"></div>
  </div>`;
}

function emptyStateHtml({ icon, title, message }) {
  return `
  <div class="empty-state fade-in">
    <div class="empty-icon"><i class="fa-solid ${icon}"></i></div>
    <h4>${title}</h4>
    <p>${message}</p>
  </div>`;
}

// ---- Render the Home feed view ----
async function renderHomeView() {
  const main = document.getElementById('main-view');
  feedState = { tab: 'all', page: 1, loading: false, hasMore: true };
  const me = Auth.getUser();

  main.innerHTML = `
    <div class="feed-tabs glass">
      <button class="feed-tab active" data-feed-tab="all">For You</button>
      <button class="feed-tab" data-feed-tab="following">Following</button>
    </div>

    <div class="composer glass" id="composer-shortcut">
      <div class="composer-top">
        <a href="#/profile/${me?.username}">${avatarHtml({ profileImage: me?.profile_image, fullname: me?.fullname })}</a>
        <textarea readonly placeholder="What's happening?" id="composer-shortcut-textarea"></textarea>
      </div>
      <div class="composer-bottom">
        <div class="composer-tools">
          <span class="btn-icon" style="pointer-events:none;"><i class="fa-solid fa-image"></i></span>
          <span class="btn-icon" style="pointer-events:none;"><i class="fa-solid fa-face-smile"></i></span>
        </div>
        <button class="btn btn-primary btn-sm" id="composer-shortcut-btn">Post</button>
      </div>
    </div>

    <div id="feed-list"></div>
    <div class="scroll-sentinel" id="feed-sentinel"></div>
  `;

  document.querySelectorAll('[data-feed-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-feed-tab]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      feedState.tab = btn.dataset.feedTab;
      feedState.page = 1;
      feedState.hasMore = true;
      document.getElementById('feed-list').innerHTML = '';
      loadFeedPage();
    });
  });

  document.getElementById('composer-shortcut-textarea').addEventListener('click', () => openPostModal());
  document.getElementById('composer-shortcut-btn').addEventListener('click', () => openPostModal());

  loadFeedPage();
  setupFeedInfiniteScroll();
  loadTrendingWidget();
  loadSuggestionsWidget();
}

async function loadFeedPage() {
  if (feedState.loading || !feedState.hasMore) return;
  feedState.loading = true;
  const list = document.getElementById('feed-list');
  if (!list) { feedState.loading = false; return; }

  const skeletons = document.createElement('div');
  skeletons.id = 'feed-loading-skeletons';
  skeletons.innerHTML = postCardSkeleton() + postCardSkeleton();
  list.appendChild(skeletons);

  try {
    const res = await API.getFeed(feedState.tab, feedState.page);
    skeletons.remove();

    if (feedState.page === 1 && res.data.posts.length === 0) {
      list.innerHTML = feedState.tab === 'following'
        ? emptyStateHtml({ icon: 'fa-user-group', title: 'Nothing here yet', message: 'Follow people to see their posts in this tab.' })
        : emptyStateHtml({ icon: 'fa-inbox', title: 'No posts yet', message: 'Be the first to share something with Vibe.' });
      feedState.hasMore = false;
      feedState.loading = false;
      return;
    }

    res.data.posts.forEach((post) => {
      list.insertAdjacentHTML('beforeend', postCardHtml(post));
    });

    feedState.hasMore = res.data.hasMore;
    feedState.page += 1;
  } catch (err) {
    skeletons.remove();
    showToast(err.message, 'error');
  } finally {
    feedState.loading = false;
  }
}

function setupFeedInfiniteScroll() {
  const sentinel = document.getElementById('feed-sentinel');
  if (!sentinel) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadFeedPage();
  }, { rootMargin: '400px' });
  observer.observe(sentinel);
}

// ---- Trending hashtags widget ----
async function loadTrendingWidget() {
  const el = document.getElementById('trending-widget-content');
  if (!el) return;
  try {
    const res = await API.getTrending();
    if (!res.data.hashtags.length) {
      el.innerHTML = `<p style="color:var(--text-tertiary); font-size:0.85rem;">No trending tags yet — start using #hashtags in your posts.</p>`;
      return;
    }
    el.innerHTML = res.data.hashtags.map((h) => `
      <div class="trend-item" data-search-tag="${escapeHtml(h.tag)}">
        <span class="tag-name">${escapeHtml(h.tag)}</span>
        <span class="tag-count">${h.uses} posts</span>
      </div>`).join('');
  } catch {
    el.innerHTML = '';
  }
}

// ---- "Who to follow" suggestions widget ----
async function loadSuggestionsWidget() {
  const el = document.getElementById('suggestions-widget-content');
  if (!el) return;
  try {
    const res = await API.searchUsers('a'); // broad seed letter to surface some users
    const me = Auth.getUser();
    const suggestions = res.data.users.filter((u) => u.id !== me.id && !u.is_following).slice(0, 4);
    if (!suggestions.length) {
      el.innerHTML = `<p style="color:var(--text-tertiary); font-size:0.85rem;">You're all caught up on follows!</p>`;
      return;
    }
    el.innerHTML = suggestions.map((u) => `
      <div class="suggest-item">
        <a href="#/profile/${u.username}">${avatarHtml({ profileImage: u.profile_image, fullname: u.fullname, size: 'sm' })}</a>
        <div class="name-block">
          <a href="#/profile/${u.username}"><strong>${escapeHtml(u.fullname)} ${verifiedBadge(u.is_verified)}</strong></a>
          <span>@${escapeHtml(u.username)}</span>
        </div>
        <button class="btn btn-glass btn-sm" data-follow-btn="${u.id}" data-following="false">Follow</button>
      </div>`).join('');
  } catch {
    el.innerHTML = '';
  }
}
