// ============================================================
// Follow Controller — follow/unfollow, followers/following lists
// ============================================================
const FollowModel = require('../models/followModel');
const UserModel = require('../models/userModel');
const NotificationModel = require('../models/notificationModel');

// POST /api/users/:userId/follow
async function toggleFollow(req, res, next) {
  try {
    const followingId = Number(req.params.userId);
    const followerId = req.user.id;

    if (followingId === followerId) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }

    const targetUser = await UserModel.findById(followingId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const alreadyFollowing = await FollowModel.exists(followerId, followingId);

    if (alreadyFollowing) {
      await FollowModel.unfollow(followerId, followingId);
      await NotificationModel.removeByAction({
        receiverId: followingId, senderId: followerId, type: 'follow', referenceId: null,
      });
    } else {
      await FollowModel.follow(followerId, followingId);
      await NotificationModel.create({
        receiverId: followingId, senderId: followerId, type: 'follow', referenceId: null,
      });
    }

    const counts = await FollowModel.counts(followingId);

    res.json({
      success: true,
      data: { isFollowing: !alreadyFollowing, ...counts },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:userId/followers
async function getFollowers(req, res, next) {
  try {
    const followers = await FollowModel.getFollowers(req.params.userId, req.user?.id);
    res.json({ success: true, data: { users: followers } });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:userId/following
async function getFollowing(req, res, next) {
  try {
    const following = await FollowModel.getFollowing(req.params.userId, req.user?.id);
    res.json({ success: true, data: { users: following } });
  } catch (err) {
    next(err);
  }
}

module.exports = { toggleFollow, getFollowers, getFollowing };
