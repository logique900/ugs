import React, { useState } from 'react';
import { BonDeLivraison, StatutBL, LigneBL, Client, Article, Vente, StockOperation, RetourMarchandise, Projet, Utilisateur, AuditLog } from '../types';
import { Barcode1D } from './Barcode1D';

interface BonsDeLivraisonProps {
  bonsDeLivraison: BonDeLivraison[];
  setBonsDeLivraison: React.Dispatch<React.SetStateAction<BonDeLivraison[]>>;
  clients: Client[];
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  ventes: Vente[];
  setVentes: React.Dispatch<React.SetStateAction<Vente[]>>;
  stockOperations: StockOperation[];
  setStockOperations: React.Dispatch<React.SetStateAction<StockOperation[]>>;
  retoursMarchandise: RetourMarchandise[];
  setRetoursMarchandise: React.Dispatch<React.SetStateAction<RetourMarchandise[]>>;
  projets: Projet[];
  selectedProjectId: string;
  currentUser: Utilisateur | null;
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  onNavigateToInvoice?: (factureId: string) => void;
}

export default function BonsDeLivraison({
  bonsDeLivraison,
  setBonsDeLivraison,
  clients,
  articles,
  setArticles,
  ventes,
  setVentes,
  stockOperations,
  setStockOperations,
  retoursMarchandise,
  setRetoursMarchandise,
  projets,
  selectedProjectId,
  currentUser,
  auditLogs,
  setAuditLogs,
  onNavigateToInvoice
}: BonsDeLivraisonProps) {
  // State filters & views
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'bl_list' | 'retours' | 'operations'>('bl_list');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<BonDeLivraison | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<BonDeLivraison | null>(null);
  const [showReturnModal, setShowReturnModal] = useState<BonDeLivraison | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<BonDeLivraison | null>(null);

  // Form State for BL Creation
  const [selectedCommandeId, setSelectedCommandeId] = useState<string>('');
  const [formClientId, setFormClientId] = useState<string>('');
  const [formAdresseLivraison, setFormAdresseLivraison] = useState<string>('');
  const [formAdresseFacturation, setFormAdresseFacturation] = useState<string>('');
  const [formCommandeRef, setFormCommandeRef] = useState<string>('');
  const [formTransporteur, setFormTransporteur] = useState<string>('UGS Logistics Express');
  const [formChauffeur, setFormChauffeur] = useState<string>('');
  const [formImmatriculation, setFormImmatriculation] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formProjetId, setFormProjetId] = useState<string>(selectedProjectId === 'all' ? (projets[0]?.id || '1') : selectedProjectId);
  
  const [formLignes, setFormLignes] = useState<LigneBL[]>([]);

  // Form State for Return
  const [returnMotif, setReturnMotif] = useState('');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  // Status Change Form
  const [newStatut, setNewStatut] = useState<StatutBL>('Livré');
  const [statusComment, setStatusComment] = useState('');
  const [podRecipient, setPodRecipient] = useState('');
  const [podSignature, setPodSignature] = useState('');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper: Filter BL by project & search
  const filteredBLs = bonsDeLivraison.filter(bl => {
    const matchProject = selectedProjectId === 'all' || bl.projetId === selectedProjectId;
    const matchStatut = filterStatut === 'all' || bl.statut === filterStatut;
    const matchSearch = 
      bl.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bl.clientNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bl.commandeRef && bl.commandeRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bl.transporteur && bl.transporteur.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchProject && matchStatut && matchSearch;
  });

  // Calculate stats
  const totalBL = filteredBLs.length;
  const countLivre = filteredBLs.filter(b => b.statut === 'Livré').length;
  const countEnCours = filteredBLs.filter(b => ['En préparation', 'Expédié', 'En livraison', 'Validé'].includes(b.statut)).length;
  const countPartiel = filteredBLs.filter(b => b.statut === 'Livraison partielle').length;
  const totalValeurLivree = filteredBLs
    .filter(b => ['Livré', 'Livraison partielle'].includes(b.statut))
    .reduce((sum, b) => sum + b.montantTTC, 0);

  // Helper function to auto-populate from selected Order/Commande
  const handleSelectCommande = (venteId: string) => {
    setSelectedCommandeId(venteId);
    if (!venteId) return;

    const vente = ventes.find(v => v.id === venteId);
    if (vente) {
      setFormClientId(vente.clientId);
      const client = clients.find(c => c.id === vente.clientId);
      if (client) {
        setFormAdresseLivraison(client.adresse || '');
        setFormAdresseFacturation(client.adresse || '');
      }
      setFormCommandeRef(vente.numero);
      setFormProjetId(vente.projetId || '1');

      // Populate lines from order
      if (vente.lignes && vente.lignes.length > 0) {
        const lignesBL: LigneBL[] = vente.lignes.map(l => {
          const art = articles.find(a => a.id === l.articleId);
          return {
            id: 'lbl-' + Math.random().toString(36).substr(2, 6),
            articleId: l.articleId,
            code: l.code || art?.code || 'ART',
            designation: l.designation || art?.designation || 'Produit',
            unite: 'Unité',
            qteCommandee: l.quantite,
            qteDejaLivree: 0,
            qteALivrer: l.quantite,
            qteLivree: l.quantite,
            prixUnitaireHT: l.prixUnitaireHT,
            tauxTVA: l.tauxTVA || 19,
            totalHT: l.quantite * l.prixUnitaireHT,
            totalTTC: (l.quantite * l.prixUnitaireHT) * (1 + (l.tauxTVA || 19)/100)
          };
        });
        setFormLignes(lignesBL);
      }
    }
  };

  // Add empty line to BL form
  const handleAddLine = () => {
    if (articles.length === 0) return;
    const firstArticle = articles[0];
    const newLine: LigneBL = {
      id: 'lbl-' + Math.random().toString(36).substr(2, 6),
      articleId: firstArticle.id,
      code: firstArticle.code,
      designation: firstArticle.designation,
      unite: 'Unité',
      qteCommandee: 1,
      qteDejaLivree: 0,
      qteALivrer: 1,
      qteLivree: 1,
      prixUnitaireHT: firstArticle.prixVenteHT,
      tauxTVA: 19,
      totalHT: firstArticle.prixVenteHT,
      totalTTC: firstArticle.prixVenteHT * 1.19
    };
    setFormLignes([...formLignes, newLine]);
  };

  // Update line in BL creation
  const handleUpdateLine = (index: number, field: keyof LigneBL, value: any) => {
    const updated = [...formLignes];
    const line = { ...updated[index], [field]: value };

    if (field === 'articleId') {
      const art = articles.find(a => a.id === value);
      if (art) {
        line.code = art.code;
        line.designation = art.designation;
        line.prixUnitaireHT = art.prixVenteHT;
      }
    }

    if (field === 'qteLivree' || field === 'prixUnitaireHT' || field === 'tauxTVA' || field === 'articleId') {
      const qte = Number(line.qteLivree) || 0;
      const pu = Number(line.prixUnitaireHT) || 0;
      const tva = Number(line.tauxTVA) || 19;
      line.totalHT = qte * pu;
      line.totalTTC = line.totalHT * (1 + tva/100);
    }

    updated[index] = line;
    setFormLignes(updated);
  };

  // Remove line from creation
  const handleRemoveLine = (index: number) => {
    setFormLignes(formLignes.filter((_, i) => i !== index));
  };

  // Create new BL
  const handleCreateBL = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId) {
      showNotification('Veuillez sélectionner un client', 'error');
      return;
    }
    if (formLignes.length === 0) {
      showNotification('Veuillez ajouter au moins un produit', 'error');
      return;
    }

    const client = clients.find(c => c.id === formClientId);
    const boutique = projets.find(p => p.id === formProjetId);
    
    // Generate unique BL Number
    const nextNum = (bonsDeLivraison.length + 125).toString().padStart(6, '0');
    const blNum = `BL-2026-${nextNum}`;

    const montantHT = formLignes.reduce((sum, l) => sum + l.totalHT, 0);
    const montantTTC = formLignes.reduce((sum, l) => sum + l.totalTTC, 0);
    const montantTVA = montantTTC - montantHT;

    // Determine status (check if partial)
    let initialStatut: StatutBL = 'Validé';
    const isPartial = formLignes.some(l => l.qteLivree < l.qteCommandee);
    if (isPartial) {
      initialStatut = 'Livraison partielle';
    }

    const newBL: BonDeLivraison = {
      id: 'bl-' + Date.now(),
      numero: blNum,
      projetId: formProjetId,
      boutiqueNom: boutique?.nom || 'Société UGS',
      dateCreation: new Date().toISOString().split('T')[0],
      dateLivraison: new Date().toISOString().split('T')[0],
      statut: initialStatut,
      commandeRef: formCommandeRef || undefined,
      clientId: formClientId,
      clientNom: client?.nom || 'Client inconnu',
      matriculeFiscalClient: client?.matriculeFiscal,
      adresseFacturation: formAdresseFacturation || client?.adresse || '',
      adresseLivraison: formAdresseLivraison || client?.adresse || '',
      telephoneClient: client?.telephone,
      emailClient: client?.email,
      transporteur: formTransporteur,
      chauffeur: formChauffeur,
      immatriculation: formImmatriculation,
      notes: formNotes,
      isStockDecremented: false,
      lignes: formLignes,
      montantHT,
      montantTVA,
      montantTTC,
      auteurNom: currentUser?.nom || 'Administrateur',
      historiqueStatuts: [
        {
          statut: initialStatut,
          date: new Date().toLocaleString('fr-FR'),
          utilisateur: currentUser?.nom || 'Admin',
          commentaire: 'Création initiale du Bon de Livraison'
        }
      ]
    };

    setBonsDeLivraison([newBL, ...bonsDeLivraison]);

    // Automatically trigger Stock Output (SORTIE) with Idempotency Key!
    executeStockOutputForBL(newBL);

    // Audit log
    const log: AuditLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleString('fr-FR'),
      utilisateurNom: currentUser?.nom || 'Admin',
      utilisateurEmail: currentUser?.email || 'admin@ugs.tn',
      projetId: formProjetId,
      projetNom: boutique?.nom,
      action: `Création Bon de Livraison ${blNum}`,
      categorie: 'Métier',
      nouvelleValeur: `${montantTTC.toFixed(2)} DT TTC`
    };
    setAuditLogs([log, ...auditLogs]);

    setShowCreateModal(false);
    showNotification(`Bon de Livraison ${blNum} créé avec succès!`, 'success');

    // Reset Form
    setSelectedCommandeId('');
    setFormClientId('');
    setFormAdresseLivraison('');
    setFormAdresseFacturation('');
    setFormCommandeRef('');
    setFormNotes('');
    setFormLignes([]);
  };

  // CORE LOGIC: Idempotent Stock Output (Anti-double décrémentation - Rule RB-03, RB-04, RB-10)
  const executeStockOutputForBL = (bl: BonDeLivraison) => {
    if (bl.isStockDecremented || bl.stockOperationId) {
      showNotification(`Le stock a DÉJÀ été décrémenté pour le BL ${bl.numero} (Mouvement ID: ${bl.stockOperationId})`, 'warning');
      return;
    }

    // Generate unique Operation ID: OUT-2026-XXXXXX
    const opNumber = `OUT-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    // Decrement articles stock for this boutique
    const updatedArticles = articles.map(article => {
      const line = bl.lignes.find(l => l.articleId === article.id);
      if (!line) return article;

      const currentStockInBoutique = article.stocks?.[bl.projetId] ?? article.stock ?? 0;
      const newStockInBoutique = Math.max(0, currentStockInBoutique - line.qteLivree);

      return {
        ...article,
        stocks: {
          ...(article.stocks || {}),
          [bl.projetId]: newStockInBoutique
        },
        stock: bl.projetId === '1' ? newStockInBoutique : article.stock
      };
    });

    setArticles(updatedArticles);

    // Create unique StockOperation record
    const newOperation: StockOperation = {
      id: 'so-' + Date.now(),
      operationNumber: opNumber,
      type: 'SORTIE',
      projetId: bl.projetId,
      warehouseId: bl.boutiqueNom || 'Dépôt Central UGS',
      referenceType: 'BL',
      referenceId: bl.id,
      referenceNumero: bl.numero,
      status: 'EFFECTUE',
      createdAt: new Date().toLocaleString('fr-FR'),
      createdBy: currentUser?.id || 'admin',
      createdByName: currentUser?.nom || 'Magasinier UGS',
      lignes: bl.lignes.map(l => ({
        articleId: l.articleId,
        articleNom: l.designation,
        articleCode: l.code,
        quantite: l.qteLivree
      })),
      motif: `Sortie de stock unique pour le Bon de Livraison ${bl.numero}`
    };

    setStockOperations([newOperation, ...stockOperations]);

    // Update BL status as stock decremented
    const updatedBLs = bonsDeLivraison.map(b => {
      if (b.id === bl.id) {
        return {
          ...b,
          isStockDecremented: true,
          stockOperationId: opNumber
        };
      }
      return b;
    });

    setBonsDeLivraison(updatedBLs);
    showNotification(`Sortie de stock enregistrée (${opNumber}) - Décrémentation unique effectuée`, 'success');
  };

  // CORE LOGIC: Transform BL -> Invoice (Rule RB-05: NO SECOND DECREMENTATION!)
  const handleTransformBLToInvoice = (bl: BonDeLivraison) => {
    if (bl.factureRef) {
      showNotification(`Ce BL a déjà été transformé en Facture (${bl.factureRef})`, 'warning');
      return;
    }

    // Generate Invoice Number
    const nextFacNum = (ventes.length + 101).toString().padStart(6, '0');
    const facNumero = `FAC-2026-${nextFacNum}`;

    // Create new Vente of status 'Facture'
    const newFacture: Vente = {
      id: 'fac-' + Date.now(),
      projetId: bl.projetId,
      numero: facNumero,
      clientId: bl.clientId,
      clientNom: bl.clientNom,
      auteurId: currentUser?.id,
      auteurNom: currentUser?.nom || 'Comptable UGS',
      date: new Date().toISOString().split('T')[0],
      dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      montantHT: bl.montantHT,
      montantTTC: bl.montantTTC,
      montantPaye: 0,
      statut: 'Facture',
      modePaiement: 'Virement',
      lignes: bl.lignes.map(l => ({
        articleId: l.articleId,
        code: l.code,
        designation: l.designation,
        quantite: l.qteLivree,
        prixUnitaireHT: l.prixUnitaireHT,
        tauxTVA: l.tauxTVA || 19,
        totalHT: l.totalHT,
        totalTTC: l.totalTTC
      })),
      notes: `Facture générée depuis le Bon de Livraison ${bl.numero}. Mouvement de stock d'origine conservé: ${bl.stockOperationId || 'DÉJÀ DECREMENTE'}. AUCUNE double sortie de stock.`
    };

    setVentes([newFacture, ...ventes]);

    // Link Facture to BL
    const updatedBLs = bonsDeLivraison.map(b => {
      if (b.id === bl.id) {
        return {
          ...b,
          factureRef: facNumero,
          historiqueStatuts: [
            ...(b.historiqueStatuts || []),
            {
              statut: b.statut,
              date: new Date().toLocaleString('fr-FR'),
              utilisateur: currentUser?.nom || 'Comptable',
              commentaire: `Transformé en Facture ${facNumero} (Stock déjà décrémenté, zéro doublon)`
            }
          ]
        };
      }
      return b;
    });

    setBonsDeLivraison(updatedBLs);

    // Audit Log
    const log: AuditLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleString('fr-FR'),
      utilisateurNom: currentUser?.nom || 'Comptable',
      utilisateurEmail: currentUser?.email || 'comptable@ugs.tn',
      projetId: bl.projetId,
      action: `Transformation BL ${bl.numero} → Facture ${facNumero}`,
      categorie: 'Financier',
      nouvelleValeur: `Ref Mouvement Stock Conservée: ${bl.stockOperationId || 'N/A'} (Pas de décrémentation double)`
    };
    setAuditLogs([log, ...auditLogs]);

    showNotification(`Bon de Livraison ${bl.numero} transformé avec succès en Facture ${facNumero}!`, 'success');

    if (onNavigateToInvoice) {
      onNavigateToInvoice(newFacture.id);
    }
  };

  // Handle Status Transition & POD
  const handleUpdateStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStatusModal) return;

    const updatedBLs = bonsDeLivraison.map(b => {
      if (b.id === showStatusModal.id) {
        const isNowDelivered = newStatut === 'Livré';
        return {
          ...b,
          statut: newStatut,
          nomReceptionnaire: podRecipient || b.nomReceptionnaire,
          signatureReception: podSignature || b.signatureReception,
          dateReception: isNowDelivered ? new Date().toLocaleString('fr-FR') : b.dateReception,
          historiqueStatuts: [
            ...(b.historiqueStatuts || []),
            {
              statut: newStatut,
              date: new Date().toLocaleString('fr-FR'),
              utilisateur: currentUser?.nom || 'Logistique',
              commentaire: statusComment || `Mise à jour du statut vers ${newStatut}`
            }
          ]
        };
      }
      return b;
    });

    setBonsDeLivraison(updatedBLs);
    setShowStatusModal(null);
    showNotification(`Statut du BL mis à jour : ${newStatut}`, 'success');
  };

  // Handle Goods Return (Retour de marchandises - Rule RB-08)
  const handleCreateReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReturnModal) return;

    const bl = showReturnModal;
    const returnLines = bl.lignes
      .map(l => {
        const qteRet = returnQuantities[l.articleId] || 0;
        if (qteRet <= 0) return null;
        return {
          articleId: l.articleId,
          designation: l.designation,
          qteLivree: l.qteLivree,
          qteRetournee: qteRet,
          prixUnitaireHT: l.prixUnitaireHT,
          totalHT: qteRet * l.prixUnitaireHT,
          motifSpecifique: returnMotif || 'Retour marchandise client'
        };
      })
      .filter(Boolean) as any[];

    if (returnLines.length === 0) {
      showNotification('Veuillez indiquer au moins une quantité retournée > 0', 'error');
      return;
    }

    const retNumber = `RET-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const inStockOpNumber = `IN-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    // Re-increment stock for returned items
    const updatedArticles = articles.map(art => {
      const retLine = returnLines.find(r => r.articleId === art.id);
      if (!retLine) return art;

      const currentStockInBoutique = art.stocks?.[bl.projetId] ?? art.stock ?? 0;
      const newStockInBoutique = currentStockInBoutique + retLine.qteRetournee;

      return {
        ...art,
        stocks: {
          ...(art.stocks || {}),
          [bl.projetId]: newStockInBoutique
        },
        stock: bl.projetId === '1' ? newStockInBoutique : art.stock
      };
    });
    setArticles(updatedArticles);

    // Create Stock ENTREE Operation
    const inOperation: StockOperation = {
      id: 'so-in-' + Date.now(),
      operationNumber: inStockOpNumber,
      type: 'ENTREE',
      projetId: bl.projetId,
      warehouseId: bl.boutiqueNom || 'Dépôt Central UGS',
      referenceType: 'RETOUR',
      referenceId: bl.id,
      referenceNumero: retNumber,
      status: 'EFFECTUE',
      createdAt: new Date().toLocaleString('fr-FR'),
      createdBy: currentUser?.id || 'admin',
      createdByName: currentUser?.nom || 'Magasinier UGS',
      lignes: returnLines.map(r => ({
        articleId: r.articleId,
        articleNom: r.designation,
        quantite: r.qteRetournee
      })),
      motif: `Réintégration stock suite au retour marchandise ${retNumber} sur BL ${bl.numero}`
    };
    setStockOperations([inOperation, ...stockOperations]);

    // Record Return
    const newReturn: RetourMarchandise = {
      id: 'ret-' + Date.now(),
      numero: retNumber,
      blId: bl.id,
      blNumero: bl.numero,
      clientId: bl.clientId,
      clientNom: bl.clientNom,
      projetId: bl.projetId,
      date: new Date().toLocaleString('fr-FR'),
      motifGeneral: returnMotif || 'Retour client',
      lignes: returnLines,
      stockOperationId: inStockOpNumber,
      statut: 'Validé',
      auteurNom: currentUser?.nom || 'Magasinier'
    };
    setRetoursMarchandise([newReturn, ...retoursMarchandise]);

    // Audit log
    const log: AuditLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleString('fr-FR'),
      utilisateurNom: currentUser?.nom || 'Magasinier',
      utilisateurEmail: currentUser?.email || 'admin@ugs.tn',
      projetId: bl.projetId,
      action: `Retour Marchandise ${retNumber} sur BL ${bl.numero}`,
      categorie: 'Métier',
      nouvelleValeur: `Stock réintégré (+${returnLines.reduce((s, r) => s + r.qteRetournee, 0)} articles) - Mouvement: ${inStockOpNumber}`
    };
    setAuditLogs([log, ...auditLogs]);

    setShowReturnModal(null);
    setReturnQuantities({});
    setReturnMotif('');
    showNotification(`Retour de marchandise ${retNumber} enregistré! Stock réintégré avec succès (+ENTREE).`, 'success');
  };

  // Helper badge color for BL status
  const getStatutBadge = (statut: StatutBL) => {
    switch (statut) {
      case 'Livré':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Expédié':
      case 'En livraison':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'En préparation':
      case 'Validé':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'Livraison partielle':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
      case 'Refusé':
      case 'Annulé':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-bounce transition-all ${
          toastMessage.type === 'error' ? 'bg-rose-900 text-white border-rose-700' :
          toastMessage.type === 'warning' ? 'bg-amber-900 text-white border-amber-700' :
          'bg-slate-900 text-white border-slate-700'
        }`}>
          <span className="material-symbols-outlined text-[24px]">
            {toastMessage.type === 'error' ? 'error' : toastMessage.type === 'warning' ? 'warning' : 'check_circle'}
          </span>
          <p className="text-xs font-bold">{toastMessage.text}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-black tracking-widest uppercase rounded-full border border-indigo-500/30">
                Société UGS • Logistique Centralisée
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Anti-Double Décrémentation
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-indigo-400">local_shipping</span>
              Bons de Livraison (BL)
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Orchestration du cycle complet de livraison : Commande → Préparation → Sortie Stock Unique → Livraison → Facturation sans doublon.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-400/30"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Nouveau Bon de Livraison
            </button>
          </div>
        </div>

        {/* Overview Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total BL Émis</span>
              <span className="material-symbols-outlined text-[18px] text-indigo-400">receipt_long</span>
            </div>
            <p className="text-2xl font-black text-white mt-1">{totalBL}</p>
            <span className="text-[10px] text-indigo-300 mt-0.5 block">Document(s) logistique(s)</span>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Livraisons Effectuées</span>
              <span className="material-symbols-outlined text-[18px] text-emerald-400">verified</span>
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-1">{countLivre}</p>
            <span className="text-[10px] text-slate-300 mt-0.5 block">Preuves de réception validées</span>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">En Cours / Transit</span>
              <span className="material-symbols-outlined text-[18px] text-amber-400">local_shipping</span>
            </div>
            <p className="text-2xl font-black text-amber-400 mt-1">{countEnCours}</p>
            <span className="text-[10px] text-slate-300 mt-0.5 block">Préparation & Expéditions</span>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Valeur Livrée TTC</span>
              <span className="material-symbols-outlined text-[18px] text-indigo-400">payments</span>
            </div>
            <p className="text-2xl font-black text-white mt-1">{totalValeurLivree.toFixed(2)} <span className="text-xs text-indigo-300 font-bold">DT</span></p>
            <span className="text-[10px] text-slate-300 mt-0.5 block">Marchandises sorties</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* Main Module Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('bl_list')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'bl_list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">list_alt</span>
              Liste des Bons de Livraison ({totalBL})
            </button>

            <button
              onClick={() => setActiveTab('operations')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'operations'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">outbound</span>
              Mouvements & Sorties Unique ({stockOperations.length})
            </button>

            <button
              onClick={() => setActiveTab('retours')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'retours'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">assignment_return</span>
              Retours Marchandises ({retoursMarchandise.length})
            </button>
          </div>

          {/* Search & Status Filter */}
          {activeTab === 'bl_list' && (
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="N° BL, Client, Commande, Transporteur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="w-full md:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Tous les Statuts</option>
                <option value="Validé">Validé</option>
                <option value="En préparation">En préparation</option>
                <option value="Expédié">Expédié</option>
                <option value="En livraison">En livraison</option>
                <option value="Livré">Livré</option>
                <option value="Livraison partielle">Livraison partielle</option>
                <option value="Brouillon">Brouillon</option>
                <option value="Annulé">Annulé</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: LISTE DES BONS DE LIVRAISON */}
      {activeTab === 'bl_list' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {filteredBLs.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-600">
                local_shipping
              </span>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">Aucun Bon de Livraison trouvé</h3>
              <p className="text-xs text-slate-500 mt-1">Créez votre premier BL ou ajustez vos filtres de recherche.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-500 inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Créer un Bon de Livraison
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">N° Document & Dates</th>
                    <th className="p-4">Client & Destinataire</th>
                    <th className="p-4">Boutique & Références</th>
                    <th className="p-4">Statut Logistique</th>
                    <th className="p-4">Protection Stock</th>
                    <th className="p-4 text-right">Montant TTC</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                  {filteredBLs.map((bl) => {
                    const isFacture = Boolean(bl.factureRef);
                    return (
                      <tr key={bl.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">description</span>
                            {bl.numero}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Créé le : {bl.dateCreation} • Prévu : {bl.dateLivraison}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{bl.clientNom}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-xs" title={bl.adresseLivraison}>
                            📍 {bl.adresseLivraison}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-md mb-1">
                            {bl.boutiqueNom || 'Société UGS'}
                          </span>
                          <div className="text-[10px] text-slate-500">
                            {bl.commandeRef && <span className="mr-2">Commande : <strong className="text-slate-700 dark:text-slate-300">{bl.commandeRef}</strong></span>}
                            {bl.factureRef && <span className="text-emerald-600 font-extrabold">Facture : {bl.factureRef}</span>}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatutBadge(bl.statut)}`}>
                            {bl.statut}
                          </span>
                        </td>

                        <td className="p-4">
                          {bl.isStockDecremented ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                Sortie unique faite
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">{bl.stockOperationId || 'OUT-UNIQUE'}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => executeStockOutputForBL(bl)}
                              className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[12px]">outbound</span>
                              Valider Sortie Stock
                            </button>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {bl.montantTTC.toFixed(2)} DT
                          </div>
                          <div className="text-[10px] text-slate-400">{bl.lignes.length} article(s)</div>
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View / Detail */}
                            <button
                              onClick={() => setShowDetailModal(bl)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                              title="Voir le détail du BL"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>

                            {/* Print PDF */}
                            <button
                              onClick={() => setShowPrintModal(bl)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                              title="Imprimer / PDF Pro"
                            >
                              <span className="material-symbols-outlined text-[18px]">print</span>
                            </button>

                            {/* Status Workflow Update */}
                            <button
                              onClick={() => {
                                setShowStatusModal(bl);
                                setNewStatut(bl.statut);
                              }}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                              title="Mettre à jour le statut / Preuve de livraison"
                            >
                              <span className="material-symbols-outlined text-[18px]">published_with_changes</span>
                            </button>

                            {/* Transform BL to Invoice (Rule RB-05: NO double decrement!) */}
                            {!isFacture ? (
                              <button
                                onClick={() => handleTransformBLToInvoice(bl)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                title="Transformer en Facture sans deuxième sortie de stock"
                              >
                                <span className="material-symbols-outlined text-[12px]">receipt</span>
                                Facturer
                              </button>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-black rounded border border-emerald-300">
                                Facturé
                              </span>
                            )}

                            {/* Return Goods Modal */}
                            {bl.statut === 'Livré' && (
                              <button
                                onClick={() => setShowReturnModal(bl)}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="Enregistrer un retour de marchandise"
                              >
                                <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MOUVEMENTS & SORTIES UNIQUE (Rule RB-04, RB-10, Idempotency Audit) */}
      {activeTab === 'operations' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-[22px]">verified_user</span>
                Registre des Opérations de Stock & Anti-Duplication
              </h3>
              <p className="text-xs text-slate-500">
                Garantie d'idempotence : Chaque Bon de Livraison possède un identifiant unique d'opération (e.g. OUT-2026-XXXXXX).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">ID Opération (Clé Unique)</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Référence Document</th>
                  <th className="p-3">Entrepôt / Boutique</th>
                  <th className="p-3">Articles & Quantités</th>
                  <th className="p-3">Auteur & Date</th>
                  <th className="p-3">Motif & Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {stockOperations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Aucune opération enregistrée.</td>
                  </tr>
                ) : (
                  stockOperations.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-800">
                          {op.operationNumber}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          op.type === 'SORTIE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {op.type}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {op.referenceNumero || op.referenceId} ({op.referenceType})
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{op.warehouseId || 'Centrale UGS'}</td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {op.lignes.map((l, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300">
                              • <strong>{l.articleNom}</strong> : <span className="font-mono font-bold text-indigo-600">{l.quantite}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-slate-500">
                        <div>{op.createdByName || 'Système'}</div>
                        <div className="text-[10px] text-slate-400">{op.createdAt}</div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">
                        {op.motif}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RETOURS MARCHANDISES (Rule RB-08) */}
      {activeTab === 'retours' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-[22px]">assignment_return</span>
                Historique des Retours Marchandises Client
              </h3>
              <p className="text-xs text-slate-500">
                L'annulation d'une facture ne réintègre pas automatiquement le stock. Seul un retour formalisé génère un mouvement d'ENTRÉE (+stock).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">N° Bon Retour</th>
                  <th className="p-3">BL d'Origine</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Articles Retournés</th>
                  <th className="p-3">Motif du Retour</th>
                  <th className="p-3">Mouvement Entrée Stock</th>
                  <th className="p-3">Auteur & Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {retoursMarchandise.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Aucun retour marchandise enregistré.</td>
                  </tr>
                ) : (
                  retoursMarchandise.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-extrabold text-rose-600">{ret.numero}</td>
                      <td className="p-3 font-bold text-indigo-600">{ret.blNumero}</td>
                      <td className="p-3 text-slate-900 dark:text-white font-bold">{ret.clientNom}</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {ret.lignes.map((l, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300">
                              • <strong>{l.designation}</strong> : +{l.qteRetournee} unité(s)
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{ret.motifGeneral}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold rounded">
                          {ret.stockOperationId || 'IN-STOCK'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        <div>{ret.auteurNom}</div>
                        <div className="text-[10px] text-slate-400">{ret.date}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOUTVEAU BON DE LIVRAISON */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600">add_circle</span>
                  Créer un Bon de Livraison (BL)
                </h3>
                <p className="text-xs text-slate-500">Saisie manuelle ou chargement automatique depuis une Commande commerciale.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateBL} className="space-y-6">
              {/* Option 1: Pick existing Commande / Sales Order */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                <label className="block text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1.5">
                  🔗 Charger depuis une Commande existante (Optionnel)
                </label>
                <select
                  value={selectedCommandeId}
                  onChange={(e) => handleSelectCommande(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Création manuelle sans commande source --</option>
                  {ventes.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.numero} - Client: {v.clientNom} ({v.montantTTC.toFixed(2)} DT TTC) [{v.statut}]
                    </option>
                  ))}
                </select>
              </div>

              {/* General Document Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Boutique UGS Source
                  </label>
                  <select
                    value={formProjetId}
                    onChange={(e) => setFormProjetId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {projets.map(p => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Client *
                  </label>
                  <select
                    value={formClientId}
                    onChange={(e) => {
                      setFormClientId(e.target.value);
                      const c = clients.find(cl => cl.id === e.target.value);
                      if (c) {
                        setFormAdresseLivraison(c.adresse || '');
                        setFormAdresseFacturation(c.adresse || '');
                      }
                    }}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="">-- Sélectionner le Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom} ({c.matriculeFiscal || 'Standard'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Référence Commande Source
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CMD-2026-000087"
                    value={formCommandeRef}
                    onChange={(e) => setFormCommandeRef(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Delivery Address & Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    📍 Adresse de Livraison
                  </label>
                  <textarea
                    rows={2}
                    value={formAdresseLivraison}
                    onChange={(e) => setFormAdresseLivraison(e.target.value)}
                    placeholder="Adresse complète de livraison..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🏬 Transporteur & Chauffeur
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Transporteur"
                      value={formTransporteur}
                      onChange={(e) => setFormTransporteur(e.target.value)}
                      className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Chauffeur & Immatriculation"
                      value={formChauffeur}
                      onChange={(e) => setFormChauffeur(e.target.value)}
                      className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Product Lines Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Lignes de Produits & Quantités
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Ajouter Produit
                  </button>
                </div>

                {formLignes.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                    Aucun produit ajouté. Cliquez sur "Ajouter Produit" ou sélectionnez une commande ci-dessus.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                          <th className="p-2.5">Article</th>
                          <th className="p-2.5 text-center">Qté Commandée</th>
                          <th className="p-2.5 text-center">Qté à Livrer</th>
                          <th className="p-2.5 text-right">Prix Unit. HT</th>
                          <th className="p-2.5 text-right">Total HT</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {formLignes.map((line, idx) => (
                          <tr key={idx}>
                            <td className="p-2">
                              <select
                                value={line.articleId}
                                onChange={(e) => handleUpdateLine(idx, 'articleId', e.target.value)}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold"
                              >
                                {articles.map(a => (
                                  <option key={a.id} value={a.id}>
                                    {a.code} - {a.designation} (Stock Dispo: {a.stocks?.[formProjetId] ?? a.stock ?? 0})
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="p-2 text-center w-28">
                              <input
                                type="number"
                                min={1}
                                value={line.qteCommandee}
                                onChange={(e) => handleUpdateLine(idx, 'qteCommandee', Number(e.target.value))}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold text-center"
                              />
                            </td>

                            <td className="p-2 text-center w-28">
                              <input
                                type="number"
                                min={1}
                                max={line.qteCommandee}
                                value={line.qteLivree}
                                onChange={(e) => handleUpdateLine(idx, 'qteLivree', Number(e.target.value))}
                                className="w-full p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-300 rounded-lg text-xs font-black text-center"
                              />
                            </td>

                            <td className="p-2 text-right w-28">
                              <input
                                type="number"
                                step="0.01"
                                value={line.prixUnitaireHT}
                                onChange={(e) => handleUpdateLine(idx, 'prixUnitaireHT', Number(e.target.value))}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs text-right"
                              />
                            </td>

                            <td className="p-2 text-right font-extrabold text-slate-900 dark:text-white">
                              {line.totalHT.toFixed(2)} DT
                            </td>

                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  Valider & Générer Bon de Livraison
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL BON DE LIVRAISON */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getStatutBadge(showDetailModal.statut)}`}>
                  {showDetailModal.statut}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  Bon de Livraison {showDetailModal.numero}
                </h3>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-400">Information Client</span>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm">{showDetailModal.clientNom}</p>
                <p className="text-slate-500">📍 {showDetailModal.adresseLivraison}</p>
                {showDetailModal.telephoneClient && <p className="text-slate-500">📞 {showDetailModal.telephoneClient}</p>}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-400">Protection Stock & Idempotence</span>
                <p className="font-mono font-bold text-indigo-600">
                  {showDetailModal.stockOperationId || 'DÉCRÉMENTATION UNIQUE'}
                </p>
                <p className="text-slate-500">Boutique : {showDetailModal.boutiqueNom}</p>
                {showDetailModal.factureRef && <p className="text-emerald-600 font-bold">Facture liée : {showDetailModal.factureRef}</p>}
              </div>
            </div>

            {/* Articles table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">Désignation</th>
                    <th className="p-3 text-center">Qté Commandée</th>
                    <th className="p-3 text-center">Qté Livrée</th>
                    <th className="p-3 text-right">Prix HT</th>
                    <th className="p-3 text-right">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {showDetailModal.lignes.map((l, i) => (
                    <tr key={i}>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{l.designation}</div>
                        <div className="text-[10px] text-slate-400">{l.code}</div>
                      </td>
                      <td className="p-3 text-center">{l.qteCommandee}</td>
                      <td className="p-3 text-center font-bold text-indigo-600">{l.qteLivree}</td>
                      <td className="p-3 text-right">{l.prixUnitaireHT.toFixed(2)} DT</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{l.totalTTC.toFixed(2)} DT</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* History timeline */}
            {showDetailModal.historiqueStatuts && showDetailModal.historiqueStatuts.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Historique & Traçabilité Audit</span>
                <div className="space-y-1.5">
                  {showDetailModal.historiqueStatuts.map((h, i) => (
                    <div key={i} className="text-xs flex items-center justify-between text-slate-600 dark:text-slate-300 border-b border-slate-200/50 dark:border-slate-700/50 pb-1">
                      <div>
                        <strong>{h.statut}</strong> - {h.commentaire || 'Action exécutée'} ({h.utilisateur})
                      </div>
                      <span className="text-[10px] text-slate-400">{h.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowPrintModal(showDetailModal)}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Imprimer Document PDF Pro
              </button>

              <button
                onClick={() => setShowDetailModal(null)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINT / PDF PRO PRINTABLE VIEW */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8 print:p-0 print:shadow-none font-sans">
            
            {/* Action Bar (Not printed) */}
            <div className="flex justify-between items-center print:hidden border-b pb-4">
              <span className="text-xs font-bold text-slate-500">Aperçu Avant Impression Document Logistique</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-500 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Lancer l'Impression / Télécharger PDF
                </button>
                <button onClick={() => setShowPrintModal(null)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Print Document Content */}
            <div className="p-6 border border-slate-200 rounded-2xl space-y-6 bg-white text-slate-900">
              {/* Company Header */}
              <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-900 text-white font-black text-xl flex items-center justify-center rounded-lg">
                      UGS
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-indigo-950 tracking-tight">SOCIÉTÉ UGS</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Centrale de Distribution & Logistique</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Avenue Habib Bourguiba, Sfax • Tél: +216 74 000 001<br />
                    Matricule Fiscal: 1234567/M/A/M/000 • Email: centrale@ugs.tn
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <h3 className="text-2xl font-black text-indigo-900">BON DE LIVRAISON</h3>
                  <p className="text-sm font-mono font-bold text-slate-800">{showPrintModal.numero}</p>
                  <p className="text-xs text-slate-500">Date : {showPrintModal.dateCreation}</p>
                  {showPrintModal.commandeRef && <p className="text-xs font-bold text-slate-700">Commande : {showPrintModal.commandeRef}</p>}
                </div>
              </div>

              {/* Client & Delivery Info */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider">Client & Facturation</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-1">{showPrintModal.clientNom}</p>
                  {showPrintModal.matriculeFiscalClient && <p className="text-slate-600">MF: {showPrintModal.matriculeFiscalClient}</p>}
                  <p className="text-slate-600 mt-1">{showPrintModal.adresseFacturation || showPrintModal.adresseLivraison}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider">Adresse de Livraison & Transport</span>
                  <p className="font-bold text-slate-800 mt-1">📍 {showPrintModal.adresseLivraison}</p>
                  <p className="text-slate-600 mt-1">Transporteur : {showPrintModal.transporteur || 'UGS Express'}</p>
                  {showPrintModal.chauffeur && <p className="text-slate-600">Chauffeur: {showPrintModal.chauffeur}</p>}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-indigo-900 text-white font-bold uppercase text-[9px] tracking-wider">
                    <th className="p-2.5">Réf / Code</th>
                    <th className="p-2.5">Désignation Produit</th>
                    <th className="p-2.5 text-center">Qté Commandée</th>
                    <th className="p-2.5 text-center">Qté Livrée</th>
                    <th className="p-2.5 text-right">Prix HT</th>
                    <th className="p-2.5 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {showPrintModal.lignes.map((l, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-mono text-[11px] font-bold">{l.code}</td>
                      <td className="p-2.5 font-bold">{l.designation}</td>
                      <td className="p-2.5 text-center text-slate-500">{l.qteCommandee}</td>
                      <td className="p-2.5 text-center font-extrabold text-indigo-950">{l.qteLivree}</td>
                      <td className="p-2.5 text-right">{l.prixUnitaireHT.toFixed(2)} DT</td>
                      <td className="p-2.5 text-right font-bold">{l.totalHT.toFixed(2)} DT</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & QR Verification */}
              <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 p-1 border rounded flex items-center justify-center">
                    <Barcode1D value={showPrintModal.numero} width={1} height={40} />
                  </div>
                  <div className="text-[9px] text-slate-500 max-w-xs">
                    Authentification QR Code • Mouvement Stock ID: <strong className="font-mono text-indigo-900">{showPrintModal.stockOperationId || 'OUT-UNIQUE'}</strong>. Document officiel Société UGS.
                  </div>
                </div>

                <div className="text-right space-y-1 text-xs">
                  <p className="text-slate-600">Total HT : <strong className="text-slate-900">{showPrintModal.montantHT.toFixed(2)} DT</strong></p>
                  <p className="text-slate-600">TVA (19%) : <strong className="text-slate-900">{(showPrintModal.montantTVA || 0).toFixed(2)} DT</strong></p>
                  <p className="text-base font-black text-indigo-950">Total TTC : {showPrintModal.montantTTC.toFixed(2)} DT</p>
                </div>
              </div>

              {/* Signatures Block */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
                <div className="h-24 border border-dashed border-slate-300 rounded-xl p-3 flex flex-col justify-between">
                  <span className="font-bold text-slate-700">Cachet & Signature Transporteur / Magasinier UGS</span>
                  <span className="text-[10px] text-slate-400">Date & Nom</span>
                </div>

                <div className="h-24 border border-dashed border-slate-300 rounded-xl p-3 flex flex-col justify-between">
                  <span className="font-bold text-slate-700">Nom & Signature Client Réceptionnaire</span>
                  <span className="text-[10px] text-slate-400">Bon pour réception conforme</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RETOUR MARCHANDISE */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600">assignment_return</span>
                  Retour de Marchandise sur BL {showReturnModal.numero}
                </h3>
                <p className="text-xs text-slate-500">Génère un mouvement d'ENTRÉE de stock (+stock) pour les produits réintégrés.</p>
              </div>
              <button onClick={() => setShowReturnModal(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motif général du retour
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sacs endommagés, erreur de référence client..."
                  value={returnMotif}
                  onChange={(e) => setReturnMotif(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                  Saisir les Quantités Retournées par Produit
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {showReturnModal.lignes.map((l) => (
                    <div key={l.articleId} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{l.designation}</div>
                        <div className="text-[10px] text-slate-400">Qté livrée : {l.qteLivree}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500">Qté Retournée:</span>
                        <input
                          type="number"
                          min={0}
                          max={l.qteLivree}
                          value={returnQuantities[l.articleId] || 0}
                          onChange={(e) => setReturnQuantities({
                            ...returnQuantities,
                            [l.articleId]: Number(e.target.value)
                          })}
                          className="w-20 p-1.5 bg-white dark:bg-slate-900 border border-rose-300 text-rose-600 font-extrabold rounded-lg text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-rose-500"
                >
                  Valider le Retour (+Entrée Stock)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE STATUS & POD */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">published_with_changes</span>
                  Changer le Statut - BL {showStatusModal.numero}
                </h3>
              </div>
              <button onClick={() => setShowStatusModal(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nouveau Statut
                </label>
                <select
                  value={newStatut}
                  onChange={(e) => setNewStatut(e.target.value as StatutBL)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                >
                  <option value="Brouillon">Brouillon</option>
                  <option value="Validé">Validé</option>
                  <option value="En préparation">En préparation</option>
                  <option value="Expédié">Expédié</option>
                  <option value="En livraison">En livraison</option>
                  <option value="Livré">Livré</option>
                  <option value="Livraison partielle">Livraison partielle</option>
                  <option value="Refusé">Refusé</option>
                  <option value="Annulé">Annulé</option>
                </select>
              </div>

              {newStatut === 'Livré' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300">
                    Preuve de Livraison (POD)
                  </span>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Nom du Réceptionnaire</label>
                    <input
                      type="text"
                      placeholder="Ex: Karim Mansour"
                      value={podRecipient}
                      onChange={(e) => setPodRecipient(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Signature / Empreinte</label>
                    <input
                      type="text"
                      placeholder="Ex: Signé électroniquement le 30/08/2026"
                      value={podSignature}
                      onChange={(e) => setPodSignature(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Commentaire Audit</label>
                <textarea
                  rows={2}
                  placeholder="Remarque ou réserve..."
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white rounded-xl font-black shadow-md hover:bg-amber-500"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
