const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const [[{ total_clients }]] = await db.query("SELECT COUNT(*) as total_clients FROM clients WHERE statut = 'actif'");
    const [[{ clients_en_attente }]] = await db.query("SELECT COUNT(*) as clients_en_attente FROM clients WHERE statut = 'en_attente'");
    const [[{ total_rdv }]] = await db.query("SELECT COUNT(*) as total_rdv FROM rendezvous WHERE date_rdv = CURRENT_DATE");
    const [[{ rdv_en_attente }]] = await db.query("SELECT COUNT(*) as rdv_en_attente FROM rendezvous WHERE statut = 'en_attente'");
    const [[{ interventions_en_cours }]] = await db.query("SELECT COUNT(*) as interventions_en_cours FROM interventions WHERE statut = 'en_cours'");
    const [[{ factures_non_payees }]] = await db.query("SELECT COUNT(*) as factures_non_payees FROM factures WHERE statut = 'non_payee'");
    const [[{ chiffre_affaires }]] = await db.query(
      `SELECT COALESCE(SUM(montant_paye), 0) as chiffre_affaires
       FROM factures
       WHERE EXTRACT(MONTH FROM date_facture) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM date_facture) = EXTRACT(YEAR FROM CURRENT_DATE)`
    );
    const [rdv_recents] = await db.query(
      `SELECT r.*, c.nom, c.prenom, v.marque, v.modele
       FROM rendezvous r JOIN clients c ON r.client_id = c.id JOIN vehicules v ON r.vehicule_id = v.id
       ORDER BY r.created_at DESC LIMIT 5`
    );

    res.json({
      total_clients,
      clients_en_attente,
      rdv_aujourd_hui: total_rdv,
      rdv_en_attente,
      interventions_en_cours,
      factures_non_payees,
      chiffre_affaires_mois: chiffre_affaires,
      rdv_recents
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
