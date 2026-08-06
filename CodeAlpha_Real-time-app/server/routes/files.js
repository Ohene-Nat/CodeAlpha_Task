const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { requireAuth } = require('../middleware/auth');
const { encryptBuffer, decryptBuffer } = require('../utils/encryption');
const fileStore = require('../utils/fileStore');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB, adjust as needed

// Keep uploads in memory just long enough to encrypt + write to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// POST /api/files/upload  (multipart/form-data: file, room)
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  const { room } = req.body || {};
  if (!room) return res.status(400).json({ error: 'room is required.' });
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });

  const id = uuidv4();
  const storedFilename = `${id}.enc`;

  const encrypted = encryptBuffer(req.file.buffer);
  fs.writeFileSync(path.join(UPLOAD_DIR, storedFilename), encrypted);

  const meta = {
    id,
    room,
    uploaderId: req.user.id,
    uploaderName: req.user.name,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storedFilename,
    createdAt: new Date().toISOString(),
  };
  fileStore.add(meta);

  const { storedFilename: _omit, ...publicMeta } = meta;
  res.status(201).json({ file: publicMeta });
});

// GET /api/files/room/:room  -> list files shared in a room
router.get('/room/:room', requireAuth, (req, res) => {
  const files = fileStore.listByRoom(req.params.room).map(({ storedFilename, ...rest }) => rest);
  res.json({ files });
});

// GET /api/files/download/:id -> decrypts and streams the original file
router.get('/download/:id', requireAuth, (req, res) => {
  const meta = fileStore.findById(req.params.id);
  if (!meta) return res.status(404).json({ error: 'File not found.' });

  const fullPath = path.join(UPLOAD_DIR, meta.storedFilename);
  if (!fs.existsSync(fullPath)) {
    return res.status(410).json({ error: 'File data is missing from storage.' });
  }

  const encrypted = fs.readFileSync(fullPath);
  let plain;
  try {
    plain = decryptBuffer(encrypted);
  } catch (err) {
    return res.status(500).json({ error: 'Could not decrypt file.' });
  }

  res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(meta.originalName)}"`);
  res.send(plain);
});

module.exports = router;
