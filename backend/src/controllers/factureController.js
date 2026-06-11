const db = require('../config/db');
const os = require('os');
const crypto = require('crypto');
const { envoyerWhatsAppClient } = require('../services/whatsappService');

// ===== TOKEN PUBLIC (sans APK) =====
// Map: token -> { type, id, expires }
const _tokensPublics = new Map();

const _getLocalIp = () => {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
};

const _genTokenPublic = (type, id) => {
  const token = crypto.randomBytes(18).toString('hex');
  const expires = Date.now() + 72 * 60 * 60 * 1000; // 72h
  _tokensPublics.set(token, { type, id: String(id), expires });
  // Nettoyage periodique
  if (_tokensPublics.size > 500) {
    const now = Date.now();
    for (const [k, v] of _tokensPublics) if (v.expires < now) _tokensPublics.delete(k);
  }
  return token;
};

const _getLienPublic = (type, id) => {
  const clientUrl = String(process.env.APP_CLIENT_URL || '').trim().replace(/\/$/, '');
  const urlUtilisable = clientUrl
    && /^https?:\/\//i.test(clientUrl)
    && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(clientUrl);
  if (urlUtilisable) return `${clientUrl}/documents/${type}/${id}/imprimer`;
  const port = process.env.PORT || 3000;
  const ip = _getLocalIp();
  const token = _genTokenPublic(type, id);
  return `http://${ip}:${port}/public/documents/${token}`;
};

