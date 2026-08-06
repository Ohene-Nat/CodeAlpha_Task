// ============================================================
// User Controller — profiles, editing, search, settings
// ============================================================
const bcrypt = require('bcrypt');
const UserModel = require('../models/userModel');
const { clean } = require('../utils/sanitize');

const SALT_ROUNDS = 10;

// GET /api/users/:username
async function getProfile(req, res, next) {
  try {
    const viewerId = req.user?.id;
    const profile = await UserModel.getProfile(req.params.username, viewerId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, data: { user: profile } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/me
async function updateProfile(req, res, next) {
  try {
    const fields = {};
    if (req.body.fullname !== undefined) fields.fullname = clean(req.body.fullname);
    if (req.body.bio !== undefined) fields.bio = clean(req.body.bio).slice(0, 280);

    if (req.body.username !== undefined) {
      const newUsername = clean(req.body.username).toLowerCase();
      if (newUsername !== req.user.username) {
        if (await UserModel.usernameExists(newUsername)) {
          return res.status(409).json({ success: false, message: 'That username is already taken.' });
        }
        fields.username = newUsername;
      }
    }

    if (req.files?.profileImage?.[0]) {
      fields.profile_image = `/uploads/profiles/${req.files.profileImage[0].filename}`;
    }
    if (req.files?.coverImage?.[0]) {
      fields.cover_image = `/uploads/covers/${req.files.coverImage[0].filename}`;
    }

    const updated = await UserModel.updateProfile(req.user.id, fields);
    res.json({ success: true, message: 'Profile updated successfully.', data: { user: updated } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/me/password
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const fullUser = await UserModel.findByEmail(req.user.email); // includes password hash

    const isMatch = await bcrypt.compare(currentPassword, fullUser.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await UserModel.updatePassword(req.user.id, hashedPassword);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/me
async function deleteAccount(req, res, next) {
  try {
    await UserModel.deleteAccount(req.user.id);
    res.json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/search?q=term
async function searchUsers(req, res, next) {
  try {
    const term = clean(req.query.q || '');
    if (!term || term.length < 1) {
      return res.json({ success: true, data: { users: [] } });
    }
    const users = await UserModel.search(term, req.user?.id);
    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, changePassword, deleteAccount, searchUsers };
