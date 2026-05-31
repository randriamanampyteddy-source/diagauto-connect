const express = require('express');
const router = express.Router();

const { verifyToken, isAdmin, isClient } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const clientCtrl = require('../controllers/clientController');
const rdvCtrl = require('../controllers/rendezvousController');
const factureCtrl = require('../controllers/factureController');
const dashCtrl = require('../controllers/dashboardController');
const interCtrl = require('../controllers/interventionController');

// AUTH
router.post('/auth/admin/login', authCtrl.adminLogin);
router.post('/auth/client/register', authCtrl.clientRegister);
router.post('/auth/client/login', authCtrl.clientLogin);

// ADMIN - Dashboard
router.get('/admin/dashboard', verifyToken, isAdmin, dashCtrl.getStats);

// ADMIN - Clients
router.get('/admin/clients', verifyToken, isAdmin, clientCtrl.getAllClients);
router.put('/admin/clients/:id/valider', verifyToken, isAdmin, clientCtrl.validerClient);
router.put('/admin/clients/:id/suspendre', verifyToken, isAdmin, clientCtrl.suspendreClient);
router.get('/admin/clients/:id/vehicules', verifyToken, isAdmin, clientCtrl.getVehiculesClient);

// ADMIN - Rendez-vous
router.get('/admin/rendezvous', verifyToken, isAdmin, rdvCtrl.getAllRdv);
router.put('/admin/rendezvous/:id/statut', verifyToken, isAdmin, rdvCtrl.changerStatutRdv);

// ADMIN - Interventions
router.get('/admin/interventions', verifyToken, isAdmin, interCtrl.getAllInterventions);
router.post('/admin/interventions', verifyToken, isAdmin, interCtrl.creerIntervention);
router.put('/admin/interventions/:id/statut', verifyToken, isAdmin, interCtrl.changerStatut);

// ADMIN - Devis
router.post('/admin/devis', verifyToken, isAdmin, factureCtrl.creerDevis);
router.get('/admin/devis', verifyToken, isAdmin, factureCtrl.getAllDevis);
router.put('/admin/devis/:id/statut', verifyToken, isAdmin, factureCtrl.changerStatutDevis);

// ADMIN - Proforma
router.post('/admin/proformas', verifyToken, isAdmin, factureCtrl.creerProforma);
router.get('/admin/proformas', verifyToken, isAdmin, factureCtrl.getAllProformas);

// ADMIN - Factures
router.post('/admin/factures', verifyToken, isAdmin, factureCtrl.creerFacture);
router.get('/admin/factures', verifyToken, isAdmin, factureCtrl.getAllFactures);
router.put('/admin/factures/:id/paiement', verifyToken, isAdmin, factureCtrl.enregistrerPaiement);

// CLIENT - Profil & Véhicules
router.get('/client/profil', verifyToken, isClient, clientCtrl.getMonProfil);
router.get('/client/vehicules', verifyToken, isClient, clientCtrl.getMesVehicules);
router.post('/client/vehicules', verifyToken, isClient, clientCtrl.ajouterVehicule);

// CLIENT - Rendez-vous
router.post('/client/rendezvous', verifyToken, isClient, rdvCtrl.creerRdv);
router.get('/client/rendezvous', verifyToken, isClient, rdvCtrl.getMesRdv);

// CLIENT - Interventions
router.get('/client/interventions', verifyToken, isClient, interCtrl.getMesInterventions);

// CLIENT - Factures & Devis
router.get('/client/factures', verifyToken, isClient, factureCtrl.getMesFactures);
router.get('/client/devis', verifyToken, isClient, factureCtrl.getMesDevis);

module.exports = router;
