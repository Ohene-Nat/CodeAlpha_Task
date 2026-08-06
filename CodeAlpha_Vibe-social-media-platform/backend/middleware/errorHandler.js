// ============================================================
// Centralized Error Handling Middleware
// ============================================================
const multer = require('multer');

function errorHandler(err, req, res, next) {
  console.error('🔥 Error:', err.message);

  // Multer-specific errors (file size, unexpected field, etc.)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }

  // Custom file-filter errors thrown from middleware/upload.js
  if (err.message && err.message.includes('images are allowed')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'That value already exists. Please choose another.' });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Related resource not found.' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Something went wrong on our end. Please try again.';

  res.status(statusCode).json({ success: false, message });
}

// 404 handler for unmatched routes
function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
}

module.exports = { errorHandler, notFound };
