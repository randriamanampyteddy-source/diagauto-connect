const db = require('../config/db');
const { envoyerWhatsAppClient } = require('../services/whatsappService');

const MAX_PAR_JOUR = 2;
let messagesTableReady = false;

const addDays = (date, days) => {
  const d = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const getCountForDate = async (executor, date, excludeId = null) => {
  const params = [String(date).slice(0, 10)];
  let exclude = '';
  if (excludeId) {
    exclude = ' AND id <> ?';
    params.push(excludeId);
  }
  const [[row]] = await executor.query(
    `SELECT COUNT(*) AS total FROM rendezvous
     WHERE date_rdv = ? AND statut <> 'annule'${exclude}`,
    params
  );
  return Number(row.total) || 0;
};

const findNextAvailableDate = async (executor, startDate, excludeId = null) => {
  for (let i = 1; i <= 90; i += 1) {
    const candidate = addDays(startDate, i);
    if (await getCountForDate(executor, candidate, excludeId) < MAX_PAR_JOUR) return candidate;
  }
  return null;
};

const dateIsPast = (date) => String(date).slice(0, 10) < new Date().toISOString().slice(0, 10);

const formatDate = (date) => new Date(`${String(date).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR');

const statusLabels = {
  en_attente: 'En attente',
  confirme: 'Confirme',
  annule: 'Annule',
  termine: 'Termine',
};

const ensureMessagesTable = async () => {
  if (messagesTableReady) return;
  if (db.type === 'postgres') {
    await db.query(
      `CREATE TABLE IF NOT EXISTS rendezvous_messages (
        id SERIAL PRIMARY KEY,
        rendezvous_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        expediteur VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        lu_client BOOLEAN DEFAULT FALSE,
        lu_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  } else {
    await db.query(
      `CREATE TABLE IF NOT EXISTS rendezvous_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rendezvous_id INT NOT NULL,
        client_id INT NOT NULL,
        expediteur VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        lu_client BOOLEAN DEFAULT FALSE,
        lu_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  }
  messagesTableReady = true;
};

const ajouterMessageRdv = async ({ rendezvousId, clientId, expediteur, message }) => {
  await ensureMessagesTable();
  await db.query(
    `INSERT INTO rendezvous_messages
     (rendezvous_id, client_id, expediteur, message, lu_client, lu_admin)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      rendezvousId,
      clientId,
      expediteur,
      message,
      expediteur === 'client',
      expediteur !== 'client',
    ]
  );
};

const getMessageWhatsAppRdv = (rdv) => {
  const note = rdv.notes_admin ? `\nMessage admin : ${rdv.notes_admin}` : '';
  const motif = rdv.motif ? `\nMotif : ${rdv.motif}` : '';
  return `DiagAuto Mada\nRendez-vous atelier.\nClient : ${rdv.prenom || ''} ${rdv.nom || ''}\nDate : ${formatDate(rdv.date_rdv)}\nHeure : ${String(rdv.heure_rdv).slice(0, 5)}\nVehicule : ${rdv.marque} ${rdv.modele} (${rdv.immatriculation})\nStatut : ${statusLabels[rdv.statut] || rdv.statut}${motif}${note}`;
};

exports.creerRdvAdmin = async (req, res) => {
  const conn = await db.getConnection();
  let dateLock = null;
  try {
    const { client_id, vehicule_id, date_rdv, heure_rdv, motif, notes_admin } = req.body;
    if (!client_id || !vehicule_id || !date_rdv || !heure_rdv) {
      return res.status(400).json({ message: 'Client, vehicule, date et heure obligatoires' });
    }
    if (dateIsPast(date_rdv)) return res.status(400).json({ message: 'Date rendez-vous invalide' });

    const [[vehicule]] = await conn.query(
      'SELECT id, marque, modele, immatriculation FROM vehicules WHERE id = ? AND client_id = ?',
      [vehicule_id, client_id]
    );
    if (!vehicule) return res.status(404).json({ message: 'Vehicule introuvable pour ce client' });

    await conn.beginTransaction();
    dateLock = `diagauto-rdv-${String(date_rdv).slice(0, 10)}`;
    const [[lock]] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [dateLock]);
    if (!lock.acquired) {
      await conn.rollback();
      return res.status(409).json({ message: 'Date en cours de reservation. Reessayez.' });
    }

    const count = await getCountForDate(conn, date_rdv);
    if (count >= MAX_PAR_JOUR) {
      const suggested_date = await findNextAvailableDate(conn, date_rdv);
      await conn.rollback();
      return res.status(409).json({
        message: 'Cette date est complete. Maximum 2 rendez-vous par jour.',
        suggested_date,
      });
    }

    const [result] = await conn.query(
      `INSERT INTO rendezvous
       (client_id, vehicule_id, date_rdv, heure_rdv, motif, statut, notes_admin)
       VALUES (?, ?, ?, ?, ?, 'confirme', ?)`,
      [client_id, vehicule_id, date_rdv, heure_rdv, motif || null, notes_admin || null]
    );
    await conn.commit();

    await ajouterMessageRdv({
      rendezvousId: result.insertId,
      clientId: client_id,
      expediteur: 'admin',
      message: `Votre rendez-vous est confirme.\nDate : ${formatDate(date_rdv)}\nHeure : ${String(heure_rdv).slice(0, 5)}\nVehicule : ${vehicule.marque} ${vehicule.modele} (${vehicule.immatriculation})${notes_admin ? `\nNote : ${notes_admin}` : ''}`,
    });

    res.status(201).json({ message: 'Rendez-vous cree et confirme', id: result.insertId });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    if (dateLock) {
      try { await conn.query('SELECT RELEASE_LOCK(?)', [dateLock]); } catch {}
    }
    conn.release();
  }
};

