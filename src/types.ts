export type TabType = 'dashboard' | 'projets' | 'articles' | 'categories' | 'stock' | 'clients' | 'fournisseurs' | 'achats' | 'bons_achat' | 'bons_sortie' | 'ventes' | 'livraisons' | 'transferts' | 'caisse' | 'credits' | 'admin' | 'rapports' | 'objectifs' | 'predictive' | 'utilisateurs' | 'statistiques' | 'audit';

export interface CategorieItem {
  id: string;
  nom: string;
  code?: string;
  description?: string;
  statut: 'Actif' | 'Inactif';
  projetId?: string;
}

export type Role = 'super_admin' | 'admin' | 'comptable' | 'caissier' | 'agent' | 'chef_projet' | 'directeur';

export interface UtilisateurPermissions {
  peutAccorderRemise?: boolean;
  peutModifierPrix?: boolean;
  peutSupprimerDocuments?: boolean;
  peutVoirMarge?: boolean;
  peutCloturerCaisse?: boolean;
}

export interface Utilisateur {
  id: string;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string;
  motDePasse?: string;
  role: Role;
  statut?: 'Actif' | 'Inactif';
  projetId?: string; // Projet principal ou par défaut
  projetsAffectes?: string[]; // Projets autorisés en multi-projets
  derniereConnexion?: string;
  dateCreation?: string;
  permissions?: UtilisateurPermissions;
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
  typeArticle?: 'Produit' | 'Service';
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
  margeBeneficiaire?: number; // Marge bénéficiaire en pourcentage (%)
  tva?: number;
  prixPromotionnelHT?: number;
  prixParQuantite?: PrixQuantite[];
  historiquePrix?: HistoriquePrix[];
  historiqueModifications?: HistoriqueModification[];
  
  stocks: Record<string, number>; // Mapping: projetId -> quantité
  stockMinimums?: Record<string, number>; // Mapping: projetId -> quantité minimale
  
  stock?: number; // legacy / helper field
  stockMinimum?: number; // legacy / helper field
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
  typeTier?: 'Entreprise' | 'Particulier' | 'Parent/Élève' | 'Institution' | 'Autre';
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
  auteurId?: string; // ID of the cashier
  auteurNom?: string; // Name of the cashier
  date: string;
  dateEcheance?: string;
  montantHT: number;
  montantTTC: number;
  montantPaye?: number;
  statut: 'Devis' | 'En Négociation' | 'Commande' | 'Facture' | 'Payée' | 'Annulée';
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
  projetNom?: string;
  boutiqueNom?: string;
  articleId: string;
  articleNom?: string;
  articleCode?: string;
  designation?: string;
  type: 'Entrée' | 'Sortie' | string;
  quantite: number;
  date: string;
  dateFormatted?: string;
  motif: string;
  reference?: string;
  referencePiece?: string;
  auteur?: string;
  utilisateurNom?: string;
  boutique?: string;
  stockAvant?: number;
  stockApres?: number;
  quantiteAvant?: number;
  quantiteApres?: number;
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

export interface SessionCaisse {
  id: string;
  projetId: string;
  utilisateurId: string;
  utilisateurNom: string;
  dateOuverture: string;
  dateFermeture?: string;
  soldeInitial: number;
  soldeFinalTheorique?: number; // Somme des ventes + solde initial
  soldeFinalReel?: number; // Compté par le caissier
  ecart?: number;
  statut: 'Ouverte' | 'Fermee';
  notes?: string;
}

export interface SessionActionLog {
  id: string;
  sessionId: string;
  utilisateurId: string;
  timestamp: string;
  action: string;
  details?: string;
  montant?: number;
  type: 'Vente' | 'Ajustement' | 'Ouverture' | 'Fermeture' | 'Systeme';
}

export interface Objectif {
  id: string;
  type: 'Boutique' | 'Caissier';
  cibleId: string;
  cibleNom?: string;
  periode: string; // Format: 'YYYY-MM'
  montantCible: number;
}

export type StatutBL = 
  | 'Brouillon' 
  | 'Validé' 
  | 'En préparation' 
  | 'Expédié' 
  | 'En livraison' 
  | 'Livré' 
  | 'Livraison partielle' 
  | 'Refusé' 
  | 'Annulé';

export interface LigneBL {
  id?: string;
  articleId: string;
  code?: string;
  designation: string;
  unite?: string; // ex: 'Pièce', 'Carton', 'Kg', 'Litre'
  qteCommandee: number;
  qteDejaLivree: number;
  qteALivrer: number;
  qteLivree: number;
  prixUnitaireHT: number;
  remisePourcentage?: number;
  remise?: number;
  tauxTVA?: number;
  totalHT: number;
  totalTTC: number;
}

export interface BonDeLivraison {
  id: string;
  numero: string; // Ex: BL-2026-000125
  projetId: string;
  boutiqueNom?: string;
  dateCreation: string;
  dateLivraison: string;
  dateExpedition?: string;
  statut: StatutBL;
  
