// ============================================================
// Authentication Middleware — protects routes using JWT
// ============================================================
const { verifyToken } = require('../config/jwt');
const UserModel = require('../models/userModel');

/**
 * Requires a valid JWT in the Authorization header ("Bearer <token>").
 * Attaches the authenticated user's public profile to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
}

/**
 * Optional auth — attaches req.user if a valid token is present,
 * but does not block the request if it's missing/invalid.
 * Useful for public endpoints that customize output for logged-in viewers
 * (e.g. "is_following", "is_liked" flags).
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const user = await UserModel.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch (err) {
    // Silently ignore invalid tokens for optional auth
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
