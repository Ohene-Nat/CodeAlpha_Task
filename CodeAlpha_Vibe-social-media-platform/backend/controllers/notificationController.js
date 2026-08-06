// ============================================================
// Notification Controller
// ============================================================
const NotificationModel = require('../models/notificationModel');

// GET /api/notifications
async function getNotifications(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 30);
    const offset = (page - 1) * limit;

    const notifications = await NotificationModel.getForUser(req.user.id, limit, offset);
    const unreadCount = await NotificationModel.unreadCount(req.user.id);

    res.json({ success: true, data: { notifications, unreadCount, hasMore: notifications.length === limit } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/notifications/read-all
async function markAllRead(req, res, next) {
  try {
    await NotificationModel.markAllRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/notifications/:id/read
async function markOneRead(req, res, next) {
  try {
    await NotificationModel.markOneRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/notifications/unread-count
async function getUnreadCount(req, res, next) {
  try {
    const unreadCount = await NotificationModel.unreadCount(req.user.id);
    res.json({ success: true, data: { unreadCount } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotifications, markAllRead, markOneRead, getUnreadCount };
