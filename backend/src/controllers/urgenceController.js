const db = require('../config/db');

let urgenceMessagesReady = false;
let urgenceColumnsReady = false;

const ensureUrgenceColumns = async () => {
  if (urgenceColumnsReady) return;
  const statements = db.type === 'postgres'
    ? [
        'ALTER TABLE urgences_depannage ADD COLUMN IF NOT EXISTS numero_vehicule VARCHAR(100)',
      ]
    : [
        'ALTER TABLE urgences_depannage ADD COLUMN IF NOT EXISTS numero_vehicule VARCHAR(100) NULL',
        "ALTER TABLE urgences_depannage MODIFY zone ENUM('route_nationale', 'province', 'antananarivo', 'hors_antananarivo', 'autre') DEFAULT 'route_nationale'",
      ];
  for (const sql of statements) {
    try {
      await db.query(sql);
    } catch (err) {
      if (!/duplicate|exists|syntax/i.test(String(err.message))) throw err;
    }
  }
  urgenceColumnsReady = true;
};

const parseLocalisation = (value) => {
  try {
    const parsed = JSON.parse(value);
    const latitude = Number(parsed.latitude);
    const longitude = Number(parsed.longitude);
    const precision = Number(parsed.precision);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      latitude,
      longitude,
      precision: Number.isFinite(precision) ? precision : null,
      carte_url: `https://www.google.com/maps?q=${latitude},${longitude}`,
    };
  } catch {
    return null;
  }
};

const enrichirUrgence = (urgence) => ({
  ...urgence,
  gps: parseLocalisation(urgence.localisation),
});

const ensureUrgenceMessagesTable = async () => {
  if (urgenceMessagesReady) return;

  if (db.type === 'postgres') {
    await db.query(
      `CREATE TABLE IF NOT EXISTS urgence_messages (
        id SERIAL PRIMARY KEY,
        urgence_id INT NOT NULL REFERENCES urgences_depannage(id) ON DELETE CASCADE,
        client_id INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        expediteur VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        lu_client BOOLEAN DEFAULT FALSE,
        lu_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  } else {
    await db.query(
      `CREATE TABLE IF NOT EXISTS urgence_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        urgence_id INT NOT NULL,
        client_id INT NOT NULL,
        expediteur VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        lu_client BOOLEAN DEFAULT FALSE,
        lu_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (urgence_id) REFERENCES urgences_depannage(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )`
    );
  }

  urgenceMessagesReady = true;
};

const getUrgenceForClient = async (id, clientId) => {
  const [[urgence]] = await db.query(
    'SELECT * FROM urgences_depannage WHERE id = ? AND client_id = ?',
    [id, clientId]
  );
  return urgence;
};

const getUrgenceForAdmin = async (id) => {
  const [[urgence]] = await db.query(
    'SELECT * FROM urgences_depannage WHERE id = ?',
    [id]
  );
  return urgence;
};

const ajouterMessageUrgence = async ({ urgenceId, clientId, expediteur, message }) => {
  await ensureUrgenceMessagesTable();
  await db.query(
    `INSERT INTO urgence_messages
     (urgence_id, client_id, expediteur, message, lu_client, lu_admin)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      urgenceId,
      clientId,
      expediteur,
      message,
      expediteur === 'client',
      expediteur === 'admin',
    ]
  );
};

