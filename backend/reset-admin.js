const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await db.query('UPDATE admins SET password = ? WHERE email = ?', [hash, 'admin@diagauto.mg']);
  console.log('✓ Password reset: admin@diagauto.mg / admin123');
  await db.end();
})();
