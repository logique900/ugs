import { Article, AuditLog, Client, Fournisseur, Projet, Utilisateur } from './types';

export const mockUsers: Utilisateur[] = [
  { id: 'u1', nom: 'Super Admin', email: 'admin@entreprise.com', motDePasse: 'admin123', role: 'admin', statut: 'Actif', projetsAffectes: ['1', '2', '3'] },
  { id: 'u2', nom: 'Comptable Central', email: 'comptable@entreprise.com', motDePasse: 'comptable123', role: 'comptable', statut: 'Actif', projetsAffectes: ['1', '2'] },
  { id: 'u3', nom: 'Ahmed (Sfax Centre)', email: 'ahmed@ugs.tn', motDePasse: 'ahmed123', role: 'caissier', statut: 'Actif', projetId: '1', projetsAffectes: ['1'] },
  { id: 'u4', nom: 'Karim (Multi-boutiques)', email: 'karim@ugs.tn', motDePasse: 'karim123', role: 'caissier', statut: 'Actif', projetId: '1', projetsAffectes: ['1', '2'] },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'log-6', timestamp: '2026-08-18 09:20:00', utilisateurNom: 'Ahmed', utilisateurEmail: 'ahmed@ugs.tn', projetId: '1', projetNom: 'Boutique Sfax Centre', action: 'Vente V-00125', categorie: 'Financier', nouvelleValeur: '+450 DT' },
  { id: 'log-7', timestamp: '2026-08-18 10:15:00', utilisateurNom: 'Admin', utilisateurEmail: 'admin@ugs-distribution.com', projetId: '1', projetNom: 'Boutique Sfax Centre', action: 'Correction stock • Laptop HP', categorie: 'Métier', nouvelleValeur: '-2 unités' },
  { id: 'log-8', timestamp: '2026-08-18 11:30:00', utilisateurNom: 'Admin', utilisateurEmail: 'admin@ugs-distribution.com', projetId: '1', projetNom: 'Boutique Sfax Centre', action: 'Transfert • 5 × Laptop HP Sfax → Gabès', categorie: 'Métier' },
  { id: 'log-1', timestamp: '2026-08-12 02:15:30', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@ugs-distribution.com', action: 'Connexion réussie au Portail Central', categorie: 'Sécurité' },
  { id: 'log-2', timestamp: '2026-08-12 02:10:12', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@ugs-distribution.com', projetId: '1', projetNom: 'Projet Alpha', action: 'Context Switching: Basculement vers Projet Alpha', categorie: 'Système' },
  { id: 'log-3', timestamp: '2026-08-11 16:45:00', utilisateurNom: 'Jean Dupont', utilisateurEmail: 'jean.dupont@ugs-distribution.com', projetId: '1', projetNom: 'Projet Alpha', action: 'Création Facture FAC-ALP-001', categorie: 'Financier', nouvelleValeur: '15000 DT TTC' },
  { id: 'log-4', timestamp: '2026-08-11 14:22:18', utilisateurNom: 'Marie Martin', utilisateurEmail: 'marie.martin@ugs-distribution.com', projetId: '2', projetNom: 'Projet Beta', action: 'Mouvement Stock Sortie ART003', categorie: 'Métier', ancienneValeur: 'Stock 95', nouvelleValeur: 'Stock 65' },
  { id: 'log-5', timestamp: '2026-08-10 11:05:40', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@ugs-distribution.com', action: 'Mise à jour permissions utilisateur Marie Martin', categorie: 'Sécurité' }
];

export const mockProjets: Projet[] = [
  { id: '1', nom: 'Boutique Sfax Centre', codeBoutique: 'SF-CENTRE-001', adresse: 'Avenue Habib Bourguiba', ville: 'Sfax', gouvernorat: 'Sfax', telephone: '74 000 001', email: 'contact@sfaxtcentre.tn', statut: 'Active', description: 'Boutique principale - Centre ville', dateCreation: '2023-01-15', responsable: 'Mohamed Ali' },
  { id: '2', nom: 'Boutique Sfax Nord', codeBoutique: 'SF-NORD-002', adresse: 'Route de Tunis km 5', ville: 'Sfax', gouvernorat: 'Sfax', telephone: '74 000 002', email: 'nord@ugs.tn', statut: 'Active', description: 'Succursale Sfax Nord', dateCreation: '2023-06-20', responsable: 'Sami Ben Ali' },
  { id: '3', nom: 'Boutique Gabès', codeBoutique: 'GB-SUD-001', adresse: 'Avenue de la République', ville: 'Gabès', gouvernorat: 'Gabès', telephone: '75 000 001', email: 'gabes@ugs.tn', statut: 'Inactive', description: 'Succursale Sud', dateCreation: '2022-11-05', responsable: 'Fatma Zahra' },
];

export const mockArticles: Article[] = [
  { 
    id: 'samsung-a52', 
    projetId: '1', 
    code: 'TEL-SAM-A52', 
    designation: 'Ancien modèle Samsung A52', 
    famille: 'Téléphonie', 
    codeBarres: ['8806090123456'], 
    prixAchatHT: 550, 
    prixVenteHT: 780, 
    stock: 0, 
    statut: 'Inactif', 
    description: 'Ancien modèle Samsung Galaxy A52 - Statut INACTIF (Historique conservé - BF-PROD-008)' 
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
    stock: 25, 
    stockParDepot: [
      { depotId: '1', nom: 'Boutique Sfax Centre', quantite: 25, emplacement: 'Aisle-A1' },
      { depotId: '2', nom: 'Boutique Sfax Nord', quantite: 10, emplacement: 'Aisle-B2' },
      { depotId: '3', nom: 'Boutique Gabès', quantite: 5, emplacement: 'Reserve-Sud' }
    ],
    statut: 'Actif', 
    description: 'Clavier USB filaire Logitech K120 confortable et résistant (BF-PROD-006 & BF-PROD-007)' 
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
    stock: 15, 
    stockParDepot: [
      { depotId: '1', nom: 'Boutique Sfax Centre', quantite: 15, emplacement: 'Vitrine 01' },
      { depotId: '2', nom: 'Boutique Sfax Nord', quantite: 7, emplacement: 'Rayon Informatique' },
      { depotId: '3', nom: 'Boutique Gabès', quantite: 12, emplacement: 'Stockage Principal' }
    ],
    statut: 'Actif', 
    description: 'Ordinateur portable HP 15 pouces haute performance - Stock disponible multi-boutiques (BF-PROD-007, BF-PROD-011 & BF-PROD-012)',
    historiqueModifications: [
      {
        id: 'hist-mod-1',
        date: '2026-08-18T01:15:00.000Z',
        utilisateur: 'Mohamed Ali',
        roleUtilisateur: 'admin',
        champModifie: "Prix de vente",
        ancienneValeur: '2200 DT',
        nouvelleValeur: '2150 DT',
        remarque: 'Ajustement tarifique pour offre promotionnelle (BF-PROD-009)'
      },
      {
        id: 'hist-mod-2',
        date: '2026-08-18T01:10:00.000Z',
        utilisateur: 'Mohamed Ali',
        roleUtilisateur: 'admin',
        champModifie: "Catégorie",
        ancienneValeur: 'Informatique',
        nouvelleValeur: 'Ordinateurs portables',
        remarque: 'Reclassification de la catégorie (BF-PROD-009)'
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
    stock: 8, 
    statut: 'Actif', 
    description: 'Smartphone Samsung Galaxy A55 5G - Catalogue BF-PROD-011' 
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
    stock: 0, 
    statut: 'Inactif', 
    description: 'Imprimante HP LaserJet Professionnelle (BF-PROD-011)' 
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
    stock: 10, 
    statut: 'Actif', 
    description: 'Ordinateur portable professionnel Dell Latitude (BF-PROD-012 Exemple "ordinateur")' 
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
    stock: 6, 
    statut: 'Actif', 
    description: 'Ordinateur portable HP ProBook (BF-PROD-012 Exemple "ordinateur")' 
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
    stock: 4, 
    statut: 'Actif', 
    description: 'Ordinateur portable Lenovo ThinkPad (BF-PROD-012 Exemple "ordinateur")' 
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
    stock: 8, 
    stockParDepot: [
      { depotId: '1', nom: 'Boutique Sfax Centre', quantite: 5, emplacement: 'Coffre-fort A1' },
      { depotId: '2', nom: 'Boutique Sfax Nord', quantite: 3, emplacement: 'Vitrine VIP' }
    ],
    statut: 'Actif', 
    description: 'Smartphone Apple iPhone 13 128Go - Produit avec historique commercial (BF-PROD-010)',
    statsCommerciales: {
      ventesCount: 250,
      facturesCount: 15,
      devisCount: 8
    }
  },
  { id: '1', projetId: '1', code: 'ART001', designation: 'Ciment Haute Résistance 50kg', famille: 'Matériaux BTP', prixAchatHT: 12, prixVenteHT: 18, stock: 120, statut: 'Actif' },
  { id: '2', projetId: '1', code: 'ART002', designation: 'Poutre Acier IPN 200', famille: 'Structure & Gros Œuvre', prixAchatHT: 140, prixVenteHT: 210, stock: 35, statut: 'Actif' },
  { id: '3', projetId: '2', code: 'ART003', designation: 'Peinture Murale Écologique 10L', famille: 'Finition & Rénovation', prixAchatHT: 45, prixVenteHT: 78, stock: 65, statut: 'Actif' },
  { id: '4', projetId: '2', code: 'ART004', designation: 'Parquet Chêne Massif m²', famille: 'Sols & Revêtements', prixAchatHT: 35, prixVenteHT: 62, stock: 140, statut: 'Actif' },
  { id: '5', projetId: '3', code: 'ART005', designation: 'Câble Fibre Optique Armé 100m', famille: 'Câblage & Réseaux', prixAchatHT: 180, prixVenteHT: 290, stock: 15, statut: 'Actif' },
  { id: '6', projetId: '3', code: 'ART006', designation: 'Armoire Réseau Informatique 42U', famille: 'Equipement Lourd', prixAchatHT: 450, prixVenteHT: 720, stock: 6, statut: 'Actif' },
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
    notes: 'Facture historique - Contient le produit Samsung A52 désormais INACTIF (BF-PROD-008)'
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
