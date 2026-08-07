// ============================================================
// Multer Upload Middleware — handles profile/cover/post images
// ============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const MAX_SIZE = Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB default
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Ensure upload directories exist
['profiles', 'covers', 'posts'].forEach((dir) => {
  const fullPath = path.join(__dirname, '..', 'uploads', dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '..', 'uploads', subfolder));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${subfolder.slice(0, -1)}-${Date.now()}-${uniqueSuffix}${ext}`);
    },
  });
}

function fileFilter(req, file, cb) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed.'));
  }
  cb(null, true);
}

const uploadProfile = multer({
  storage: makeStorage('profiles'),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

const uploadCover = multer({
  storage: makeStorage('covers'),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

const uploadPost = multer({
  storage: makeStorage('posts'),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

// Combined uploader for the "edit profile" form, which may submit BOTH a
// profileImage and a coverImage in the same multipart request. A single
// multer instance is required here since the request stream can only be
// parsed once - routing each file to the right folder by its fieldname.
const combinedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'coverImage' ? 'covers' : 'profiles';
    cb(null, path.join(__dirname, '..', 'uploads', folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = file.fieldname === 'coverImage' ? 'cover' : 'profile';
    cb(null, `${prefix}-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const uploadProfileAndCover = multer({
  storage: combinedStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

module.exports = { uploadProfile, uploadCover, uploadPost, uploadProfileAndCover };
