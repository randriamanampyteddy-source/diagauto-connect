require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');
const routes = require('./src/routes/index');

const app = express();

const parseOrigins = (value) => String(value || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN || '*');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origine CORS non autorisee'));
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const updateDirectories = [
  process.env.DIAGAUTO_UPDATE_DIR,
  'D:\\APK\\DiagAutoConnect\\releases',
  process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, 'Desktop', 'DiagAuto Mada - Version installable')
    : null,
].filter(Boolean);
const updateDirectory = updateDirectories.find(directory => fs.existsSync(directory));
if (updateDirectory) {
  app.use('/updates', express.static(updateDirectory, { index: false, dotfiles: 'deny' }));
}

app.use('/api', routes);

app.get('/', (req, res) => res.json({ message: 'DiagAuto Connect API is running' }));

const PORT = process.env.PORT || 5000;

const ensureSchema = async () => {
  const [[column]] = db.type === 'postgres'
    ? await db.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'urgences_depannage'
         AND column_name = 'client_notification_version'`
    )
    : await db.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'urgences_depannage'
         AND COLUMN_NAME = 'client_notification_version'`
    );
  if (!Number(column.total)) {
    const after = db.type === 'postgres' ? '' : ' AFTER client_notification_non_lue';
    await db.query(`ALTER TABLE urgences_depannage ADD COLUMN client_notification_version INT NOT NULL DEFAULT 0${after}`);
  }
};

ensureSchema()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((error) => {
    console.error('Database schema initialization failed:', error.message);
    process.exit(1);
  });
