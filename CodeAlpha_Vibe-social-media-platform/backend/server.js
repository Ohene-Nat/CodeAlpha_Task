// ============================================================
// Vibe API — Server Entry Point
// ============================================================
require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Verify the database connection before accepting traffic
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL database.');

    app.listen(PORT, () => {
      console.log(`🚀 Vibe API server running on http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('   Check your .env database credentials and that PostgreSQL is running.');
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