  // Références croisées
  commandeRef?: string; // Ex: CMD-2026-000087
  devisRef?: string;
  factureRef?: string; // Ex: FAC-2026-000098
  venteSourceId?: string; // ID de la Vente / Commande d'origine
  
  // Client & Adresses
  clientId: string;
  clientNom: string;
  matriculeFiscalClient?: string;
  adresseFacturation?: string;
  adresseLivraison: string;
  telephoneClient?: string;
  emailClient?: string;
  
  // Transport & Logistique
  transporteur?: string;
  chauffeur?: string;
  immatriculation?: string;
  fraisLivraison?: number;
  notes?: string;
  entrepôtSource?: string;
  
  // Preuve de livraison (POD)
  signatureReception?: string;
  nomReceptionnaire?: string;
  dateReception?: string;
  reserves?: string;
  
  // Idempotence & Stock
  stockOperationId?: string; // Ex: OUT-2026-000087
  isStockDecremented: boolean;
  
  // Contenu & Totaux
  lignes: LigneBL[];
  montantHT: number;
  montantTVA?: number;
  montantTTC: number;
  auteurNom?: string;
  auteurId?: string;
  
  // Historique interne du BL
  historiqueStatuts?: Array<{
    statut: StatutBL;
    date: string;
    utilisateur: string;
    commentaire?: string;
  }>;
}

export interface StockOperation {
  id: string;
  operationNumber: string; // Ex: OUT-2026-000087
  type: 'SORTIE' | 'ENTREE' | 'AJUSTEMENT';
  projetId: string;
  warehouseId?: string;
  referenceType: 'BL' | 'FACTURE' | 'RETOUR' | 'ENTREE_STOCK' | 'COMMANDE';
  referenceId: string; // ID du BL, Facture ou Retour
  referenceNumero?: string;
  status: 'EFFECTUE' | 'ANNULE';
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  lignes: Array<{
    articleId: string;
    articleNom: string;
    articleCode?: string;
    quantite: number;
  }>;
  motif: string;
}

export interface LigneRetour {
  articleId: string;
  designation: string;
  qteLivree: number;
  qteRetournee: number;
  prixUnitaireHT: number;
  totalHT: number;
  motifSpecifique?: string;
}

export interface RetourMarchandise {
  id: string;
  numero: string; // Ex: RET-2026-000012
  blId: string;
  blNumero: string;
  clientId: string;
  clientNom: string;
  projetId: string;
  date: string;
  motifGeneral: string;
  lignes: LigneRetour[];
  stockOperationId?: string; // Mouvement de stock d'entrée généré
  statut: 'Validé' | 'En attente' | 'Annulé';
  auteurNom: string;
}

// ==========================================
// TYPES BON D'ACHAT (BA) & BON DE SORTIE (BS)
// ==========================================

export type StatutBA = 
  | 'BROUILLON' 
  | 'EN ATTENTE' 
  | 'APPROUVÉ' 
  | 'COMMANDÉ' 
  | 'RÉCEPTION PARTIELLE' 
  | 'RÉCEPTIONNÉ' 
  | 'ANNULÉ' 
  | 'REFUSÉ';

export interface LigneBA {
  id?: string;
  articleId: string;
  code?: string;
  designation: string;
  unite?: string;
  qteCommandee: number;
  qteDejaRecue: number;
  qteARecevoir: number;
  qteRecue: number;
  prixUnitaireHT: number;
  tauxTVA?: number;
  totalHT: number;
  totalTTC: number;
}

export interface ReceptionBA {
  id: string;
  date: string;
  stockOperationId: string; // Ex: IN-2026-000087
  auteurNom: string;
  lignes: Array<{
    articleId: string;
    designation?: string;
    qteRecue: number;
  }>;
  notes?: string;
}

export interface BonDAchat {
  id: string;
  numero: string; // Ex: BA-2026-000045
  projetId: string; // Entrepôt de réception / Projet
  boutiqueNom?: string;
  fournisseurId: string;
  fournisseurNom: string;
  matriculeFiscalFournisseur?: string;
  telephoneFournisseur?: string;
  emailFournisseur?: string;
  adresseFournisseur?: string;
  contactFournisseur?: string;
  dateCreation: string;
  datePrevueReception?: string;
  statut: StatutBA;
  auteurId?: string;
  auteurNom?: string;
  conditionsAchat?: string;
  remiseGlobalHT?: number;
  fraisAnnexes?: number;
  observations?: string;
  lignes: LigneBA[];
  receptions?: ReceptionBA[];
  montantHT: number;
  montantTVA?: number;
  montantTTC: number;
  factureFournisseurRef?: string;
  isStockIncremented?: boolean; // Anti-double entrée de stock
  stockOperationId?: string; // ID unique op stock IN
  historiqueStatuts?: Array<{
    statut: StatutBA;
    date: string;
    utilisateur: string;
    commentaire?: string;
  }>;
}

export type MotifSortieBS = 
  | 'Consommation interne' 
  | 'Échantillon' 
  | 'Cadeau' 
  | 'Don' 
  | 'Casse' 
  | 'Produit périmé' 
  | 'Produit endommagé' 
  | 'Production' 
  | 'Maintenance' 
  | 'Démonstration' 
  | 'Ajustement de stock' 
  | 'Transfert' 
  | 'Autre';

export type StatutBS = 
  | 'BROUILLON' 
  | 'EN ATTENTE' 
  | 'VALIDÉ' 
  | 'EN PRÉPARATION' 
  | 'SORTIE EFFECTUÉE' 
  | 'ANNULÉ' 
  | 'REFUSÉ';

export interface LigneBS {
  id?: string;
  articleId: string;
  code?: string;
  designation: string;
  unite?: string;
  stockDisponible: number;
  qteDemandee: number;
  qteSortie: number;
  stockApres: number;
  prixUnitaireHT?: number;
  totalHT?: number;
}

export interface BonDeSortie {
  id: string;
  numero: string; // Ex: BS-2026-000032
  projetId: string; // Entrepôt / Source store
  boutiqueNom?: string;
  dateCreation: string;
  heureCreation?: string;
  statut: StatutBS;
  auteurId?: string;
  auteurNom?: string;
  demandeur: string; // Demandeur interne
  serviceDepartement: string; // Service / Département
  responsableValidation?: string;
  motif: MotifSortieBS;
  motifJustification?: string;
  entrepotSource?: string;
  destinationBoutiqueId?: string; // Boutique réceptrice pour les transferts
  destinationBoutiqueNom?: string;
  lignes: LigneBS[];
  observations?: string;
  piecesJointes?: string[];
  isStockDecremented: boolean; // Anti-double décrémentation
  stockOperationId?: string; // Ex: OUT-2026-000099
  exceptionStockNegatifValidee?: boolean;
  historiqueStatuts?: Array<{
    statut: StatutBS;
    date: string;
    utilisateur: string;
    commentaire?: string;
  }>;
}

export interface NotificationItem {
  id: string;
  titre: string;
  message: string;
  type: 'warning' | 'error' | 'info' | 'success';
  priorite?: 'Haute' | 'Moyenne' | 'Basse';
  categorie: 'Stock' | 'Ventes' | 'Achats' | 'Caisse' | 'Logistique' | 'Diffusion' | 'Système';
  destinataireRole?: 'tous' | Role;
  destinataireProjetId?: 'tous' | string;
  tabLink?: TabType;
  date: string;
  lu: boolean;
  auteur?: string;
  systemeGénéré?: boolean;
}


