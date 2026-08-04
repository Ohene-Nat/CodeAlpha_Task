require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

async function seedAdmin() {
  const email = 'admin@shopsphere.com';
  const password = 'Admin@123';
  const hashedPassword = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (fullname, username, email, password, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       fullname = EXCLUDED.fullname,
       username = EXCLUDED.username,
       password = EXCLUDED.password,
       role = EXCLUDED.role`,
    ['Shop Admin', 'admin', email, hashedPassword, 'admin']
  );

  console.log('Admin account ready.');
  console.log('Email: admin@shopsphere.com');
  console.log('Password: Admin@123');
  await pool.end();
}

seedAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
