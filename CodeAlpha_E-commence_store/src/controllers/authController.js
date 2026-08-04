const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { signToken } = require('../utils/tokens');

async function register(req, res, next) {
  try {
    const { fullname, username, email, password, confirmPassword } = req.body;

    if (!fullname || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(normalizedUsername)) {
      return res.status(400).json({ message: 'Username must be 3-30 characters and can only contain letters, numbers, dots, and underscores.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), normalizedUsername]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Email or username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (fullname, username, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, fullname, username, email, role, created_at',
      [fullname, normalizedUsername, email.toLowerCase(), hashedPassword, 'customer']
    );

    const user = result.rows[0];
    const token = signToken(user);
    req.session.token = token;

    return res.status(201).json({ message: 'Registration successful.', token, user });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signToken(user);
    req.session.token = token;

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    req.session.destroy((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }
      return res.json({ message: 'Logged out successfully.' });
    });
  } catch (error) {
    return next(error);
  }
}

async function profile(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, fullname, username, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    return res.json({ user: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  profile,
};
