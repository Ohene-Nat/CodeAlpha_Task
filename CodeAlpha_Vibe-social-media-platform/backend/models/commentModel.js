// ============================================================
// Comment Model
// ============================================================
const { query } = require('../config/db');

const CommentModel = {
  async create({ postId, userId, comment }) {
    const result = await query(
      `INSERT INTO comments (post_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *`,
      [postId, userId, comment]
    );
    return result.rows[0];
  },

  async getByPost(postId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT c.id, c.post_id, c.user_id, c.comment, c.created_at,
              u.username, u.fullname, u.profile_image, u.is_verified
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await query('SELECT * FROM comments WHERE id = $1', [id]);
    return result.rows[0];
  },

  async isOwner(commentId, userId) {
    const result = await query('SELECT 1 FROM comments WHERE id = $1 AND user_id = $2', [commentId, userId]);
    return result.rowCount > 0;
  },

  async delete(id) {
    await query('DELETE FROM comments WHERE id = $1', [id]);
    return true;
  },

  async countForPost(postId) {
    const result = await query('SELECT COUNT(*)::int AS count FROM comments WHERE post_id = $1', [postId]);
    return result.rows[0].count;
  },
};

module.exports = CommentModel;
