// ============================================================
// Express Application Setup
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ------------------------------------------------------------
// Security Middleware
// ------------------------------------------------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images to load in <img> tags cross-origin
}));

// In development, accept requests from any localhost/127.0.0.1 origin
// regardless of port — local dev tools (Live Server, http.server, etc.)
// don't always land on the same port, and that shouldn't break CORS.
// CLIENT_URL is still honored explicitly, and production stays strict.
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // non-browser clients (curl, Postman, server-to-server)
    if (origin === process.env.CLIENT_URL) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && localOriginPattern.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} is not allowed.`));
  },
  credentials: false, // we authenticate via Bearer tokens, not cookies, so this isn't needed
}));

// Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);

// ------------------------------------------------------------
// Static file serving for uploaded images
// ------------------------------------------------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ------------------------------------------------------------
// Root route — friendly pointer for anyone hitting the bare
// server URL directly (all real endpoints live under /api/*)
// ------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Vibe API is running. All endpoints are prefixed with /api — for example /api/health or /api/posts/feed.',
  });
});

// ------------------------------------------------------------
// Health check
// ------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Vibe API is running.', timestamp: new Date().toISOString() });
});

// ------------------------------------------------------------
// API Routes
// ------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);

// ------------------------------------------------------------
// 404 + Error Handling (must be last)
// ------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
