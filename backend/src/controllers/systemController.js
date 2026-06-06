const db = require('../config/db');
const bcrypt = require('bcryptjs');
const {
  getConfigurationWhatsApp,
  verifierConfigurationWhatsApp,
} = require('../services/whatsappService');

const countOne = async (sql, params = []) => {
  const [[row]] = await db.query(sql, params);
  return Number(row.total) || 0;
};

exports.getStats = async (req, res) => {
  try {
    const whatsappConfig = getConfigurationWhatsApp();
    const stats = {
      clients: await countOne('SELECT COUNT(*) total FROM clients'),
      vehicules: await countOne('SELECT COUNT(*) total FROM vehicules'),
      rendezvous: await countOne('SELECT COUNT(*) total FROM rendezvous'),
      interventions: await countOne('SELECT COUNT(*) total FROM interventions'),
      devis: await countOne('SELECT COUNT(*) total FROM devis'),
      proformas: await countOne('SELECT COUNT(*) total FROM proformas'),
      factures: await countOne('SELECT COUNT(*) total FROM factures'),
      whatsapp_configure: whatsappConfig.configure,
      whatsapp_app_client_url_utilisable: whatsappConfig.app_client_url_utilisable,
      whatsapp_envoyes: await countOne("SELECT COUNT(*) total FROM notifications_whatsapp WHERE statut = 'envoye'"),
      whatsapp_en_attente: await countOne("SELECT COUNT(*) total FROM notifications_whatsapp WHERE statut IN ('configuration_manquante','numero_manquant','echec')"),
      lignes_orphelines: await countOne(
        `SELECT COUNT(*) total FROM lignes_document l
         LEFT JOIN devis d ON l.document_type='devis' AND l.document_id=d.id
         LEFT JOIN proformas p ON l.document_type='proforma' AND l.document_id=p.id
         LEFT JOIN factures f ON l.document_type='facture' AND l.document_id=f.id
         WHERE d.id IS NULL AND p.id IS NULL AND f.id IS NULL`
      ),
      rdv_annules_nettoyables: await countOne(
        `SELECT COUNT(*) total FROM rendezvous r
         LEFT JOIN interventions i ON i.rendezvous_id = r.id
         WHERE r.statut = 'annule' AND i.id IS NULL`
      ),
      devis_nettoyables: await countOne(
        `SELECT COUNT(*) total FROM devis d
         LEFT JOIN factures f ON f.devis_id = d.id
         WHERE d.statut IN ('brouillon','refuse') AND f.id IS NULL`
      ),
      proformas_nettoyables: await countOne(
        "SELECT COUNT(*) total FROM proformas WHERE statut IN ('brouillon','refuse')"
      ),
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getWhatsAppStatus = async (req, res) => {
  try {
    const [notifications] = await db.query(
      `SELECT n.id, n.type, n.destinataire, n.statut, n.erreur, n.created_at,
              CONCAT(c.prenom, ' ', c.nom) client
       FROM notifications_whatsapp n
       LEFT JOIN clients c ON c.id = n.client_id
       ORDER BY n.id DESC
       LIMIT 20`
    );
    const [statuts] = await db.query(
      'SELECT statut, COUNT(*) total FROM notifications_whatsapp GROUP BY statut'
    );
    res.json({
      configuration: getConfigurationWhatsApp(),
      statuts: Object.fromEntries(statuts.map(row => [row.statut, Number(row.total)])),
      notifications,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.verifierWhatsApp = async (req, res) => {
  const resultat = await verifierConfigurationWhatsApp();
  res.json(resultat);
};

exports.nettoyer = async (req, res) => {
  const { options = [], confirmation } = req.body;
  if (confirmation !== 'NETTOYER') {
    return res.status(400).json({ message: 'Confirmation requise: NETTOYER' });
  }
  const allowed = ['lignes_orphelines', 'rdv_annules', 'devis_brouillon_refuse', 'proformas_brouillon_refuse'];
  const selected = options.filter(o => allowed.includes(o));
  if (!selected.length) return res.status(400).json({ message: 'Aucune option valide' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const resultats = {};

    if (selected.includes('lignes_orphelines')) {
      const [r] = await conn.query(
        `DELETE l FROM lignes_document l
         LEFT JOIN devis d ON l.document_type='devis' AND l.document_id=d.id
         LEFT JOIN proformas p ON l.document_type='proforma' AND l.document_id=p.id
         LEFT JOIN factures f ON l.document_type='facture' AND l.document_id=f.id
         WHERE d.id IS NULL AND p.id IS NULL AND f.id IS NULL`
      );
      resultats.lignes_orphelines = r.affectedRows;
    }

    if (selected.includes('rdv_annules')) {
      const [r] = await conn.query(
        `DELETE r FROM rendezvous r
         LEFT JOIN interventions i ON i.rendezvous_id = r.id
         WHERE r.statut = 'annule' AND i.id IS NULL`
      );
      resultats.rdv_annules = r.affectedRows;
    }

    if (selected.includes('devis_brouillon_refuse')) {
      const [docs] = await conn.query(
        `SELECT d.id FROM devis d
         LEFT JOIN factures f ON f.devis_id = d.id
         WHERE d.statut IN ('brouillon','refuse') AND f.id IS NULL`
      );
      const ids = docs.map(d => d.id);
      if (ids.length) {
        await conn.query("DELETE FROM lignes_document WHERE document_type='devis' AND document_id IN (?)", [ids]);
        const [r] = await conn.query('DELETE FROM devis WHERE id IN (?)', [ids]);
        resultats.devis_brouillon_refuse = r.affectedRows;
      } else {
        resultats.devis_brouillon_refuse = 0;
      }
    }

    if (selected.includes('proformas_brouillon_refuse')) {
      const [docs] = await conn.query("SELECT id FROM proformas WHERE statut IN ('brouillon','refuse')");
      const ids = docs.map(d => d.id);
      if (ids.length) {
        await conn.query("DELETE FROM lignes_document WHERE document_type='proforma' AND document_id IN (?)", [ids]);
        const [r] = await conn.query('DELETE FROM proformas WHERE id IN (?)', [ids]);
        resultats.proformas_brouillon_refuse = r.affectedRows;
      } else {
        resultats.proformas_brouillon_refuse = 0;
      }
    }

    await conn.commit();
    res.json({ message: 'Nettoyage terminé', resultats });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

exports.reinitialiserAdmin = async (req, res) => {
  const { confirmation, password } = req.body;
  if (confirmation !== 'REINITIALISER TOUT') {
    return res.status(400).json({ message: 'Confirmation requise: REINITIALISER TOUT' });
  }

  const [admins] = await db.query('SELECT password FROM admins WHERE id = ?', [req.user.id]);
  if (!admins.length || !(await bcrypt.compare(password || '', admins[0].password))) {
    return res.status(401).json({ message: 'Mot de passe admin incorrect' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const resultats = {};
    for (const table of [
      'lignes_document',
      'factures',
      'proformas',
      'devis',
      'urgences_depannage',
      'notifications_whatsapp',
      'interventions',
      'rendezvous',
      'vehicules',
      'clients',
    ]) {
      const [result] = await conn.query(`DELETE FROM ${table}`);
      resultats[table] = result.affectedRows;
    }
    await conn.commit();
    res.json({
      message: 'Application réinitialisée. Admin et configuration atelier conservés.',
      resultats,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

exports.reinitialiserClient = async (req, res) => {
  const { confirmation, password } = req.body;
  if (confirmation !== 'REINITIALISER') {
    return res.status(400).json({ message: 'Confirmation requise: REINITIALISER' });
  }

  const [clients] = await db.query('SELECT password FROM clients WHERE id = ?', [req.user.id]);
  if (!clients.length || !(await bcrypt.compare(password || '', clients[0].password))) {
    return res.status(401).json({ message: 'Mot de passe client incorrect' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const clientId = req.user.id;
    const resultats = {};

    const [factures] = await conn.query('SELECT id FROM factures WHERE client_id = ?', [clientId]);
    const [devis] = await conn.query('SELECT id FROM devis WHERE client_id = ?', [clientId]);
    const [proformas] = await conn.query('SELECT id FROM proformas WHERE client_id = ?', [clientId]);

    const deleteLines = async (type, rows) => {
      const ids = rows.map(row => row.id);
      if (!ids.length) return 0;
      const [result] = await conn.query(
        'DELETE FROM lignes_document WHERE document_type = ? AND document_id IN (?)',
        [type, ids]
      );
      return result.affectedRows;
    };

    resultats.lignes_factures = await deleteLines('facture', factures);
    resultats.lignes_devis = await deleteLines('devis', devis);
    resultats.lignes_proformas = await deleteLines('proforma', proformas);

    for (const table of ['factures', 'proformas', 'devis', 'urgences_depannage', 'notifications_whatsapp', 'interventions', 'rendezvous', 'vehicules']) {
      const [result] = await conn.query(`DELETE FROM ${table} WHERE client_id = ?`, [clientId]);
      resultats[table] = result.affectedRows;
    }

    await conn.commit();
    res.json({
      message: 'Historique réinitialisé. Votre compte client est conservé.',
      resultats,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};
