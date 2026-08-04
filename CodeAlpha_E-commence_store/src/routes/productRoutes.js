const express = require('express');
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProductById));
router.post('/', requireAuth, requireAdmin, asyncHandler(createProduct));
router.put('/:id', requireAuth, requireAdmin, asyncHandler(updateProduct));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(deleteProduct));

module.exports = router;
