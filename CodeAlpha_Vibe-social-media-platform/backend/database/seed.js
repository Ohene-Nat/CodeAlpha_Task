// ============================================================
// Database Setup Script — runs schema.sql then seed.sql
// Usage: npm run seed
// ============================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vibe_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('📦 Applying schema.sql ...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema applied.');

    console.log('🌱 Applying seed.sql ...');
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seed);
    console.log('✅ Seed data inserted.');

    console.log('\nDone! Sample login: nathan@vibe.com / Password123!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
