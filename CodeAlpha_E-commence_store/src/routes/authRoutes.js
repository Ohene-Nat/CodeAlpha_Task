const express = require('express');
const { register, login, logout, profile } = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/logout', asyncHandler(logout));
router.get('/profile', requireAuth, asyncHandler(profile));

module.exports = router;
