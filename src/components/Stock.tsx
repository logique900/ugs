import { getArticleStock, hasLowStock, isOutOfStock, updateArticleStock } from '../utils/stockUtils';
import React, { useState, useMemo } from 'react';
import { Article, Projet, MouvementStock, Utilisateur, Role, Vente, Fournisseur, Achat, TabType } from '../types';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';

interface StockProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  articles: Article[];
  onArticlesChange: (articles: Article[]) => void;
  mouvements: MouvementStock[];
  onMouvementsChange: (mouvements: MouvementStock[]) => void;
  projets: Projet[];
  ventes?: Vente[];
  fournisseurs?: Fournisseur[];
  onGenerateAchat?: (nouvelAchat: Partial<Achat>) => void;
  onNavigate?: (tab: TabType) => void;
}

export function Stock({ 
  currentUser, 
  selectedProjectId, 
  articles, 
  onArticlesChange, 
  mouvements, 
  onMouvementsChange, 
  projets,
  ventes = [],
  fournisseurs = [],
  onGenerateAchat,
  onNavigate
}: StockProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'rupture' | 'faible' | 'normal'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Entrée' | 'Sortie' | 'Correction' | 'Transfert'>('Entrée');

  const activeRole: Role = currentUser?.role || 'admin';

  // Matrice des permissions
  const isAdmin = activeRole === 'admin' || activeRole === 'directeur' || activeRole === 'chef_projet';
  const isComptable = activeRole === 'comptable';
  const isCaissier = activeRole === 'caissier' || activeRole === 'agent';

  
  const canConsultStock = true; // Tous les rôles
  const canConsultMovements = true; // Tous les rôles
  const canConsultAlerts = true; // Tous les rôles
  const canManualEntree = isAdmin || isCaissier;
  const canManualSortie = isAdmin || isCaissier;
  const canCorrection = isAdmin || isCaissier;
  const canTransfert = isAdmin || isCaissier;
  const canConfigureThresholds = isAdmin || isCaissier;

  
  const [formData, setFormData] = useState<{
    date: string;
    motif: string;
    lignes: { articleId: string; quantite: number }[];
  }>({
    date: new Date().toISOString().split('T')[0],
    motif: '',
    lignes: []
  });
  const [articleSearchTerm, setArticleSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  const aiMotifsEntree = ["Réapprovisionnement fournisseur", "Retour de chantier", "Correction d'inventaire", "Achat exceptionnel"];
  const aiMotifsSortie = ["Consommation chantier", "Produit défectueux / Casse", "Échantillon client", "Vol / Perte"];

  const [selectedArticleForBoutiqueModal, setSelectedArticleForBoutiqueModal] = useState<Article | null>(null);

  // Transferts Société UGS ➔ Boutiques (Multi-articles & Multi-services)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferScannerOpen, setIsTransferScannerOpen] = useState(false);
  const [transferScannerInput, setTransferScannerInput] = useState('');
  const [avecVehicule, setAvecVehicule] = useState(true);
  const [transferForm, setTransferForm] = useState<{
    sourceDepotId: string;
    destBoutiqueId: string;
    date: string;
    motif: string;
    chauffeur: string;
    immatriculation: string;
    lignes: Array<{ id: string; articleId: string; quantite: number }>;
  }>({
    sourceDepotId: '1', // Société UGS
    destBoutiqueId: '2',
    date: new Date().toISOString().split('T')[0],
    motif: 'Réapprovisionnement boutique depuis Société UGS',
    chauffeur: 'Chauffeur Logistique ERP Management',
    immatriculation: '185 TN 4210',
    lignes: [{ id: 'line-1', articleId: '', quantite: 1 }]
  });

  const [isBulkPickerOpen, setIsBulkPickerOpen] = useState(false);
  const [bulkPickerSearch, setBulkPickerSearch] = useState('');
  const [bulkPickerTypeFilter, setBulkPickerTypeFilter] = useState<'all' | 'Produit' | 'Service'>('all');
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);

  const [lastTransferVoucher, setLastTransferVoucher] = useState<{
    id: string;
    sourceNom: string;
    destNom: string;
    date: string;
    motif: string;
    chauffeur: string;
    immatriculation: string;
    lignes: Array<{
      article: Article;
      quantite: number;
      stockSourceAvant: number;
      stockSourceApres: number;
      stockDestAvant: number;
      stockDestApres: number;
    }>;
    totalQuantitePhysique: number;
    totalServices: number;
  } | null>(null);

  const articlesToShow = selectedProjectId === 'all' 
    ? articles 
    : articles.filter(a => a.projetId === selectedProjectId);

  const mouvementsToShow = selectedProjectId === 'all'
    ? mouvements
    : mouvements.filter(m => m.projetId === selectedProjectId);

  const categoriesList = useMemo(() => {
    return Array.from(new Set(articles.map(a => a.famille).filter(Boolean)));
  }, [articles]);

  const filteredArticles = articlesToShow.filter(a => {
    // 1. Category filter
    if (categoryFilter !== 'all' && a.famille !== categoryFilter) {
      return false;
    }

    // 2. Product filter
    if (productFilter !== 'all' && a.id !== productFilter) {
      return false;
    }

    // 3. Search term
    const term = searchTerm.toLowerCase().trim();
    let matchesSearch = true;
    if (term) {
      const matchesDesignation = a.designation?.toLowerCase().includes(term);
      const matchesCode = a.code?.toLowerCase().includes(term);
      const matchesRef = a.referenceInterne?.toLowerCase().includes(term);
      const matchesCodeBarres = a.codeBarres?.some(cb => cb.toLowerCase().includes(term));
      const matchesFamille = a.famille?.toLowerCase().includes(term);
      const matchesMarque = a.marque?.toLowerCase().includes(term);
      matchesSearch = matchesDesignation || matchesCode || matchesRef || matchesCodeBarres || matchesFamille || matchesMarque;
    }

    // 4. Status filter
    let matchesStatus = true;
    const stockQty = getArticleStock(a, selectedProjectId);
    const minQty = a.stockMinimums?.[selectedProjectId] || 15;

    if (statusFilter === 'rupture') matchesStatus = stockQty === 0;
    if (statusFilter === 'faible') matchesStatus = stockQty > 0 && stockQty < minQty;
    if (statusFilter === 'normal') matchesStatus = stockQty >= minQty;

    return matchesSearch && matchesStatus;
  });

  const handleOpenModal = (type: 'Entrée' | 'Sortie' | 'Correction' | 'Transfert', prefillArticleId?: string) => {
    if (!canManualEntree && !canManualSortie && !canCorrection && !canTransfert) {
      alert("Accès refusé : Les mouvements manuels sont réservés aux Administrateurs.");
      return;
    }
    setModalType(type);
    const prefillArticle = articles.find(a => a.id === prefillArticleId);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      motif: '',
      lignes: prefillArticleId ? [{ articleId: prefillArticleId, quantite: 1 }] : []
    });
    setArticleSearchTerm('');
    setIsDropdownOpen(false);
    setShowAISuggestions(true);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManualEntree && !canManualSortie) {
      alert("Opération bloquée : Seuls les Administrateurs ont la permission d'effectuer des mouvements de stock manuels.");
      return;
    }
    if (formData.lignes.length === 0) return;

    if (modalType === 'Sortie') {
      const zeroOrInsufficientLine = formData.lignes.find(ligne => {
        const article = articles.find(a => a.id === ligne.articleId);
        if (!article) return true;
        const currentStock = getArticleStock(article, selectedProjectId);
        return currentStock <= 0 || currentStock < ligne.quantite;
      });
      if (zeroOrInsufficientLine) {
        const art = articles.find(a => a.id === zeroOrInsufficientLine.articleId);
        const currentStock = art ? getArticleStock(art, selectedProjectId) : 0;
        alert(`ACTION BLOQUÉE - STOCK NULL OU INSUFFISANT :\nPour "${art?.designation || 'l\'article'}", le stock disponible est de ${currentStock} unité(s).\n\nImpossible d'effectuer une sortie ou décrémentation de stock sur un produit dont le stock est nul ou insuffisant.`);
        return;
      }
    }

    const timestamp = Date.now();
    const newMouvements: MouvementStock[] = [];
    let updatedArticles = [...articles];

    formData.lignes.forEach((ligne, index) => {
      const article = updatedArticles.find(a => a.id === ligne.articleId);
      if (!article) return;

      const stockAvant = getArticleStock(article, selectedProjectId);
      const stockApres = modalType === 'Entrée' ? stockAvant + ligne.quantite : Math.max(0, stockAvant - ligne.quantite);
      const boutiqueNom = projets.find(p => p.id === article.projetId)?.nom || 'Sfax Centre';

      newMouvements.push({
        id: `mvt-${timestamp}-${index}`,
        projetId: article.projetId,
        articleId: ligne.articleId,
        designation: article.designation,
        type: modalType,
        quantite: ligne.quantite,
        date: formData.date,
        motif: formData.motif,
        auteur: currentUser?.nom || 'Gestionnaire Stock',
        boutique: boutiqueNom,
        stockAvant,
        stockApres
      });

      updatedArticles = updatedArticles.map(a => {
        if (a.id === ligne.articleId) {
          return {
            ...a,
            stock: stockApres
          };
        }
        return a;
      });
    });

    onMouvementsChange([...newMouvements, ...mouvements]);
    onArticlesChange(updatedArticles);
    setIsModalOpen(false);
  };

  const handleOpenTransferModal = (prefillArticleId?: string) => {
    const defaultArticleId = prefillArticleId || (articlesToShow.length > 0 ? articlesToShow[0].id : (articles.length > 0 ? articles[0].id : ''));
    const defaultDest = projets.find(p => p.id !== '1')?.id || '2';
    setTransferForm({
      sourceDepotId: '1', // Société UGS par défaut
      destBoutiqueId: defaultDest,
      date: new Date().toISOString().split('T')[0],
      motif: 'Réapprovisionnement boutique depuis Société UGS',
      chauffeur: 'Chauffeur Logistique ERP Management',
      immatriculation: '185 TN 4210',
      lignes: [{ id: `line-${Date.now()}-0`, articleId: defaultArticleId, quantite: 1 }]
    });
    setBulkSelectedIds([]);
    setIsBulkPickerOpen(false);
    setIsTransferModalOpen(true);
    setAvecVehicule(true);
  };

  const handleAddTransferLine = (articleId: string = '', quantite: number = 1) => {
    setTransferForm(prev => ({
      ...prev,
      lignes: [
        ...prev.lignes,
        { id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, articleId, quantite }
      ]
    }));
  };

  const handleProcessTransferScan = (rawCode: string) => {
    if (!rawCode.trim()) return;
    const code = rawCode.trim();

    const found = articles.find(a => 
      (a.codeBarres && a.codeBarres.includes(code)) || 
      a.code === code
    );

    if (found) {
      setTransferForm(prev => {
        const existingLineIndex = prev.lignes.findIndex(l => l.articleId === found.id);
        if (existingLineIndex >= 0) {
          const newLignes = [...prev.lignes];
          newLignes[existingLineIndex] = {
            ...newLignes[existingLineIndex],
            quantite: (newLignes[existingLineIndex].quantite || 0) + 1
          };
          return { ...prev, lignes: newLignes };
        } else {
          const emptyLineIndex = prev.lignes.findIndex(l => !l.articleId);
          if (emptyLineIndex >= 0) {
            const newLignes = [...prev.lignes];
            newLignes[emptyLineIndex] = {
              ...newLignes[emptyLineIndex],
              articleId: found.id,
              quantite: 1
            };
            return { ...prev, lignes: newLignes };
          } else {
            return {
              ...prev,
              lignes: [
                ...prev.lignes,
                { id: `line-${Date.now()}`, articleId: found.id, quantite: 1 }
              ]
            };
          }
        }
      });
    } else {
      alert(`Article non trouvé pour le code: ${code}`);
    }
    setTransferScannerInput('');
  };

  const handleRemoveTransferLine = (lineId: string) => {
    setTransferForm(prev => {
      const nextLines = prev.lignes.filter(l => l.id !== lineId);
      return {
        ...prev,
        lignes: nextLines.length > 0 ? nextLines : [{ id: `line-${Date.now()}`, articleId: '', quantite: 1 }]
      };
    });
  };

  const handleUpdateTransferLine = (lineId: string, updates: Partial<{ articleId: string; quantite: number }>) => {
    setTransferForm(prev => ({
      ...prev,
      lignes: prev.lignes.map(l => l.id === lineId ? { ...l, ...updates } : l)
    }));
  };

  const handleApplyBulkPicker = () => {
    if (bulkSelectedIds.length === 0) {
      setIsBulkPickerOpen(false);
      return;
    }
    setTransferForm(prev => {
      const existingArticleIds = new Set(prev.lignes.map(l => l.articleId).filter(Boolean));
      const nextLines = [...prev.lignes.filter(l => l.articleId !== '')];
      
      bulkSelectedIds.forEach(artId => {
        if (!existingArticleIds.has(artId)) {
          nextLines.push({
            id: `line-${Date.now()}-${artId}`,
            articleId: artId,
            quantite: 1
          });
        }
      });

      return {
        ...prev,
        lignes: nextLines.length > 0 ? nextLines : [{ id: `line-${Date.now()}`, articleId: '', quantite: 1 }]
      };
    });
    setIsBulkPickerOpen(false);
    setBulkSelectedIds([]);
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();

    if (transferForm.sourceDepotId === transferForm.destBoutiqueId) {
      alert("Le Dépôt source et la Boutique réceptrice doivent être différents.");
      return;
    }

    const validLines = transferForm.lignes.filter(l => l.articleId && l.quantite > 0);
    if (validLines.length === 0) {
      alert("Veuillez sélectionner au moins un article ou service avec une quantité supérieure à 0.");
      return;
    }

    // Regrouper par articleId pour validation et exécution consolidée
    const aggregatedMap = new Map<string, number>();
    for (const line of validLines) {
      const current = aggregatedMap.get(line.articleId) || 0;
      aggregatedMap.set(line.articleId, current + line.quantite);
    }

    // Vérifier la disponibilité des stocks physiques à la Société UGS
    const insufficientStocks: string[] = [];
    aggregatedMap.forEach((qty, artId) => {
      const art = articles.find(a => a.id === artId);
      if (art && art.typeArticle !== 'Service') {
        const sourceStock = getArticleStock(art, transferForm.sourceDepotId);
        if (sourceStock <= 0 || qty > sourceStock) {
          insufficientStocks.push(`• ${art.designation} (${art.code}) : Demandé ${qty}, Disponible au Dépôt = ${sourceStock}`);
        }
      }
    });

    if (insufficientStocks.length > 0) {
      alert(`Stock insuffisant à la Société UGS pour les articles suivants :\n\n${insufficientStocks.join('\n')}\n\nVeuillez ajuster les quantités avant de valider.`);
      return;
    }

    const sourceProjet = projets.find(p => p.id === transferForm.sourceDepotId) || { id: '1', nom: 'Société UGS' };
    const destProjet = projets.find(p => p.id === transferForm.destBoutiqueId) || { id: '2', nom: 'Boutique Réceptrice' };
    const timestamp = Date.now();
    const transferCode = `TR-${new Date().getFullYear()}-${String(timestamp).slice(-5)}`;

    let updatedArticles = [...articles];
    const voucherLignes: Array<{
      article: Article;
      quantite: number;
      stockSourceAvant: number;
      stockSourceApres: number;
      stockDestAvant: number;
      stockDestApres: number;
    }> = [];
    const newMouvements: MouvementStock[] = [];

    aggregatedMap.forEach((qty, artId) => {
      const art = updatedArticles.find(a => a.id === artId);
      if (!art) return;

      const isService = art.typeArticle === 'Service';
      const sourceStockAvant = getArticleStock(art, transferForm.sourceDepotId);
      const destStockAvant = getArticleStock(art, transferForm.destBoutiqueId);

      let sourceStockApres = sourceStockAvant;
      let destStockApres = destStockAvant;

      if (isService) {
        // Déploiement / activation du service pour la boutique réceptrice
        updatedArticles = updatedArticles.map(a => {
          if (a.id === art.id) {
            return updateArticleStock(a, transferForm.destBoutiqueId, 1);
          }
          return a;
        });
        destStockApres = 1;
      } else {
        // Décrémenter la source et incrémenter la destination
        updatedArticles = updatedArticles.map(a => {
          if (a.id === art.id) {
            let updated = updateArticleStock(a, transferForm.sourceDepotId, -qty);
            updated = updateArticleStock(updated, transferForm.destBoutiqueId, qty);
            return updated;
          }
          return a;
        });
        sourceStockApres = Math.max(0, sourceStockAvant - qty);
        destStockApres = destStockAvant + qty;
      }

      voucherLignes.push({
        article: art,
        quantite: qty,
        stockSourceAvant: sourceStockAvant,
        stockSourceApres: sourceStockApres,
        stockDestAvant: destStockAvant,
        stockDestApres: destStockApres
      });

      // Mouvement Sortie Société UGS
      const mvtSortie: MouvementStock = {
        id: `mvt-tr-out-${timestamp}-${art.id}`,
        projetId: transferForm.sourceDepotId,
        articleId: art.id,
        designation: art.designation,
        type: 'Transfert',
        quantite: qty,
        date: transferForm.date,
        motif: `Transfert sortant vers ${destProjet.nom} [${transferCode}] - Motif: ${transferForm.motif}`,
        auteur: currentUser?.nom || 'Responsabla Société UGS',
        boutique: sourceProjet.nom,
        stockAvant: sourceStockAvant,
        stockApres: sourceStockApres
      };

      // Mouvement Entrée Boutique
      const mvtEntree: MouvementStock = {
        id: `mvt-tr-in-${timestamp}-${art.id}`,
        projetId: transferForm.destBoutiqueId,
        articleId: art.id,
        designation: art.designation,
        type: 'Transfert',
        quantite: qty,
        date: transferForm.date,
        motif: `Transfert entrant depuis ${sourceProjet.nom} [${transferCode}] - Motif: ${transferForm.motif}`,
        auteur: currentUser?.nom || 'Responsabla Société UGS',
        boutique: destProjet.nom,
        stockAvant: destStockAvant,
        stockApres: destStockApres
      };

      newMouvements.push(mvtSortie, mvtEntree);
    });

    onMouvementsChange([...newMouvements, ...mouvements]);
    onArticlesChange(updatedArticles);

    const totalQuantitePhysique = voucherLignes
      .filter(l => l.article.typeArticle !== 'Service')
      .reduce((sum, l) => sum + l.quantite, 0);

    const totalServices = voucherLignes
      .filter(l => l.article.typeArticle === 'Service').length;

    setLastTransferVoucher({
      id: transferCode,
      sourceNom: sourceProjet.nom,
      destNom: destProjet.nom,
      date: transferForm.date,
      motif: transferForm.motif,
      chauffeur: transferForm.chauffeur,
      immatriculation: transferForm.immatriculation,
      lignes: voucherLignes,
      totalQuantitePhysique,
      totalServices
    });

    setIsTransferModalOpen(false);
  };

  // KPIs
  const kpis = useMemo(() => {
    const value = articlesToShow.reduce((acc, a) => acc + (a.prixAchatHT * getArticleStock(a, selectedProjectId)), 0);
    const lowStock = articlesToShow.filter(a => getArticleStock(a, selectedProjectId) > 0 && getArticleStock(a, selectedProjectId) < 15).length;
    const outOfStock = articlesToShow.filter(a => getArticleStock(a, selectedProjectId) === 0).length;
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    
    const mvtsThisMonth = mouvementsToShow.filter(m => m.date >= firstDayOfMonth);
    const totalEntrees = mvtsThisMonth.filter(m => m.type === 'Entrée').reduce((acc, m) => acc + m.quantite, 0);
    const totalSorties = mvtsThisMonth.filter(m => m.type === 'Sortie').reduce((acc, m) => acc + m.quantite, 0);

    return { value, lowStock, outOfStock, totalEntrees, totalSorties };
  }, [articlesToShow, mouvementsToShow]);

  // Chart Data
  const chartData = useMemo(() => {
    // Group movements by date for the last 7 days
    const today = new Date();
    const dates = Array.from({length: 7}, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return dates.map(date => {
      const dayMvts = mouvementsToShow.filter(m => m.date === date);
      const entrees = dayMvts.filter(m => m.type === 'Entrée').reduce((acc, m) => acc + m.quantite, 0);
      const sorties = dayMvts.filter(m => m.type === 'Sortie').reduce((acc, m) => acc + m.quantite, 0);
      return { 
        name: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), 
        Entrées: entrees, 
        Sorties: sorties 
      };
    });
  }, [mouvementsToShow]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
                {/* Enhanced Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-xl sm:text-3xl font-bold text-on-surface flex items-center gap-3">
            Gestion des Stocks
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm sm:text-base">
            Consultez les quantités disponibles et suivez les entrées, sorties et transferts entre boutiques.
          </p>
        </div>
        
      </div>

      {/* Bannière de Flux Société UGS ➔ Boutiques */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-xl border border-indigo-500/30 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold shrink-0">
            <span className="material-symbols-outlined text-[28px]">hub</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base tracking-tight text-white">
                Société UGS
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider">
                Société UGS
              </span>
            </div>
              
          </div>
        </div>
        <button
          onClick={() => handleOpenTransferModal()}
          className="px-4 py-2.5 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer hover:scale-[1.02]"
        >
          <span className="material-symbols-outlined text-[18px] text-indigo-600">swap_horiz</span>
          Nouveau Transfert Inter-Sites
        </button>
      </div>

      {/* Modern Bento Grid KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* KPI 1: Valeur Globale */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="p-3 bg-surface-container text-on-surface-variant rounded-xl">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </span>
            <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> Actif
            </span>
          </div>
          <p className="text-on-surface-variant font-medium text-sm mb-1 relative z-10">Valeur d'Inventaire</p>
          <h3 className="text-4xl font-bold text-on-surface tracking-tight relative z-10">
            {kpis.value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-xl text-on-surface-variant font-medium">DT</span>
          </h3>
        </div>

        {/* KPI 2: Articles en Péril */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <span className="material-symbols-outlined">warning</span>
            </span>
          </div>
          <p className="text-on-surface-variant font-medium text-sm mb-1 relative z-10">Articles à surveiller</p>
          <div className="flex items-end gap-3 relative z-10">
            <div>
              <h3 className="text-4xl font-bold text-orange-600 tracking-tight">{kpis.lowStock}</h3>
              <p className="text-xs font-bold text-orange-600/70 uppercase tracking-wider">Stock Faible</p>
            </div>
            <div className="w-px h-10 bg-outline-variant"></div>
            <div>
              <h3 className="text-4xl font-bold text-error tracking-tight">{kpis.outOfStock}</h3>
              <p className="text-xs font-bold text-error/70 uppercase tracking-wider">Ruptures</p>
            </div>
          </div>
        </div>

        {/* KPI 3 & 4 Combined in a Chart Card */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-on-surface-variant font-medium text-sm mb-1">Mouvements des 7 derniers jours</p>
              <div className="flex gap-4">
                <p className="text-sm font-bold text-green-600"><span className="text-xl">{kpis.totalEntrees}</span> Entrées</p>
                <p className="text-sm font-bold text-error"><span className="text-xl">{kpis.totalSorties}</span> Sorties</p>
              </div>
            </div>
            <span className="p-3 bg-surface-container text-on-surface-variant rounded-xl">
              <span className="material-symbols-outlined">analytics</span>
            </span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntree" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSortie" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="Entrées" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorEntree)" />
                <Area type="monotone" dataKey="Sorties" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorSortie)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Content: Advanced Table & Interactive History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Inventory Interactive Table */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Filtering Tools */}
          <div className="flex flex-col gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 p-1 bg-surface-container-low rounded-xl overflow-x-auto w-full sm:w-auto">
                {(['all', 'normal', 'faible', 'rupture'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      statusFilter === status 
                        ? 'bg-white shadow text-on-surface' 
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {status === 'all' && 'Tous les états'}
                    {status === 'normal' && 'Normal'}
                    {status === 'faible' && 'Stock faible'}
                    {status === 'rupture' && 'Rupture'}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Rechercher (nom, réf, SKU, code-barres)..."
                  className="block w-full pl-9 pr-3 py-1.5 border border-outline-variant rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent text-on-surface transition-shadow"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-outline-variant/40">
              <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1 mr-1">
                <span className="material-symbols-outlined text-[16px]">filter_alt</span>
                Filtres :
              </span>

              {/* Catégorie */}
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-semibold text-slate-500">Catégorie :</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs font-medium bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1 text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="all">Toutes les catégories</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Produit */}
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-semibold text-slate-500">Produit :</label>
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="text-xs font-medium bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1 text-on-surface focus:outline-none focus:border-primary max-w-[200px] truncate"
                >
                  <option value="all">Tous les produits</option>
                  {articlesToShow.map(art => (
                    <option key={art.id} value={art.id}>{art.designation}</option>
                  ))}
                </select>
              </div>

              {(categoryFilter !== 'all' || productFilter !== 'all' || statusFilter !== 'all' || searchTerm !== '') && (
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setProductFilter('all');
                    setStatusFilter('all');
                    setSearchTerm('');
                  }}
                  className="text-xs font-bold text-error hover:underline ml-auto flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden flex flex-col h-[550px]">
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left font-body-md whitespace-nowrap border-collapse">
                <thead className="bg-surface-container-lowest text-on-surface-variant font-label-md uppercase tracking-wider sticky top-0 z-10 shadow-sm backdrop-blur-xl bg-opacity-90">
                  <tr>
                    <th className="px-6 py-5 font-bold text-xs">Article & Code</th>
                    <th className="px-6 py-5 font-bold text-xs w-40">Niveau de Stock</th>
                    <th className="px-6 py-5 font-bold text-xs text-center">Multi-Boutiques</th>
                    <th className="px-6 py-5 font-bold text-xs text-center">Statut</th>
                    <th className="px-6 py-5 font-bold text-xs text-right">Actions Rapides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {filteredArticles.map((article) => {
                    const maxStock = 200; // Arbitrary max stock for progress bar calc
                    const percentage = Math.min((getArticleStock(article, selectedProjectId) / maxStock) * 100, 100);
                    
                    return (
                      <tr key={article.id} className="hover:bg-surface-container-low/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0 border border-outline-variant/50">
                              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                            </div>
                            <div>
                              <p className="font-bold text-on-surface text-sm">{article.designation}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-code-md text-[11px] font-semibold text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded uppercase">
                                  {article.code}
                                </span>
                                <span className="text-[11px] text-on-surface-variant truncate max-w-[150px]">{article.famille}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-end">
                              {selectedProjectId !== 'all' ? (
  <span className="font-bold text-lg text-on-surface leading-none">{getArticleStock(article, selectedProjectId)}</span>
) : (
  <div className="flex flex-col gap-1 text-right">
    <span className="font-bold text-lg text-on-surface leading-none mb-1">{getArticleStock(article, 'all')} <span className="text-xs text-on-surface-variant font-normal">total</span></span>
    {Object.entries(article.stocks || {}).map(([pId, qty]) => {
      const pName = projets.find(p => p.id === pId)?.nom || pId;
      return <span key={pId} className="text-[10px] text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded-sm">{pName.replace('Boutique ', '')} : {qty}</span>;
    })}
  </div>
)}
                              <span className="text-[10px] font-bold text-on-surface-variant">/ {maxStock}</span>
                            </div>
                            {/* Health Bar */}
                            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  getArticleStock(article, selectedProjectId) === 0 ? 'bg-error' : 
                                  getArticleStock(article, selectedProjectId) < 15 ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedArticleForBoutiqueModal(article)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Voir la répartition du stock par boutique"
                          >
                            <span className="material-symbols-outlined text-[16px]">storefront</span>
                            Boutiques
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getArticleStock(article, selectedProjectId) === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-error/10 text-error border border-error/20">
                              Rupture
                            </span>
                          ) : getArticleStock(article, selectedProjectId) < 15 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-orange-500/10 text-orange-700 border border-orange-500/20">
                              En Alerte
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-green-500/10 text-green-700 border border-green-500/20">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {canManualEntree || canManualSortie ? (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleOpenTransferModal(article.id)}
                                className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 flex items-center justify-center transition-colors tooltip-trigger"
                                title="Transférer Dépôt ➔ Boutique"
                              >
                                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                              </button>
                              <button 
                                onClick={() => handleOpenModal('Sortie', article.id)}
                                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-error/10 hover:text-error text-on-surface flex items-center justify-center transition-colors tooltip-trigger"
                                title="Déduire (Sortie)"
                              >
                                <span className="material-symbols-outlined text-[18px]">remove</span>
                              </button>
                              <button 
                                onClick={() => handleOpenModal('Entrée', article.id)}
                                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-green-500/10 hover:text-green-700 text-on-surface flex items-center justify-center transition-colors tooltip-trigger"
                                title="Ajouter (Entrée)"
                              >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1 text-slate-400 text-xs font-medium">
                              <span className="material-symbols-outlined text-[16px]">lock</span>
                              <span className="text-[10px] uppercase font-mono">Lecture seule</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredArticles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                         <div className="flex flex-col items-center justify-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-5xl mb-4 opacity-20">inventory_2</span>
                            <p className="text-base font-bold">Aucun article trouvé</p>
                            <p className="text-sm">Essayez de modifier vos filtres de recherche.</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: History Feed */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant flex flex-col h-full lg:h-[calc(550px+64px)] overflow-hidden">
          <div className="p-6 border-b border-outline-variant bg-surface-container-lowest/50 backdrop-blur flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="font-title-lg font-bold text-on-surface">Journal des Mouvements</h2>
              <p className="text-xs font-medium text-on-surface-variant mt-1">Activité récente sur vos stocks</p>
            </div>
            <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold">{mouvementsToShow.length}</span>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative border-l-2 border-outline-variant/30 ml-4 space-y-6 pb-4">
              {mouvementsToShow.map((mvt) => {
                const article = articles.find(a => a.id === mvt.articleId) || articlesToShow.find(a => a.id === mvt.articleId);
                const isTransfert = mvt.type === 'Transfert';
                const isEntree = mvt.type === 'Entrée';
                return (
                  <div key={mvt.id} className="relative pl-6 group">
                    <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border-4 border-surface-container-lowest flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${
                      isTransfert 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : isEntree 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      <span className="material-symbols-outlined text-[16px]">
                        {isTransfert ? 'swap_horiz' : isEntree ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>
                    
                    <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group-hover:border-outline-variant space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-sm text-on-surface">
                            {mvt.designation || article?.designation || 'Article Inconnu'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {mvt.boutique || projets.find(p => p.id === mvt.projetId)?.nom || 'Sfax Centre'}
                            </span>
                            {mvt.stockAvant !== undefined && mvt.stockApres !== undefined && (
                              <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                                Stock : {mvt.stockAvant} ➔ {mvt.stockApres}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-bold whitespace-nowrap px-2.5 py-1 rounded-lg uppercase inline-block ${
                            isTransfert
                              ? 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/20'
                              : isEntree 
                              ? 'bg-green-500/10 text-green-700 border border-green-500/20' 
                              : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                          }`}>
                            {isTransfert 
                              ? `Transfert : ${mvt.motif?.includes('entrant') ? '+' : '-'}${mvt.quantite}` 
                              : `${mvt.type} : ${isEntree ? '+' : '-'}${mvt.quantite}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[15px] text-primary">receipt</span>
                          <p className="text-[11px] font-semibold text-slate-800">{mvt.motif}</p>
                        </div>
                        <p className="text-[10px] font-bold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-md">
                          {mvt.date}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {mouvementsToShow.length === 0 && (
                <div className="pl-6 text-center text-on-surface-variant py-12">
                  <span className="material-symbols-outlined text-3xl mb-2 opacity-30">hourglass_empty</span>
                  <p className="text-sm font-medium">Aucun mouvement.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Movement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4">
            {/* Modal content unchanged logically, updated aesthetics */}
            <div className="p-6 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shadow-inner ${modalType === 'Entrée' ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' : 'bg-gradient-to-br from-red-400 to-red-600 text-white'}`}>
                  <span className="material-symbols-outlined text-[24px]">
                    {modalType === 'Entrée' ? 'add_box' : 'indeterminate_check_box'}
                  </span>
                </div>
                <div>
                  <h3 className="font-display-sm text-xl font-bold text-on-surface">
                    {modalType === 'Entrée' ? 'Enregistrer une Entrée' : 'Enregistrer une Sortie'}
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Ajustez vos niveaux de stock
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-surface-container hover:bg-surface-container-high rounded-full text-on-surface cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

                        
            <form onSubmit={handleSubmit} className="p-0 flex flex-col h-full max-h-[85vh]">
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Advanced Article Search Combobox */}
                <div className="relative">
                  <label className="block text-xs font-bold text-on-surface-variant mb-2 flex justify-between">
                    <span>Ajouter un Article au panier *</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-[20px]">search</span>
                    <input 
                      type="text"
                      placeholder="Tapez le code, le nom ou la famille..."
                      className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border-2 border-primary/20 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                      value={articleSearchTerm}
                      onChange={(e) => {
                        setArticleSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                    />
                  </div>

                  {/* Dropdown List */}
                  {isDropdownOpen && articleSearchTerm.trim() !== '' && (
                    <div className="absolute z-50 mt-2 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                      {articlesToShow.filter(a => 
                        a.designation.toLowerCase().includes(articleSearchTerm.toLowerCase()) || 
                        a.code.toLowerCase().includes(articleSearchTerm.toLowerCase()) ||
                        a.famille.toLowerCase().includes(articleSearchTerm.toLowerCase())
                      ).map(a => (
                        <div 
                          key={a.id} 
                          onClick={() => {
                            setFormData(prev => {
                              const exists = prev.lignes.find(l => l.articleId === a.id);
                              if (exists) {
                                return { ...prev, lignes: prev.lignes.map(l => l.articleId === a.id ? { ...l, quantite: l.quantite + 1 } : l) };
                              }
                              return { ...prev, lignes: [{ articleId: a.id, quantite: 1 }, ...prev.lignes] };
                            });
                            setArticleSearchTerm('');
                            setIsDropdownOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-surface-container-low cursor-pointer border-b border-outline-variant/30 last:border-0 flex justify-between items-center group"
                        >
                          <div>
                            <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{a.designation}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded uppercase">{a.code}</span>
                              <span className="text-[10px] text-on-surface-variant">{a.famille}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${getArticleStock(a, selectedProjectId) === 0 ? 'text-error' : getArticleStock(a, selectedProjectId) < 15 ? 'text-orange-500' : 'text-green-600'}`}>
                              {getArticleStock(a, selectedProjectId)}
                            </p>
                            <p className="text-[10px] text-on-surface-variant font-bold uppercase">En Stock</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Articles (Basket) */}
                {formData.lignes.length > 0 && (
                  <div className="space-y-3 mt-4 animate-in fade-in">
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Panier ({formData.lignes.length} article{formData.lignes.length > 1 ? 's' : ''})</span>
                    </h4>
                    {formData.lignes.map((ligne) => {
                      const article = articles.find(a => a.id === ligne.articleId);
                      if (!article) return null;
                      const isError = modalType === 'Sortie' && getArticleStock(article, selectedProjectId) < ligne.quantite;

                      return (
                        <div key={ligne.articleId} className={`p-3 rounded-xl border ${isError ? 'border-error bg-error/5' : 'border-outline-variant bg-surface-container-lowest'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative group transition-colors`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-on-surface text-sm truncate">{article.designation}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded uppercase">{article.code}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getArticleStock(article, selectedProjectId) === 0 ? 'bg-error/10 text-error' : getArticleStock(article, selectedProjectId) < 15 ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-700'}`}>
                                En stock: {getArticleStock(article, selectedProjectId)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <div className="flex items-center bg-surface-container border border-outline-variant rounded-xl overflow-hidden h-9">
                              <button 
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  lignes: prev.lignes.map(l => l.articleId === ligne.articleId ? { ...l, quantite: Math.max(1, l.quantite - 1) } : l)
                                }))}
                                className="w-8 h-full flex items-center justify-center hover:bg-surface-container-high text-on-surface transition-colors"
                              >-</button>
                              <input 
                                type="number"
                                min="1"
                                className="w-12 h-full text-center bg-transparent font-bold text-sm focus:outline-none"
                                value={ligne.quantite}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  lignes: prev.lignes.map(l => l.articleId === ligne.articleId ? { ...l, quantite: parseInt(e.target.value) || 1 } : l)
                                }))}
                              />
                              <button 
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  lignes: prev.lignes.map(l => l.articleId === ligne.articleId ? { ...l, quantite: l.quantite + 1 } : l)
                                }))}
                                className="w-8 h-full flex items-center justify-center hover:bg-surface-container-high text-on-surface transition-colors"
                              >+</button>
                            </div>
                            {modalType === 'Sortie' && (
                               <button 
                                 type="button"
                                 onClick={() => setFormData(prev => ({
                                   ...prev,
                                   lignes: prev.lignes.map(l => l.articleId === ligne.articleId ? { ...l, quantite: getArticleStock(article, selectedProjectId) } : l)
                                 }))}
                                 className="text-[10px] font-bold text-primary hover:bg-primary/10 rounded-lg px-2 h-9 transition-colors flex items-center"
                               >
                                 MAX
                               </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                lignes: prev.lignes.filter(l => l.articleId !== ligne.articleId)
                              }))}
                              className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-colors ml-1"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                          {isError && (
                            <p className="w-full sm:w-auto text-[10px] font-bold text-error bg-error/10 px-2 py-1 rounded-md mt-2 sm:mt-0 sm:absolute sm:-bottom-3 sm:left-4">Stock insuffisant !</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 pt-6 mt-6 border-t border-outline-variant">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-2">Date d'opération globale *</label>
                    <div className="relative">
                      <input 
                        type="date"
                        required
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-xs font-bold text-on-surface-variant">Motif / Justification global *</label>
                      <button 
                        type="button" 
                        onClick={() => setShowAISuggestions(!showAISuggestions)}
                        className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${showAISuggestions ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        {showAISuggestions ? 'Masquer IA' : 'Suggestions IA'}
                      </button>
                    </div>
                    
                    <div className="relative mb-3">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">edit_note</span>
                      <input 
                        type="text" 
                        required
                        placeholder={modalType === 'Entrée' ? "Ex: Bon de livraison #123..." : "Ex: Sortie chantier Alpha #45..."}
                        className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        value={formData.motif}
                        onChange={(e) => setFormData(prev => ({ ...prev, motif: e.target.value }))}
                      />
                    </div>

                    {showAISuggestions && (
                      <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                        <span className="text-[10px] font-bold text-primary flex items-center mr-1">
                          <span className="material-symbols-outlined text-[14px] mr-0.5">auto_awesome</span> IA
                        </span>
                        {(modalType === 'Entrée' ? aiMotifsEntree : aiMotifsSortie).map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, motif: suggestion }))}
                            className="px-3 py-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold rounded-lg transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {formData.lignes.length === 0 && (
                  <div className="p-8 mt-4 text-center border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-50 mb-3">shopping_basket</span>
                    <p className="text-sm font-bold text-on-surface-variant">Le panier est vide</p>
                    <p className="text-xs text-on-surface-variant mt-1">Recherchez un article ci-dessus pour l'ajouter.</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-outline-variant bg-surface-container-lowest flex justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={formData.lignes.length === 0}
                  className={`px-8 py-3 text-sm font-bold text-white rounded-xl shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                    modalType === 'Entrée' 
                      ? 'bg-green-600 hover:bg-green-500 shadow-green-500/20' 
                      : 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  Confirmer le Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Multi-Boutique Quantity Detail Modal (BF-PROD-007) */}
      {selectedArticleForBoutiqueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 text-blue-300 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">storefront</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold tracking-tight text-white">
                      Disponibilité Multi-Boutiques
                    </h3>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5 font-medium">
                    {selectedArticleForBoutiqueModal.designation} ({selectedArticleForBoutiqueModal.code})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedArticleForBoutiqueModal(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 bg-slate-50">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">Stock Total Tous Dépôts</span>
                  <span className="text-xl font-bold text-blue-950">
                    {selectedArticleForBoutiqueModal.stockParDepot 
                      ? selectedArticleForBoutiqueModal.stockParDepot.reduce((acc, d) => acc + d.quantite, 0)
                      : selectedArticleForBoutiqueModal.stock} unités
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                  {selectedArticleForBoutiqueModal.famille}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-indigo-600">domain</span>
                  Quantités par Boutique :
                </h4>

                <div className="space-y-2.5">
                  {(selectedArticleForBoutiqueModal.stockParDepot && selectedArticleForBoutiqueModal.stockParDepot.length > 0
                    ? selectedArticleForBoutiqueModal.stockParDepot
                    : projets.map((p, idx) => ({
                        depotId: p.id,
                        nom: p.nom,
                        quantite: p.id === selectedArticleForBoutiqueModal.projetId ? selectedArticleForBoutiqueModal.stock : Math.max(0, (selectedArticleForBoutiqueModal.stock || 10) - idx * 3),
                        emplacement: p.adresse || 'Dépot Central'
                      }))
                  ).map((depot) => {
                    const isCurrentProject = depot.depotId === selectedProjectId;
                    return (
                      <div 
                        key={depot.depotId} 
                        className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                          isCurrentProject 
                            ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                            isCurrentProject ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className="material-symbols-outlined text-[18px]">location_on</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{depot.nom}</span>
                              {isCurrentProject && (
                                <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                  Boutique Actuelle
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                              Emplacement : {depot.emplacement || 'Rayon principal'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-lg font-bold block ${
                            depot.quantite === 0 ? 'text-rose-600' :
                            depot.quantite < 10 ? 'text-amber-600' : 'text-emerald-700'
                          }`}>
                            {depot.quantite} <span className="text-xs font-bold text-slate-500">unités</span>
                          </span>
                          <span className={`text-[10px] font-bold uppercase ${
                            depot.quantite === 0 ? 'text-rose-600' :
                            depot.quantite < 10 ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {depot.quantite === 0 ? 'Rupture' : depot.quantite < 10 ? 'Stock Réduit' : 'Disponible'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const artId = selectedArticleForBoutiqueModal.id;
                  setSelectedArticleForBoutiqueModal(null);
                  handleOpenTransferModal(artId);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                Transférer vers une boutique
              </button>
              <button
                type="button"
                onClick={() => setSelectedArticleForBoutiqueModal(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TRANSFERT GROUPÉ DÉPÔT CENTRAL ERP Management ➔ BOUTIQUES */}
      {isTransferScannerOpen && (
        <CameraBarcodeScannerModal
          articles={articles}
          onScanSuccess={(code) => handleProcessTransferScan(code)}
          onClose={() => setIsTransferScannerOpen(false)}
        />
      )}
      
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
            
            {/* Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">swap_horiz</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold tracking-tight text-white">
                      Transfert d'Articles vers une Boutique
                    </h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Société UGS ➔ Boutique
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-400/20 text-indigo-300 border border-indigo-400/30">
                      Plusieurs articles
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Envoi de marchandises depuis la Société UGS vers une boutique de vente
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmTransfer} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {/* Type d'opération Banner */}
              <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-4 text-indigo-950 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-600 text-[26px] shrink-0">local_shipping</span>
                  
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold px-3 py-1.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                    {transferForm.lignes.filter(l => l.articleId).length} article(s) sélectionné(s)
                  </span>
                </div>
              </div>

              {/* Source & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Source */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                    Dépôt de départ *
                  </label>
                  <div className="relative">
                    <select
                      value={transferForm.sourceDepotId}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, sourceDepotId: e.target.value }))}
                      disabled={currentUser?.role === 'admin'}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold focus:outline-none shadow-xs ${
                        currentUser?.role === 'admin' 
                          ? 'bg-slate-200/80 text-slate-700 border-slate-300 cursor-not-allowed' 
                          : 'bg-slate-100 text-indigo-950 border-slate-300 cursor-pointer'
                      }`}
                    >
                      {projets.filter(p => currentUser?.role === 'admin' ? p.id === '1' : true).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id === '1' ? '' + p.nom + ' (Société UGS)' : p.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-indigo-700 font-semibold mt-1">
                    {currentUser?.role === 'admin' 
                      ? 'Départ fixé à la Société UGS' 
                      : transferForm.sourceDepotId === '1' 
                        ? 'Départ depuis la Société UGS' 
                        : 'Transfert entre boutiques'}
                  </p>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                    Boutique d'arrivée *
                  </label>
                  <select
                    value={transferForm.destBoutiqueId}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, destBoutiqueId: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-xs cursor-pointer"
                  >
                    {projets.filter(p => p.id !== transferForm.sourceDepotId).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom} {p.adresse ? `(${p.adresse})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">Boutique qui recevra les marchandises</p>
                </div>
              </div>

              {/* Paramètres Logistiques & Transport */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-sm font-bold text-slate-700 flex items-center cursor-pointer gap-2 w-full">
                    <input
                      type="checkbox"
                      checked={avecVehicule}
                      onChange={(e) => {
                        setAvecVehicule(e.target.checked);
                        if (!e.target.checked) {
                          setTransferForm(prev => ({ ...prev, chauffeur: '', immatriculation: '' }));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    Transport avec véhicule (livreur / transporteur)
                  </label>
                </div>

                <div className={`grid grid-cols-1 ${avecVehicule ? 'sm:grid-cols-3' : 'sm:grid-cols-1'} gap-3`}>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Date de Transfert *
                    </label>
                    <input
                      type="date"
                      required
                      value={transferForm.date}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  
                  {avecVehicule && (
                    <>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                          Chauffeur ou Livreur
                        </label>
                        <input
                          type="text"
                          value={transferForm.chauffeur}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, chauffeur: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                          placeholder="Nom du chauffeur"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                          Véhicule (Matricule)
                        </label>
                        <input
                          type="text"
                          value={transferForm.immatriculation}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, immatriculation: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                          placeholder="Ex: 185 TN 4210"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Motif */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Raison du Transfert *
                </label>
                <input
                  type="text"
                  required
                  value={transferForm.motif}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, motif: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                  placeholder="Ex: Réapprovisionnement de la boutique..."
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "Réapprovisionnement de la boutique",
                    "Stock de départ pour nouvelle boutique",
                    "Livraison groupée de produits",
                    "Demande urgente d'un client"
                  ].map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTransferForm(prev => ({ ...prev, motif: s }))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* SÉLECTION RAPIDE CATALOGUE COMPLET (DRAWER POPUP) */}
              {isBulkPickerOpen && (
                <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-[20px]">bolt</span>
                      <h4 className="text-sm font-bold text-white">Sélection Multiple Rapide (Catalogue ERP Management)</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBulkPickerOpen(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>

                  {/* Recherche & Filtres Type */}
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                      <input
                        type="text"
                        value={bulkPickerSearch}
                        onChange={(e) => setBulkPickerSearch(e.target.value)}
                        placeholder="Rechercher par désignation, code, famille..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setBulkPickerTypeFilter('all')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          bulkPickerTypeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Tous ({articles.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkPickerTypeFilter('Produit')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          bulkPickerTypeFilter === 'Produit' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Produits ({articles.filter(a => a.typeArticle !== 'Service').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkPickerTypeFilter('Service')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          bulkPickerTypeFilter === 'Service' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Services ({articles.filter(a => a.typeArticle === 'Service').length})
                      </button>
                    </div>
                  </div>

                  {/* List of articles with checkboxes */}
                  {(() => {
                    const filteredArticlesForBulk = articles.filter(art => {
                      if (bulkPickerTypeFilter === 'Produit' && art.typeArticle === 'Service') return false;
                      if (bulkPickerTypeFilter === 'Service' && art.typeArticle !== 'Service') return false;
                      if (!bulkPickerSearch.trim()) return true;
                      const q = bulkPickerSearch.toLowerCase();
                      return (
                        art.designation?.toLowerCase().includes(q) ||
                        art.code?.toLowerCase().includes(q) ||
                        art.famille?.toLowerCase().includes(q)
                      );
                    });

                    const allFilteredSelected = filteredArticlesForBulk.length > 0 && filteredArticlesForBulk.every(a => bulkSelectedIds.includes(a.id));

                    return (
                      <>
                        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (allFilteredSelected) {
                                setBulkSelectedIds(prev => prev.filter(id => !filteredArticlesForBulk.some(a => a.id === id)));
                              } else {
                                const newIds = Array.from(new Set([...bulkSelectedIds, ...filteredArticlesForBulk.map(a => a.id)]));
                                setBulkSelectedIds(newIds);
                              }
                            }}
                            className="font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                          >
                            {allFilteredSelected ? 'Tout désélectionner' : `Tout sélectionner (${filteredArticlesForBulk.length})`}
                          </button>
                          <span className="font-mono">
                            {bulkSelectedIds.length} article(s) coché(s)
                          </span>
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                          {filteredArticlesForBulk.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-500">
                              Aucun article ou service ne correspond à la recherche.
                            </div>
                          ) : (
                            filteredArticlesForBulk.map(art => {
                              const isService = art.typeArticle === 'Service';
                              const sourceStock = getArticleStock(art, transferForm.sourceDepotId);
                              const isChecked = bulkSelectedIds.includes(art.id);
                              return (
                                <div
                                  key={art.id}
                                  onClick={() => {
                                    setBulkSelectedIds(prev => 
                                      prev.includes(art.id) ? prev.filter(x => x !== art.id) : [...prev, art.id]
                                    );
                                  }}
                                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                                    isChecked
                                      ? 'bg-indigo-950/60 border-indigo-500/80 text-white'
                                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}} // Handled by parent click
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                                    />
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                          isService ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        }`}>
                                          {isService ? 'Service' : 'Produit'}
                                        </span>
                                        <span className="font-bold text-xs text-white">{art.designation}</span>
                                        <span className="font-mono text-[10px] text-slate-400">({art.code})</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400">{art.famille}</span>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className={`text-xs font-bold ${
                                      isService ? 'text-amber-400' : sourceStock === 0 ? 'text-rose-400' : 'text-emerald-400'
                                    }`}>
                                      {isService ? 'Activable' : `${sourceStock} dispo au dépôt`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsBulkPickerOpen(false)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyBulkPicker}
                            disabled={bulkSelectedIds.length === 0}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                            Ajouter les {bulkSelectedIds.length} articles sélectionnés au transfert
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* SECTION TABLEAU DES ARTICLES & SERVICES DU TRANSFERT */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Produits et Services à Transférer ({transferForm.lignes.length}) *
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Multi-sélection active
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2 py-1">
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">barcode_scanner</span>
                      <input 
                        type="text" 
                        value={transferScannerInput}
                        onChange={(e) => setTransferScannerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleProcessTransferScan(transferScannerInput);
                          }
                        }}
                        placeholder="Scanner..."
                        className="bg-transparent border-none text-xs w-28 focus:outline-none font-bold text-slate-700"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setIsTransferScannerOpen(true)}
                        className="ml-1 w-6 h-6 rounded-lg bg-indigo-100 hover:bg-indigo-600 hover:text-white text-indigo-600 flex items-center justify-center transition-colors tooltip-trigger"
                        title="Ouvrir la caméra"
                      >
                        <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsBulkPickerOpen(!isBulkPickerOpen)}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      ⚡ Rapide
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTransferLine()}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Ajouter
                    </button>
                  </div>
                </div>

                {/* TABLE DES LIGNES */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 min-w-[260px]">Article / Prestation de Service</th>
                          <th className="py-2.5 px-3 w-28 text-center">Type</th>
                          <th className="py-2.5 px-3 w-28 text-center">Dispo Dépôt ERP Management</th>
                          <th className="py-2.5 px-3 w-28 text-center">Stock Boutique</th>
                          <th className="py-2.5 px-3 w-36 text-center">Quantité</th>
                          <th className="py-2.5 px-3 w-14 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {transferForm.lignes.map((line, index) => {
                          const article = articles.find(a => a.id === line.articleId);
                          const isService = article?.typeArticle === 'Service';
                          const sourceStock = article ? getArticleStock(article, transferForm.sourceDepotId) : 0;
                          const destStock = article ? getArticleStock(article, transferForm.destBoutiqueId) : 0;
                          const hasStockError = !isService && article && line.quantite > sourceStock;

                          return (
                            <tr key={line.id} className={`hover:bg-slate-50/80 transition-colors ${hasStockError ? 'bg-rose-50/50' : ''}`}>
                              {/* # */}
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                                {index + 1}
                              </td>

                              {/* Article Dropdown */}
                              <td className="py-2.5 px-3">
                                <select
                                  required
                                  value={line.articleId}
                                  onChange={(e) => handleUpdateTransferLine(line.id, { articleId: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-2xs"
                                >
                                  <option value="" disabled>-- Choisir un produit ou service --</option>
                                  {articles.map((art) => {
                                    const artIsService = art.typeArticle === 'Service';
                                    const artStock = getArticleStock(art, transferForm.sourceDepotId);
                                    return (
                                      <option key={art.id} value={art.id}>
                                        {artIsService ? '[SERVICE]' : '[PRODUIT]'} {art.designation} ({art.code}) — {artIsService ? 'Activable' : `${artStock} en stock`}
                                      </option>
                                    );
                                  })}
                                </select>
                                {article && (
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                    <span className="font-mono font-bold text-slate-700">{article.code}</span>
                                    <span>•</span>
                                    <span>{article.famille}</span>
                                    <span>•</span>
                                    <span>PA: {article.prixAchatHT?.toFixed(2) || '0.00'} TND</span>
                                  </div>
                                )}
                              </td>

                              {/* Type */}
                              <td className="py-2.5 px-3 text-center">
                                {article ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    isService 
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}>
                                    {isService ? 'Service' : 'Produit'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">-</span>
                                )}
                              </td>

                              {/* Source Stock */}
                              <td className="py-2.5 px-3 text-center font-bold">
                                {article ? (
                                  isService ? (
                                    <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      Activable
                                    </span>
                                  ) : (
                                    <span className={`text-xs ${sourceStock === 0 ? 'text-rose-600 font-bold' : sourceStock < 10 ? 'text-amber-600' : 'text-slate-900'}`}>
                                      {sourceStock} unités
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>

                              {/* Dest Stock */}
                              <td className="py-2.5 px-3 text-center font-bold">
                                {article ? (
                                  isService ? (
                                    <span className="text-slate-600 text-[11px]">
                                      {destStock > 0 ? 'Activé' : 'Non activé'}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-700">
                                      {destStock} unités
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>

                              {/* Quantité */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="number"
                                    min="1"
                                    required
                                    value={line.quantite}
                                    onChange={(e) => handleUpdateTransferLine(line.id, { quantite: parseInt(e.target.value) || 1 })}
                                    className={`w-16 px-2 py-1 text-center font-bold rounded-lg border text-xs focus:outline-none ${
                                      hasStockError
                                        ? 'border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-500'
                                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-indigo-600 focus:bg-white'
                                    }`}
                                  />
                                  {!isService && article && sourceStock > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateTransferLine(line.id, { quantite: sourceStock })}
                                      className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold cursor-pointer"
                                      title="Transférer tout le stock disponible au dépôt"
                                    >
                                      Max
                                    </button>
                                  )}
                                </div>
                                {hasStockError && (
                                  <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                                    Dispo: {sourceStock} max
                                  </p>
                                )}
                              </td>

                              {/* Delete Line */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTransferLine(line.id)}
                                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Supprimer cette ligne"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* RÉSUMÉ LOGISTIQUE DU TRANSFERT GROUPÉ */}
              {(() => {
                const validLines = transferForm.lignes.filter(l => l.articleId);
                const countPhysical = validLines.filter(l => {
                  const art = articles.find(a => a.id === l.articleId);
                  return art && art.typeArticle !== 'Service';
                });
                const totalQtyPhysical = countPhysical.reduce((sum, l) => sum + (l.quantite || 0), 0);
                const countServices = validLines.filter(l => {
                  const art = articles.find(a => a.id === l.articleId);
                  return art && art.typeArticle === 'Service';
                });
                const sourceNom = projets.find(p => p.id === transferForm.sourceDepotId)?.nom || 'Société UGS';
                const destNom = projets.find(p => p.id === transferForm.destBoutiqueId)?.nom || 'Boutique Réceptrice';

                return (
                  <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Itinéraire Flux</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold mt-0.5">
                          <span className="text-amber-400">{sourceNom}</span>
                          <span className="text-slate-500">➔</span>
                          <span className="text-emerald-400">{destNom}</span>
                        </div>
                      </div>

                      <div className="border-l border-slate-800 pl-4">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Articles / Prestations</span>
                        <span className="text-xs font-bold text-white mt-0.5 block">
                          {validLines.length} ligne(s) sélectionnée(s)
                        </span>
                      </div>

                      <div className="border-l border-slate-800 pl-4">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Produits Physiques</span>
                        <span className="text-xs font-bold text-indigo-300 mt-0.5 block">
                          {totalQtyPhysical} pièce(s) au total
                        </span>
                      </div>

                      <div className="border-l border-slate-800 pl-4">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Services Déployés</span>
                        <span className="text-xs font-bold text-amber-300 mt-0.5 block">
                          {countServices.length} prestation(s) activée(s)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.01]"
                >
                  <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                  Valider le transfert et imprimer le bon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BORDEREAU DE TRANSFERT INTER-SITES ERP Management MULTI-PRODUITS & SERVICES */}
      {lastTransferVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* Voucher Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">Bon de transfert entre boutiques</h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Effectué avec succès
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">Bon N° {lastTransferVoucher.id}</p>
                </div>
              </div>
              <button
                onClick={() => setLastTransferVoucher(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Printable Voucher Content */}
            <div className="p-6 space-y-4 bg-slate-50 text-xs overflow-y-auto flex-1 custom-scrollbar" id="printable-transfer-voucher">
              
              {/* Document Header info */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Expéditeur :</span>
                    <span className="font-bold text-indigo-950 text-xs">{lastTransferVoucher.sourceNom}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Destinataire :</span>
                    <span className="font-bold text-emerald-800 text-xs">{lastTransferVoucher.destNom}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Date du flux :</span>
                    <span className="font-bold text-slate-800">{lastTransferVoucher.date}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {lastTransferVoucher.chauffeur && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Chauffeur / Livreur :</span>
                      <span className="font-bold text-slate-800">{lastTransferVoucher.chauffeur}</span>
                    </div>
                  )}
                  {lastTransferVoucher.immatriculation && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Véhicule :</span>
                      <span className="font-bold text-slate-800">{lastTransferVoucher.immatriculation}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px] shrink-0">Motif :</span>
                    <span className="font-medium text-slate-700">{lastTransferVoucher.motif}</span>
                  </div>
                </div>
              </div>

              {/* Table of transferred items */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider">
                    Détail des Articles et Prestations Transférés ({lastTransferVoucher.lignes.length})
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-indigo-700">
                      {lastTransferVoucher.totalQuantitePhysique} unités physiques
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">
                      {lastTransferVoucher.totalServices} service(s)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-8 text-center">#</th>
                        <th className="py-2 px-3">Réf / Code</th>
                        <th className="py-2 px-3">Désignation</th>
                        <th className="py-2 px-3 text-center">Type</th>
                        <th className="py-2 px-3 text-center">Qté Transférée</th>
                        <th className="py-2 px-3 text-center">Stock Dépôt ERP Management</th>
                        <th className="py-2 px-3 text-center">Stock Boutique Dest.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {lastTransferVoucher.lignes.map((line, idx) => {
                        const isService = line.article.typeArticle === 'Service';
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">{line.article.code}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{line.article.designation}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                isService ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {isService ? 'Service' : 'Produit'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-indigo-700">
                              {isService ? '1 (Actif)' : `${line.quantite} pcs`}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600">
                              {isService ? 'Activable' : `${line.stockSourceAvant} ➔ ${line.stockSourceApres}`}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-[11px] text-emerald-700 font-bold">
                              {isService ? 'Activé' : `${line.stockDestAvant} ➔ ${line.stockDestApres}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures Tripartites */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 grid grid-cols-3 gap-4 pt-4 text-center">
                <div className="border border-dashed border-slate-300 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Visa Expéditeur ERP Management</span>
                  <p className="text-[11px] font-bold text-slate-900">Responsabla Société UGS</p>
                  <div className="h-10 border-b border-slate-200 mt-2"></div>
                </div>

                {lastTransferVoucher.chauffeur && (
                <div className="border border-dashed border-slate-300 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Visa Transporteur</span>
                  <p className="text-[11px] font-bold text-slate-900">{lastTransferVoucher.chauffeur}</p>
                  <div className="h-10 border-b border-slate-200 mt-2"></div>
                </div>
                )}

                <div className="border border-dashed border-slate-300 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Visa Réception Boutique</span>
                  <p className="text-[11px] font-bold text-slate-900">Responsable Boutique</p>
                  <div className="h-10 border-b border-slate-200 mt-2"></div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                <span>Transfert groupé exécuté avec succès. Les stocks et mouvements ont été synchronisés pour l'ensemble des articles et services.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Imprimer le bon
              </button>
              <button
                type="button"
                onClick={() => setLastTransferVoucher(null)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
  );
}
