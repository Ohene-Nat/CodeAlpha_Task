// ============================================================
// Comment Controller
// ============================================================
const CommentModel = require('../models/commentModel');
const PostModel = require('../models/postModel');
const NotificationModel = require('../models/notificationModel');
const { clean } = require('../utils/sanitize');

// POST /api/posts/:postId/comments
async function addComment(req, res, next) {
  try {
    const post = await PostModel.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const comment = clean(req.body.comment);
    const created = await CommentModel.create({ postId: req.params.postId, userId: req.user.id, comment });

    // Notify the post owner (unless commenting on your own post)
    await NotificationModel.create({
      receiverId: post.user_id,
      senderId: req.user.id,
      type: 'comment',
      referenceId: post.id,
    });

    const fullComment = {
      ...created,
      username: req.user.username,
      fullname: req.user.fullname,
      profile_image: req.user.profile_image,
      is_verified: req.user.is_verified,
    };

    res.status(201).json({ success: true, message: 'Comment added.', data: { comment: fullComment } });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:postId/comments
async function getComments(req, res, next) {
  try {
    const comments = await CommentModel.getByPost(req.params.postId);
    res.json({ success: true, data: { comments } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/comments/:id  (owner only)
async function deleteComment(req, res, next) {
  try {
    const isOwner = await CommentModel.isOwner(req.params.id, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments.' });
    }
    await CommentModel.delete(req.params.id);
    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { addComment, getComments, deleteComment };
