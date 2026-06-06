const db = require('../config/db');

let archiveColumnsReady = false;

const ensureArchiveColumns = async () => {
  if (archiveColumnsReady) return;
  const statements = db.type === 'postgres'
    ? [
        'ALTER TABLE interventions ADD COLUMN IF NOT EXISTS dernier_kilometrage INTEGER',
        'ALTER TABLE interventions ADD COLUMN IF NOT EXISTS numero_vehicule_archive VARCHAR(100)',
      ]
    : [
        'ALTER TABLE interventions ADD COLUMN IF NOT EXISTS dernier_kilometrage INT NULL',
        'ALTER TABLE interventions ADD COLUMN IF NOT EXISTS numero_vehicule_archive VARCHAR(100) NULL',
      ];

  for (const sql of statements) {
    try {
      await db.query(sql);
    } catch (err) {
      if (!/duplicate|exists/i.test(String(err.message))) throw err;
    }
  }
  archiveColumnsReady = true;
};

exports.getAllInterventions = async (req, res) => {
  try {
    await ensureArchiveColumns();
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
    await ensureArchiveColumns();
    const { rendezvous_id, client_id, vehicule_id, description, technicien, date_debut, dernier_kilometrage, numero_vehicule_archive } = req.body;
    if (!client_id || !vehicule_id || !description || !String(description).trim()) {
      return res.status(400).json({ message: 'Client, véhicule et réparation obligatoires' });
    }
    const [[vehicule]] = await db.query(
      'SELECT id FROM vehicules WHERE id = ? AND client_id = ?',
      [vehicule_id, client_id]
    );
    if (!vehicule) return res.status(404).json({ message: 'Véhicule introuvable pour ce client' });
    await db.query(
      `INSERT INTO interventions
       (rendezvous_id, client_id, vehicule_id, description, technicien, date_debut, dernier_kilometrage, numero_vehicule_archive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rendezvous_id || null,
        client_id,
        vehicule_id,
        description,
        technicien,
        date_debut,
        dernier_kilometrage ? Number(dernier_kilometrage) : null,
        numero_vehicule_archive || null,
      ]
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
      `SELECT i.id, i.rendezvous_id, i.client_id, i.vehicule_id, i.description, i.technicien,
              i.date_debut, i.date_fin, i.statut, i.created_at,
              v.marque, v.modele, v.immatriculation
       FROM interventions i JOIN vehicules v ON i.vehicule_id = v.id
       WHERE i.client_id = ? ORDER BY i.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
