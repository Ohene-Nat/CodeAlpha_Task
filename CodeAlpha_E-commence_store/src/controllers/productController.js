const pool = require('../config/db');

async function getProducts(req, res, next) {
  try {
    const { search = '', category = 'all', minPrice = 0, maxPrice = 100000, page = 1, limit = 12 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const values = [
      `%${search}%`,
      category,
      Number(minPrice),
      Number(maxPrice),
      Number(limit),
      offset,
    ];

    const result = await pool.query(
      `SELECT *
       FROM products
       WHERE name ILIKE $1
         AND ($2 = 'all' OR category = $2)
         AND price BETWEEN $3 AND $4
       ORDER BY created_at DESC
       LIMIT $5 OFFSET $6`,
      values
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM products
       WHERE name ILIKE $1
         AND ($2 = 'all' OR category = $2)
         AND price BETWEEN $3 AND $4`,
      values.slice(0, 4)
    );

    return res.json({
      products: result.rows,
      pagination: {
        total: countResult.rows[0].total,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const gallery = [result.rows[0].image, result.rows[0].image, result.rows[0].image].filter(Boolean);
    return res.json({ product: { ...result.rows[0], gallery } });
  } catch (error) {
    return next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const { name, description, category, image, price, stock } = req.body;
    const result = await pool.query(
      `INSERT INTO products (name, description, category, image, price, stock)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, category, image, price, stock]
    );

    return res.status(201).json({ product: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { name, description, category, image, price, stock } = req.body;
    const result = await pool.query(
      `UPDATE products
       SET name = $1, description = $2, category = $3, image = $4, price = $5, stock = $6
       WHERE id = $7
       RETURNING *`,
      [name, description, category, image, price, stock, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json({ product: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
