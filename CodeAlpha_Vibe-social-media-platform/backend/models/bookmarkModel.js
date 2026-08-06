// ============================================================
// Bookmark Model — bonus feature: saved posts
// ============================================================
const { query } = require('../config/db');

const BookmarkModel = {
  async exists(postId, userId) {
    const result = await query('SELECT 1 FROM bookmarks WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    return result.rowCount > 0;
  },

  async add(postId, userId) {
    await query(
      `INSERT INTO bookmarks (post_id, user_id) VALUES ($1, $2) ON CONFLICT (post_id, user_id) DO NOTHING`,
      [postId, userId]
    );
    return true;
  },

  async remove(postId, userId) {
    await query('DELETE FROM bookmarks WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    return true;
  },
};

module.exports = BookmarkModel;
