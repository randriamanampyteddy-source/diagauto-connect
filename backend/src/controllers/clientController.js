const db = require('../config/db');
const bcrypt = require('bcryptjs');

const generateClientId = () => `CLI-${Math.floor(10000 + Math.random() * 90000)}`;
const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) password += chars[Math.floor(Math.random() * chars.length)];
  return password;
};

exports.creerClientSansApk = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      nom, prenom, email, telephone, whatsapp, adresse,
      marque, modele, annee, immatriculation, couleur,
    } = req.body;
    if (!nom || !String(nom).trim() || !telephone || !String(telephone).trim()) {
      return res.status(400).json({ message: 'Nom et téléphone obligatoires' });
    }
    if (!marque || !modele || !immatriculation) {
      return res.status(400).json({ message: 'Marque, modèle et immatriculation obligatoires' });
    }

    await conn.beginTransaction();
    let idClient = generateClientId();
    let [existingId] = await conn.query('SELECT id FROM clients WHERE id_client = ?', [idClient]);
    while (existingId.length) {
      idClient = generateClientId();
      [existingId] = await conn.query('SELECT id FROM clients WHERE id_client = ?', [idClient]);
    }

    const normalizedEmail = String(email || '').trim().toLowerCase()
      || `sans-apk.${Date.now()}.${Math.floor(Math.random() * 10000)}@diagauto.local`;
    const [existingEmail] = await conn.query('SELECT id FROM clients WHERE email = ?', [normalizedEmail]);
    if (existingEmail.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }
    const [existingVehicle] = await conn.query(
      'SELECT id FROM vehicules WHERE immatriculation = ?',
      [String(immatriculation).trim()]
    );
    if (existingVehicle.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Immatriculation déjà enregistrée' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    const [clientResult] = await conn.query(
      `INSERT INTO clients (id_client, nom, prenom, email, password, telephone, whatsapp, adresse, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'actif')`,
      [
        idClient,
        String(nom).trim(),
        String(prenom || '').trim(),
        normalizedEmail,
        hashedPassword,
        String(telephone).trim(),
        String(whatsapp || '').trim() || null,
        String(adresse || '').trim() || null,
      ]
    );
    const [vehicleResult] = await conn.query(
      `INSERT INTO vehicules (client_id, marque, modele, annee, immatriculation, couleur)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        clientResult.insertId,
        String(marque).trim(),
        String(modele).trim(),
        annee || null,
        String(immatriculation).trim().toUpperCase(),
        String(couleur || '').trim() || null,
      ]
    );
    await conn.commit();
    res.status(201).json({
      message: 'Client sans APK et véhicule créés',
      client: {
        id: clientResult.insertId,
        id_client: idClient,
        nom: String(nom).trim(),
        prenom: String(prenom || '').trim(),
        email: normalizedEmail,
        telephone: String(telephone).trim(),
        statut: 'actif',
      },
      vehicule: {
        id: vehicleResult.insertId,
        client_id: clientResult.insertId,
        marque: String(marque).trim(),
        modele: String(modele).trim(),
        immatriculation: String(immatriculation).trim().toUpperCase(),
      },
      temp_password: temporaryPassword,
    });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, id_client, nom, prenom, email, telephone, whatsapp, adresse, statut, created_at FROM clients ORDER BY created_at DESC');
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
      'SELECT id, id_client, nom, prenom, email, telephone, whatsapp, adresse, statut, created_at FROM clients WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Client introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.updateMonProfil = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, whatsapp, adresse } = req.body;
    if (!nom || !prenom || !email) {
      return res.status(400).json({ message: 'Nom, prénom et email obligatoires' });
    }
    const [exist] = await db.query('SELECT id FROM clients WHERE email = ? AND id <> ?', [email, req.user.id]);
    if (exist.length) return res.status(400).json({ message: 'Email déjà utilisé' });

    await db.query(
      'UPDATE clients SET nom=?, prenom=?, email=?, telephone=?, whatsapp=?, adresse=? WHERE id=?',
      [nom, prenom, email, telephone || null, whatsapp || null, adresse || null, req.user.id]
    );
    res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.changerMonPassword = async (req, res) => {
  try {
    const { ancien_password, nouveau_password } = req.body;
    if (!ancien_password || !nouveau_password || nouveau_password.length < 6) {
      return res.status(400).json({ message: 'Mot de passe invalide' });
    }
    const [rows] = await db.query('SELECT password FROM clients WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Client introuvable' });
    const valid = await bcrypt.compare(ancien_password, rows[0].password);
    if (!valid) return res.status(401).json({ message: 'Ancien mot de passe incorrect' });
    const hashed = await bcrypt.hash(nouveau_password, 10);
    await db.query('UPDATE clients SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Mot de passe modifié' });
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
    const { marque, modele, annee, immatriculation, couleur } = req.body;
    await db.query(
      'INSERT INTO vehicules (client_id, marque, modele, annee, immatriculation, couleur) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, marque, modele, annee || null, immatriculation, couleur || null]
    );
    res.status(201).json({ message: 'Véhicule ajouté' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
