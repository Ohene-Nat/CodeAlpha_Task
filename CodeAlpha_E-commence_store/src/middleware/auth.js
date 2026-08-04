const { verifyToken } = require('../utils/tokens');

function readAuthToken(req) {
  const bearer = req.headers.authorization;
  if (bearer && bearer.startsWith('Bearer ')) {
    return bearer.slice(7);
  }

  return req.session && req.session.token ? req.session.token : null;
}

function requireAuth(req, res, next) {
  const token = readAuthToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};
