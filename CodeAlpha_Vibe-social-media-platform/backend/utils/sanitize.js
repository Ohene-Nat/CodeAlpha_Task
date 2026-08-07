// ============================================================
// Sanitization Utility — strips dangerous HTML/script content
// to protect against stored XSS in user-generated text fields.
// ============================================================
const xss = require('xss');

const xssOptions = {
  whiteList: {}, // no HTML tags allowed at all in plain-text fields
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

function clean(text) {
  if (typeof text !== 'string') return text;
  return xss(text.trim(), xssOptions);
}

module.exports = { clean };
