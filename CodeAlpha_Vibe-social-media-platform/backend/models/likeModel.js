// ============================================================
// Like Model — handles like/unlike with duplicate prevention
// via the DB unique constraint (post_id, user_id)
// ============================================================
const { query } = require('../config/db');

const LikeModel = {
  async exists(postId, userId) {
    const result = await query('SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    return result.rowCount > 0;
  },

  async add(postId, userId) {
    try {
      await query(
        `INSERT INTO likes (post_id, user_id) VALUES ($1, $2)
         ON CONFLICT (post_id, user_id) DO NOTHING`,
        [postId, userId]
      );
      return true;
    } catch (err) {
      throw err;
    }
  },

  async remove(postId, userId) {
    await query('DELETE FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    return true;
  },

  async countForPost(postId) {
    const result = await query('SELECT COUNT(*)::int AS count FROM likes WHERE post_id = $1', [postId]);
    return result.rows[0].count;
  },

  async getPostOwner(postId) {
    const result = await query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    return result.rows[0]?.user_id;
  },
};

module.exports = LikeModel;
