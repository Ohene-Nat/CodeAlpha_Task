const pool = require('../config/db');

const VALID_STATUSES = ['pending', 'delivered', 'cancelled'];
const USER_CANCELLABLE = ['pending'];

function generateOrderNumber(orderId) {
  return `ORD-${String(orderId).padStart(8, '0')}`;
}

async function createOrder(req, res, next) {
  const client = await pool.connect();
  try {
    const { shippingAddress, customerName, phone, email } = req.body;
    const userId = req.user.id;

    await client.query('BEGIN');

    const cartResult = await client.query(
      `SELECT cart.product_id, cart.quantity, products.price, products.name, products.stock
       FROM cart
       JOIN products ON products.id = cart.product_id
       WHERE cart.user_id = $1`,
      [userId]
    );

    if (cartResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    const subtotal = cartResult.rows.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const shipping = subtotal > 100 ? 0 : 10;
    const tax = subtotal * 0.1;
    const total = subtotal + shipping + tax;

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total, shipping_address, payment_status, order_status, customer_name, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, total, shippingAddress, 'pending', 'pending', customerName, phone, email]
    );

    const order = orderResult.rows[0];
    const orderNumber = generateOrderNumber(order.id);
    await client.query('UPDATE orders SET order_number = $1 WHERE id = $2', [orderNumber, order.id]);

    for (const item of cartResult.rows) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [order.id, item.product_id, item.quantity, item.price]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    await client.query('DELETE FROM cart WHERE user_id = $1', [userId]);
    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Order placed successfully.',
      order: {
        ...order,
        order_number: orderNumber,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function getOrders(req, res, next) {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const productSummarySubquery = `(
        SELECT string_agg(products.name, ', ' ORDER BY order_items.id)
        FROM order_items
        JOIN products ON products.id = order_items.product_id
        WHERE order_items.order_id = orders.id
      ) AS product_names,
      (
        SELECT COUNT(*)::int
        FROM order_items
        WHERE order_items.order_id = orders.id
      ) AS item_count`;

    const query = req.user.role === 'admin'
      ? `SELECT orders.*, users.fullname AS customer_fullname, users.email AS customer_email,
           ${productSummarySubquery}
         FROM orders
         JOIN users ON users.id = orders.user_id
         ORDER BY orders.created_at DESC`
      : `SELECT orders.*, ${productSummarySubquery}
         FROM orders
         WHERE user_id = $1
         ORDER BY created_at DESC`;
    const params = req.user.role === 'admin' ? [] : [userId];
    const result = await pool.query(query, params);
    return res.json({ orders: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function getOrderById(req, res, next) {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orderResult.rows[0];
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const itemsResult = await pool.query(
      `SELECT order_items.*, products.name, products.image
       FROM order_items
       JOIN products ON products.id = order_items.product_id
       WHERE order_items.order_id = $1`,
      [req.params.id]
    );

    return res.json({ order, items: itemsResult.rows });
  } catch (error) {
    return next(error);
  }
}

async function updateOrder(req, res, next) {
  try {
    const { orderStatus, paymentStatus } = req.body;

    if (orderStatus && !VALID_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ message: `Invalid status. Use: ${VALID_STATUSES.join(', ')}.` });
    }

    const result = await pool.query(
      'UPDATE orders SET order_status = COALESCE($1, order_status), payment_status = COALESCE($2, payment_status) WHERE id = $3 RETURNING *',
      [orderStatus || null, paymentStatus || null, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    return res.json({ message: 'Order updated.', order: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orderResult.rows[0];
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (!USER_CANCELLABLE.includes(order.order_status)) {
      return res.status(400).json({ message: 'Only pending orders can be cancelled.' });
    }

    const result = await pool.query(
      "UPDATE orders SET order_status = 'cancelled', payment_status = 'cancelled' WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    return res.json({ message: 'Order cancelled.', order: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  VALID_STATUSES,
};
