// ============================================================
// Bookmark Controller — save/unsave posts
// ============================================================
const BookmarkModel = require('../models/bookmarkModel');
const PostModel = require('../models/postModel');

// POST /api/posts/:postId/bookmark
async function toggleBookmark(req, res, next) {
  try {
    const postId = req.params.postId;
    const post = await PostModel.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const alreadyBookmarked = await BookmarkModel.exists(postId, req.user.id);

    if (alreadyBookmarked) {
      await BookmarkModel.remove(postId, req.user.id);
    } else {
      await BookmarkModel.add(postId, req.user.id);
    }

    res.json({ success: true, data: { isBookmarked: !alreadyBookmarked } });
  } catch (err) {
    next(err);
  }
}

module.exports = { toggleBookmark };
