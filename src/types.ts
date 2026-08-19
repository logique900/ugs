export type TabType = 'dashboard' | 'projets' | 'articles' | 'categories' | 'stock' | 'clients' | 'fournisseurs' | 'achats' | 'ventes' | 'caisse' | 'credits' | 'admin';

export interface CategorieItem {
  id: string;
  nom: string;
  code?: string;
  description?: string;
  statut: 'Actif' | 'Inactif';
  projetId?: string;
}

export type Role = 'admin' | 'comptable' | 'caissier' | 'agent' | 'chef_projet' | 'directeur';

export interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  motDePasse?: string;
  role: Role;
  statut?: 'Actif' | 'Inactif';
  projetId?: string; // Projet principal ou par défaut
  projetsAffectes?: string[]; // Projets autorisés en multi-projets
}

export interface Projet {
  id: string;
  nom: string;
  codeBoutique?: string;
  statut: 'Active' | 'Inactive' | 'Archivée' | 'Actif' | 'En pause' | 'Archivé';
  description: string;
  dateCreation: string;
  responsable: string;
  adresse?: string;
  ville?: string;
  gouvernorat?: string;
  telephone?: string;
  email?: string;
  
  // Extra fields that were already there
  budgetGlobal?: number;
  entrepriseNom?: string;
  matriculeFiscal?: string;
  rib?: string;
  banque?: string;
  logoUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  utilisateurNom: string;
  utilisateurEmail: string;
  projetId?: string;
  projetNom?: string;
  action: string;
  categorie: 'Sécurité' | 'Métier' | 'Financier' | 'Système';
  ancienneValeur?: string;
  nouvelleValeur?: string;
}

export interface HistoriquePrix {
  date: string;
  utilisateur: string;
  ancienPrixAchat: number;
  nouveauPrixAchat: number;
  ancienPrixVente: number;
  nouveauPrixVente: number;
}

export interface HistoriqueModification {
  id: string;
  date: string;
  utilisateur: string;
  roleUtilisateur?: string;
  champModifie: string; // ex: "Prix de vente", "Catégorie", "Statut", "Désignation", "Code-barres"
  ancienneValeur: string;
  nouvelleValeur: string;
  remarque?: string;
}

export interface PrixQuantite {
  quantiteMinimum: number;
  prixUnitaire: number;
}

export interface StockDepot {
  depotId: string;
  nom: string;
  quantite: number;
  emplacement?: string;
}

export interface Article {
  id: string;
  projetId?: string;
  code: string;
  referenceInterne?: string;
  designation: string;
  description?: string;
  famille: string;
  categorie?: string;
  marque?: string;
  uniteMesure?: string;
  codeBarres?: string[];
  prixAchatHT: number;
  prixVenteHT: number;
  tva?: number;
  prixPromotionnelHT?: number;
  prixParQuantite?: PrixQuantite[];
  historiquePrix?: HistoriquePrix[];
  historiqueModifications?: HistoriqueModification[];
  
  stock: number;
  stockMinimum?: number;
  stockMaximum?: number;
  stockSecurite?: number;
  stockParDepot?: StockDepot[];
  seuilAlerte?: number; // legacy support
  
  depotPrincipal?: string;
  emplacement?: string;
  fournisseurPrincipalId?: string;
  
  statut?: 'Actif' | 'Inactif';
  statsCommerciales?: {
    ventesCount: number;
    facturesCount: number;
    devisCount: number;
  };
}

export interface Client {
  id: string;
  projetId?: string;
  code?: string;
  nom: string;
  typeTier?: 'Entreprise' | 'Particulier';
  matriculeFiscal?: string;
  email: string;
  telephone: string;
  adresse: string;
  ville?: string;
  pays?: string;
  contactNom?: string;
  contactPoste?: string;
  contactTel?: string;
  statut?: 'Actif' | 'Prospect' | 'Bloqué' | 'Contentieux';
  categorie?: 'Grand Compte' | 'PME' | 'Particulier' | 'Marché Public';
  plafondCredit?: number;
  delaiPaiement?: number; // en jours (ex: 0, 30, 45, 60)
  soldeInitial?: number;
  rib?: string;
  banque?: string;
  notes?: string;
  scoreSolvabilite?: number; // 0 - 100
}

