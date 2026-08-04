const express = require('express');
const { getUsers, getStats } = require('../controllers/adminController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', requireAuth, requireAdmin, asyncHandler(getStats));
router.get('/users', requireAuth, requireAdmin, asyncHandler(getUsers));

module.exports = router;
