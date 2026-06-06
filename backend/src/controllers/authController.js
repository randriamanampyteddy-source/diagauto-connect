const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

const getErrorMessage = (err) => err?.message || err?.code || err?.name || String(err) || 'Erreur inconnue';

const generateClientId = () => {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `CLI-${num}`;
};

let clientDevicesReady = false;

const hashDeviceId = (value) => crypto
  .createHash('sha256')
  .update(String(value || '').trim())
  .digest('hex');

const ensureClientDevicesTable = async () => {
  if (clientDevicesReady) return;
  if (db.type === 'postgres') {
    await db.query(
      `CREATE TABLE IF NOT EXISTS client_devices (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        device_hash VARCHAR(128) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  } else {
    await db.query(
      `CREATE TABLE IF NOT EXISTS client_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        device_hash VARCHAR(128) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )`
    );
  }
  clientDevicesReady = true;
};

const enregistrerDeviceClient = async (clientId, deviceId) => {
  await ensureClientDevicesTable();
  const deviceHash = hashDeviceId(deviceId);
  if (!deviceHash) throw new Error('Device ID manquant');

  const [existing] = await db.query(
    'SELECT id FROM client_devices WHERE client_id = ? AND device_hash = ?',
    [clientId, deviceHash]
  );
  if (existing.length) {
    await db.query('UPDATE client_devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [existing[0].id]);
    return deviceHash;
  }

  const [[row]] = await db.query('SELECT COUNT(*) AS total FROM client_devices WHERE client_id = ?', [clientId]);
  if ((Number(row.total) || 0) >= 2) {
    const err = new Error('Limite atteinte: ce compte client est deja active sur 2 telephones.');
    err.statusCode = 403;
    throw err;
  }

  await db.query(
    'INSERT INTO client_devices (client_id, device_hash) VALUES (?, ?)',
    [clientId, deviceHash]
  );
  return deviceHash;
};

// ADMIN LOGIN
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (!rows.length) return res.status(404).json({ message: 'Admin introuvable' });

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { id: admin.id, role: 'admin', email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({
      token,
      user: { id: admin.id, nom: admin.nom, prenom: admin.prenom, email: admin.email, role: 'admin' }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: getErrorMessage(err) });
  }
};

// CLIENT INSCRIPTION
exports.clientRegister = async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone, whatsapp, adresse } = req.body;
    const [exist] = await db.query('SELECT id FROM clients WHERE email = ?', [email]);
    if (exist.length) return res.status(400).json({ message: 'Email déjà utilisé' });

    const hashed = await bcrypt.hash(password, 10);
    let id_client = generateClientId();
    let [check] = await db.query('SELECT id FROM clients WHERE id_client = ?', [id_client]);
    while (check.length) {
      id_client = generateClientId();
      [check] = await db.query('SELECT id FROM clients WHERE id_client = ?', [id_client]);
    }

    await db.query(
      'INSERT INTO clients (id_client, nom, prenom, email, password, telephone, whatsapp, adresse) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id_client, nom, prenom, email, hashed, telephone, whatsapp || null, adresse]
    );
    res.status(201).json({ message: 'Inscription réussie. En attente de validation admin.', id_client });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: getErrorMessage(err) });
  }
};

// ADMIN CHANGER MOT DE PASSE
exports.adminChangerPassword = async (req, res) => {
  try {
    const { ancien_password, nouveau_password } = req.body;
    const [rows] = await db.query('SELECT * FROM admins WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Admin introuvable' });

    const valid = await bcrypt.compare(ancien_password, rows[0].password);
    if (!valid) return res.status(401).json({ message: 'Ancien mot de passe incorrect' });

    const hashed = await bcrypt.hash(nouveau_password, 10);
    await db.query('UPDATE admins SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: getErrorMessage(err) });
  }
};

// ADMIN GET PROFIL
exports.adminGetProfil = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nom, prenom, email, telephone FROM admins WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Admin introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: getErrorMessage(err) });
  }
};

// CLIENT LOGIN (par ID client + password)
exports.clientLogin = async (req, res) => {
  try {
    const { id_client, password, device_id } = req.body;
    if (!device_id || !String(device_id).trim()) {
      return res.status(400).json({ message: 'Identification appareil obligatoire' });
    }
    const [rows] = await db.query('SELECT * FROM clients WHERE id_client = ?', [id_client]);
    if (!rows.length) return res.status(404).json({ message: 'ID Client introuvable' });

    const client = rows[0];
    if (client.statut === 'en_attente')
      return res.status(403).json({ message: 'Compte en attente de validation' });
    if (client.statut === 'suspendu')
      return res.status(403).json({ message: 'Compte suspendu' });

    const valid = await bcrypt.compare(password, client.password);
    if (!valid) return res.status(401).json({ message: 'Mot de passe incorrect' });

    const device_hash = await enregistrerDeviceClient(client.id, device_id);

    const token = jwt.sign(
      { id: client.id, role: 'client', email: client.email, id_client: client.id_client, device_hash },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({
      token,
      user: { id: client.id, id_client: client.id_client, nom: client.nom, prenom: client.prenom, email: client.email, role: 'client' }
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'Erreur serveur', error: getErrorMessage(err) });
  }
};
