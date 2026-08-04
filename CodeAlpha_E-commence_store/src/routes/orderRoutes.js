const express = require('express');
const { createOrder, getOrders, getOrderById, updateOrder, cancelOrder } = require('../controllers/orderController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, asyncHandler(createOrder));
router.get('/', requireAuth, asyncHandler(getOrders));
router.get('/:id', requireAuth, asyncHandler(getOrderById));
router.patch('/:id/cancel', requireAuth, asyncHandler(cancelOrder));
router.put('/:id', requireAuth, requireAdmin, asyncHandler(updateOrder));

module.exports = router;
