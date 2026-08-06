// ============================================================
// User Model — all raw SQL for the `users` table lives here.
// Every query is parameterized ($1, $2, ...) to prevent SQL injection.
// ============================================================
const { query } = require('../config/db');

const PUBLIC_FIELDS = `
  id, fullname, username, email, bio, profile_image, cover_image,
  is_verified, is_online, last_seen, created_at
`;

const UserModel = {
  // Create a new user, returns public fields only
  async create({ fullname, username, email, hashedPassword, profileImage }) {
    const result = await query(
      `INSERT INTO users (fullname, username, email, password, profile_image)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${PUBLIC_FIELDS}`,
      [fullname, username, email, hashedPassword, profileImage || null]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return result.rows[0];
  },

  async findByUsername(username) {
    const result = await query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [id]);
    return result.rows[0];
  },

  // Full profile including counts (followers, following, posts) + relative-to-viewer flags
  async getProfile(username, viewerId) {
    const result = await query(
      `SELECT u.id, u.fullname, u.username, u.email, u.bio, u.profile_image, u.cover_image,
              u.is_verified, u.is_online, u.last_seen, u.created_at,
              (SELECT COUNT(*)::int FROM followers WHERE following_id = u.id) AS followers_count,
              (SELECT COUNT(*)::int FROM followers WHERE follower_id = u.id) AS following_count,
              (SELECT COUNT(*)::int FROM posts WHERE user_id = u.id) AS posts_count,
              EXISTS(SELECT 1 FROM followers WHERE follower_id = $2 AND following_id = u.id) AS is_following
       FROM users u
       WHERE LOWER(u.username) = LOWER($1)`,
      [username, viewerId || 0]
    );
    return result.rows[0];
  },

  async updateProfile(id, fields) {
    // Build dynamic SET clause safely using parameterized values
    const allowed = ['fullname', 'username', 'bio', 'profile_image', 'cover_image'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING ${PUBLIC_FIELDS}`,
      values
    );
    return result.rows[0];
  },

  async updatePassword(id, hashedPassword) {
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
    return true;
  },

  async setOnlineStatus(id, isOnline) {
    await query('UPDATE users SET is_online = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2', [isOnline, id]);
  },

  async deleteAccount(id) {
    await query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  },

  // Search users by username or fullname (case-insensitive partial match)
  async search(term, viewerId, limit = 15) {
    const result = await query(
      `SELECT id, fullname, username, profile_image, is_verified,
              EXISTS(SELECT 1 FROM followers WHERE follower_id = $2 AND following_id = u.id) AS is_following
       FROM users u
       WHERE username ILIKE $1 OR fullname ILIKE $1
       ORDER BY (username ILIKE $3) DESC, username ASC
       LIMIT $4`,
      [`%${term}%`, viewerId || 0, `${term}%`, limit]
    );
    return result.rows;
  },

  async emailExists(email) {
    const result = await query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return result.rowCount > 0;
  },

  async usernameExists(username) {
    const result = await query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    return result.rowCount > 0;
  },
};

module.exports = UserModel;
