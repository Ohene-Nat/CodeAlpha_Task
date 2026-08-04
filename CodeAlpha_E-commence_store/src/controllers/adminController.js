const pool = require('../config/db');

async function getUsers(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, fullname, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ users: result.rows, total: result.rowCount });
  } catch (error) {
    return next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const [users, orders, pending, delivered, cancelled] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'"),
      pool.query('SELECT COUNT(*)::int AS count FROM orders'),
      pool.query("SELECT COUNT(*)::int AS count FROM orders WHERE order_status = 'pending'"),
      pool.query("SELECT COUNT(*)::int AS count FROM orders WHERE order_status = 'delivered'"),
      pool.query("SELECT COUNT(*)::int AS count FROM orders WHERE order_status = 'cancelled'"),
    ]);

    return res.json({
      stats: {
        totalUsers: users.rows[0].count,
        totalOrders: orders.rows[0].count,
        pendingOrders: pending.rows[0].count,
        deliveredOrders: delivered.rows[0].count,
        cancelledOrders: cancelled.rows[0].count,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUsers,
  getStats,
};
