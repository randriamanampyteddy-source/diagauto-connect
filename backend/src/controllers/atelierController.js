const db = require('../config/db');

exports.getConfig = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM atelier_config WHERE id = 1');
    res.json(row || {});
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json({});
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { nom, adresse, telephone, whatsapp, email, facebook, site_web, nif, stat } = req.body;
    await db.query(
      'UPDATE atelier_config SET nom=?, adresse=?, telephone=?, whatsapp=?, email=?, facebook=?, site_web=?, nif=?, stat=? WHERE id=1',
      [nom, adresse, telephone, whatsapp, email, facebook, site_web, nif, stat]
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
        v.marque, v.modele, v.immatriculation, v.annee, v.couleur
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
    let atelier = {};
    try {
      [[atelier]] = await db.query('SELECT * FROM atelier_config WHERE id=1');
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
    }

    res.json({ facture, lignes, atelier: atelier || {} });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

const documentMap = {
  facture: {
    table: 'factures',
    numero: 'numero_facture',
    date: 'date_facture',
    secondDate: 'date_echeance',
    notFound: 'Facture introuvable',
  },
  devis: {
    table: 'devis',
    numero: 'numero_devis',
    date: 'date_devis',
    secondDate: 'date_validite',
    notFound: 'Devis introuvable',
  },
  proforma: {
    table: 'proformas',
    numero: 'numero_proforma',
    date: 'date_proforma',
    secondDate: 'date_validite',
    notFound: 'Proforma introuvable',
  },
};

const getDocumentDetail = async (req, res, clientOnly = false) => {
  try {
    const { type, id } = req.params;
    const cfg = documentMap[type];
    if (!cfg) return res.status(400).json({ message: 'Type de document invalide' });

    const clientFilter = clientOnly ? ' AND d.client_id = ?' : '';
    const params = clientOnly ? [id, req.user.id] : [id];
    const [[document]] = await db.query(
      `SELECT d.*,
        d.${cfg.numero} AS numero_document,
        d.${cfg.date} AS date_document,
        d.${cfg.secondDate} AS date_secondaire,
        c.nom AS client_nom, c.prenom AS client_prenom, c.id_client,
        c.telephone AS client_tel, c.adresse AS client_adresse, c.email AS client_email,
        v.marque, v.modele, v.immatriculation, v.annee, v.couleur
       FROM ${cfg.table} d
       JOIN clients c ON d.client_id = c.id
       JOIN vehicules v ON d.vehicule_id = v.id
       WHERE d.id = ?${clientFilter}`,
      params
    );
    if (!document) return res.status(404).json({ message: cfg.notFound });

    const [lignes] = await db.query(
      'SELECT * FROM lignes_document WHERE document_type=? AND document_id=? ORDER BY id',
      [type, id]
    );
    let atelier = {};
    try {
      [[atelier]] = await db.query('SELECT * FROM atelier_config WHERE id=1');
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
    }

    res.json({ type, document, lignes, atelier: atelier || {} });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getAdminDocumentDetail = (req, res) => getDocumentDetail(req, res, false);
exports.getClientDocumentDetail = (req, res) => getDocumentDetail(req, res, true);
