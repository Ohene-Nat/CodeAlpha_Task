// ============================================================
// Auth Routes — /api/auth
// ============================================================
const express = require('express');
const router = express.Router();

const { register, login, logout, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules, handleValidation } = require('../middleware/validators');
const { uploadProfile } = require('../middleware/upload');

router.post('/register', authLimiter, uploadProfile.single('profileImage'), registerRules, handleValidation, register);
router.post('/login', authLimiter, loginRules, handleValidation, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);

module.exports = router;