exports.creerUrgence = async (req, res) => {
  try {
    await ensureUrgenceColumns();
    const { telephone, numero_vehicule, latitude, longitude, precision, zone, message } = req.body;
    if (!telephone || !String(telephone).trim()) {
      return res.status(400).json({ message: 'Numero telephone obligatoire' });
    }
    if (!numero_vehicule || !String(numero_vehicule).trim()) {
      return res.status(400).json({ message: 'Numero du vehicule obligatoire' });
    }
    const allowedZones = ['route_nationale', 'province', 'antananarivo', 'hors_antananarivo'];
    const zoneValue = allowedZones.includes(zone) ? zone : 'route_nationale';

    const lat = Number(latitude);
    const lng = Number(longitude);
    const accuracy = Number(precision);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Localisation GPS exacte obligatoire' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Message obligatoire' });
    }

    const localisation = JSON.stringify({
      latitude: lat,
      longitude: lng,
      precision: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    });
    const [result] = await db.query(
      `INSERT INTO urgences_depannage (client_id, telephone, numero_vehicule, localisation, zone, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, telephone, numero_vehicule, localisation, zoneValue, message]
    );
    res.status(201).json({ message: 'Urgence envoyee', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMesUrgences = async (req, res) => {
  try {
    await ensureUrgenceColumns();
    const [rows] = await db.query(
      `SELECT * FROM urgences_depannage
       WHERE client_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json(rows.map(enrichirUrgence));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMesNotificationsStats = async (req, res) => {
  try {
    await ensureUrgenceMessagesTable();
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS non_lues, MAX(updated_at) AS derniere_notification,
              SUM(client_notification_version) AS notification_version
       FROM urgences_depannage
       WHERE client_id = ? AND client_notification_non_lue = TRUE`,
      [req.user.id]
    );
    const [[messages]] = await db.query(
      `SELECT COUNT(*) AS messages_non_lus, MAX(created_at) AS derniere_message
       FROM urgence_messages
       WHERE client_id = ? AND expediteur = 'admin' AND lu_client = FALSE`,
      [req.user.id]
    );
    res.json({
      non_lues: Number(row.non_lues) || Number(messages.messages_non_lus) || 0,
      derniere_notification: messages.derniere_message || row.derniere_notification || null,
      notification_version: Number(row.notification_version) || Number(messages.messages_non_lus) || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.lireMesNotifications = async (req, res) => {
  try {
    await ensureUrgenceMessagesTable();
    await db.query(
      'UPDATE urgences_depannage SET client_notification_non_lue = FALSE WHERE client_id = ?',
      [req.user.id]
    );
    await db.query(
      'UPDATE urgence_messages SET lu_client = TRUE WHERE client_id = ?',
      [req.user.id]
    );
    res.json({ message: 'Notifications lues' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getAllUrgences = async (req, res) => {
  try {
    await ensureUrgenceColumns();
    const [rows] = await db.query(
      `SELECT u.*, c.id_client, c.nom, c.prenom, c.email, c.telephone AS client_telephone
       FROM urgences_depannage u
       JOIN clients c ON u.client_id = c.id
       ORDER BY FIELD(u.statut, 'nouveau', 'vu', 'en_cours', 'traite', 'annule'), u.created_at DESC`
    );
    res.json(rows.map(enrichirUrgence));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getUrgenceStats = async (req, res) => {
  try {
    const [[row]] = await db.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN statut = 'nouveau' THEN 1 ELSE 0 END) AS nouvelles,
        SUM(CASE WHEN statut IN ('nouveau','vu','en_cours') THEN 1 ELSE 0 END) AS actives
       FROM urgences_depannage`
    );
    res.json({
      total: Number(row.total) || 0,
      nouvelles: Number(row.nouvelles) || 0,
      actives: Number(row.actives) || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.repondreUrgence = async (req, res) => {
  try {
    const { id } = req.params;
    const { reponse_admin, statut } = req.body;
    const allowed = ['vu', 'en_cours', 'traite', 'annule'];
    if (statut && !allowed.includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const urgence = await getUrgenceForAdmin(id);
    if (!urgence) return res.status(404).json({ message: 'Urgence introuvable' });

    const reponse = reponse_admin && String(reponse_admin).trim();
    const notifierClient = Boolean(reponse) || Boolean(statut && statut !== urgence.statut);
    await db.query(
      `UPDATE urgences_depannage
       SET reponse_admin = COALESCE(?, reponse_admin),
           statut = COALESCE(?, statut),
           client_notification_non_lue = IF(?, TRUE, client_notification_non_lue),
           client_notification_version = client_notification_version + IF(?, 1, 0)
       WHERE id = ?`,
      [reponse || null, statut || null, notifierClient, notifierClient, id]
    );

    if (reponse) {
      await ajouterMessageUrgence({
        urgenceId: id,
        clientId: urgence.client_id,
        expediteur: 'admin',
        message: reponse,
      });
    }

    res.json({ message: 'Urgence mise a jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMessagesUrgenceClient = async (req, res) => {
  try {
    await ensureUrgenceMessagesTable();
    const urgence = await getUrgenceForClient(req.params.id, req.user.id);
    if (!urgence) return res.status(404).json({ message: 'Urgence introuvable' });
    await db.query(
      'UPDATE urgence_messages SET lu_client = TRUE WHERE urgence_id = ? AND client_id = ?',
      [req.params.id, req.user.id]
    );
    await db.query(
      'UPDATE urgences_depannage SET client_notification_non_lue = FALSE WHERE id = ? AND client_id = ?',
      [req.params.id, req.user.id]
    );
    const [rows] = await db.query(
      `SELECT id, expediteur, message, lu_client, lu_admin, created_at
       FROM urgence_messages
       WHERE urgence_id = ? AND client_id = ?
       ORDER BY created_at ASC, id ASC`,
      [req.params.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.envoyerMessageUrgenceClient = async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Message obligatoire' });
    const urgence = await getUrgenceForClient(req.params.id, req.user.id);
    if (!urgence) return res.status(404).json({ message: 'Urgence introuvable' });
    await ajouterMessageUrgence({
      urgenceId: req.params.id,
      clientId: req.user.id,
      expediteur: 'client',
      message,
    });
    if (urgence.statut === 'nouveau') {
      await db.query('UPDATE urgences_depannage SET statut = ? WHERE id = ?', ['vu', req.params.id]);
    }
    res.status(201).json({ message: 'Message envoye' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMessagesUrgenceAdmin = async (req, res) => {
  try {
    await ensureUrgenceMessagesTable();
    const urgence = await getUrgenceForAdmin(req.params.id);
    if (!urgence) return res.status(404).json({ message: 'Urgence introuvable' });
    await db.query(
      'UPDATE urgence_messages SET lu_admin = TRUE WHERE urgence_id = ?',
      [req.params.id]
    );
    const [rows] = await db.query(
      `SELECT id, expediteur, message, lu_client, lu_admin, created_at
       FROM urgence_messages
       WHERE urgence_id = ?
       ORDER BY created_at ASC, id ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.envoyerMessageUrgenceAdmin = async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Message obligatoire' });
    const urgence = await getUrgenceForAdmin(req.params.id);
    if (!urgence) return res.status(404).json({ message: 'Urgence introuvable' });
    await ajouterMessageUrgence({
      urgenceId: req.params.id,
      clientId: urgence.client_id,
      expediteur: 'admin',
      message,
    });
    await db.query(
      `UPDATE urgences_depannage
       SET reponse_admin = ?,
           statut = CASE WHEN statut = 'nouveau' THEN 'en_cours' ELSE statut END,
           client_notification_non_lue = TRUE,
           client_notification_version = client_notification_version + 1
       WHERE id = ?`,
      [message, req.params.id]
    );
    res.status(201).json({ message: 'Message envoye' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