// ===== HTML PAGE PUBLIQUE =====
const _htmlDocument = (doc, lignes, atelier) => {
  const typeLabels = { facture: 'FACTURE', devis: 'DEVIS', proforma: 'PROFORMA' };
  const prefixes = { facture: 'numero_facture', devis: 'numero_devis', proforma: 'numero_proforma' };
  const dateFields = { facture: 'date_facture', devis: 'date_devis', proforma: 'date_proforma' };
  const tLabel = typeLabels[doc._type] || doc._type.toUpperCase();
  const numero = doc[prefixes[doc._type]] || '—';
  const date = doc[dateFields[doc._type]]
    ? new Date(`${String(doc[dateFields[doc._type]]).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR')
    : '—';
  const validite = (doc.date_validite)
    ? `<tr><td>Validité</td><td>${new Date(`${String(doc.date_validite).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR')}</td></tr>` : '';
  const echeance = (doc.date_echeance)
    ? `<tr><td>Échéance</td><td>${new Date(`${String(doc.date_echeance).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR')}</td></tr>` : '';
  const fmt = (n) => `${Number(n || 0).toLocaleString('fr-FR')} Ar`;
  const montantHT = Number(doc.montant_ht || 0);
  const tva = Number(doc.tva || 0);
  const montantTTC = Number(doc.montant_ttc || 0);
  const montantPaye = Number(doc.montant_paye || 0);
  const reste = Math.max(0, montantTTC - montantPaye);

  const lignesHtml = lignes.map(l => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #e8eef8">${l.description || ''}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e8eef8;text-align:center">${l.quantite}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e8eef8;text-align:right">${fmt(l.prix_unitaire)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e8eef8;text-align:right;font-weight:600">${fmt(l.montant)}</td>
    </tr>`).join('');

  const paiementSection = doc._type === 'facture' ? `
    <tr><td style="padding:5px 10px;text-align:right;color:#555">Déjà payé :</td><td style="padding:5px 10px;text-align:right;color:#2e7d32;font-weight:700">${fmt(montantPaye)}</td></tr>
    <tr style="background:#fff3e0"><td style="padding:7px 10px;text-align:right;font-weight:800;color:#e65100">Reste à payer :</td><td style="padding:7px 10px;text-align:right;font-weight:800;color:#e65100;font-size:1.05rem">${fmt(reste)}</td></tr>` : '';

  const atelierNom = atelier?.nom || 'DiagAuto Mada';
  const atelierAddr = atelier?.adresse ? `<div style="font-size:11px;color:#666">${atelier.adresse}</div>` : '';
  const atelierTel = atelier?.telephone ? `<div style="font-size:11px;color:#666">Tél: ${atelier.telephone}</div>` : '';
  const atelierNif = atelier?.nif ? `<div style="font-size:11px;color:#888">NIF: ${atelier.nif}</div>` : '';

  const statutColors = { brouillon:'#78909c', envoye:'#1565c0', accepte:'#2e7d32', refuse:'#c62828', payee:'#1b5e20', partiellement_payee:'#e65100', non_payee:'#c62828' };
  const statut = String(doc.statut || '').replaceAll('_', ' ');
  const statutColor = statutColors[doc.statut] || '#555';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${tLabel} ${numero}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f7fb;padding:16px;color:#1a1a2e}
  .card{background:#fff;border-radius:14px;padding:20px;max-width:600px;margin:0 auto;box-shadow:0 2px 18px rgba(0,0,0,.1)}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #e3f2fd}
  .atelier-name{font-size:1.1rem;font-weight:800;color:#1565c0}
  .doc-title{font-size:1.4rem;font-weight:900;color:#0d2137;text-align:right}
  .doc-num{font-size:.85rem;color:#64748b;text-align:right}
  table{width:100%;border-collapse:collapse}
  .info-table td{padding:4px 0;font-size:.88rem;vertical-align:top}
  .info-table td:first-child{color:#64748b;width:110px}
  .info-table td:last-child{font-weight:600}
  .lines-table th{background:#1565c0;color:#fff;padding:7px 10px;text-align:left;font-size:.78rem;text-transform:uppercase}
  .totaux-table td{padding:5px 10px;text-align:right;font-size:.9rem}
  .statut-badge{display:inline-block;padding:3px 12px;border-radius:12px;font-size:.78rem;font-weight:700;background:#e8eef8;color:${statutColor};border:1px solid currentColor}
  .notes{background:#f8fafc;border-left:3px solid #90caf9;border-radius:0 8px 8px 0;padding:8px 12px;font-size:.83rem;color:#445;margin-top:10px}
  .footer{text-align:center;font-size:.7rem;color:#999;margin-top:14px;padding-top:10px;border-top:1px solid #e8eef8}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div>
      <div class="atelier-name">${atelierNom}</div>
      ${atelierAddr}${atelierTel}${atelierNif}
    </div>
    <div>
      <div class="doc-title">${tLabel}</div>
      <div class="doc-num">${numero}</div>
      <div style="margin-top:5px"><span class="statut-badge">${statut}</span></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
    <div>
      <div style="font-size:.75rem;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:6px">Client</div>
      <table class="info-table">
        <tr><td>Nom</td><td>${doc.prenom || ''} ${doc.nom || ''}</td></tr>
        ${doc.id_client ? `<tr><td>ID Client</td><td>${doc.id_client}</td></tr>` : ''}
      </table>
    </div>
    <div>
      <div style="font-size:.75rem;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:6px">Véhicule</div>
      <table class="info-table">
        <tr><td>Véhicule</td><td>${doc.marque || ''} ${doc.modele || ''}</td></tr>
        <tr><td>Immat.</td><td>${doc.immatriculation || '—'}</td></tr>
      </table>
    </div>
  </div>

  <table class="info-table" style="margin-bottom:16px">
    <tr><td>Date</td><td>${date}</td></tr>
    ${validite}${echeance}
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
    <thead>
      <tr class="lines-table">
        <th style="padding:7px 10px;text-align:left;font-size:.78rem;background:#1565c0;color:#fff">Description</th>
        <th style="padding:7px 10px;text-align:center;font-size:.78rem;background:#1565c0;color:#fff">Qté</th>
        <th style="padding:7px 10px;text-align:right;font-size:.78rem;background:#1565c0;color:#fff">Prix unit.</th>
        <th style="padding:7px 10px;text-align:right;font-size:.78rem;background:#1565c0;color:#fff">Montant</th>
      </tr>
    </thead>
    <tbody>${lignesHtml}</tbody>
  </table>

  <table class="totaux-table" style="margin-left:auto;width:auto;min-width:220px">
    <tr><td style="padding:5px 10px;text-align:right;color:#555">Montant HT :</td><td style="padding:5px 10px;text-align:right">${fmt(montantHT)}</td></tr>
    ${tva > 0 ? `<tr><td style="padding:5px 10px;text-align:right;color:#555">TVA (${tva}%) :</td><td style="padding:5px 10px;text-align:right">${fmt(montantTTC - montantHT)}</td></tr>` : ''}
    <tr style="background:#e3f2fd"><td style="padding:7px 10px;text-align:right;font-weight:800;color:#1565c0">Total TTC :</td><td style="padding:7px 10px;text-align:right;font-weight:800;color:#1565c0;font-size:1.05rem">${fmt(montantTTC)}</td></tr>
    ${paiementSection}
  </table>

  ${doc.notes ? `<div class="notes">📝 ${doc.notes}</div>` : ''}

  <div class="footer">
    ${atelierNom} · Document généré le ${new Date().toLocaleDateString('fr-FR')} · DiagAuto Mada
  </div>
</div>
</body>
</html>`;
};

// ===== ENDPOINT PUBLIC =====
exports.accesPublicDocument = async (req, res) => {
  try {
    const { token } = req.params;
    const entry = _tokensPublics.get(token);
    if (!entry || entry.expires < Date.now()) {
      return res.status(410).type('html').send('<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Lien expiré</h2><p>Ce document n\'est plus disponible via ce lien.</p></body></html>');
    }
    const { type, id } = entry;
    const configs = {
      facture:  { table: 'factures',  num: 'numero_facture',  date: 'date_facture'  },
      devis:    { table: 'devis',     num: 'numero_devis',    date: 'date_devis'    },
      proforma: { table: 'proformas', num: 'numero_proforma', date: 'date_proforma' },
    };
    const cfg = configs[type];
    if (!cfg) return res.status(404).send('Type de document inconnu');

    const joins = {
      facture:  'JOIN clients c ON d.client_id=c.id JOIN vehicules v ON d.vehicule_id=v.id',
      devis:    'JOIN clients c ON d.client_id=c.id JOIN vehicules v ON d.vehicule_id=v.id',
      proforma: 'JOIN clients c ON d.client_id=c.id JOIN vehicules v ON d.vehicule_id=v.id',
    };
    const [[doc]] = await db.query(
      `SELECT d.*, c.nom, c.prenom, c.id_client, v.marque, v.modele, v.immatriculation
       FROM ${cfg.table} d ${joins[type]} WHERE d.id = ?`, [id]
    );
    if (!doc) return res.status(404).type('html').send('<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Document introuvable</h2></body></html>');

    const [lignes] = await db.query(
      'SELECT * FROM lignes_document WHERE document_type = ? AND document_id = ? ORDER BY id',
      [type, id]
    );
    const [[atelier]] = await db.query('SELECT * FROM atelier_config WHERE id = 1').catch(() => [[{}]]);

    doc._type = type;
    res.type('html').send(_htmlDocument(doc, lignes, atelier || {}));
  } catch (err) {
    res.status(500).type('html').send(`<html><body style="padding:40px"><h2>Erreur</h2><p>${err.message}</p></body></html>`);
  }
};

// ===== HELPERS =====
const genNumero = (prefix) => {
  const date = new Date();
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${annee}${mois}-${rand}`;
};

const formatMontant = (montant) => `${Number(montant || 0).toLocaleString('fr-FR')} Ar`;

const _formatLignes = (lignes) => {
  if (!lignes || !lignes.length) return '';
  return '\n' + lignes.map(l =>
    `  • ${l.description} x${l.quantite} = ${formatMontant(l.montant)}`
  ).join('\n');
};

// ===== DEVIS =====
exports.creerDevis = async (req, res) => {
  try {
    const { client_id, vehicule_id, intervention_id, date_devis, date_validite, lignes, tva, notes } = req.body;
    const numero_devis = genNumero('DEV');
    const montant_ht = lignes.reduce((sum, l) => sum + l.quantite * l.prix_unitaire, 0);
    const montant_ttc = montant_ht * (1 + tva / 100);
    const [result] = await db.query(
      'INSERT INTO devis (numero_devis, client_id, vehicule_id, intervention_id, date_devis, date_validite, montant_ht, tva, montant_ttc, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [numero_devis, client_id, vehicule_id, intervention_id || null, date_devis, date_validite, montant_ht, tva, montant_ttc, notes]
    );
    for (const l of lignes) {
      await db.query(
        'INSERT INTO lignes_document (document_type, document_id, description, quantite, prix_unitaire, montant) VALUES (?, ?, ?, ?, ?, ?)',
        ['devis', result.insertId, l.description, l.quantite, l.prix_unitaire, l.quantite * l.prix_unitaire]
      );
    }
    res.status(201).json({ message: 'Devis créé', id: result.insertId, numero_devis });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getAllDevis = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, c.nom, c.prenom, c.id_client, v.marque, v.modele, v.immatriculation
       FROM devis d JOIN clients c ON d.client_id = c.id JOIN vehicules v ON d.vehicule_id = v.id
       ORDER BY d.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMesDevis = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, v.marque, v.modele, v.immatriculation
       FROM devis d JOIN vehicules v ON d.vehicule_id = v.id
       WHERE d.client_id = ? ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.changerStatutDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    await db.query('UPDATE devis SET statut = ? WHERE id = ?', [statut, id]);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.envoyerDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const [[d]] = await db.query(
      `SELECT d.client_id, d.numero_devis, d.date_validite, d.montant_ht, d.tva, d.montant_ttc, d.statut,
              v.marque, v.modele, v.immatriculation
       FROM devis d JOIN vehicules v ON d.vehicule_id = v.id
       WHERE d.id = ?`,
      [id]
    );
    if (!d) return res.status(404).json({ message: 'Devis introuvable' });

    if (d.statut === 'brouillon') {
      await db.query("UPDATE devis SET statut = 'envoye' WHERE id = ?", [id]);
      d.statut = 'envoye';
    }

    const [lignes] = await db.query(
      'SELECT * FROM lignes_document WHERE document_type = ? AND document_id = ? ORDER BY id',
      ['devis', id]
    );
    const validite = d.date_validite
      ? `\nValidité : ${new Date(`${String(d.date_validite).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR')}`
      : '';
    const lien = _getLienPublic('devis', id);
    const whatsapp = await envoyerWhatsAppClient({
      clientId: d.client_id,
      type: 'devis_envoi',
      message: `DiagAuto Mada\nDevis disponible.\nDevis : ${d.numero_devis}\nVéhicule : ${d.marque} ${d.modele} (${d.immatriculation})\nTotal TTC : ${formatMontant(d.montant_ttc)}${validite}\nStatut : ${String(d.statut || '').replaceAll('_', ' ')}${_formatLignes(lignes)}\n\n🔗 Voir le document : ${lien}`,
    });
    res.json({ message: 'Devis pret a envoyer', statut: d.statut, whatsapp });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.changerStatutMonDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    if (!['accepte', 'refuse'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }
    const [result] = await db.query(
      'UPDATE devis SET statut = ? WHERE id = ? AND client_id = ?',
      [statut, id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Devis introuvable' });
    res.json({ message: 'Statut mis a jour', statut });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ===== PROFORMA =====
exports.creerProforma = async (req, res) => {
  try {
    const { client_id, vehicule_id, date_proforma, date_validite, lignes, tva, notes } = req.body;
    const numero_proforma = genNumero('PRO');
    const montant_ht = lignes.reduce((sum, l) => sum + l.quantite * l.prix_unitaire, 0);
    const montant_ttc = montant_ht * (1 + tva / 100);
    const [result] = await db.query(
      'INSERT INTO proformas (numero_proforma, client_id, vehicule_id, date_proforma, date_validite, montant_ht, tva, montant_ttc, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [numero_proforma, client_id, vehicule_id, date_proforma, date_validite, montant_ht, tva, montant_ttc, notes]
    );
    for (const l of lignes) {
      await db.query(
        'INSERT INTO lignes_document (document_type, document_id, description, quantite, prix_unitaire, montant) VALUES (?, ?, ?, ?, ?, ?)',
        ['proforma', result.insertId, l.description, l.quantite, l.prix_unitaire, l.quantite * l.prix_unitaire]
      );
    }
    res.status(201).json({ message: 'Proforma créé', id: result.insertId, numero_proforma });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getAllProformas = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.nom, c.prenom, c.id_client, v.marque, v.modele, v.immatriculation
       FROM proformas p JOIN clients c ON p.client_id = c.id JOIN vehicules v ON p.vehicule_id = v.id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMesProformas = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, v.marque, v.modele, v.immatriculation
       FROM proformas p JOIN vehicules v ON p.vehicule_id = v.id
       WHERE p.client_id = ? ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.changerStatutProforma = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    await db.query('UPDATE proformas SET statut = ? WHERE id = ?', [statut, id]);
    res.json({ message: 'Statut mis a jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.envoyerProforma = async (req, res) => {
  try {
    const { id } = req.params;
    const [[p]] = await db.query(
      `SELECT p.client_id, p.numero_proforma, p.date_validite, p.montant_ht, p.tva, p.montant_ttc, p.statut,
              v.marque, v.modele, v.immatriculation
       FROM proformas p JOIN vehicules v ON p.vehicule_id = v.id
       WHERE p.id = ?`,
      [id]
    );
    if (!p) return res.status(404).json({ message: 'Proforma introuvable' });

    if (p.statut === 'brouillon') {
      await db.query("UPDATE proformas SET statut = 'envoye' WHERE id = ?", [id]);
      p.statut = 'envoye';
    }

    const [lignes] = await db.query(
      'SELECT * FROM lignes_document WHERE document_type = ? AND document_id = ? ORDER BY id',
      ['proforma', id]
    );
    const validite = p.date_validite
      ? `\nValidité : ${new Date(`${String(p.date_validite).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR')}`
      : '';
    const lien = _getLienPublic('proforma', id);
    const whatsapp = await envoyerWhatsAppClient({
      clientId: p.client_id,
      type: 'proforma_envoi',
      message: `DiagAuto Mada\nProforma disponible.\nProforma : ${p.numero_proforma}\nVéhicule : ${p.marque} ${p.modele} (${p.immatriculation})\nTotal TTC : ${formatMontant(p.montant_ttc)}${validite}\nStatut : ${String(p.statut || '').replaceAll('_', ' ')}${_formatLignes(lignes)}\n\n🔗 Voir le document : ${lien}`,
    });
    res.json({ message: 'Proforma pret a envoyer', statut: p.statut, whatsapp });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.changerStatutMaProforma = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    if (!['accepte', 'refuse'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }
    const [result] = await db.query(
      'UPDATE proformas SET statut = ? WHERE id = ? AND client_id = ?',
      [statut, id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Proforma introuvable' });
    res.json({ message: 'Statut mis a jour', statut });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ===== FACTURES =====
exports.creerFacture = async (req, res) => {
  try {
    const { client_id, vehicule_id, intervention_id, devis_id, date_facture, date_echeance, lignes, tva, notes } = req.body;
    if (!client_id || !vehicule_id || !date_facture || !Array.isArray(lignes) || !lignes.length) {
      return res.status(400).json({ message: 'Client, véhicule, date et lignes de facture obligatoires' });
    }
    const [[vehicule]] = await db.query(
      'SELECT id FROM vehicules WHERE id = ? AND client_id = ?',
      [vehicule_id, client_id]
    );
    if (!vehicule) return res.status(404).json({ message: 'Véhicule introuvable pour ce client' });
    const numero_facture = genNumero('FAC');
    const montant_ht = lignes.reduce((sum, l) => sum + l.quantite * l.prix_unitaire, 0);
    const montant_ttc = montant_ht * (1 + tva / 100);
    const [result] = await db.query(
      'INSERT INTO factures (numero_facture, client_id, vehicule_id, intervention_id, devis_id, date_facture, date_echeance, montant_ht, tva, montant_ttc, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [numero_facture, client_id, vehicule_id, intervention_id || null, devis_id || null, date_facture, date_echeance, montant_ht, tva, montant_ttc, notes]
    );
    for (const l of lignes) {
      await db.query(
        'INSERT INTO lignes_document (document_type, document_id, description, quantite, prix_unitaire, montant) VALUES (?, ?, ?, ?, ?, ?)',
        ['facture', result.insertId, l.description, l.quantite, l.prix_unitaire, l.quantite * l.prix_unitaire]
      );
    }
    res.status(201).json({ message: 'Facture creee', id: result.insertId, numero_facture });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getAllFactures = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.*, c.nom, c.prenom, c.id_client, v.marque, v.modele, v.immatriculation
       FROM factures f JOIN clients c ON f.client_id = c.id JOIN vehicules v ON f.vehicule_id = v.id
       ORDER BY f.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMesFactures = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.*, v.marque, v.modele, v.immatriculation
       FROM factures f JOIN vehicules v ON f.vehicule_id = v.id
       WHERE f.client_id = ? ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.envoyerFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const [[f]] = await db.query(
      `SELECT f.client_id, f.numero_facture, f.montant_ht, f.tva, f.montant_ttc, f.montant_paye, f.statut,
              v.marque, v.modele, v.immatriculation
       FROM factures f JOIN vehicules v ON f.vehicule_id = v.id
       WHERE f.id = ?`,
      [id]
    );
    if (!f) return res.status(404).json({ message: 'Facture introuvable' });

    const [lignes] = await db.query(
      'SELECT * FROM lignes_document WHERE document_type = ? AND document_id = ? ORDER BY id',
      ['facture', id]
    );
    const reste = Math.max(0, Number(f.montant_ttc) - Number(f.montant_paye || 0));
    const lien = _getLienPublic('facture', id);
    const whatsapp = await envoyerWhatsAppClient({
      clientId: f.client_id,
      type: 'facture_envoi',
      message: `DiagAuto Mada\nFacture disponible.\nFacture : ${f.numero_facture}\nVéhicule : ${f.marque} ${f.modele} (${f.immatriculation})\nTotal TTC : ${formatMontant(f.montant_ttc)}\nDéjà payé : ${formatMontant(f.montant_paye)}\nReste à payer : ${formatMontant(reste)}\nStatut : ${String(f.statut || '').replaceAll('_', ' ')}${_formatLignes(lignes)}\n\n🔗 Voir la facture : ${lien}`,
    });
    res.json({ message: 'Facture prete a envoyer', whatsapp });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.enregistrerPaiement = async (req, res) => {
  try {
    const { id } = req.params;
    const { montant_paye } = req.body;
    const [[f]] = await db.query(
      `SELECT f.client_id, f.numero_facture, f.montant_ttc, v.marque, v.modele, v.immatriculation
       FROM factures f JOIN vehicules v ON f.vehicule_id = v.id
       WHERE f.id = ?`,
      [id]
    );
    if (!f) return res.status(404).json({ message: 'Facture introuvable' });
    const statut = montant_paye >= f.montant_ttc ? 'payee' : montant_paye > 0 ? 'partiellement_payee' : 'non_payee';
    await db.query('UPDATE factures SET montant_paye = ?, statut = ? WHERE id = ?', [montant_paye, statut, id]);
    const lien = _getLienPublic('facture', id);
    const whatsapp = await envoyerWhatsAppClient({
      clientId: f.client_id,
      type: 'facture_paiement',
      message: `DiagAuto Mada\nPaiement facture validé.\nFacture : ${f.numero_facture}\nVéhicule : ${f.marque} ${f.modele} (${f.immatriculation})\nMontant payé : ${formatMontant(montant_paye)}\nStatut : ${statut.replaceAll('_', ' ')}\n\n🔗 Voir la facture : ${lien}`,
    });
    res.json({ message: 'Paiement enregistré', statut, whatsapp });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
