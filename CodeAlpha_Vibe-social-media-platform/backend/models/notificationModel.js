// ============================================================
// Notification Model
// ============================================================
const { query } = require('../config/db');

const NotificationModel = {
  // Create a notification, but never notify a user about their own action
  async create({ receiverId, senderId, type, referenceId }) {
    if (Number(receiverId) === Number(senderId)) return null; // no self-notifications
    const result = await query(
      `INSERT INTO notifications (receiver_id, sender_id, type, reference_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [receiverId, senderId, type, referenceId || null]
    );
    return result.rows[0];
  },

  async getForUser(userId, limit = 30, offset = 0) {
    const result = await query(
      `SELECT n.id, n.type, n.reference_id, n.is_read, n.created_at,
              u.id AS sender_id, u.username, u.fullname, u.profile_image, u.is_verified
       FROM notifications n
       JOIN users u ON u.id = n.sender_id
       WHERE n.receiver_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  async unreadCount(userId) {
    const result = await query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE receiver_id = $1 AND is_read = FALSE',
      [userId]
    );
    return result.rows[0].count;
  },

  async markAllRead(userId) {
    await query('UPDATE notifications SET is_read = TRUE WHERE receiver_id = $1', [userId]);
    return true;
  },

  async markOneRead(id, userId) {
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND receiver_id = $2', [id, userId]);
    return true;
  },

  // Remove a like/comment/follow notification (e.g. on unlike)
  async removeByAction({ receiverId, senderId, type, referenceId }) {
    await query(
      `DELETE FROM notifications
       WHERE receiver_id = $1 AND sender_id = $2 AND type = $3
       AND (reference_id = $4 OR ($4 IS NULL AND reference_id IS NULL))`,
      [receiverId, senderId, type, referenceId || null]
    );
    return true;
  },
};

module.exports = NotificationModel;
