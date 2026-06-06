const db = require('../config/db');
const { envoyerWhatsAppClient } = require('../services/whatsappService');

const getAccesFactureClient = (id) => {
  const clientUrl = String(process.env.APP_CLIENT_URL || '').trim().replace(/\/$/, '');
  const urlUtilisable = clientUrl
    && /^https?:\/\//i.test(clientUrl)
    && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(clientUrl);
  return urlUtilisable
    ? `Facture numérique : ${clientUrl}/documents/facture/${id}/imprimer`
    : 'Facture numérique disponible dans l’application client DiagAuto Mada.';
};
const genNumero = (prefix) => {
  const date = new Date();
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${annee}${mois}-${rand}`;
};

const getAccesFactureClientComplet = (id) => {
  const clientUrl = String(process.env.APP_CLIENT_URL || '').trim().replace(/\/$/, '');
  const urlUtilisable = clientUrl
    && /^https?:\/\//i.test(clientUrl)
    && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(clientUrl);
  return urlUtilisable
    ? `Lien facture numerique : ${clientUrl}/documents/facture/${id}/imprimer`
    : 'Facture numerique jointe dans l application client DiagAuto Mada : ouvrez Documents > Factures > Voir / Imprimer.';
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
      `SELECT f.client_id, f.numero_facture, f.montant_ttc, f.montant_paye, f.statut,
              v.marque, v.modele, v.immatriculation
       FROM factures f JOIN vehicules v ON f.vehicule_id = v.id
       WHERE f.id = ?`,
      [id]
    );
    if (!f) return res.status(404).json({ message: 'Facture introuvable' });

    const reste = Number(f.montant_ttc) - Number(f.montant_paye || 0);
    const whatsapp = await envoyerWhatsAppClient({
      clientId: f.client_id,
      type: 'facture_envoi',
      message: `DiagAuto Mada\nFacture disponible.\nFacture : ${f.numero_facture}\nVehicule : ${f.marque} ${f.modele} (${f.immatriculation})\nTotal : ${Number(f.montant_ttc).toLocaleString('fr-FR')} Ar\nDeja paye : ${Number(f.montant_paye || 0).toLocaleString('fr-FR')} Ar\nReste : ${Math.max(0, reste).toLocaleString('fr-FR')} Ar\nStatut : ${String(f.statut || '').replaceAll('_', ' ')}\n${getAccesFactureClientComplet(id)}`,
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
    const whatsapp = await envoyerWhatsAppClient({
      clientId: f.client_id,
      type: 'facture_paiement',
      message: `DiagAuto Mada\nPaiement facture valide.\nFacture : ${f.numero_facture}\nVehicule : ${f.marque} ${f.modele} (${f.immatriculation})\nMontant paye : ${Number(montant_paye).toLocaleString('fr-FR')} Ar\nStatut : ${statut.replaceAll('_', ' ')}\n${getAccesFactureClientComplet(id)}`,
    });
    res.json({ message: 'Paiement enregistré', statut, whatsapp });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
