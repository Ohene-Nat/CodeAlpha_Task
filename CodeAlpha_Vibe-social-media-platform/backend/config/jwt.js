// ============================================================
// JWT Helper Functions
// ============================================================
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const REMEMBER_EXPIRES = process.env.JWT_REMEMBER_EXPIRES_IN || '30d';

/**
 * Sign a new JWT for a given user id.
 * @param {number} userId
 * @param {boolean} rememberMe - if true, use extended expiry
 */
function generateToken(userId, rememberMe = false) {
  const expiresIn = rememberMe ? REMEMBER_EXPIRES : DEFAULT_EXPIRES;
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn });
}

/**
 * Verify a JWT and return its decoded payload, or throw if invalid.
 * @param {string} token
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateToken, verifyToken };
