// ============================================================
// Vibe — Notifications View
// ============================================================

const NOTIF_META = {
  like: { icon: 'fa-heart', class: 'like', verb: 'liked your post' },
  comment: { icon: 'fa-comment', class: 'comment', verb: 'commented on your post' },
  follow: { icon: 'fa-user-plus', class: 'follow', verb: 'started following you' },
};

async function renderNotificationsView() {
  const main = document.getElementById('main-view');
  main.innerHTML = `
    <div class="glass card fade-in" style="margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
      <h2 style="font-size:1.2rem;">Notifications</h2>
      <button class="btn btn-ghost btn-sm" id="mark-all-read-btn">Mark all as read</button>
    </div>
    <div id="notif-list"></div>
  `;

  document.getElementById('mark-all-read-btn').addEventListener('click', async () => {
    try {
      await API.markAllNotificationsRead();
      document.querySelectorAll('.notif-item.unread').forEach((el) => el.classList.remove('unread'));
      updateNotifBadges(0);
      showToast('All notifications marked as read.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  const list = document.getElementById('notif-list');
  list.innerHTML = postCardSkeleton();

  try {
    const res = await API.getNotifications();
    const notifications = res.data.notifications;

    if (!notifications.length) {
      list.innerHTML = emptyStateHtml({ icon: 'fa-bell-slash', title: 'No notifications yet', message: 'Likes, comments, and new followers will show up here.' });
      return;
    }

    list.innerHTML = `<div class="glass card">${notifications.map(notifItemHtml).join('')}</div>`;

    // Mark visible unread notifications as read after a short delay
    notifications.filter((n) => !n.is_read).forEach((n) => {
      API.markNotificationRead(n.id).catch(() => {});
    });
    updateNotifBadges(0);

    document.querySelectorAll('[data-notif-goto]').forEach((el) => {
      el.addEventListener('click', () => {
        window.location.hash = `#/profile/${el.dataset.notifUsername}`;
      });
    });
  } catch (err) {
    list.innerHTML = `<p style="text-align:center; color:var(--danger);">${escapeHtml(err.message)}</p>`;
  }
}

function notifItemHtml(n) {
  const meta = NOTIF_META[n.type] || NOTIF_META.like;
  return `
  <div class="notif-item ${n.is_read ? '' : 'unread'}" data-notif-goto data-notif-username="${n.username}">
    <div class="notif-icon ${meta.class}"><i class="fa-solid ${meta.icon}"></i></div>
    ${avatarHtml({ profileImage: n.profile_image, fullname: n.fullname, size: 'sm' })}
    <div style="flex:1;">
      <div class="notif-text"><strong>${escapeHtml(n.fullname)}</strong> ${verifiedBadge(n.is_verified)} ${meta.verb}</div>
      <div class="notif-time">${timeAgo(n.created_at)}</div>
    </div>
  </div>`;
}

async function refreshNotifBadge() {
  if (!Auth.isLoggedIn()) return;
  try {
    const res = await API.getUnreadCount();
    updateNotifBadges(res.data.unreadCount);
  } catch { /* silent fail for background polling */ }
}

function updateNotifBadges(count) {
  [
    document.getElementById('notif-badge-topbar'),
    document.getElementById('notif-badge-sidebar'),
    document.getElementById('notif-badge-mobile'),
  ].forEach((el) => {
    if (!el) return;
    el.textContent = count > 99 ? '99+' : count;
    el.classList.toggle('hidden', count === 0);
  });
}
