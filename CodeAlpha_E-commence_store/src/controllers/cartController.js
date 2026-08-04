const pool = require('../config/db');

async function getCart(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT cart.id, cart.quantity, products.id AS product_id, products.name, products.description, products.image, products.price, products.stock, products.category
       FROM cart
       JOIN products ON products.id = cart.product_id
       WHERE cart.user_id = $1
       ORDER BY cart.id DESC`,
      [userId]
    );

    return res.json({ cart: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function addToCart(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    const existing = await pool.query('SELECT id, quantity FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    if (existing.rowCount > 0) {
      const updated = await pool.query(
        'UPDATE cart SET quantity = quantity + $1 WHERE id = $2 RETURNING *',
        [quantity, existing.rows[0].id]
      );
      return res.json({ cartItem: updated.rows[0] });
    }

    const result = await pool.query(
      'INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
      [userId, productId, quantity]
    );

    return res.status(201).json({ cartItem: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function updateCart(req, res, next) {
  try {
    const { quantity } = req.body;
    const result = await pool.query(
      'UPDATE cart SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [quantity, req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    return res.json({ cartItem: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function deleteCartItem(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    return res.json({ message: 'Cart item removed.' });
  } catch (error) {
    return next(error);
  }
}

async function clearCart(req, res, next) {
  try {
    await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);
    return res.json({ message: 'Cart cleared.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCart,
  deleteCartItem,
  clearCart,
};
