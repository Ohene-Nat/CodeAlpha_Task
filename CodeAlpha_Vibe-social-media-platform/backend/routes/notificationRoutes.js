// ============================================================
// Notification Routes — /api/notifications
// ============================================================
const express = require('express');
const router = express.Router();

const {
  getNotifications, markAllRead, markOneRead, getUnreadCount,
} = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getNotifications);
router.get('/unread-count', requireAuth, getUnreadCount);
router.put('/read-all', requireAuth, markAllRead);
router.put('/:id/read', requireAuth, markOneRead);

module.exports = router;
