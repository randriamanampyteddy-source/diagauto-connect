const db = require('../config/db');

// Créer un rendez-vous (client)
exports.creerRdv = async (req, res) => {
  try {
    const { vehicule_id, date_rdv, heure_rdv, motif } = req.body;
    await db.query(
      'INSERT INTO rendezvous (client_id, vehicule_id, date_rdv, heure_rdv, motif) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, vehicule_id, date_rdv, heure_rdv, motif]
    );
    res.status(201).json({ message: 'Rendez-vous demandé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
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

// Changer statut rendez-vous (admin)
exports.changerStatutRdv = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, notes_admin } = req.body;
    await db.query('UPDATE rendezvous SET statut = ?, notes_admin = ? WHERE id = ?', [statut, notes_admin, id]);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