exports.creerRdv = async (req, res) => {
  const conn = await db.getConnection();
  let dateLock = null;
  try {
    const { vehicule_id, date_rdv, heure_rdv, motif } = req.body;
    if (!vehicule_id || !date_rdv || !heure_rdv) {
      return res.status(400).json({ message: 'Vehicule, date et heure obligatoires' });
    }
    if (dateIsPast(date_rdv)) return res.status(400).json({ message: 'Date rendez-vous invalide' });

    const [[vehicule]] = await conn.query(
      'SELECT id FROM vehicules WHERE id = ? AND client_id = ?',
      [vehicule_id, req.user.id]
    );
    if (!vehicule) return res.status(404).json({ message: 'Vehicule introuvable' });

    await conn.beginTransaction();
    dateLock = `diagauto-rdv-${String(date_rdv).slice(0, 10)}`;
    const [[lock]] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [dateLock]);
    if (!lock.acquired) {
      await conn.rollback();
      return res.status(409).json({ message: 'Date en cours de reservation. Veuillez reessayer.' });
    }

    const count = await getCountForDate(conn, date_rdv);
    if (count >= MAX_PAR_JOUR) {
      const suggested_date = await findNextAvailableDate(conn, date_rdv);
      await conn.rollback();
      return res.status(409).json({
        message: 'Cette date est complete. Maximum 2 rendez-vous par jour.',
        suggested_date,
      });
    }

    await conn.query(
      'INSERT INTO rendezvous (client_id, vehicule_id, date_rdv, heure_rdv, motif) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, vehicule_id, date_rdv, heure_rdv, motif]
    );
    await conn.commit();
    res.status(201).json({ message: 'Rendez-vous demande avec succes' });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    if (dateLock) {
      try { await conn.query('SELECT RELEASE_LOCK(?)', [dateLock]); } catch {}
    }
    conn.release();
  }
};

