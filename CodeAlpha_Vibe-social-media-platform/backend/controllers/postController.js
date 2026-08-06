// ============================================================
// Post Controller — CRUD + feed retrieval
// ============================================================
const PostModel = require('../models/postModel');
const CommentModel = require('../models/commentModel');
const { clean } = require('../utils/sanitize');

// POST /api/posts
async function createPost(req, res, next) {
  try {
    const content = clean(req.body.content || '');
    const image = req.file ? `/uploads/posts/${req.file.filename}` : null;

    const post = await PostModel.create({ userId: req.user.id, content, image });
    const fullPost = await PostModel.findById(post.id, req.user.id);

    res.status(201).json({ success: true, message: 'Post created successfully.', data: { post: fullPost } });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/feed?tab=all|following&page=1
async function getFeed(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(30, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const viewerId = req.user?.id || 0;

    const posts = req.query.tab === 'following' && req.user
      ? await PostModel.getFollowingFeed(viewerId, limit, offset)
      : await PostModel.getFeed(viewerId, limit, offset);

    res.json({ success: true, data: { posts, page, hasMore: posts.length === limit } });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/user/:userId
async function getUserPosts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(30, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const posts = await PostModel.getByUser(req.params.userId, req.user?.id, limit, offset);
    res.json({ success: true, data: { posts, page, hasMore: posts.length === limit } });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/bookmarks
async function getBookmarkedPosts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(30, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const posts = await PostModel.getBookmarked(req.user.id, limit, offset);
    res.json({ success: true, data: { posts, page, hasMore: posts.length === limit } });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:id
async function getPostById(req, res, next) {
  try {
    const post = await PostModel.findById(req.params.id, req.user?.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    res.json({ success: true, data: { post } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/posts/:id  (owner only)
async function updatePost(req, res, next) {
  try {
    const isOwner = await PostModel.isOwner(req.params.id, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'You can only edit your own posts.' });
    }

    const content = clean(req.body.content || '');
    const image = req.file ? `/uploads/posts/${req.file.filename}` : null;

    await PostModel.update(req.params.id, content, image);
    const updated = await PostModel.findById(req.params.id, req.user.id);

    res.json({ success: true, message: 'Post updated successfully.', data: { post: updated } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/posts/:id  (owner only)
async function deletePost(req, res, next) {
  try {
    const isOwner = await PostModel.isOwner(req.params.id, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'You can only delete your own posts.' });
    }
    await PostModel.delete(req.params.id);
    res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/trending/hashtags
async function getTrending(req, res, next) {
  try {
    const hashtags = await PostModel.getTrendingHashtags(6);
    res.json({ success: true, data: { hashtags } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPost, getFeed, getUserPosts, getBookmarkedPosts,
  getPostById, updatePost, deletePost, getTrending,
};
