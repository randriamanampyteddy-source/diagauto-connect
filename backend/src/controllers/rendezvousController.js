const db = require('../config/db');
const { envoyerWhatsAppClient } = require('../services/whatsappService');
const MAX_PAR_JOUR = 2;

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
  for (let i = 1; i <= 90; i++) {
    const candidate = addDays(startDate, i);
    if (await getCountForDate(executor, candidate, excludeId) < MAX_PAR_JOUR) return candidate;
  }
  return null;
};

const dateIsPast = (date) => String(date).slice(0, 10) < new Date().toISOString().slice(0, 10);

// Créer un rendez-vous (client)
exports.creerRdvAdmin = async (req, res) => {
  const conn = await db.getConnection();
  let dateLock = null;
  try {
    const { client_id, vehicule_id, date_rdv, heure_rdv, motif, notes_admin } = req.body;
    if (!client_id || !vehicule_id || !date_rdv || !heure_rdv) {
      return res.status(400).json({ message: 'Client, véhicule, date et heure obligatoires' });
    }
    if (dateIsPast(date_rdv)) return res.status(400).json({ message: 'Date rendez-vous invalide' });

    const [[vehicule]] = await conn.query(
      'SELECT id, marque, modele, immatriculation FROM vehicules WHERE id = ? AND client_id = ?',
      [vehicule_id, client_id]
    );
    if (!vehicule) return res.status(404).json({ message: 'Véhicule introuvable pour ce client' });

    await conn.beginTransaction();
    dateLock = `diagauto-rdv-${String(date_rdv).slice(0, 10)}`;
    const [[lock]] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [dateLock]);
    if (!lock.acquired) {
      await conn.rollback();
      return res.status(409).json({ message: 'Date en cours de réservation. Réessayez.' });
    }
    const count = await getCountForDate(conn, date_rdv);
    if (count >= MAX_PAR_JOUR) {
      const suggested_date = await findNextAvailableDate(conn, date_rdv);
      await conn.rollback();
      return res.status(409).json({
        message: 'Cette date est complète. Maximum 2 rendez-vous par jour.',
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
    const date = new Date(`${String(date_rdv).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR');
    const whatsapp = await envoyerWhatsAppClient({
      clientId: client_id,
      type: 'rendezvous_confirme',
      message: `DiagAuto Mada\nVotre rendez-vous est confirmé.\nDate : ${date}\nHeure : ${String(heure_rdv).slice(0, 5)}\nVéhicule : ${vehicule.marque} ${vehicule.modele} (${vehicule.immatriculation})${notes_admin ? `\nNote : ${notes_admin}` : ''}`,
    });
    res.status(201).json({ message: 'Rendez-vous créé et confirmé', id: result.insertId, whatsapp });
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
      return res.status(400).json({ message: 'Véhicule, date et heure obligatoires' });
    }
    if (dateIsPast(date_rdv)) return res.status(400).json({ message: 'Date rendez-vous invalide' });

    const [[vehicule]] = await conn.query(
      'SELECT id FROM vehicules WHERE id = ? AND client_id = ?',
      [vehicule_id, req.user.id]
    );
    if (!vehicule) return res.status(404).json({ message: 'Véhicule introuvable' });

    await conn.beginTransaction();
    dateLock = `diagauto-rdv-${String(date_rdv).slice(0, 10)}`;
    const [[lock]] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [dateLock]);
    if (!lock.acquired) {
      await conn.rollback();
      return res.status(409).json({ message: 'Date en cours de réservation. Veuillez réessayer.' });
    }
    const count = await getCountForDate(conn, date_rdv);
    if (count >= MAX_PAR_JOUR) {
      const suggested_date = await findNextAvailableDate(conn, date_rdv);
      await conn.rollback();
      return res.status(409).json({
        message: 'Cette date est complète. Maximum 2 rendez-vous par jour.',
        suggested_date,
      });
    }
    await conn.query(
      'INSERT INTO rendezvous (client_id, vehicule_id, date_rdv, heure_rdv, motif) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, vehicule_id, date_rdv, heure_rdv, motif]
    );
    await conn.commit();
    res.status(201).json({ message: 'Rendez-vous demandé avec succès' });
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

// Mes rendez-vous (client)
exports.getMesRdv = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, v.marque, v.modele, v.immatriculation
       FROM rendezvous r JOIN vehicules v ON r.vehicule_id = v.id
       WHERE r.client_id = ? ORDER BY r.date_rdv DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Tous les rendez-vous (admin)
exports.getAllRdv = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, c.nom, c.prenom, c.id_client, v.marque, v.modele, v.immatriculation
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

// Tous les RDV actifs (dates + immatriculation) — pour le calendrier client
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
    res.json({ message: 'Rendez-vous annulé' });
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
      return res.status(409).json({ message: 'Date en cours de réservation. Veuillez réessayer.' });
    }
    const count = await getCountForDate(conn, date_rdv, id);
    if (count >= MAX_PAR_JOUR) {
      const suggested_date = await findNextAvailableDate(conn, date_rdv, id);
      await conn.rollback();
      return res.status(409).json({
        message: 'Cette date est complète. Choisissez une autre date.',
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
    res.json({ message: 'Rendez-vous reporté' });
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

// Changer statut rendez-vous (admin)
exports.changerStatutRdv = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, notes_admin } = req.body;
    const [[rdv]] = await db.query(
      `SELECT r.client_id, r.date_rdv, r.heure_rdv, v.marque, v.modele, v.immatriculation
       FROM rendezvous r JOIN vehicules v ON r.vehicule_id = v.id
       WHERE r.id = ?`,
      [id]
    );
    if (!rdv) return res.status(404).json({ message: 'Rendez-vous introuvable' });
    await db.query('UPDATE rendezvous SET statut = ?, notes_admin = ? WHERE id = ?', [statut, notes_admin, id]);

    let whatsapp = null;
    if (statut === 'confirme') {
      const date = new Date(`${String(rdv.date_rdv).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR');
      whatsapp = await envoyerWhatsAppClient({
        clientId: rdv.client_id,
        type: 'rendezvous_confirme',
        message: `DiagAuto Mada\nVotre rendez-vous est confirmé.\nDate : ${date}\nHeure : ${String(rdv.heure_rdv).slice(0, 5)}\nVéhicule : ${rdv.marque} ${rdv.modele} (${rdv.immatriculation})${notes_admin ? `\nNote : ${notes_admin}` : ''}`,
      });
    }
    res.json({ message: 'Statut mis à jour', whatsapp });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
