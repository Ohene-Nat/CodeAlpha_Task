require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const { attachSocketHandlers } = require('./sockets');

// Fail fast with a clear message if required secrets are missing,
// instead of limping along with undefined JWT_SECRET etc.
const REQUIRED_ENV = ['JWT_SECRET', 'FILE_ENCRYPTION_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(
      `Missing required environment variable ${key}. Copy server/.env.example to server/.env and fill it in.`
    );
    process.exit(1);
  }
}

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Serve the static client so the whole app can run from a single origin/port.
const CLIENT_DIR = path.join(__dirname, '..', 'client');
app.use(express.static(CLIENT_DIR));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

// Centralized error handler so multer errors (e.g. file too large) come back as JSON.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGINS, credentials: true },
  maxHttpBufferSize: 1e7,
});
attachSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
