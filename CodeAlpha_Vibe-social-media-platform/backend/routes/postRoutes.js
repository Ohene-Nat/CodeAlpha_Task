// ============================================================
// Post Routes — /api/posts
// ============================================================
const express = require('express');
const router = express.Router();

const {
  createPost, getFeed, getUserPosts, getBookmarkedPosts,
  getPostById, updatePost, deletePost, getTrending,
} = require('../controllers/postController');
const { addComment, getComments, deleteComment } = require('../controllers/commentController');
const { toggleLike } = require('../controllers/likeController');
const { toggleBookmark } = require('../controllers/bookmarkController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { postRules, commentRules, handleValidation } = require('../middleware/validators');
const { uploadPost } = require('../middleware/upload');

// Static routes first (before "/:id")
router.get('/feed', optionalAuth, getFeed);
router.get('/trending/hashtags', getTrending);
router.get('/bookmarks', requireAuth, getBookmarkedPosts);
router.get('/user/:userId', optionalAuth, getUserPosts);

router.post('/', requireAuth, uploadPost.single('image'), postRules, handleValidation, createPost);
router.get('/:id', optionalAuth, getPostById);
router.put('/:id', requireAuth, uploadPost.single('image'), postRules, handleValidation, updatePost);
router.delete('/:id', requireAuth, deletePost);

router.post('/:postId/like', requireAuth, toggleLike);
router.post('/:postId/bookmark', requireAuth, toggleBookmark);

router.post('/:postId/comments', requireAuth, commentRules, handleValidation, addComment);
router.get('/:postId/comments', optionalAuth, getComments);
router.delete('/comments/:id', requireAuth, deleteComment);

module.exports = router;
