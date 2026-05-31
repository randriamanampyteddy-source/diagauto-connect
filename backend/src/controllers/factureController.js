const db = require('../config/db');

const genNumero = (prefix) => {
  const date = new Date();
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${annee}${mois}-${rand}`;
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
    res.status(201).json({ message: 'Devis créé', numero_devis });
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
    res.status(201).json({ message: 'Proforma créé', numero_proforma });
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

// ===== FACTURES =====
exports.creerFacture = async (req, res) => {
  try {
    const { client_id, vehicule_id, intervention_id, devis_id, date_facture, date_echeance, lignes, tva, notes } = req.body;
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
    res.status(201).json({ message: 'Facture créée', numero_facture });
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

exports.enregistrerPaiement = async (req, res) => {
  try {
    const { id } = req.params;
    const { montant_paye } = req.body;
    const [[f]] = await db.query('SELECT montant_ttc FROM factures WHERE id = ?', [id]);
    const statut = montant_paye >= f.montant_ttc ? 'payee' : montant_paye > 0 ? 'partiellement_payee' : 'non_payee';
    await db.query('UPDATE factures SET montant_paye = ?, statut = ? WHERE id = ?', [montant_paye, statut, id]);
    res.json({ message: 'Paiement enregistré', statut });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
