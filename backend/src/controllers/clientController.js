const db = require('../config/db');

exports.getAllClients = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, id_client, nom, prenom, email, telephone, adresse, statut, created_at FROM clients ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.validerClient = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE clients SET statut = 'actif' WHERE id = ?", [id]);
    res.json({ message: 'Client validé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.suspendreClient = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE clients SET statut = 'suspendu' WHERE id = ?", [id]);
    res.json({ message: 'Client suspendu' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.resetPasswordClient = async (req, res) => {
  try {
    const { id } = req.params;
    const bcrypt = require('bcryptjs');
    // Génère un mot de passe temporaire : 8 caractères
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPwd = '';
    for (let i = 0; i < 8; i++) tempPwd += chars[Math.floor(Math.random() * chars.length)];
    const hashed = await bcrypt.hash(tempPwd, 10);
    await db.query('UPDATE clients SET password = ? WHERE id = ?', [hashed, id]);
    res.json({ message: 'Mot de passe réinitialisé', temp_password: tempPwd });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getVehiculesClient = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM vehicules WHERE client_id = ? ORDER BY created_at DESC', [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMonProfil = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, id_client, nom, prenom, email, telephone, adresse, statut, created_at FROM clients WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Client introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMesVehicules = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vehicules WHERE client_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.ajouterVehicule = async (req, res) => {
  try {
    const { marque, modele, annee, immatriculation, couleur, energie } = req.body;
    await db.query(
      'INSERT INTO vehicules (client_id, marque, modele, annee, immatriculation, couleur, energie) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, marque, modele, annee || null, immatriculation, couleur || null, energie || null]
    );
    res.status(201).json({ message: 'Véhicule ajouté' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
