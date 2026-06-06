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

const clientApkPath = path.join(__dirname, 'public', 'downloads', 'DiagAuto-Client.apk');
app.get('/download/client.apk', (req, res) => {
  if (!fs.existsSync(clientApkPath)) {
    res.status(404).send('APK client introuvable');
    return;
  }
  res.download(clientApkPath, 'DiagAuto-Client.apk');
});

app.get('/download/client', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DiagAuto Client - Installation</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f6fa;color:#102033;font-family:Arial,sans-serif;padding:24px}
    main{width:min(460px,100%);background:white;border:1px solid #dde4ef;border-radius:12px;padding:24px;box-shadow:0 16px 45px rgba(16,32,51,.12)}
    .logo{width:64px;height:64px;border-radius:50%;background:#183f6c;color:white;display:grid;place-items:center;font-weight:800;margin:0 auto 14px}
    h1{text-align:center;margin:0 0 8px;font-size:24px}
    p{color:#667085;line-height:1.45}
    a{display:block;text-align:center;background:#183f6c;color:white;text-decoration:none;font-weight:800;border-radius:10px;padding:14px 16px;margin:18px 0}
    small{display:block;color:#667085;text-align:center}
  </style>
</head>
<body>
  <main>
    <div class="logo">DA</div>
    <h1>DiagAuto Client</h1>
    <p>Appuyez sur le bouton ci-dessous pour telecharger l'application client DiagAuto Mada.</p>
    <a href="/download/client.apk">Telecharger l'APK</a>
    <small>Sur Android, autorisez l'installation depuis le navigateur si le telephone le demande.</small>
  </main>
</body>
</html>`);
});

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
