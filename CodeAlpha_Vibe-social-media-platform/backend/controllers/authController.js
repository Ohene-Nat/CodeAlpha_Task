// ============================================================
// Auth Controller — register, login, logout, current user
// ============================================================
const bcrypt = require('bcrypt');
const UserModel = require('../models/userModel');
const { generateToken } = require('../config/jwt');
const { clean } = require('../utils/sanitize');

const SALT_ROUNDS = 10;

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const fullname = clean(req.body.fullname);
    const username = clean(req.body.username).toLowerCase();
    const email = clean(req.body.email).toLowerCase();
    const { password } = req.body;

    // Uniqueness checks (also enforced at DB level as a second guard)
    if (await UserModel.emailExists(email)) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
    }
    if (await UserModel.usernameExists(username)) {
      return res.status(409).json({ success: false, message: 'That username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : null;

    const user = await UserModel.create({ fullname, username, email, hashedPassword, profileImage });
    const token = generateToken(user.id, false);

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Welcome to Vibe!',
      data: { user, token },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { emailOrUsername, password, rememberMe } = req.body;
    const isEmail = emailOrUsername.includes('@');

    const user = isEmail
      ? await UserModel.findByEmail(emailOrUsername)
      : await UserModel.findByUsername(emailOrUsername);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please try again.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please try again.' });
    }

    await UserModel.setOnlineStatus(user.id, true);

    const token = generateToken(user.id, !!rememberMe);
    delete user.password; // never send hash to client

    res.json({
      success: true,
      message: `Welcome back, ${user.fullname.split(' ')[0]}!`,
      data: { user, token },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    if (req.user) await UserModel.setOnlineStatus(req.user.id, false);
    // JWTs are stateless; client discards the token. This endpoint updates
    // presence state and exists for a clean, discoverable REST contract.
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  res.json({ success: true, data: { user: req.user } });
}

module.exports = { register, login, logout, getMe };
