const db = require('../config/db');

exports.getAllInterventions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*, c.nom, c.prenom, c.id_client, v.marque, v.modele, v.immatriculation
       FROM interventions i
       JOIN clients c ON i.client_id = c.id
       JOIN vehicules v ON i.vehicule_id = v.id
       ORDER BY i.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.creerIntervention = async (req, res) => {
  try {
    const { rendezvous_id, client_id, vehicule_id, description, technicien, date_debut } = req.body;
    await db.query(
      'INSERT INTO interventions (rendezvous_id, client_id, vehicule_id, description, technicien, date_debut) VALUES (?, ?, ?, ?, ?, ?)',
      [rendezvous_id || null, client_id, vehicule_id, description, technicien, date_debut]
    );
    res.status(201).json({ message: 'Intervention créée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.changerStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, date_fin } = req.body;
    await db.query('UPDATE interventions SET statut = ?, date_fin = ? WHERE id = ?', [statut, date_fin || null, id]);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMesInterventions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*, v.marque, v.modele, v.immatriculation
       FROM interventions i JOIN vehicules v ON i.vehicule_id = v.id
       WHERE i.client_id = ? ORDER BY i.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
