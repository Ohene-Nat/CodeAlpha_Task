const express = require('express');
const { getCart, addToCart, updateCart, deleteCartItem, clearCart } = require('../controllers/cartController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(getCart));
router.post('/', requireAuth, asyncHandler(addToCart));
router.put('/:id', requireAuth, asyncHandler(updateCart));
router.delete('/:id', requireAuth, asyncHandler(deleteCartItem));
router.delete('/', requireAuth, asyncHandler(clearCart));

module.exports = router;