exports.getMesRdv = async (req, res) => {
  try {
    await ensureMessagesTable();
    const [rows] = await db.query(
      `SELECT r.*, v.marque, v.modele, v.immatriculation,
              (
                SELECT COUNT(*) FROM rendezvous_messages rm
                WHERE rm.rendezvous_id = r.id
                  AND rm.client_id = r.client_id
                  AND rm.expediteur <> 'client'
                  AND rm.lu_client = FALSE
              ) AS unread_count
       FROM rendezvous r JOIN vehicules v ON r.vehicule_id = v.id
       WHERE r.client_id = ? ORDER BY r.date_rdv DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getAllRdv = async (req, res) => {
  try {
    await ensureMessagesTable();
    const [rows] = await db.query(
      `SELECT r.*, c.nom, c.prenom, c.id_client, v.marque, v.modele, v.immatriculation,
              (
                SELECT COUNT(*) FROM rendezvous_messages rm
                WHERE rm.rendezvous_id = r.id
                  AND rm.expediteur = 'client'
                  AND rm.lu_admin = FALSE
              ) AS unread_count
       FROM rendezvous r
       JOIN clients c ON r.client_id = c.id
       JOIN vehicules v ON r.vehicule_id = v.id
       ORDER BY r.date_rdv DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getTousRdvActifs = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.date_rdv, r.heure_rdv, r.statut, v.immatriculation
       FROM rendezvous r JOIN vehicules v ON r.vehicule_id = v.id
       WHERE r.statut != 'annule'
       ORDER BY r.date_rdv ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.annulerMonRdv = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `UPDATE rendezvous SET statut = 'annule'
       WHERE id = ? AND client_id = ? AND statut IN ('en_attente', 'confirme')`,
      [id, req.user.id]
    );
    if (!result.affectedRows) return res.status(400).json({ message: 'Rendez-vous non annulable' });
    res.json({ message: 'Rendez-vous annule' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.reporterMonRdv = async (req, res) => {
  const conn = await db.getConnection();
  let dateLock = null;
  try {
    const { id } = req.params;
    const { date_rdv, heure_rdv } = req.body;
    if (!date_rdv || !heure_rdv || dateIsPast(date_rdv)) {
      return res.status(400).json({ message: 'Nouvelle date ou heure invalide' });
    }
    const [[rdv]] = await conn.query(
      `SELECT id FROM rendezvous
       WHERE id = ? AND client_id = ? AND statut IN ('en_attente', 'confirme')`,
      [id, req.user.id]
    );
    if (!rdv) return res.status(400).json({ message: 'Rendez-vous non reportable' });

    await conn.beginTransaction();
    dateLock = `diagauto-rdv-${String(date_rdv).slice(0, 10)}`;
    const [[lock]] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [dateLock]);
    if (!lock.acquired) {
      await conn.rollback();
      return res.status(409).json({ message: 'Date en cours de reservation. Veuillez reessayer.' });
    }

    const count = await getCountForDate(conn, date_rdv, id);
    if (count >= MAX_PAR_JOUR) {
      const suggested_date = await findNextAvailableDate(conn, date_rdv, id);
      await conn.rollback();
      return res.status(409).json({
        message: 'Cette date est complete. Choisissez une autre date.',
        suggested_date,
      });
    }

    await conn.query(
      `UPDATE rendezvous
       SET date_rdv = ?, heure_rdv = ?, statut = 'en_attente'
       WHERE id = ? AND client_id = ?`,
      [date_rdv, heure_rdv, id, req.user.id]
    );
    await conn.commit();
    res.json({ message: 'Rendez-vous reporte' });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    if (dateLock) {
      try { await conn.query('SELECT RELEASE_LOCK(?)', [dateLock]); } catch {}
    }
    conn.release();
  }
};

exports.changerStatutRdv = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, notes_admin } = req.body;
    const [[rdv]] = await db.query(
      `SELECT r.client_id, r.date_rdv, r.heure_rdv, r.statut, v.marque, v.modele, v.immatriculation
       FROM rendezvous r JOIN vehicules v ON r.vehicule_id = v.id
       WHERE r.id = ?`,
      [id]
    );
    if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });
    if (statut === 'confirme' && dateIsPast(rdv.date_rdv)) {
      return res.status(400).json({ message: 'Date rendez-vous invalide: impossible de confirmer une date passee' });
    }

    await db.query('UPDATE rendezvous SET statut = ?, notes_admin = ? WHERE id = ?', [statut, notes_admin, id]);

    if (statut !== rdv.statut || notes_admin) {
      await ajouterMessageRdv({
        rendezvousId: id,
        clientId: rdv.client_id,
        expediteur: 'admin',
        message: `Mise a jour rendez-vous.\nStatut : ${statusLabels[statut] || statut}\nDate : ${formatDate(rdv.date_rdv)}\nHeure : ${String(rdv.heure_rdv).slice(0, 5)}\nVehicule : ${rdv.marque} ${rdv.modele} (${rdv.immatriculation})${notes_admin ? `\nMessage admin : ${notes_admin}` : ''}`,
      });
    }

    res.json({ message: 'Statut mis a jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.envoyerRdvWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const [[rdv]] = await db.query(
      `SELECT r.client_id, r.date_rdv, r.heure_rdv, r.motif, r.statut, r.notes_admin,
              c.nom, c.prenom, v.marque, v.modele, v.immatriculation
       FROM rendezvous r
       JOIN clients c ON r.client_id = c.id
       JOIN vehicules v ON r.vehicule_id = v.id
       WHERE r.id = ?`,
      [id]
    );
    if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });

    const whatsapp = await envoyerWhatsAppClient({
      clientId: rdv.client_id,
      type: 'rendezvous_envoi',
      message: getMessageWhatsAppRdv(rdv),
    });
    res.json({ message: 'Rendez-vous pret a envoyer', whatsapp });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMessagesRdvClient = async (req, res) => {
  try {
    await ensureMessagesTable();
    const { id } = req.params;
    const [[rdv]] = await db.query('SELECT id FROM rendezvous WHERE id = ? AND client_id = ?', [id, req.user.id]);
    if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });
    await db.query(
      "UPDATE rendezvous_messages SET lu_client = TRUE WHERE rendezvous_id = ? AND client_id = ? AND expediteur <> 'client'",
      [id, req.user.id]
    );
    const [rows] = await db.query(
      'SELECT * FROM rendezvous_messages WHERE rendezvous_id = ? AND client_id = ? ORDER BY created_at ASC, id ASC',
      [id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.envoyerMessageRdvClient = async (req, res) => {
  try {
    const { id } = req.params;
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Message obligatoire' });
    const [[rdv]] = await db.query('SELECT id FROM rendezvous WHERE id = ? AND client_id = ?', [id, req.user.id]);
    if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });
    await ajouterMessageRdv({ rendezvousId: id, clientId: req.user.id, expediteur: 'client', message });
    res.status(201).json({ message: 'Message envoye' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMessagesRdvAdmin = async (req, res) => {
  try {
    await ensureMessagesTable();
    const { id } = req.params;
    const [[rdv]] = await db.query('SELECT client_id FROM rendezvous WHERE id = ?', [id]);
    if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });
    await db.query('UPDATE rendezvous_messages SET lu_admin = TRUE WHERE rendezvous_id = ? AND expediteur = ?', [id, 'client']);
    const [rows] = await db.query(
      'SELECT * FROM rendezvous_messages WHERE rendezvous_id = ? ORDER BY created_at ASC, id ASC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.envoyerMessageRdvAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Message obligatoire' });
    const [[rdv]] = await db.query('SELECT client_id FROM rendezvous WHERE id = ?', [id]);
    if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });
    await ajouterMessageRdv({ rendezvousId: id, clientId: rdv.client_id, expediteur: 'admin', message });
    res.status(201).json({ message: 'Message envoye' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMesRdvNotificationsStats = async (req, res) => {
  try {
    await ensureMessagesTable();
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS non_lues, MAX(id) AS notification_version, MAX(created_at) AS derniere_notification
       FROM rendezvous_messages
       WHERE client_id = ? AND lu_client = FALSE AND expediteur <> 'client'`,
      [req.user.id]
    );
    res.json({
      non_lues: Number(row.non_lues) || 0,
      notification_version: Number(row.notification_version) || 0,
      derniere_notification: row.derniere_notification || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.lireMesRdvNotifications = async (req, res) => {
  try {
    await ensureMessagesTable();
    await db.query(
      "UPDATE rendezvous_messages SET lu_client = TRUE WHERE client_id = ? AND expediteur <> 'client'",
      [req.user.id]
    );
    res.json({ message: 'Notifications lues' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getRdvNotificationsStatsAdmin = async (req, res) => {
  try {
    await ensureMessagesTable();
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS non_lues, MAX(id) AS notification_version, MAX(created_at) AS derniere_notification
       FROM rendezvous_messages
       WHERE expediteur = 'client' AND lu_admin = FALSE`
    );
    res.json({
      non_lues: Number(row.non_lues) || 0,
      notification_version: Number(row.notification_version) || 0,
      derniere_notification: row.derniere_notification || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
