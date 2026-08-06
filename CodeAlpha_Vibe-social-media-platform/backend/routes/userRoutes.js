// ============================================================
// User Routes — /api/users
// ============================================================
const express = require('express');
const router = express.Router();

const {
  getProfile, updateProfile, changePassword, deleteAccount, searchUsers,
} = require('../controllers/userController');
const { toggleFollow, getFollowers, getFollowing } = require('../controllers/followController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { changePasswordRules, handleValidation } = require('../middleware/validators');
const { uploadProfileAndCover } = require('../middleware/upload');

// IMPORTANT: specific/static routes must be declared BEFORE the dynamic
// "/:username" route, otherwise Express would treat "search" as a username.
router.get('/search', optionalAuth, searchUsers);

router.put(
  '/me',
  requireAuth,
  uploadProfileAndCover.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  updateProfile
);
router.put('/me/password', requireAuth, changePasswordRules, handleValidation, changePassword);
router.delete('/me', requireAuth, deleteAccount);

router.get('/:username', optionalAuth, getProfile);

router.post('/:userId/follow', requireAuth, toggleFollow);
router.get('/:userId/followers', optionalAuth, getFollowers);
router.get('/:userId/following', optionalAuth, getFollowing);

module.exports = router;
