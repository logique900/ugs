import { Article, AuditLog, Client, Fournisseur, Projet, Utilisateur } from './types';

export const mockUsers: Utilisateur[] = [
  { 
    id: 'demo-super-admin', 
    nom: 'Direction Générale UGS', 
    prenom: 'Super Admin',
    email: 'superadmin@erp-management.com', 
    telephone: '+216 75 655 555',
    motDePasse: 'demo123', 
    role: 'super_admin', 
    statut: 'Actif', 
    projetsAffectes: ['1', '2', '3'],
    dateCreation: '2023-01-15',
    derniereConnexion: '2026-09-08 11:42',
    permissions: {
      peutAccorderRemise: true,
      peutModifierPrix: true,
      peutSupprimerDocuments: true,
      peutVoirMarge: true,
      peutCloturerCaisse: true,
    }
  },
  { 
    id: 'demo-admin', 
    nom: 'Mohamed Ali (Dépôt Central)', 
    prenom: 'Mohamed Ali',
    email: 'admin@erp-management.com', 
    telephone: '+216 75 655 556',
    motDePasse: 'demo123', 
    role: 'admin', 
    statut: 'Actif', 
    projetId: '1',
    projetsAffectes: ['1'],
    dateCreation: '2023-01-20',
    derniereConnexion: '2026-09-08 09:15',
    permissions: {
      peutAccorderRemise: true,
      peutModifierPrix: true,
      peutSupprimerDocuments: false,
      peutVoirMarge: true,
      peutCloturerCaisse: false,
    }
  },
  { 
    id: 'demo-comptable', 
    nom: 'Khadija Mansour', 
    prenom: 'Khadija',
    email: 'comptable@erp-management.com', 
    telephone: '+216 75 655 557',
    motDePasse: 'demo123', 
    role: 'comptable', 
    statut: 'Actif', 
    projetsAffectes: ['1', '2', '3'],
    dateCreation: '2023-03-10',
    derniereConnexion: '2026-09-07 16:30',
    permissions: {
      peutAccorderRemise: false,
      peutModifierPrix: false,
      peutSupprimerDocuments: false,
      peutVoirMarge: true,
      peutCloturerCaisse: true,
    }
  },
  { 
    id: 'demo-caissier', 
    nom: 'Anis Ben Salah', 
    prenom: 'Anis',
    email: 'caissier@erp-management.com', 
    telephone: '+216 75 655 558',
    motDePasse: 'demo123', 
    role: 'caissier', 
    statut: 'Actif', 
    projetId: '1', 
    projetsAffectes: ['1'],
    dateCreation: '2023-05-12',
    derniereConnexion: '2026-09-08 08:30',
    permissions: {
      peutAccorderRemise: false,
      peutModifierPrix: false,
      peutSupprimerDocuments: false,
      peutVoirMarge: false,
      peutCloturerCaisse: true,
    }
  },
  { 
    id: 'demo-caissier-scolaire', 
    nom: 'Rim Trabelsi (Boutique Scolaire)', 
    prenom: 'Rim',
    email: 'caissier.scolaire@erp-management.com', 
    telephone: '+216 74 000 002',
    motDePasse: 'demo123', 
    role: 'caissier', 
    statut: 'Actif', 
    projetId: '2', 
    projetsAffectes: ['2'],
    dateCreation: '2023-06-25',
    derniereConnexion: '2026-09-08 10:10',
    permissions: {
      peutAccorderRemise: false,
      peutModifierPrix: false,
      peutSupprimerDocuments: false,
      peutVoirMarge: false,
      peutCloturerCaisse: true,
    }
  },
  { 
    id: 'u-gabes', 
    nom: 'Fatma Zahra (Boutique Gabès)', 
    prenom: 'Fatma',
    email: 'gabes@erp-management.com', 
    telephone: '+216 75 000 001',
    motDePasse: 'demo123', 
    role: 'chef_projet', 
    statut: 'Actif', 
    projetId: '3', 
    projetsAffectes: ['3'],
    dateCreation: '2023-07-01',
    derniereConnexion: '2026-09-06 14:05',
    permissions: {
      peutAccorderRemise: true,
      peutModifierPrix: false,
      peutSupprimerDocuments: false,
      peutVoirMarge: true,
      peutCloturerCaisse: true,
    }
  },
  { 
    id: 'u7', 
    nom: 'Sarah Ayadi (Agent Commercial)', 
    prenom: 'Sarah',
    email: 'agent@entreprise.com', 
    telephone: '+216 75 655 559',
    motDePasse: 'agent123', 
    role: 'agent', 
    statut: 'Actif', 
    projetId: '1', 
    projetsAffectes: ['1', '3'],
    dateCreation: '2023-09-14',
    derniereConnexion: '2026-09-05 18:22',
    permissions: {
      peutAccorderRemise: true,
      peutModifierPrix: false,
      peutSupprimerDocuments: false,
      peutVoirMarge: false,
      peutCloturerCaisse: false,
    }
  },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'log-6', timestamp: '2026-08-18 09:20:00', utilisateurNom: 'Ahmed', utilisateurEmail: 'ahmed@erp-management.com', projetId: '1', projetNom: 'Boutique Sfax Centre', action: 'Vente V-00125', categorie: 'Financier', nouvelleValeur: '+450 DT' },
  { id: 'log-7', timestamp: '2026-08-18 10:15:00', utilisateurNom: 'Admin', utilisateurEmail: 'admin@erp-management.com', projetId: '1', projetNom: 'Boutique Sfax Centre', action: 'Correction stock • Laptop HP', categorie: 'Métier', nouvelleValeur: '-2 unités' },
  { id: 'log-8', timestamp: '2026-08-18 11:30:00', utilisateurNom: 'Admin', utilisateurEmail: 'admin@erp-management.com', projetId: '1', projetNom: 'Boutique Sfax Centre', action: 'Transfert • 5 × Laptop HP Sfax → Gabès', categorie: 'Métier' },
  { id: 'log-1', timestamp: '2026-08-12 02:15:30', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@erp-management.com', action: 'Connexion réussie au Portail Central', categorie: 'Sécurité' },
  { id: 'log-2', timestamp: '2026-08-12 02:10:12', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@erp-management.com', projetId: '1', projetNom: 'Projet Alpha', action: 'Context Switching: Basculement vers Projet Alpha', categorie: 'Système' },
  { id: 'log-3', timestamp: '2026-08-11 16:45:00', utilisateurNom: 'Jean Dupont', utilisateurEmail: 'jean.dupont@erp-management.com', projetId: '1', projetNom: 'Projet Alpha', action: 'Création Facture FAC-ALP-001', categorie: 'Financier', nouvelleValeur: '15000 DT TTC' },
  { id: 'log-4', timestamp: '2026-08-11 14:22:18', utilisateurNom: 'Marie Martin', utilisateurEmail: 'marie.martin@erp-management.com', projetId: '2', projetNom: 'Projet Beta', action: 'Mouvement Stock Sortie ART003', categorie: 'Métier', ancienneValeur: 'Stock 95', nouvelleValeur: 'Stock 65' },
  { id: 'log-5', timestamp: '2026-08-10 11:05:40', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@erp-management.com', action: 'Mise à jour permissions utilisateur Marie Martin', categorie: 'Sécurité' }
];

export const mockProjets: Projet[] = [
  { 
    id: '1', 
    nom: 'SOCIETE UNIVERS GSM DE SUD', 
    entrepriseNom: 'SOCIETE UNIVERS GSM DE SUD',
    codeBoutique: 'DEPOT-CENTRAL', 
    adresse: '112, OMAR IBN KHATAB ZRIG, GABES S3', 
    ville: 'Gabès', 
    gouvernorat: 'Gabès', 
    telephone: '+216 75 655 555', 
    email: 'contact@univers-gsm.tn', 
    statut: 'Active', 
    description: 'SOCIETE UNIVERS GSM DE SUD — Siège & Dépôt Central Distribution', 
    dateCreation: '2023-01-15', 
    responsable: 'Direction Générale UGS',
    matriculeFiscal: '1532846 G/A/M/000',
    rib: '04 705 012 0051487155 82',
    banque: 'Attijari Bank',
    logoUrl: '/logo.png'
  },
  { 
    id: '2', 
    nom: 'Boutique Scolaire Plus', 
    entrepriseNom: 'SOCIETE UNIVERS GSM DE SUD',
    codeBoutique: 'SCOL-001', 
    adresse: '112, OMAR IBN KHATAB ZRIG, GABES S3', 
    ville: 'Gabès', 
    gouvernorat: 'Gabès', 
    telephone: '+216 75 655 555', 
    email: 'scolaire@univers-gsm.tn', 
    statut: 'Active', 
    description: 'Point de vente spécialisé distribution Scolaire & Fournitures', 
    dateCreation: '2023-06-20', 
    responsable: 'Sami Ben Ali',
    matriculeFiscal: '1532846 G/A/M/000',
    rib: '04 705 012 0051487155 82',
    banque: 'Attijari Bank',
    logoUrl: '/logo.png'
  },
  { 
    id: '3', 
    nom: 'Boutique Gabès', 
    entrepriseNom: 'SOCIETE UNIVERS GSM DE SUD',
    codeBoutique: 'GB-SUD-001', 
    adresse: '112, OMAR IBN KHATAB ZRIG, GABES S3', 
    ville: 'Gabès', 
    gouvernorat: 'Gabès', 
    telephone: '+216 75 655 555', 
    email: 'gabes@univers-gsm.tn', 
    statut: 'Active', 
    description: 'Succursale commerciale de distribution Sud', 
    dateCreation: '2022-11-05', 
    responsable: 'Fatma Zahra',
    matriculeFiscal: '1532846 G/A/M/000',
    rib: '04 705 012 0051487155 82',
    banque: 'Attijari Bank',
    logoUrl: '/logo.png'
  },
];

export const mockArticles: Article[] = [
  { 
    id: 'mo-install', 
    projetId: '1', 
    code: 'SRV-MAIN-OEUVRE', 
    typeArticle: 'Service',
    designation: 'Main d\'œuvre (Installation & Service)', 
    famille: 'Prestation', 
    prixAchatHT: 0, 
    prixVenteHT: 50, 
    stocks: {}, 
    statut: 'Actif', 
    description: 'Frais de main d\'œuvre et d\'installation (Prix ajustable lors de la vente)' 
  },
  { 
    id: 'cahier-spirale', 
    projetId: '2', 
    code: 'SCOL-CAH-SP200', 
    typeArticle: 'Produit',
    designation: 'Cahier Spirale 200 pages', 
    famille: 'Fournitures', 
    prixAchatHT: 3.5, 
    prixVenteHT: 5.2, 
    margeBeneficiaire: 48.57,
    stocks: { '2': 150 }, 
    statut: 'Actif', 
    description: 'Cahier spirale grand format' 
  },
  { 
    id: 'stylo-bleu', 
    projetId: '2', 
    code: 'SCOL-STY-BLU', 
    typeArticle: 'Produit',
    designation: 'Stylo à bille Bleu', 
    famille: 'Fournitures', 
    prixAchatHT: 0.4, 
    prixVenteHT: 0.8, 
    margeBeneficiaire: 100,
    stocks: { '2': 500 }, 
    statut: 'Actif', 
    description: 'Stylo à bille classique bleu' 
  },
  { 
    id: 'impression-doc', 
    projetId: '2', 
    code: 'SRV-IMPRESSION', 
    typeArticle: 'Service',
    designation: 'Impression Document (N&B)', 
    famille: 'Reprographie', 
    prixAchatHT: 0, 
    prixVenteHT: 0.1, 
    stocks: {}, 
    statut: 'Actif', 
    description: 'Impression noir et blanc A4' 
  },
  { 
    id: 'samsung-a52', 
    projetId: '1', 
    code: 'TEL-SAM-A52', 
    designation: 'Ancien modèle Samsung A52', 
    famille: 'Téléphonie', 
    codeBarres: ['8806090123456'], 
    prixAchatHT: 550, 
    prixVenteHT: 780, 
    stocks: { '1': 0 }, 
    statut: 'Inactif', 
    description: 'Ancien modèle Samsung Galaxy A52' 
  },
  { 
    id: 'clavier-k120', 
    projetId: '1', 
    code: 'LOG-K120', 
    designation: 'Clavier Logitech K120', 
    famille: 'Informatique', 
    codeBarres: ['5099206020719'], 
    prixAchatHT: 28, 
    prixVenteHT: 45, 
    stocks: { '1': 25, '2': 10, '3': 5 }, 
    statut: 'Actif', 
    description: 'Clavier USB filaire Logitech K120 confortable et résistant' 
  },
  { 
    id: 'laptop-15', 
    projetId: '1', 
    code: 'PRD-000145', 
    referenceInterne: 'LAP-001',
    designation: 'Laptop HP 15', 
    famille: 'Informatique', 
    categorie: 'Informatique',
    codeBarres: ['6191234567890'], 
    prixAchatHT: 1850, 
    prixVenteHT: 2200, 
    stocks: { '1': 15, '2': 7, '3': 12 }, 
    statut: 'Actif', 
    description: 'Ordinateur portable HP 15 pouces haute performance avec écran Full HD',
    historiqueModifications: [
      {
        id: 'hist-mod-1',
        date: '2026-08-18T01:15:00.000Z',
        utilisateur: 'Mohamed Ali',
        roleUtilisateur: 'admin',
        champModifie: "Prix de vente",
        ancienneValeur: '2200 DT',
        nouvelleValeur: '2150 DT',
        remarque: 'Ajustement tarifique pour offre promotionnelle'
      },
      {
        id: 'hist-mod-2',
        date: '2026-08-18T01:10:00.000Z',
        utilisateur: 'Mohamed Ali',
        roleUtilisateur: 'admin',
        champModifie: "Catégorie",
        ancienneValeur: 'Informatique',
        nouvelleValeur: 'Ordinateurs portables',
        remarque: 'Reclassification de la catégorie'
      }
    ]
  },
  { 
    id: 'samsung-a55', 
    projetId: '1', 
    code: 'TEL-001', 
    designation: 'Samsung A55', 
    famille: 'Téléphonie', 
    categorie: 'Téléphonie',
    codeBarres: ['8806090998877'], 
    prixAchatHT: 920, 
    prixVenteHT: 1150, 
    stocks: { '1': 8 }, 
    statut: 'Actif', 
    description: 'Smartphone Samsung Galaxy A55 5G' 
  },
  { 
    id: 'hp-lj-001', 
    projetId: '1', 
    code: 'IMP-001', 
    designation: 'HP LaserJet', 
    famille: 'Imprimantes', 
    categorie: 'Imprimantes',
    codeBarres: ['193905443210'], 
    prixAchatHT: 480, 
    prixVenteHT: 650, 
    stocks: { '1': 0 }, 
    statut: 'Inactif', 
    description: 'Imprimante HP LaserJet Professionnelle monochrome' 
  },
  { 
    id: 'dell-lat-01', 
    projetId: '1', 
    code: 'ORD-DELL-01', 
    designation: 'Ordinateur Dell Latitude', 
    famille: 'Informatique', 
    categorie: 'Informatique',
    codeBarres: ['5397184123456'], 
    prixAchatHT: 1950, 
    prixVenteHT: 2450, 
    stocks: { '1': 10 }, 
    statut: 'Actif', 
    description: 'Ordinateur portable professionnel Dell Latitude' 
  },
  { 
    id: 'hp-probook-02', 
    projetId: '1', 
    code: 'ORD-HP-02', 
    designation: 'Ordinateur HP ProBook', 
    famille: 'Informatique', 
    categorie: 'Informatique',
    codeBarres: ['193905987654'], 
    prixAchatHT: 1720, 
    prixVenteHT: 2100, 
    stocks: { '1': 6 }, 
    statut: 'Actif', 
    description: 'Ordinateur portable HP ProBook' 
  },
  { 
    id: 'lenovo-tp-03', 
    projetId: '1', 
    code: 'ORD-LEN-03', 
    designation: 'Ordinateur Lenovo ThinkPad', 
    famille: 'Informatique', 
    categorie: 'Informatique',
    codeBarres: ['4580550123456'], 
    prixAchatHT: 2300, 
    prixVenteHT: 2890, 
    stocks: { "1": 4 }, 
    statut: 'Actif', 
    description: 'Ordinateur portable Lenovo ThinkPad' 
  },
  { 
    id: 'iphone-13', 
    projetId: '1', 
    code: 'APL-IPH13-128', 
    designation: 'iPhone 13 128Go', 
    famille: 'Téléphonie & Smartphones', 
    codeBarres: ['194252707203'], 
    prixAchatHT: 2100, 
    prixVenteHT: 2690, 
    stocks: { "1": 8 }, 
    
    statut: 'Actif', 
    description: 'Smartphone Apple iPhone 13 128Go',
    statsCommerciales: {
      ventesCount: 250,
      facturesCount: 15,
      devisCount: 8
    }
  },
  { id: '1', projetId: '1', code: 'ART001', designation: 'Ciment Haute Résistance 50kg', famille: 'Matériaux BTP', prixAchatHT: 12, prixVenteHT: 18, stocks: { "1": 120 }, statut: 'Actif' },
  { id: '2', projetId: '1', code: 'ART002', designation: 'Poutre Acier IPN 200', famille: 'Structure & Gros Œuvre', prixAchatHT: 140, prixVenteHT: 210, stocks: { "1": 35 }, statut: 'Actif' },
  { id: '3', projetId: '2', code: 'ART003', designation: 'Peinture Murale Écologique 10L', famille: 'Finition & Rénovation', prixAchatHT: 45, prixVenteHT: 78, stocks: { "1": 65 }, statut: 'Actif' },
  { id: '4', projetId: '2', code: 'ART004', designation: 'Parquet Chêne Massif m²', famille: 'Sols & Revêtements', prixAchatHT: 35, prixVenteHT: 62, stocks: { "1": 140 }, statut: 'Actif' },
  { id: '5', projetId: '3', code: 'ART005', designation: 'Câble Fibre Optique Armé 100m', famille: 'Câblage & Réseaux', prixAchatHT: 180, prixVenteHT: 290, stocks: { "1": 15 }, statut: 'Actif' },
  { id: '6', projetId: '3', code: 'ART006', designation: 'Armoire Réseau Informatique 42U', famille: 'Equipement Lourd', prixAchatHT: 450, prixVenteHT: 720, stocks: { "1": 6 }, statut: 'Actif' },
];

export const mockClients: Client[] = [
  { 
    id: '1', 
    projetId: '1', 
    code: 'CLI-001',
    nom: 'Bâtiment & Travaux Alpha SAS', 
    typeTier: 'Entreprise',
    matriculeFiscal: '1234567/M/A/M/000',
    email: 'contact@btp-alpha.fr', 
    telephone: '+216 71 234 567', 
    adresse: 'Zone Industrielle Voie 4', 
    ville: 'Tunis',
    pays: 'Tunisie',
    contactNom: 'Karim Mansour',
    contactPoste: 'Directeur des Approvisionnements',
    contactTel: '+216 98 123 456',
    statut: 'Actif',
    categorie: 'Grand Compte',
    plafondCredit: 50000,
    delaiPaiement: 60,
    soldeInitial: 0,
    banque: 'BIAT',
    rib: '08 001 0001234567890 45',
    scoreSolvabilite: 92,
    notes: 'Client historique fiable avec excellent historique de paiement.'
  },
  { 
    id: '2', 
    projetId: '2', 
    code: 'CLI-002',
    nom: 'RénovImmox Lyon SARL', 
    typeTier: 'Entreprise',
    matriculeFiscal: '9876543/B/N/C/000',
    email: 'achats@renovimmox.fr', 
    telephone: '+33 4 78 90 12 34', 
    adresse: '32 rue Garibaldi', 
    ville: 'Lyon',
    pays: 'France',
    contactNom: 'Sophie Delorme',
    contactPoste: 'Responsable Achats',
    contactTel: '+33 6 12 34 56 78',
    statut: 'Actif',
    categorie: 'PME',
    plafondCredit: 25000,
    delaiPaiement: 30,
    soldeInitial: 0,
    banque: 'BNP Paribas',
    rib: '30004 01234 00001234567 89',
    scoreSolvabilite: 85,
    notes: 'Projet de rénovation de 12 appartements de haut standing.'
  },
  { 
    id: '3', 
    projetId: '3', 
    code: 'CLI-003',
    nom: 'Télécom Infrastructures SA', 
    typeTier: 'Entreprise',
    matriculeFiscal: '4567891/K/P/X/000',
    email: 'projets@telecom-infra.com', 
    telephone: '+216 73 500 600', 
    adresse: 'Parc Technologique El Ghazela', 
    ville: 'Ariana',
    pays: 'Tunisie',
    contactNom: 'Amine Trabelsi',
    contactPoste: 'Chef de Projets Réseaux',
    contactTel: '+216 55 987 654',
    statut: 'Actif',
    categorie: 'Marché Public',
    plafondCredit: 80000,
    delaiPaiement: 90,
    soldeInitial: 0,
    banque: 'STB',
    rib: '10 005 0009876543210 12',
    scoreSolvabilite: 78,
    notes: 'Contrat cadre de déploiement de réseau fibre optique.'
  },
  {
    id: '4',
    projetId: '1',
    code: 'CLI-004',
    nom: 'Dr. Mehdi Ben Salah (Villa Privée)',
    typeTier: 'Particulier',
    matriculeFiscal: 'CIN: 08765432',
    email: 'm.bensalah@medecin.tn',
    telephone: '+216 22 345 678',
    adresse: 'Résidence Les Jasmins, Gammarth',
    ville: 'Tunis',
    pays: 'Tunisie',
    contactNom: 'Dr. Mehdi Ben Salah',
    contactPoste: 'Propriétaire',
    contactTel: '+216 22 345 678',
    statut: 'Actif',
    categorie: 'Particulier',
    plafondCredit: 15000,
    delaiPaiement: 0, // Paiement comptant
    soldeInitial: 0,
    banque: 'Attijari Bank',
    scoreSolvabilite: 95,
    notes: 'Paiement à la livraison / comptant.'
  }
];

export const mockFournisseurs: Fournisseur[] = [
  { 
    id: '1', 
    projetId: '1', 
    code: 'FRN-001',
    nom: 'Matériaux & Béton de France', 
    typeTier: 'Entreprise',
    matriculeFiscal: '1122334/T/A/M/000',
    email: 'sales@materiaux-france.fr', 
    telephone: '+33 1 45 67 89 10', 
    adresse: 'ZAC des Bâtisseurs, Lot 14', 
    ville: 'Marseille',
    pays: 'France',
    contactNom: 'Pierre Dubois',
    contactPoste: 'Responsable Commercial B2B',
    contactTel: '+33 6 44 55 66 77',
    statut: 'Actif',
    categorie: 'Grossiste',
    delaiPaiement: 60,
    banque: 'Société Générale',
    rib: '30003 04567 00009876543 21',
    evaluationQualite: 5,
    notes: 'Fournisseur principal de ciment et agrégats certifiés ISO 9001.'
  },
  { 
    id: '2', 
    projetId: '2', 
    code: 'FRN-002',
    nom: 'RénovPro Grossiste Peintures & Sols', 
    typeTier: 'Entreprise',
    matriculeFiscal: '5566778/R/P/L/000',
    email: 'contact@renovpro.fr', 
    telephone: '+33 4 72 00 11 22', 
    adresse: 'ZI Nord Lyon', 
    ville: 'Lyon',
    pays: 'France',
    contactNom: 'Hélène Mercier',
    contactPoste: 'Directrice des Ventes',
    contactTel: '+33 6 88 99 00 11',
    statut: 'Actif',
    categorie: 'Fabricant',
    delaiPaiement: 45,
    banque: 'Crédit Agricole',
    evaluationQualite: 4,
    notes: 'Livraisons ponctuelles sous 48h.'
  },
  { 
    id: '3', 
    projetId: '3', 
    code: 'FRN-003',
    nom: 'Optic & Network Global Tech', 
    typeTier: 'Entreprise',
    matriculeFiscal: '9988776/O/N/G/000',
    email: 'commandes@opticnetwork.com', 
    telephone: '+216 71 888 999', 
    adresse: 'Zone Portuaire Radès', 
    ville: 'Ben Arous',
    pays: 'Tunisie',
    contactNom: 'Tarek Chaabane',
    contactPoste: 'Support Technique & Logistique',
    contactTel: '+216 99 111 222',
    statut: 'Actif',
    categorie: 'Importateur',
    delaiPaiement: 30,
    banque: 'UIB',
    evaluationQualite: 5,
    notes: 'Distributeur officiel câblage fibre et baies serveurs.'
  },
  {
    id: '4',
    projetId: '1',
    code: 'FRN-004',
    nom: 'STE Électricité Générale & Sous-traitance',
    typeTier: 'Sous-traitant',
    matriculeFiscal: '7788990/E/L/S/000',
    email: 'electricite.soustraitance@gnet.tn',
    telephone: '+216 71 333 444',
    adresse: 'Avenue Habib Bourguiba',
    ville: 'Ariana',
    pays: 'Tunisie',
    contactNom: 'Mourad Trabelsi',
    contactPoste: 'Gérant & Ingénieur Chef',
    contactTel: '+216 20 444 555',
    statut: 'Actif',
    categorie: 'Sous-traitant',
    delaiPaiement: 30,
    banque: 'BH Bank',
    evaluationQualite: 4,
    notes: 'Équipe agréée pour les raccordements moyenne et haute tension.'
  }
];

export const mockVentes = [
  { 
    id: 'hist-a52', 
    projetId: '1', 
    numero: 'FAC-HIST-2025-089', 
    clientId: '1', 
    clientNom: 'Société Générale de Construction',
    date: '2025-11-20', 
    dateEcheance: '2025-12-20',
    montantHT: 1560, 
    montantTTC: 1856.4, 
    montantPaye: 1856.4,
    statut: 'Payée' as const,
    modePaiement: 'Virement' as const,
    lignes: [
      { articleId: 'samsung-a52', code: 'TEL-SAM-A52', designation: 'Ancien modèle Samsung A52', quantite: 2, prixUnitaireHT: 780, remise: 0, tva: 19, totalHT: 1560, totalTTC: 1856.4 }
    ],
    notes: 'Facture archivée'
  },
  { 
    id: '1', 
    projetId: '1', 
    numero: 'FAC-ALP-001', 
    clientId: '1', 
    date: '2026-07-15', 
    dateEcheance: '2026-09-15',
    montantHT: 12500, 
    montantTTC: 14875, 
    montantPaye: 14875,
    statut: 'Payée' as const,
    modePaiement: 'Virement' as const,
    lignes: [
      { articleId: '1', code: 'ART001', designation: 'Ciment Haute Résistance 50kg', quantite: 500, prixUnitaireHT: 18, remise: 5, tva: 19, totalHT: 8550, totalTTC: 10174.5 },
      { articleId: '2', code: 'ART002', designation: 'Poutre Acier IPN 200', quantite: 20, prixUnitaireHT: 210, remise: 0, tva: 19, totalHT: 3950, totalTTC: 4700.5 }
    ],
    notes: 'Livraison sur chantier Voie 4 - Règlement par virement bancaire BIAT'
  },
  { 
    id: '2', 
    projetId: '1', 
    numero: 'FAC-ALP-002', 
    clientId: '1', 
    date: '2026-06-10', 
    dateEcheance: '2026-08-10',
    montantHT: 18200, 
    montantTTC: 21658, 
    montantPaye: 5000,
    statut: 'Facture' as const,
    modePaiement: 'Crédit' as const,
    lignes: [
      { articleId: '2', code: 'ART002', designation: 'Poutre Acier IPN 200', quantite: 80, prixUnitaireHT: 210, remise: 2, tva: 19, totalHT: 16464, totalTTC: 19592.16 },
      { articleId: '1', code: 'ART001', designation: 'Ciment Haute Résistance 50kg', quantite: 100, prixUnitaireHT: 18, remise: 0, tva: 19, totalHT: 1736, totalTTC: 2065.84 }
    ],
    notes: 'Échéance dépassée de 5 jours - En cours de traitement'
  },
  { 
    id: '3', 
    projetId: '1', 
    numero: 'DEV-ALP-042', 
    clientId: '1', 
    date: '2026-08-12', 
    dateEcheance: '2026-09-12',
    montantHT: 8500, 
    montantTTC: 10115, 
    montantPaye: 0,
    statut: 'Devis' as const,
    modePaiement: 'Virement' as const,
    lignes: [
      { articleId: '1', code: 'ART001', designation: 'Ciment Haute Résistance 50kg', quantite: 400, prixUnitaireHT: 18, remise: 0, tva: 19, totalHT: 7200, totalTTC: 8568 },
      { articleId: '2', code: 'ART002', designation: 'Poutre Acier IPN 200', quantite: 6, prixUnitaireHT: 210, remise: 0, tva: 19, totalHT: 1300, totalTTC: 1547 }
    ],
    notes: 'Devis valable 30 jours'
  },
  { 
    id: '4', 
    projetId: '2', 
    numero: 'FAC-BET-001', 
    clientId: '2', 
    date: '2026-07-01', 
    dateEcheance: '2026-07-31',
    montantHT: 15400, 
    montantTTC: 18326, 
    montantPaye: 0,
    statut: 'Facture' as const,
    modePaiement: 'Crédit' as const,
    lignes: [
      { articleId: '3', code: 'ART003', designation: 'Peinture Murale Écologique 10L', quantite: 120, prixUnitaireHT: 78, remise: 0, tva: 19, totalHT: 9360, totalTTC: 11138.4 },
      { articleId: '4', code: 'ART004', designation: 'Parquet Chêne Massif m²', quantite: 100, prixUnitaireHT: 62, remise: 5, tva: 19, totalHT: 6040, totalTTC: 7187.6 }
    ],
    notes: 'Retard de paiement > 15 jours - Relance Niveau 1 transmise'
  },
  { 
    id: '5', 
    projetId: '3', 
    numero: 'FAC-GAM-001', 
    clientId: '3', 
    date: '2026-05-15', 
    dateEcheance: '2026-08-15',
    montantHT: 32000, 
    montantTTC: 38080, 
    montantPaye: 38080,
    statut: 'Payée' as const,
    modePaiement: 'Virement' as const,
    lignes: [
      { articleId: '5', code: 'ART005', designation: 'Câble Fibre Optique Armé 100m', quantite: 80, prixUnitaireHT: 290, remise: 0, tva: 19, totalHT: 23200, totalTTC: 27608 },
      { articleId: '6', code: 'ART006', designation: 'Armoire Réseau Informatique 42U', quantite: 12, prixUnitaireHT: 720, remise: 0, tva: 19, totalHT: 8800, totalTTC: 10472 }
    ],
    notes: 'Marché Public réglé par mandat administratif'
  },
  { 
    id: '6', 
    projetId: '1', 
    numero: 'FAC-ALP-003', 
    clientId: '4', 
    date: '2026-08-05', 
    dateEcheance: '2026-08-05',
    montantHT: 4200, 
    montantTTC: 4998, 
    montantPaye: 4998,
    statut: 'Payée' as const,
    modePaiement: 'Espèces' as const,
    lignes: [
      { articleId: '1', code: 'ART001', designation: 'Ciment Haute Résistance 50kg', quantite: 200, prixUnitaireHT: 18, remise: 0, tva: 19, totalHT: 3600, totalTTC: 4284 },
      { articleId: '2', code: 'ART002', designation: 'Poutre Acier IPN 200', quantite: 3, prixUnitaireHT: 210, remise: 5, tva: 19, totalHT: 600, totalTTC: 714 }
    ],
    notes: 'Paiement comptant en espèces à la livraison'
  }
];

export const mockAchats = [
  { 
    id: '1', 
    projetId: '1', 
    numero: 'ACH-ALP-001', 
    fournisseurId: '1', 
    date: '2026-07-10', 
    dateEcheance: '2026-09-10',
    montantHT: 8400, 
    montantTTC: 9996, 
    montantRegle: 9996,
    statut: 'Payé' as const,
    modePaiement: 'Virement' as const,
    lignes: [
      { articleId: '1', code: 'ART001', designation: 'Ciment Haute Résistance 50kg', quantite: 700, prixUnitaireHT: 12, totalHT: 8400, totalTTC: 9996 }
    ],
    notes: 'Bon de livraison fournisseur N° BL-9988'
  },
  { 
    id: '2', 
    projetId: '1', 
    numero: 'ACH-ALP-002', 
    fournisseurId: '1', 
    date: '2026-08-01', 
    dateEcheance: '2026-09-30',
    montantHT: 14000, 
    montantTTC: 16660, 
    montantRegle: 0,
    statut: 'Reçu' as const,
    modePaiement: 'Virement' as const,
    lignes: [
      { articleId: '2', code: 'ART002', designation: 'Poutre Acier IPN 200', quantite: 100, prixUnitaireHT: 140, totalHT: 14000, totalTTC: 16660 }
    ],
    notes: 'Matériaux contrôlés et stockés au parc principal'
  },
  { 
    id: '3', 
    projetId: '2', 
    numero: 'ACH-BET-001', 
    fournisseurId: '2', 
    date: '2026-07-20', 
    dateEcheance: '2026-09-05',
    montantHT: 6500, 
    montantTTC: 7735, 
    montantRegle: 7735,
    statut: 'Payé' as const,
    modePaiement: 'Chèque' as const,
    lignes: [
      { articleId: '3', code: 'ART003', designation: 'Peinture Murale Écologique 10L', quantite: 100, prixUnitaireHT: 45, totalHT: 4500, totalTTC: 5355 },
      { articleId: '4', code: 'ART004', designation: 'Parquet Chêne Massif m²', quantite: 55, prixUnitaireHT: 35, totalHT: 2000, totalTTC: 2380 }
    ],
    notes: 'Règlement par chèque N° CHQ-445588'
  },
  { 
    id: '4', 
    projetId: '3', 
    numero: 'ACH-GAM-001', 
    fournisseurId: '3', 
    date: '2026-07-25', 
    dateEcheance: '2026-08-25',
    montantHT: 18000, 
    montantTTC: 21420, 
    montantRegle: 21420,
    statut: 'Payé' as const,
    modePaiement: 'Virement' as const,
    lignes: [
      { articleId: '5', code: 'ART005', designation: 'Câble Fibre Optique Armé 100m', quantite: 100, prixUnitaireHT: 180, totalHT: 18000, totalTTC: 21420 }
    ],
    notes: 'Lot réceptionné conforme aux normes ISO'
  },
  { 
    id: '5', 
    projetId: '1', 
    numero: 'ACH-ALP-003', 
    fournisseurId: '4', 
    date: '2026-08-08', 
    dateEcheance: '2026-09-08',
    montantHT: 5200, 
    montantTTC: 6188, 
    montantRegle: 0,
    statut: 'Commandé' as const,
    modePaiement: 'Virement' as const,
    lignes: [
      { articleId: '2', code: 'ART002', designation: 'Prestation Raccordement Réseau', quantite: 1, prixUnitaireHT: 5200, totalHT: 5200, totalTTC: 6188 }
    ],
    notes: 'Prestation sous-traitance électricité bâtiment A'
  }
];

export const mockReglements = [
  {
    id: 'reg-1',
    projetId: '1',
    numeroPiece: 'ENC-2026-001',
    type: 'Encaissement' as const,
    tierId: '1',
    tierNom: 'Bâtiment & Travaux Alpha SAS',
    tierType: 'Client' as const,
    documentRef: 'FAC-ALP-001',
    date: '2026-07-20',
    montant: 14875,
    modePaiement: 'Virement' as const,
    banque: 'BIAT',
    referencePaiement: 'VIR-BIAT-88741',
    notes: 'Règlement total facture FAC-ALP-001',
    statut: 'Validé' as const
  },
  {
    id: 'reg-2',
    projetId: '1',
    numeroPiece: 'ENC-2026-002',
    type: 'Encaissement' as const,
    tierId: '1',
    tierNom: 'Bâtiment & Travaux Alpha SAS',
    tierType: 'Client' as const,
    documentRef: 'FAC-ALP-002',
    date: '2026-08-02',
    montant: 5000,
    modePaiement: 'Chèque' as const,
    banque: 'BIAT',
    referencePaiement: 'CHQ-889922',
    notes: 'Acompte 1 sur facture FAC-ALP-002',
    statut: 'Validé' as const
  },
  {
    id: 'reg-3',
    projetId: '1',
    numeroPiece: 'ENC-2026-003',
    type: 'Encaissement' as const,
    tierId: '4',
    tierNom: 'Dr. Mehdi Ben Salah',
    tierType: 'Client' as const,
    documentRef: 'FAC-ALP-003',
    date: '2026-08-05',
    montant: 4998,
    modePaiement: 'Espèces' as const,
    referencePaiement: 'CASH-REC-005',
    notes: 'Paiement comptant en caisse',
    statut: 'Validé' as const
  },
  {
    id: 'reg-4',
    projetId: '1',
    numeroPiece: 'DEC-2026-001',
    type: 'Décaissement' as const,
    tierId: '1',
    tierNom: 'Matériaux & Béton de France',
    tierType: 'Fournisseur' as const,
    documentRef: 'ACH-ALP-001',
    date: '2026-07-28',
    montant: 9996,
    modePaiement: 'Virement' as const,
    banque: 'BIAT',
    referencePaiement: 'VIR-FOURN-0012',
    notes: 'Paiement fournisseur ciment',
    statut: 'Validé' as const
  }
];

export const mockRelances = [
  {
    id: 'rel-1',
    projetId: '1',
    clientId: '1',
    clientNom: 'Bâtiment & Travaux Alpha SAS',
    date: '2026-08-12',
    niveau: 1 as const,
    montantTotalDu: 16658,
    facturesConcernees: ['FAC-ALP-002'],
    statut: 'Envoyée' as const,
    notes: 'Rappel amical envoyé par email avec relevé de facture joint.'
  },
  {
    id: 'rel-2',
    projetId: '2',
    clientId: '2',
    clientNom: 'RénovImmox Lyon SARL',
    date: '2026-08-10',
    niveau: 2 as const,
    montantTotalDu: 18326,
    facturesConcernees: ['FAC-BET-001'],
    statut: 'Envoyée' as const,
    notes: 'Relance formelle Niveau 2 avec avertissement sur intérêts de retard.'
  }
];

export const mockMouvements = [
  { id: '1', projetId: '1', articleId: '1', type: 'Entrée' as const, quantite: 50, date: '2026-07-20', motif: 'Livraison Fournisseur', referencePiece: 'BL-9988', auteur: 'Jean Dupont' },
  { id: '2', projetId: '1', articleId: '2', type: 'Sortie' as const, quantite: 5, date: '2026-07-22', motif: 'Sortie Chantier Voie 4', referencePiece: 'FAC-ALP-001', auteur: 'Jean Dupont' },
  { id: '3', projetId: '2', articleId: '3', type: 'Entrée' as const, quantite: 30, date: '2026-07-25', motif: 'Approvisionnement Peinture', referencePiece: 'ACH-BET-001', auteur: 'Marie Martin' },
  { id: '4', projetId: '3', articleId: '5', type: 'Sortie' as const, quantite: 4, date: '2026-08-01', motif: 'Déploiement Ligne Fibre', referencePiece: 'FAC-GAM-001', auteur: 'Super Admin' },
];

export const mockMonthlyData: Record<string, Array<{ mois: string; ventes: number; achats: number }>> = {
  all: [
    { mois: 'Jan', ventes: 12500, achats: 8200 },
    { mois: 'Fév', ventes: 15200, achats: 9100 },
    { mois: 'Mar', ventes: 18900, achats: 11400 },
    { mois: 'Avr', ventes: 14300, achats: 7800 },
    { mois: 'Mai', ventes: 21000, achats: 13500 },
    { mois: 'Juin', ventes: 24500, achats: 14200 },
    { mois: 'Juil', ventes: 19800, achats: 12000 },
    { mois: 'Août', ventes: 17400, achats: 9500 },
    { mois: 'Sept', ventes: 26800, achats: 16100 },
    { mois: 'Oct', ventes: 29500, achats: 18300 },
    { mois: 'Nov', ventes: 31200, achats: 19400 },
    { mois: 'Déc', ventes: 35000, achats: 21000 },
  ],
  '1': [
    { mois: 'Jan', ventes: 8000, achats: 5000 },
    { mois: 'Fév', ventes: 9500, achats: 6000 },
    { mois: 'Mar', ventes: 12000, achats: 7500 },
    { mois: 'Avr', ventes: 9000, achats: 5200 },
    { mois: 'Mai', ventes: 13500, achats: 8800 },
    { mois: 'Juin', ventes: 15000, achats: 9100 },
    { mois: 'Juil', ventes: 12500, achats: 7800 },
    { mois: 'Août', ventes: 11000, achats: 6200 },
    { mois: 'Sept', ventes: 17000, achats: 10500 },
    { mois: 'Oct', ventes: 18500, achats: 11200 },
    { mois: 'Nov', ventes: 19800, achats: 12000 },
    { mois: 'Déc', ventes: 22000, achats: 13500 },
  ],
  '2': [
    { mois: 'Jan', ventes: 4500, achats: 3200 },
    { mois: 'Fév', ventes: 5700, achats: 3100 },
    { mois: 'Mar', ventes: 6900, achats: 3900 },
    { mois: 'Avr', ventes: 5300, achats: 2600 },
    { mois: 'Mai', ventes: 7500, achats: 4700 },
    { mois: 'Juin', ventes: 9500, achats: 5100 },
    { mois: 'Juil', ventes: 7300, achats: 4200 },
    { mois: 'Août', ventes: 6400, achats: 3300 },
    { mois: 'Sept', ventes: 9800, achats: 5600 },
    { mois: 'Oct', ventes: 11000, achats: 7100 },
    { mois: 'Nov', ventes: 11400, achats: 7400 },
    { mois: 'Déc', ventes: 13000, achats: 7500 },
  ],
  '3': [
    { mois: 'Jan', ventes: 1200, achats: 800 },
    { mois: 'Fév', ventes: 1500, achats: 900 },
    { mois: 'Mar', ventes: 1800, achats: 1100 },
    { mois: 'Avr', ventes: 1400, achats: 850 },
    { mois: 'Mai', ventes: 2000, achats: 1200 },
    { mois: 'Juin', ventes: 2200, achats: 1300 },
    { mois: 'Juil', ventes: 1900, achats: 1100 },
    { mois: 'Août', ventes: 1600, achats: 950 },
    { mois: 'Sept', ventes: 2300, achats: 1400 },
    { mois: 'Oct', ventes: 2500, achats: 1500 },
    { mois: 'Nov', ventes: 2600, achats: 1600 },
    { mois: 'Déc', ventes: 2800, achats: 1700 },
  ]
};

export const mockObjectifs: any[] = [
  {
    id: 'obj-1',
    type: 'Boutique',
    cibleId: '1',
    cibleNom: 'Sfax Centre',
    periode: '2026-08',
    montantCible: 50000,
  },
  {
    id: 'obj-2',
    type: 'Caissier',
    cibleId: '2',
    cibleNom: 'Ahmed',
    periode: '2026-08',
    montantCible: 15000,
  }
];

export const mockBonsDeLivraison: any[] = [
  {
    id: 'bl-101',
    numero: 'BL-2026-000125',
    projetId: '1',
    boutiqueNom: 'ERP Management - Stock Central',
    dateCreation: '2026-08-28',
    dateLivraison: '2026-08-30',
    dateExpedition: '2026-08-29',
    statut: 'Livré',
    commandeRef: 'CMD-2026-000087',
    factureRef: 'FAC-2026-000098',
    clientId: '1',
    clientNom: 'Bâtiment & Travaux Alpha SAS',
    matriculeFiscalClient: '1234567/M/A/M/000',
    adresseFacturation: 'Zone Industrielle Voie 4, Tunis',
    adresseLivraison: 'Chantier Principal Voie 4 - Hangar B, Tunis',
    telephoneClient: '+216 71 234 567',
    emailClient: 'contact@btp-alpha.fr',
    transporteur: 'ERP Management Express Logistics',
    chauffeur: 'Slim Amara',
    immatriculation: '210 TN 4589',
    fraisLivraison: 45,
    notes: 'Livraison prioritaire avec déchargement grue.',
    entrepôtSource: 'Société UGS Sfax',
    signatureReception: 'Signé par K. Mansour',
    nomReceptionnaire: 'Karim Mansour',
    dateReception: '2026-08-30 10:15',
    stockOperationId: 'OUT-2026-000087',
    isStockDecremented: true,
    lignes: [
      {
        id: 'lbl-1',
        articleId: '1',
        code: 'ART001',
        designation: 'Ciment Haute Résistance 50kg',
        unite: 'Sac 50kg',
        qteCommandee: 100,
        qteDejaLivree: 0,
        qteALivrer: 100,
        qteLivree: 100,
        prixUnitaireHT: 18,
        tauxTVA: 19,
        totalHT: 1800,
        totalTTC: 2142
      },
      {
        id: 'lbl-2',
        articleId: '2',
        code: 'ART002',
        designation: 'Poutre Acier IPN 200',
        unite: 'Unité 6m',
        qteCommandee: 10,
        qteDejaLivree: 0,
        qteALivrer: 10,
        qteLivree: 10,
        prixUnitaireHT: 210,
        tauxTVA: 19,
        totalHT: 2100,
        totalTTC: 2499
      }
    ],
    montantHT: 3900,
    montantTVA: 741,
    montantTTC: 4641,
    auteurNom: 'Ahmed (Magasinier Central)',
    historiqueStatuts: [
      { statut: 'Brouillon', date: '2026-08-28 08:30', utilisateur: 'Ahmed' },
      { statut: 'Validé', date: '2026-08-28 09:10', utilisateur: 'Ahmed', commentaire: 'Validation commande et réservation stock' },
      { statut: 'En préparation', date: '2026-08-28 14:00', utilisateur: 'Magasin Sfax' },
      { statut: 'Expédié', date: '2026-08-29 08:00', utilisateur: 'Slim Amara (Chauffeur)' },
      { statut: 'Livré', date: '2026-08-30 10:15', utilisateur: 'Slim Amara', commentaire: 'Reçu et conforme' }
    ]
  },
  {
    id: 'bl-102',
    numero: 'BL-2026-000126',
    projetId: '1',
    boutiqueNom: 'ERP Management - Stock Central',
    dateCreation: '2026-08-29',
    dateLivraison: '2026-08-31',
    statut: 'Livraison partielle',
    commandeRef: 'CMD-2026-000092',
    clientId: '2',
    clientNom: 'RénovImmox Lyon SARL',
    matriculeFiscalClient: '9876543/B/N/C/000',
    adresseFacturation: '32 rue Garibaldi, Lyon',
    adresseLivraison: 'Chantier Rénovation Bat A, Tunis',
    telephoneClient: '+33 4 78 90 12 34',
    emailClient: 'achats@renovimmox.fr',
    transporteur: 'Société Rapide Transport',
    chauffeur: 'Mohamed Tounsi',
    immatriculation: '198 TN 7712',
    notes: 'Livraison partielle (Reste 40m² de Parquet à expédier la semaine prochaine).',
    stockOperationId: 'OUT-2026-000092',
    isStockDecremented: true,
    lignes: [
      {
        id: 'lbl-3',
        articleId: '3',
        code: 'ART003',
        designation: 'Peinture Murale Écologique 10L',
        unite: 'Pot 10L',
        qteCommandee: 50,
        qteDejaLivree: 0,
        qteALivrer: 50,
        qteLivree: 50,
        prixUnitaireHT: 78,
        tauxTVA: 19,
        totalHT: 3900,
        totalTTC: 4641
      },
      {
        id: 'lbl-4',
        articleId: '4',
        code: 'ART004',
        designation: 'Parquet Chêne Massif m²',
        unite: 'm²',
        qteCommandee: 100,
        qteDejaLivree: 0,
        qteALivrer: 100,
        qteLivree: 60, // Livré partiellement 60 / 100
        prixUnitaireHT: 62,
        tauxTVA: 19,
        totalHT: 3720,
        totalTTC: 4426.8
      }
    ],
    montantHT: 7620,
    montantTVA: 1447.8,
    montantTTC: 9067.8,
    auteurNom: 'Sarah (Agent Commercial)'
  },
  {
    id: 'bl-103',
    numero: 'BL-2026-000127',
    projetId: '2',
    boutiqueNom: 'ERP Management - Scolaire Plus',
    dateCreation: '2026-08-30',
    dateLivraison: '2026-08-30',
    statut: 'En préparation',
    commandeRef: 'CMD-2026-000099',
    clientId: '4',
    clientNom: 'Dr. Mehdi Ben Salah (Villa Privée)',
    adresseLivraison: 'Résidence Les Jasmins, Gammarth',
    telephoneClient: '+216 22 345 678',
    emailClient: 'm.bensalah@medecin.tn',
    notes: 'Colis fragile - Matériel informatique & fournitures.',
    stockOperationId: 'OUT-2026-000099',
    isStockDecremented: true,
    lignes: [
      {
        id: 'lbl-5',
        articleId: 'clavier-k120',
        code: 'LOG-K120',
        designation: 'Clavier Logitech K120',
        unite: 'Pièce',
        qteCommandee: 5,
        qteDejaLivree: 0,
        qteALivrer: 5,
        qteLivree: 5,
        prixUnitaireHT: 45,
        tauxTVA: 19,
        totalHT: 225,
        totalTTC: 267.75
      }
    ],
    montantHT: 225,
    montantTVA: 42.75,
    montantTTC: 267.75,
    auteurNom: 'Chef de Groupe'
  }
];

export const mockStockOperations: any[] = [
  {
    id: 'so-1',
    operationNumber: 'OUT-2026-000087',
    type: 'SORTIE',
    projetId: '1',
    warehouseId: 'Société UGS Sfax',
    referenceType: 'BL',
    referenceId: 'bl-101',
    referenceNumero: 'BL-2026-000125',
    status: 'EFFECTUE',
    createdAt: '2026-08-28 09:10',
    createdBy: 'u1',
    createdByName: 'Ahmed (Magasinier)',
    lignes: [
      { articleId: '1', articleNom: 'Ciment Haute Résistance 50kg', articleCode: 'ART001', quantite: 100 },
      { articleId: '2', articleNom: 'Poutre Acier IPN 200', articleCode: 'ART002', quantite: 10 }
    ],
    motif: 'Sortie de stock contrôlée pour Bon de Livraison BL-2026-000125'
  },
  {
    id: 'so-2',
    operationNumber: 'OUT-2026-000092',
    type: 'SORTIE',
    projetId: '1',
    warehouseId: 'Société UGS Sfax',
    referenceType: 'BL',
    referenceId: 'bl-102',
    referenceNumero: 'BL-2026-000126',
    status: 'EFFECTUE',
    createdAt: '2026-08-29 11:20',
    createdBy: 'u7',
    createdByName: 'Sarah',
    lignes: [
      { articleId: '3', articleNom: 'Peinture Murale Écologique 10L', articleCode: 'ART003', quantite: 50 },
      { articleId: '4', articleNom: 'Parquet Chêne Massif m²', articleCode: 'ART004', quantite: 60 }
    ],
    motif: 'Sortie partielle pour Bon de Livraison BL-2026-000126'
  }
];

export const mockRetoursMarchandise: any[] = [
  {
    id: 'ret-1',
    numero: 'RET-2026-000001',
    blId: 'bl-101',
    blNumero: 'BL-2026-000125',
    clientId: '1',
    clientNom: 'Bâtiment & Travaux Alpha SAS',
    projetId: '1',
    date: '2026-08-30 11:00',
    motifGeneral: 'Poche de ciment légèrement mouillée lors du chargement',
    lignes: [
      {
        articleId: '1',
        designation: 'Ciment Haute Résistance 50kg',
        qteLivree: 100,
        qteRetournee: 2,
        prixUnitaireHT: 18,
        totalHT: 36,
        motifSpecifique: 'Sac endommagé'
      }
    ],
    stockOperationId: 'IN-2026-000001',
    statut: 'Validé',
    auteurNom: 'Ahmed'
  }
];

export const mockBonsDAchat: any[] = [
  {
    id: 'ba-201',
    numero: 'BA-2026-000045',
    projetId: '1',
    boutiqueNom: 'ERP Management - Stock Central',
    fournisseurId: 'f1',
    fournisseurNom: 'Cimenterie Nationale de Tunisie (CNT)',
    matriculeFiscalFournisseur: '0894562/A/M/000',
    telephoneFournisseur: '+216 71 888 999',
    emailFournisseur: 'commandes@cnt.tn',
    adresseFournisseur: 'Zone Industrielle Gabès, Tunisie',
    contactFournisseur: 'M. Slim Ben Amor',
    dateCreation: '2026-08-25',
    datePrevueReception: '2026-08-30',
    statut: 'RÉCEPTION PARTIELLE',
    auteurId: 'u1',
    auteurNom: 'Mohamed Ali (Chef Achats ERP Management)',
    conditionsAchat: 'Paiement à 30 jours fin de mois après livraison conforme',
    remiseGlobalHT: 0,
    fraisAnnexes: 120,
    observations: 'Livraison par camion plateau à décharger au Quai A de la Société UGS.',
    lignes: [
      {
        id: 'lba-1',
        articleId: '1',
        code: 'ART001',
        designation: 'Ciment Haute Résistance 50kg',
        unite: 'Sac',
        qteCommandee: 500,
        qteDejaRecue: 300,
        qteARecevoir: 200,
        qteRecue: 300,
        prixUnitaireHT: 16.5,
        tauxTVA: 19,
        totalHT: 8250,
        totalTTC: 9817.5
      },
      {
        id: 'lba-2',
        articleId: '2',
        code: 'ART002',
        designation: 'Poutre Acier IPN 200',
        unite: 'Pièce',
        qteCommandee: 40,
        qteDejaRecue: 40,
        qteARecevoir: 0,
        qteRecue: 40,
        prixUnitaireHT: 180,
        tauxTVA: 19,
        totalHT: 7200,
        totalTTC: 8568
      }
    ],
    receptions: [
      {
        id: 'rec-1',
        date: '2026-08-28 14:30',
        stockOperationId: 'IN-2026-000087',
        auteurNom: 'Ahmed (Magasinier)',
        lignes: [
          { articleId: '1', designation: 'Ciment Haute Résistance 50kg', qteRecue: 300 },
          { articleId: '2', designation: 'Poutre Acier IPN 200', qteRecue: 40 }
        ],
        notes: 'Première tranche reçue conforme. Reste 200 sacs de ciment.'
      }
    ],
    montantHT: 15450,
    montantTVA: 2935.5,
    montantTTC: 18385.5,
    isStockIncremented: true,
    stockOperationId: 'IN-2026-000087',
    historiqueStatuts: [
      { statut: 'BROUILLON', date: '2026-08-25 09:00', utilisateur: 'Mohamed Ali' },
      { statut: 'APPROUVÉ', date: '2026-08-25 11:30', utilisateur: 'Directeur ERP Management' },
      { statut: 'COMMANDÉ', date: '2026-08-25 14:00', utilisateur: 'Mohamed Ali' },
      { statut: 'RÉCEPTION PARTIELLE', date: '2026-08-28 14:30', utilisateur: 'Ahmed (Magasinier)' }
    ]
  },
  {
    id: 'ba-202',
    numero: 'BA-2026-000046',
    projetId: '1',
    boutiqueNom: 'ERP Management - Stock Central',
    fournisseurId: 'f2',
    fournisseurNom: 'Aciérie & Métal du Sud',
    matriculeFiscalFournisseur: '0123456/B/M/000',
    telephoneFournisseur: '+216 74 444 555',
    emailFournisseur: 'contact@acierie-sud.tn',
    adresseFournisseur: 'Route de Gabès km 3, Sfax',
    contactFournisseur: 'Mme. Houda Karray',
    dateCreation: '2026-08-29',
    datePrevueReception: '2026-09-02',
    statut: 'COMMANDÉ',
    auteurId: 'u1',
    auteurNom: 'Mohamed Ali (Chef Achats ERP Management)',
    conditionsAchat: 'Règlement au comptoir à la récepton',
    remiseGlobalHT: 150,
    fraisAnnexes: 0,
    observations: 'Commande urgente pour réapprovisionnement peinture et quincaillerie.',
    lignes: [
      {
        id: 'lba-3',
        articleId: '3',
        code: 'ART003',
        designation: 'Peinture Murale Écologique 10L',
        unite: 'Bidon',
        qteCommandee: 120,
        qteDejaRecue: 0,
        qteARecevoir: 120,
        qteRecue: 0,
        prixUnitaireHT: 42,
        tauxTVA: 19,
        totalHT: 5040,
        totalTTC: 5997.6
      }
    ],
    receptions: [],
    montantHT: 4890,
    montantTVA: 929.1,
    montantTTC: 5819.1,
    isStockIncremented: false,
    historiqueStatuts: [
      { statut: 'BROUILLON', date: '2026-08-29 10:00', utilisateur: 'Mohamed Ali' },
      { statut: 'APPROUVÉ', date: '2026-08-29 11:00', utilisateur: 'Directeur ERP Management' },
      { statut: 'COMMANDÉ', date: '2026-08-29 11:15', utilisateur: 'Mohamed Ali' }
    ]
  }
];

export const mockBonsDeSortie: any[] = [
  {
    id: 'bs-301',
    numero: 'BS-2026-000032',
    projetId: '1',
    boutiqueNom: 'ERP Management - Stock Central',
    dateCreation: '2026-08-29',
    heureCreation: '10:15',
    statut: 'SORTIE EFFECTUÉE',
    auteurId: 'u1',
    auteurNom: 'Mohamed Ali',
    demandeur: 'Sami Ben Amor',
    serviceDepartement: 'Maintenance & Service Technique',
    responsableValidation: 'M. Kamel (Chef Service)',
    motif: 'Consommation interne',
    motifJustification: 'Utilisation pour réfection et travaux dans l\'entrepôt B',
    entrepotSource: 'Société UGS - Sfax',
    lignes: [
      {
        id: 'lbs-1',
        articleId: '3',
        code: 'ART003',
        designation: 'Peinture Murale Écologique 10L',
        unite: 'Bidon',
        stockDisponible: 85,
        qteDemandee: 5,
        qteSortie: 5,
        stockApres: 80,
        prixUnitaireHT: 45,
        totalHT: 225
      }
    ],
    observations: 'Sortie validée par le chef de dépôt.',
    isStockDecremented: true,
    stockOperationId: 'OUT-2026-000099',
    historiqueStatuts: [
      { statut: 'BROUILLON', date: '2026-08-29 10:15', utilisateur: 'Sami' },
      { statut: 'VALIDÉ', date: '2026-08-29 10:30', utilisateur: 'Mohamed Ali' },
      { statut: 'SORTIE EFFECTUÉE', date: '2026-08-29 10:45', utilisateur: 'Ahmed (Magasinier)' }
    ]
  },
  {
    id: 'bs-302',
    numero: 'BS-2026-000033',
    projetId: '1',
    boutiqueNom: 'ERP Management - Stock Central',
    dateCreation: '2026-08-30',
    heureCreation: '08:45',
    statut: 'EN ATTENTE',
    auteurId: 'u7',
    auteurNom: 'Sarah',
    demandeur: 'Service Commercial ERP Management',
    serviceDepartement: 'Marketing & Échantillons Client',
    responsableValidation: 'Mme. Hela (Responsable Ventes)',
    motif: 'Échantillon',
    motifJustification: 'Mise à disposition pour démonstration lors du salon BTP Sfax',
    entrepotSource: 'Société UGS',
    lignes: [
      {
        id: 'lbs-2',
        articleId: '4',
        code: 'ART004',
        designation: 'Parquet Chêne Massif m²',
        unite: 'm²',
        stockDisponible: 120,
        qteDemandee: 10,
        qteSortie: 10,
        stockApres: 110,
        prixUnitaireHT: 85,
        totalHT: 850
      }
    ],
    observations: 'Échantillons à retourner ou passer en perte si découpés.',
    isStockDecremented: false,
    historiqueStatuts: [
      { statut: 'BROUILLON', date: '2026-08-30 08:45', utilisateur: 'Sarah' },
      { statut: 'EN ATTENTE', date: '2026-08-30 09:00', utilisateur: 'Sarah' }
    ]
  }
];

export const mockSessionsCaisse: any[] = [
  {
    id: 'ses-1',
    projetId: '2',
    utilisateurId: 'demo-caissier-1',
    utilisateurNom: 'Yassine (Caissier Gabès)',
    dateOuverture: '2026-09-08 08:30',
    dateFermeture: '2026-09-08 17:00',
    soldeInitial: 350.000,
    soldeFinalTheorique: 1820.500,
    soldeFinalReel: 1820.500,
    ecart: 0,
    statut: 'Fermee',
    notes: 'Journée conforme, aucun écart.'
  },
  {
    id: 'ses-2',
    projetId: '3',
    utilisateurId: 'demo-caissier-2',
    utilisateurNom: 'Amira (Caissière Scolaire Plus)',
    dateOuverture: '2026-09-08 08:45',
    dateFermeture: undefined,
    soldeInitial: 250.000,
    soldeFinalTheorique: 1145.200,
    soldeFinalReel: 1140.000,
    ecart: -5.200,
    statut: 'Ouverte',
    notes: 'Session en cours.'
  },
  {
    id: 'ses-3',
    projetId: '2',
    utilisateurId: 'demo-caissier-1',
    utilisateurNom: 'Yassine (Caissier Gabès)',
    dateOuverture: '2026-09-07 08:30',
    dateFermeture: '2026-09-07 18:00',
    soldeInitial: 300.000,
    soldeFinalTheorique: 2450.000,
    soldeFinalReel: 2460.000,
    ecart: 10.000,
    statut: 'Fermee',
    notes: 'Surplus espèces constaté.'
  },
  {
    id: 'ses-4',
    projetId: '1',
    utilisateurId: 'demo-admin',
    utilisateurNom: 'Mohamed Ali (Dépôt Central)',
    dateOuverture: '2026-09-06 08:00',
    dateFermeture: '2026-09-06 16:30',
    soldeInitial: 500.000,
    soldeFinalTheorique: 3890.000,
    soldeFinalReel: 3890.000,
    ecart: 0,
    statut: 'Fermee',
    notes: 'Règlement factures directes dépôt.'
  }
];

export const mockActionLogsCaisse: any[] = [
  {
    id: 'log-c1',
    sessionId: 'ses-2',
    utilisateurId: 'demo-caissier-2',
    timestamp: '2026-09-08 08:45:00',
    action: 'Ouverture de caisse',
    details: 'Fond de caisse initial vérifié : 250.000 DT',
    montant: 250.000,
    type: 'Ouverture'
  },
  {
    id: 'log-c2',
    sessionId: 'ses-2',
    utilisateurId: 'demo-caissier-2',
    timestamp: '2026-09-08 09:30:00',
    action: 'Encaissement Vente FAC-SCOL-102',
    details: 'Vente fournitures et cartables - Espèces',
    montant: 340.200,
    type: 'Vente'
  },
  {
    id: 'log-c3',
    sessionId: 'ses-2',
    utilisateurId: 'demo-caissier-2',
    timestamp: '2026-09-08 11:15:00',
    action: 'Encaissement Vente FAC-SCOL-103',
    details: 'Vente pack rentrée scolaire - Espèces',
    montant: 555.000,
    type: 'Vente'
  },
  {
    id: 'log-c4',
    sessionId: 'ses-1',
    utilisateurId: 'demo-caissier-1',
    timestamp: '2026-09-08 17:00:00',
    action: 'Clôture de caisse quotidienne',
    details: 'Arrêt de caisse validé. Solde final 1820.500 DT',
    montant: 1820.500,
    type: 'Fermeture'
  }
];


