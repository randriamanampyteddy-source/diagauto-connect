const db = require('../config/db');

exports.getConfig = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM atelier_config WHERE id = 1');
    res.json(row || {});
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { nom, adresse, telephone, email, facebook, site_web, nif, stat } = req.body;
    await db.query(
      'UPDATE atelier_config SET nom=?, adresse=?, telephone=?, email=?, facebook=?, site_web=?, nif=?, stat=? WHERE id=1',
      [nom, adresse, telephone, email, facebook, site_web, nif, stat]
    );
    res.json({ message: 'Configuration mise à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getFactureDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [[facture]] = await db.query(
      `SELECT f.*,
        c.nom AS client_nom, c.prenom AS client_prenom, c.id_client,
        c.telephone AS client_tel, c.adresse AS client_adresse, c.email AS client_email,
        v.marque, v.modele, v.immatriculation, v.annee, v.couleur, v.energie
       FROM factures f
       JOIN clients c ON f.client_id = c.id
       JOIN vehicules v ON f.vehicule_id = v.id
       WHERE f.id = ?`, [id]
    );
    if (!facture) return res.status(404).json({ message: 'Facture introuvable' });

    const [lignes] = await db.query(
      "SELECT * FROM lignes_document WHERE document_type='facture' AND document_id=? ORDER BY id",
      [id]
    );
    const [[atelier]] = await db.query('SELECT * FROM atelier_config WHERE id=1');

    res.json({ facture, lignes, atelier: atelier || {} });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
