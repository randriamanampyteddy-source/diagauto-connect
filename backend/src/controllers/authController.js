const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateClientId = () => {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `CLI-${num}`;
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
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// CLIENT INSCRIPTION
exports.clientRegister = async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone, adresse } = req.body;
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
      'INSERT INTO clients (id_client, nom, prenom, email, password, telephone, adresse) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id_client, nom, prenom, email, hashed, telephone, adresse]
    );
    res.status(201).json({ message: 'Inscription réussie. En attente de validation admin.', id_client });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// CLIENT LOGIN
exports.clientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM clients WHERE email = ?', [email]);
    if (!rows.length) return res.status(404).json({ message: 'Client introuvable' });

    const client = rows[0];
    if (client.statut === 'en_attente')
      return res.status(403).json({ message: 'Compte en attente de validation' });
    if (client.statut === 'suspendu')
      return res.status(403).json({ message: 'Compte suspendu' });

    const valid = await bcrypt.compare(password, client.password);
    if (!valid) return res.status(401).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { id: client.id, role: 'client', email: client.email, id_client: client.id_client },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({
      token,
      user: { id: client.id, id_client: client.id_client, nom: client.nom, prenom: client.prenom, email: client.email, role: 'client' }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
