const express = require('express');
const router = express.Router();

const { verifyToken, isAdmin, isClient } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const clientCtrl = require('../controllers/clientController');
const rdvCtrl = require('../controllers/rendezvousController');
const factureCtrl = require('../controllers/factureController');
const dashCtrl = require('../controllers/dashboardController');
const interCtrl = require('../controllers/interventionController');
const atelierCtrl = require('../controllers/atelierController');
const systemCtrl = require('../controllers/systemController');
const urgenceCtrl = require('../controllers/urgenceController');

// AUTH
router.post('/auth/admin/login', authCtrl.adminLogin);
router.get('/auth/admin/profil', verifyToken, isAdmin, authCtrl.adminGetProfil);
router.put('/auth/admin/password', verifyToken, isAdmin, authCtrl.adminChangerPassword);
router.post('/auth/client/register', authCtrl.clientRegister);
router.post('/auth/client/login', authCtrl.clientLogin);

// ADMIN - Dashboard
router.get('/admin/dashboard', verifyToken, isAdmin, dashCtrl.getStats);

// ADMIN - Clients
router.get('/admin/clients', verifyToken, isAdmin, clientCtrl.getAllClients);
router.post('/admin/clients/sans-apk', verifyToken, isAdmin, clientCtrl.creerClientSansApk);
router.put('/admin/clients/:id/valider', verifyToken, isAdmin, clientCtrl.validerClient);
router.put('/admin/clients/:id/suspendre', verifyToken, isAdmin, clientCtrl.suspendreClient);
router.get('/admin/clients/:id/vehicules', verifyToken, isAdmin, clientCtrl.getVehiculesClient);
router.post('/admin/clients/:id/reset-password', verifyToken, isAdmin, clientCtrl.resetPasswordClient);

// ADMIN - Rendez-vous
router.get('/admin/rendezvous', verifyToken, isAdmin, rdvCtrl.getAllRdv);
router.post('/admin/rendezvous', verifyToken, isAdmin, rdvCtrl.creerRdvAdmin);
router.get('/admin/rendezvous/notifications/stats', verifyToken, isAdmin, rdvCtrl.getRdvNotificationsStatsAdmin);
router.get('/admin/rendezvous/:id/messages', verifyToken, isAdmin, rdvCtrl.getMessagesRdvAdmin);
router.post('/admin/rendezvous/:id/messages', verifyToken, isAdmin, rdvCtrl.envoyerMessageRdvAdmin);
router.post('/admin/rendezvous/:id/envoyer', verifyToken, isAdmin, rdvCtrl.envoyerRdvWhatsApp);
router.put('/admin/rendezvous/:id/statut', verifyToken, isAdmin, rdvCtrl.changerStatutRdv);

// ADMIN - Interventions
router.get('/admin/interventions', verifyToken, isAdmin, interCtrl.getAllInterventions);
router.post('/admin/interventions', verifyToken, isAdmin, interCtrl.creerIntervention);
router.put('/admin/interventions/:id/statut', verifyToken, isAdmin, interCtrl.changerStatut);

// ADMIN - Devis
router.post('/admin/devis', verifyToken, isAdmin, factureCtrl.creerDevis);
router.get('/admin/devis', verifyToken, isAdmin, factureCtrl.getAllDevis);
router.post('/admin/devis/:id/envoyer', verifyToken, isAdmin, factureCtrl.envoyerDevis);
router.put('/admin/devis/:id/statut', verifyToken, isAdmin, factureCtrl.changerStatutDevis);

// ADMIN - Proforma
router.post('/admin/proformas', verifyToken, isAdmin, factureCtrl.creerProforma);
router.get('/admin/proformas', verifyToken, isAdmin, factureCtrl.getAllProformas);
router.post('/admin/proformas/:id/envoyer', verifyToken, isAdmin, factureCtrl.envoyerProforma);
router.put('/admin/proformas/:id/statut', verifyToken, isAdmin, factureCtrl.changerStatutProforma);

// ADMIN - Factures
router.post('/admin/factures', verifyToken, isAdmin, factureCtrl.creerFacture);
router.get('/admin/factures', verifyToken, isAdmin, factureCtrl.getAllFactures);
router.post('/admin/factures/:id/envoyer', verifyToken, isAdmin, factureCtrl.envoyerFacture);
router.put('/admin/factures/:id/paiement', verifyToken, isAdmin, factureCtrl.enregistrerPaiement);

// CLIENT - Profil & Véhicules
router.get('/client/profil', verifyToken, isClient, clientCtrl.getMonProfil);
router.put('/client/profil', verifyToken, isClient, clientCtrl.updateMonProfil);
router.put('/client/password', verifyToken, isClient, clientCtrl.changerMonPassword);
router.get('/client/vehicules', verifyToken, isClient, clientCtrl.getMesVehicules);
router.post('/client/vehicules', verifyToken, isClient, clientCtrl.ajouterVehicule);

