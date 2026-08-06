// ============================================================
// Follow Model — follow/unfollow with duplicate prevention
// via the DB unique constraint (follower_id, following_id)
// ============================================================
const { query } = require('../config/db');

const FollowModel = {
  async exists(followerId, followingId) {
    const result = await query(
      'SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return result.rowCount > 0;
  },

  async follow(followerId, followingId) {
    await query(
      `INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [followerId, followingId]
    );
    return true;
  },

  async unfollow(followerId, followingId) {
    await query(
      'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return true;
  },

  async getFollowers(userId, viewerId) {
    const result = await query(
      `SELECT u.id, u.fullname, u.username, u.profile_image, u.is_verified,
              EXISTS(SELECT 1 FROM followers WHERE follower_id = $2 AND following_id = u.id) AS is_following
       FROM followers f
       JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC`,
      [userId, viewerId || 0]
    );
    return result.rows;
  },

  async getFollowing(userId, viewerId) {
    const result = await query(
      `SELECT u.id, u.fullname, u.username, u.profile_image, u.is_verified,
              EXISTS(SELECT 1 FROM followers WHERE follower_id = $2 AND following_id = u.id) AS is_following
       FROM followers f
       JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [userId, viewerId || 0]
    );
    return result.rows;
  },

  async counts(userId) {
    const result = await query(
      `SELECT
        (SELECT COUNT(*)::int FROM followers WHERE following_id = $1) AS followers_count,
        (SELECT COUNT(*)::int FROM followers WHERE follower_id = $1) AS following_count`,
      [userId]
    );
    return result.rows[0];
  },
};

module.exports = FollowModel;
