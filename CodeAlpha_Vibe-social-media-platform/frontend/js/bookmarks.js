// ============================================================
// Vibe — Bookmarks View
// ============================================================

let bookmarksState = { page: 1, loading: false, hasMore: true };

async function renderBookmarksView() {
  const main = document.getElementById('main-view');
  bookmarksState = { page: 1, loading: false, hasMore: true };

  main.innerHTML = `
    <div class="glass card fade-in" style="margin-bottom:16px;">
      <h2 style="font-size:1.2rem;"><i class="fa-solid fa-bookmark" style="color:var(--warning); margin-right:8px;"></i>Saved Posts</h2>
    </div>
    <div id="bookmarks-list"></div>
    <div class="scroll-sentinel" id="bookmarks-sentinel"></div>
  `;

  loadBookmarksPage();

  const sentinel = document.getElementById('bookmarks-sentinel');
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadBookmarksPage();
  }, { rootMargin: '400px' });
  observer.observe(sentinel);
}

async function loadBookmarksPage() {
  if (bookmarksState.loading || !bookmarksState.hasMore) return;
  bookmarksState.loading = true;
  const list = document.getElementById('bookmarks-list');
  if (!list) { bookmarksState.loading = false; return; }

  const skeletons = document.createElement('div');
  skeletons.innerHTML = postCardSkeleton();
  list.appendChild(skeletons);

  try {
    const res = await API.getBookmarks(bookmarksState.page);
    skeletons.remove();

    if (bookmarksState.page === 1 && res.data.posts.length === 0) {
      list.innerHTML = emptyStateHtml({ icon: 'fa-bookmark', title: 'No saved posts', message: 'Tap the bookmark icon on any post to save it for later.' });
      bookmarksState.hasMore = false;
      bookmarksState.loading = false;
      return;
    }

    res.data.posts.forEach((post) => list.insertAdjacentHTML('beforeend', postCardHtml(post)));
    bookmarksState.hasMore = res.data.hasMore;
    bookmarksState.page += 1;
  } catch (err) {
    skeletons.remove();
    showToast(err.message, 'error');
  } finally {
    bookmarksState.loading = false;
  }
}
