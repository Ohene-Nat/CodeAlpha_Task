// ============================================================
// Validation Rules — express-validator chains for each route
// ============================================================
const { body, validationResult } = require('express-validator');

// Run after a validation chain to return formatted errors
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
}

const registerRules = [
  body('fullname').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters.'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores.'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/\d/).withMessage('Password must contain at least one number.'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match.');
    return true;
  }),
];

const loginRules = [
  body('emailOrUsername').trim().notEmpty().withMessage('Email or username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const postRules = [
  body('content')
    .trim()
    .isLength({ max: 500 }).withMessage('Post content cannot exceed 500 characters.')
    .custom((value, { req }) => {
      if (!value && !req.file) throw new Error('Post must contain text or an image.');
      return true;
    }),
];

const commentRules = [
  body('comment').trim().isLength({ min: 1, max: 300 }).withMessage('Comment must be 1-300 characters.'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/\d/).withMessage('New password must contain at least one number.'),
];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  postRules,
  commentRules,
  changePasswordRules,
};
