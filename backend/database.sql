-- DiagAuto Connect - Base de données
CREATE DATABASE IF NOT EXISTS diagauto_connect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE diagauto_connect;

-- Table Admin
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  telephone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Clients
CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_client VARCHAR(20) UNIQUE NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  telephone VARCHAR(20),
  adresse TEXT,
  statut ENUM('en_attente', 'actif', 'suspendu') DEFAULT 'en_attente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Vehicules
CREATE TABLE vehicules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  marque VARCHAR(100) NOT NULL,
  modele VARCHAR(100) NOT NULL,
  annee INT,
  immatriculation VARCHAR(50) UNIQUE NOT NULL,
  couleur VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Table Rendez-vous
CREATE TABLE rendezvous (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  vehicule_id INT NOT NULL,
  date_rdv DATE NOT NULL,
  heure_rdv TIME NOT NULL,
  motif TEXT,
  statut ENUM('en_attente', 'confirme', 'annule', 'termine') DEFAULT 'en_attente',
  notes_admin TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (vehicule_id) REFERENCES vehicules(id)
);

-- Table Interventions
CREATE TABLE interventions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rendezvous_id INT,
  client_id INT NOT NULL,
  vehicule_id INT NOT NULL,
  description TEXT NOT NULL,
  technicien VARCHAR(100),
  date_debut DATE,
  date_fin DATE,
  statut ENUM('en_cours', 'termine', 'suspendu') DEFAULT 'en_cours',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rendezvous_id) REFERENCES rendezvous(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (vehicule_id) REFERENCES vehicules(id)
);

-- Table Devis
CREATE TABLE devis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_devis VARCHAR(20) UNIQUE NOT NULL,
  client_id INT NOT NULL,
  vehicule_id INT NOT NULL,
  intervention_id INT,
  date_devis DATE NOT NULL,
  date_validite DATE,
  statut ENUM('brouillon', 'envoye', 'accepte', 'refuse') DEFAULT 'brouillon',
  montant_ht DECIMAL(10,2) DEFAULT 0,
  tva DECIMAL(5,2) DEFAULT 20,
  montant_ttc DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (vehicule_id) REFERENCES vehicules(id),
  FOREIGN KEY (intervention_id) REFERENCES interventions(id)
);

-- Table Proforma
CREATE TABLE proformas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_proforma VARCHAR(20) UNIQUE NOT NULL,
  client_id INT NOT NULL,
  vehicule_id INT NOT NULL,
  date_proforma DATE NOT NULL,
  date_validite DATE,
  statut ENUM('brouillon', 'envoye', 'accepte', 'refuse') DEFAULT 'brouillon',
  montant_ht DECIMAL(10,2) DEFAULT 0,
  tva DECIMAL(5,2) DEFAULT 20,
  montant_ttc DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (vehicule_id) REFERENCES vehicules(id)
);

-- Table Factures
CREATE TABLE factures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_facture VARCHAR(20) UNIQUE NOT NULL,
  client_id INT NOT NULL,
  vehicule_id INT NOT NULL,
  intervention_id INT,
  devis_id INT,
  date_facture DATE NOT NULL,
  date_echeance DATE,
  statut ENUM('non_payee', 'partiellement_payee', 'payee') DEFAULT 'non_payee',
  montant_ht DECIMAL(10,2) DEFAULT 0,
  tva DECIMAL(5,2) DEFAULT 20,
  montant_ttc DECIMAL(10,2) DEFAULT 0,
  montant_paye DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (vehicule_id) REFERENCES vehicules(id),
  FOREIGN KEY (intervention_id) REFERENCES interventions(id),
  FOREIGN KEY (devis_id) REFERENCES devis(id)
);

-- Table Lignes items pour devis/proforma/facture
CREATE TABLE lignes_document (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_type ENUM('devis', 'proforma', 'facture') NOT NULL,
  document_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantite DECIMAL(10,2) DEFAULT 1,
  prix_unitaire DECIMAL(10,2) DEFAULT 0,
  montant DECIMAL(10,2) DEFAULT 0
);

-- Admin par défaut (password: admin123)
INSERT INTO admins (nom, prenom, email, password, telephone) VALUES
('Admin', 'DiagAuto', 'admin@diagauto.mg', '$2a$10$rBV2JDeWW3.vKyeCtBNmUuGFKvKlYWmg3KdpK4LzZHoHo4SmW3mXW', '+261 34 00 000 00');
