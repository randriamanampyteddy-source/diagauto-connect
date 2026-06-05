const db = require('../config/db');
const { envoyerWhatsAppClient } = require('../services/whatsappService');

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

exports.creerUrgence = async (req, res) => {
  try {
    const { telephone, latitude, longitude, precision, zone, message } = req.body;
    if (!telephone || !String(telephone).trim()) {
      return res.status(400).json({ message: 'Numéro téléphone obligatoire' });
    }

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
      `INSERT INTO urgences_depannage (client_id, telephone, localisation, zone, message)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, telephone, localisation, zone || 'route_nationale', message]
    );
    res.status(201).json({ message: 'Urgence envoyée', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMesUrgences = async (req, res) => {
  try {
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
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS non_lues, MAX(updated_at) AS derniere_notification,
              SUM(client_notification_version) AS notification_version
       FROM urgences_depannage
       WHERE client_id = ? AND client_notification_non_lue = TRUE`,
      [req.user.id]
    );
    res.json({
      non_lues: Number(row.non_lues) || 0,
      derniere_notification: row.derniere_notification || null,
      notification_version: Number(row.notification_version) || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.lireMesNotifications = async (req, res) => {
  try {
    await db.query(
      'UPDATE urgences_depannage SET client_notification_non_lue = FALSE WHERE client_id = ?',
      [req.user.id]
    );
    res.json({ message: 'Notifications lues' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getAllUrgences = async (req, res) => {
  try {
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

    const [[urgence]] = await db.query(
      'SELECT client_id, statut FROM urgences_depannage WHERE id = ?',
      [id]
    );
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

    let whatsapp = null;
    if (notifierClient) {
      const detail = reponse
        ? `Réponse de l’admin : ${reponse}`
        : `Statut de votre urgence : ${statut.replaceAll('_', ' ')}`;
      whatsapp = await envoyerWhatsAppClient({
        clientId: urgence.client_id,
        type: 'urgence_reponse_admin',
        message: `DiagAuto Mada\nMise à jour de votre demande de dépannage urgence.\n${detail}\nOuvrez l’application Client pour voir le détail.`,
      });
    }
    res.json({ message: 'Urgence mise à jour', whatsapp });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