export interface Fournisseur {
  id: string;
  projetId?: string;
  code?: string;
  nom: string;
  typeTier?: 'Entreprise' | 'Particulier' | 'Sous-traitant';
  matriculeFiscal?: string;
  email: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  pays?: string;
  siteWeb?: string;
  contactNom?: string;
  contactPoste?: string;
  contactTel?: string;
  contactEmail?: string;
  statut?: 'Actif' | 'Inactif' | 'Bloqué';
  categorie?: 'Grossiste' | 'Fabricant' | 'Prestataire' | 'Sous-traitant' | 'Importateur' | 'Matériaux' | 'Outillage' | 'Transport';
  delaiPaiement?: number; // en jours
  plafondCredit?: number; // Plafond en-cours
  modeReglementPrefere?: 'Virement' | 'Chèque' | 'Traite' | 'Espèces';
  rib?: string;
  banque?: string;
  notes?: string;
  evaluationQualite?: number; // 1-5 étoiles
}

export interface LigneVente {
  id?: string;
  articleId: string;
  code?: string;
  designation: string;
  quantite: number;
  prixUnitaireHT: number;
  remise?: number; // %
  remisePourcentage?: number;
  tva?: number; // %
  tauxTVA?: number;
  totalHT: number;
  totalTTC: number;
}

export interface Vente {
  id: string;
  projetId?: string;
  numero: string;
  clientId: string;
  clientNom?: string;
  date: string;
  dateEcheance?: string;
  montantHT: number;
  montantTTC: number;
  montantPaye?: number;
  statut: 'Devis' | 'Facture' | 'Payée' | 'Annulée';
  modePaiement?: 'Espèces' | 'Chèque' | 'Virement' | 'Traite' | 'Crédit';
  lignes?: LigneVente[];
  notes?: string;
}

export interface LigneAchat {
  id?: string;
  articleId: string;
  code?: string;
  designation: string;
  quantite: number;
  prixUnitaireHT: number;
  totalHT: number;
  totalTTC: number;
}

export interface Achat {
  id: string;
  projetId?: string;
  numero: string;
  fournisseurId: string;
  fournisseurNom?: string;
  date: string;
  dateEcheance?: string;
  montantHT: number;
  montantTTC: number;
  montantRegle?: number;
  montantPaye?: number;
  statut: 'Commandé' | 'Reçu' | 'Payé' | 'Annulé';
  modePaiement?: 'Espèces' | 'Chèque' | 'Virement' | 'Traite';
  lignes?: LigneAchat[];
  notes?: string;
}

export interface MouvementStock {
  id: string;
  projetId?: string;
  articleId: string;
  designation?: string;
  type: 'Entrée' | 'Sortie';
  quantite: number;
  date: string;
  motif: string;
  reference?: string;
  referencePiece?: string;
  auteur?: string;
}

export interface Reglement {
  id: string;
  projetId?: string;
  numeroPiece: string;
  type: 'Encaissement' | 'Décaissement';
  tierId: string; // Client ou Fournisseur
  tierNom: string;
  tierType: 'Client' | 'Fournisseur' | 'Autre';
  documentRef?: string; // Ex: FAC-ALP-001
  date: string;
  montant: number;
  modePaiement: 'Espèces' | 'Chèque' | 'Virement' | 'Traite';
  banque?: string;
  referencePaiement?: string;
  notes?: string;
  statut: 'Validé' | 'En attente' | 'Rejeté';
}

export interface RelanceClient {
  id: string;
  projetId?: string;
  clientId: string;
  clientNom: string;
  date: string;
  niveau: 1 | 2 | 3; // 1 = Rappel courtois, 2 = Ferme / Pénalités, 3 = Mise en demeure
  montantTotalDu: number;
  facturesConcernees: string[];
  statut: 'Envoyée' | 'En attente' | 'Accord trouvé' | 'Contentieux';
  notes?: string;
}

export interface CreditEcheance {
  id: string;
  venteId: string;
  numeroFacture: string;
  clientId: string;
  clientNom: string;
  projetId?: string;
  dateFacture: string;
  dateEcheance: string;
  montantTTC: number;
  montantPaye: number;
  soldeRestant: number;
  statut: 'Non échue' | 'Soldée' | 'Échue' | 'En retard' | 'Très en retard' | 'Contentieux';
  joursRetard: number;
  niveauRelance?: number;
}
