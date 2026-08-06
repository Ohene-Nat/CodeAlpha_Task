// ============================================================
// Like Controller — like/unlike a post, prevents duplicate likes
// ============================================================
const LikeModel = require('../models/likeModel');
const NotificationModel = require('../models/notificationModel');

// POST /api/posts/:postId/like
async function toggleLike(req, res, next) {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;
    const postOwnerId = await LikeModel.getPostOwner(postId);

    if (!postOwnerId) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const alreadyLiked = await LikeModel.exists(postId, userId);

    if (alreadyLiked) {
      await LikeModel.remove(postId, userId);
      await NotificationModel.removeByAction({
        receiverId: postOwnerId, senderId: userId, type: 'like', referenceId: postId,
      });
    } else {
      await LikeModel.add(postId, userId);
      await NotificationModel.create({
        receiverId: postOwnerId, senderId: userId, type: 'like', referenceId: postId,
      });
    }

    const likesCount = await LikeModel.countForPost(postId);

    res.json({
      success: true,
      data: { isLiked: !alreadyLiked, likesCount },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { toggleLike };
