const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const id_client = process.argv[2] || 'CLI-92838';
  const newPwd    = process.argv[3] || 'client123';
  const hash = await bcrypt.hash(newPwd, 10);
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await db.query('UPDATE clients SET password = ? WHERE id_client = ?', [hash, id_client]);
  console.log(`✓ Password reset: ${id_client} / ${newPwd}`);
  await db.end();
})();
