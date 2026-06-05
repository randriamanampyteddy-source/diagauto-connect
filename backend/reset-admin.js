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

  await db.query(
    `INSERT INTO admins (nom, prenom, email, password, telephone)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       password = VALUES(password),
       nom = VALUES(nom),
       prenom = VALUES(prenom),
       telephone = VALUES(telephone)`,
    ['Admin', 'DiagAuto', 'admin@diagauto.mg', hash, '+261 34 00 000 00']
  );

  const [rows] = await db.query('SELECT id, email FROM admins WHERE email = ?', ['admin@diagauto.mg']);
  console.log('Admin rows:', rows);
  console.log('Password reset: admin@diagauto.mg / admin123');

  await db.end();
})();