// CLIENT - Rendez-vous
router.post('/client/rendezvous', verifyToken, isClient, rdvCtrl.creerRdv);
router.get('/client/rendezvous', verifyToken, isClient, rdvCtrl.getMesRdv);
router.get('/client/rendezvous/tous', verifyToken, isClient, rdvCtrl.getTousRdvActifs);
router.get('/client/rendezvous/notifications/stats', verifyToken, isClient, rdvCtrl.getMesRdvNotificationsStats);
router.put('/client/rendezvous/notifications/lire', verifyToken, isClient, rdvCtrl.lireMesRdvNotifications);
router.get('/client/rendezvous/:id/messages', verifyToken, isClient, rdvCtrl.getMessagesRdvClient);
router.post('/client/rendezvous/:id/messages', verifyToken, isClient, rdvCtrl.envoyerMessageRdvClient);
router.put('/client/rendezvous/:id/annuler', verifyToken, isClient, rdvCtrl.annulerMonRdv);
router.put('/client/rendezvous/:id/reporter', verifyToken, isClient, rdvCtrl.reporterMonRdv);

// CLIENT - Interventions
router.get('/client/interventions', verifyToken, isClient, interCtrl.getMesInterventions);

// CLIENT - Factures & Devis
router.get('/client/factures', verifyToken, isClient, factureCtrl.getMesFactures);
router.get('/client/devis', verifyToken, isClient, factureCtrl.getMesDevis);
router.put('/client/devis/:id/statut', verifyToken, isClient, factureCtrl.changerStatutMonDevis);
router.get('/client/proformas', verifyToken, isClient, factureCtrl.getMesProformas);
router.put('/client/proformas/:id/statut', verifyToken, isClient, factureCtrl.changerStatutMaProforma);

// URGENCES DEPANNAGE
router.post('/client/urgences', verifyToken, isClient, urgenceCtrl.creerUrgence);
router.get('/client/urgences', verifyToken, isClient, urgenceCtrl.getMesUrgences);
router.get('/client/urgences/notifications/stats', verifyToken, isClient, urgenceCtrl.getMesNotificationsStats);
router.put('/client/urgences/notifications/lire', verifyToken, isClient, urgenceCtrl.lireMesNotifications);
router.get('/client/urgences/:id/messages', verifyToken, isClient, urgenceCtrl.getMessagesUrgenceClient);
router.post('/client/urgences/:id/messages', verifyToken, isClient, urgenceCtrl.envoyerMessageUrgenceClient);
router.get('/admin/urgences', verifyToken, isAdmin, urgenceCtrl.getAllUrgences);
router.get('/admin/urgences/stats', verifyToken, isAdmin, urgenceCtrl.getUrgenceStats);
router.get('/admin/urgences/:id/messages', verifyToken, isAdmin, urgenceCtrl.getMessagesUrgenceAdmin);
router.post('/admin/urgences/:id/messages', verifyToken, isAdmin, urgenceCtrl.envoyerMessageUrgenceAdmin);
router.put('/admin/urgences/:id', verifyToken, isAdmin, urgenceCtrl.repondreUrgence);

// ATELIER CONFIG
router.get('/admin/atelier', verifyToken, isAdmin, atelierCtrl.getConfig);
router.put('/admin/atelier', verifyToken, isAdmin, atelierCtrl.updateConfig);
router.get('/admin/factures/:id/imprimer', verifyToken, isAdmin, atelierCtrl.getFactureDetail);
router.get('/admin/documents/:type/:id/imprimer', verifyToken, isAdmin, atelierCtrl.getAdminDocumentDetail);
router.get('/client/documents/:type/:id/imprimer', verifyToken, isClient, atelierCtrl.getClientDocumentDetail);

// PUBLIC — documents sans APK (token 72h, pas d'authentification)
router.get('/public/documents/:token', factureCtrl.accesPublicDocument);

// SYSTEME
router.get('/admin/systeme/stats', verifyToken, isAdmin, systemCtrl.getStats);
router.get('/admin/systeme/whatsapp', verifyToken, isAdmin, systemCtrl.getWhatsAppStatus);
router.post('/admin/systeme/whatsapp/verifier', verifyToken, isAdmin, systemCtrl.verifierWhatsApp);
router.post('/admin/systeme/nettoyage', verifyToken, isAdmin, systemCtrl.nettoyer);
router.post('/admin/systeme/reinitialiser', verifyToken, isAdmin, systemCtrl.reinitialiserAdmin);
router.post('/client/systeme/reinitialiser', verifyToken, isClient, systemCtrl.reinitialiserClient);

module.exports = router;
