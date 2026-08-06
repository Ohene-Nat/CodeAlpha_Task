// ============================================================
// Post Model — SQL for the `posts` table + joins for feed rendering
// ============================================================
const { query } = require('../config/db');

// Shared SELECT fragment: post + author info + counts + viewer-relative flags
const FEED_SELECT = (viewerId) => `
  SELECT
    p.id, p.user_id, p.content, p.image, p.created_at, p.updated_at,
    u.username, u.fullname, u.profile_image, u.is_verified,
    (SELECT COUNT(*)::int FROM likes WHERE post_id = p.id) AS likes_count,
    (SELECT COUNT(*)::int FROM comments WHERE post_id = p.id) AS comments_count,
    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${viewerId}) AS is_liked,
    EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = ${viewerId}) AS is_bookmarked
  FROM posts p
  JOIN users u ON u.id = p.user_id
`;

const PostModel = {
  async create({ userId, content, image }) {
    const result = await query(
      `INSERT INTO posts (user_id, content, image) VALUES ($1, $2, $3) RETURNING *`,
      [userId, content, image || null]
    );
    return result.rows[0];
  },

  // Global feed: newest first, paginated
  async getFeed(viewerId, limit = 10, offset = 0) {
    const result = await query(
      `${FEED_SELECT(Number(viewerId) || 0)}
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  // Posts by a specific user (profile page)
  async getByUser(profileUserId, viewerId, limit = 10, offset = 0) {
    const result = await query(
      `${FEED_SELECT(Number(viewerId) || 0)}
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [profileUserId, limit, offset]
    );
    return result.rows;
  },

  // Feed of only followed users' posts
  async getFollowingFeed(viewerId, limit = 10, offset = 0) {
    const result = await query(
      `${FEED_SELECT(Number(viewerId))}
       WHERE p.user_id IN (SELECT following_id FROM followers WHERE follower_id = $1)
          OR p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [viewerId, limit, offset]
    );
    return result.rows;
  },

  async getBookmarked(viewerId, limit = 10, offset = 0) {
    const result = await query(
      `${FEED_SELECT(Number(viewerId))}
       WHERE p.id IN (SELECT post_id FROM bookmarks WHERE user_id = $1)
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [viewerId, limit, offset]
    );
    return result.rows;
  },

  async findById(id, viewerId = 0) {
    const result = await query(
      `${FEED_SELECT(Number(viewerId) || 0)} WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async isOwner(postId, userId) {
    const result = await query('SELECT 1 FROM posts WHERE id = $1 AND user_id = $2', [postId, userId]);
    return result.rowCount > 0;
  },

  async update(id, content, image) {
    const result = await query(
      `UPDATE posts SET content = $1, image = COALESCE($2, image) WHERE id = $3 RETURNING *`,
      [content, image, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await query('DELETE FROM posts WHERE id = $1', [id]);
    return true;
  },

  // Extract simple hashtags from recent post content for trending widget
  async getTrendingHashtags(limit = 5) {
    const result = await query(
      `SELECT word AS tag, COUNT(*)::int AS uses
       FROM (
         SELECT unnest(regexp_matches(content, '#[A-Za-z0-9_]+', 'g')) AS word
         FROM posts
         WHERE created_at > NOW() - INTERVAL '30 days'
       ) tags
       GROUP BY word
       ORDER BY uses DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },
};

module.exports = PostModel;
