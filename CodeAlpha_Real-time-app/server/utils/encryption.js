// Encrypts/decrypts uploaded files at rest using AES-256-GCM.
//
// Why: WebRTC media + Socket.io traffic are already protected in transit
// (DTLS-SRTP for media, and wss:// in production for signaling/chat). Files
// saved to disk are the one thing that sits at rest, so we encrypt those
// bytes ourselves before they touch the filesystem, and decrypt on download.

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const hex = process.env.FILE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'FILE_ENCRYPTION_KEY must be set in .env as a 64-character hex string (32 bytes).'
    );
  }
  return Buffer.from(hex, 'hex');
}

// Encrypts a Buffer. Returns { iv, authTag, data } all as Buffers,
// concatenated so callers can store a single blob on disk.
function encryptBuffer(plainBuffer) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Layout on disk: [12 bytes IV][16 bytes authTag][ciphertext...]
  return Buffer.concat([iv, authTag, encrypted]);
}

function decryptBuffer(blob) {
  const key = getKey();
  const iv = blob.subarray(0, 12);
  const authTag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

module.exports = { encryptBuffer, decryptBuffer };
