import React, { useState, useMemo } from 'react';
import { Article, Vente, MouvementStock, Projet, Fournisseur, Achat, Utilisateur, TabType } from '../types';
import { computeSmartStockAnalysis, SmartArticleAnalysis, TransferSuggestion } from '../utils/stockIntelligentEngine';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';

interface SmartStockDashboardProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  articles: Article[];
  onArticlesChange: (articles: Article[]) => void;
  mouvements: MouvementStock[];
  onMouvementsChange: (mouvements: MouvementStock[]) => void;
  projets: Projet[];
  ventes: Vente[];
  fournisseurs: Fournisseur[];
  onGenerateAchat?: (nouvelAchat: Partial<Achat>) => void;
  onNavigate?: (tab: TabType) => void;
}

export function SmartStockDashboard({
  currentUser,
  selectedProjectId,
  articles,
  onArticlesChange,
  mouvements,
  onMouvementsChange,
  projets,
  ventes,
  fournisseurs,
  onGenerateAchat,
  onNavigate
}: SmartStockDashboardProps) {
  // Navigation inside Smart Stock Cockpit
  const [smartTab, setSmartTab] = useState<'overview' | 'distribution' | 'ruptures' | 'dormants' | 'surstocks' | 'optimal'>('overview');
  
  // Dynamic Parameters
  const [filterBoutique, setFilterBoutique] = useState<string>(selectedProjectId);
  const [historiqueJours, setHistoriqueJours] = useState<number>(30);
  const [horizonCouvertureJours, setHorizonCouvertureJours] = useState<number>(30);
  const [delaiFournisseurJours, setDelaiFournisseurJours] = useState<number>(5);
  const [stockSecuriteJours, setStockSecuriteJours] = useState<number>(7);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Article for Deep Dive Simulation
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Modals
  const [transferModalData, setTransferModalData] = useState<TransferSuggestion | null>(null);
  const [transferQuantity, setTransferQuantity] = useState<number>(1);
  
  const [purchaseModalArticle, setPurchaseModalArticle] = useState<SmartArticleAnalysis | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(1);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<string>('');

  const [promoModalArticle, setPromoModalArticle] = useState<SmartArticleAnalysis | null>(null);
  const [promoDiscountPct, setPromoDiscountPct] = useState<number>(20);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Compute Engine Analysis
  const smartSummary = useMemo(() => {
    return computeSmartStockAnalysis({
      articles,
      ventes,
      mouvements,
      projets,
      selectedProjectId: filterBoutique,
      historiqueJours,
      horizonCouvertureJours,
      delaiFournisseurJours,
      stockSecuriteJours
    });
  }, [articles, ventes, mouvements, projets, filterBoutique, historiqueJours, horizonCouvertureJours, delaiFournisseurJours, stockSecuriteJours]);

  // Active Selected Article for Simulation Chart
  const activeArticle = useMemo(() => {
    if (selectedArticleId) {
      return smartSummary.analyses.find(a => a.id === selectedArticleId) || smartSummary.analyses[0];
    }
    return smartSummary.analyses[0] || null;
  }, [selectedArticleId, smartSummary.analyses]);

  // Simulation Chart Data
  const trajectoryChartData = useMemo(() => {
    if (!activeArticle) return [];
    
    const data = [];
    const stockInitial = activeArticle.currentStock;
    const dailyVelocity = activeArticle.vitesseJournaliere;
    const stockSecurite = activeArticle.stockSecuriteRecommande;
    const quantiteReassort = activeArticle.quantiteACommander;
    const deliveryDay = delaiFournisseurJours;

    for (let day = 0; day <= Math.min(horizonCouvertureJours, 30); day += (horizonCouvertureJours <= 15 ? 1 : 2)) {
      const stockSans = Math.max(0, Math.round(stockInitial - (dailyVelocity * day)));
      
      let stockAvec = stockInitial - (dailyVelocity * day);
      if (day >= deliveryDay && quantiteReassort > 0) {
        stockAvec += quantiteReassort;
      }
      stockAvec = Math.max(0, Math.round(stockAvec));

      data.push({
        jour: `J+${day}`,
        'Sans réassort': stockSans,
        'Avec réassort intelligent': stockAvec,
        'Stock sécurité': stockSecurite
      });
    }

    return data;
  }, [activeArticle, horizonCouvertureJours, delaiFournisseurJours]);

  // Category Pie Distribution for Dead Stock & Overstock
  const healthDistribution = useMemo(() => {
    const optimal = smartSummary.analyses.filter(a => a.statutRupture === 'optimal').length;
    const alertes = smartSummary.analyses.filter(a => a.statutRupture === 'alerte').length;
    const critiques = smartSummary.analyses.filter(a => a.statutRupture === 'critique').length;
    const dormants = smartSummary.analyses.filter(a => a.isDormant).length;
    const surstocks = smartSummary.analyses.filter(a => a.isSurstock).length;

    return [
      { name: 'Stock Optimal', value: optimal, color: '#10b981' },
      { name: 'Seuil Commande', value: alertes, color: '#f59e0b' },
      { name: 'Rupture Imminente', value: critiques, color: '#ef4444' },
      { name: 'Produits Dormants', value: dormants, color: '#6366f1' },
      { name: 'Surstocks', value: surstocks, color: '#3b82f6' }
    ].filter(item => item.value > 0);
  }, [smartSummary.analyses]);

  // Filtered lists for each tab
  const filteredAnalyses = useMemo(() => {
    return smartSummary.analyses.filter(a => {
      const matchSearch = a.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.famille.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [smartSummary.analyses, searchQuery]);

  const rupturesList = useMemo(() => {
    return filteredAnalyses.filter(a => a.statutRupture === 'critique' || a.statutRupture === 'alerte');
  }, [filteredAnalyses]);

  const dormantsList = useMemo(() => {
    return filteredAnalyses.filter(a => a.isDormant);
  }, [filteredAnalyses]);

  const surstocksList = useMemo(() => {
    return filteredAnalyses.filter(a => a.isSurstock);
  }, [filteredAnalyses]);

  // 1-Click Multi-Store Transfer Execution
  const handleExecuteTransfer = () => {
    if (!transferModalData || transferQuantity <= 0) return;

    const { articleId, sourceBoutiqueId, destBoutiqueId, designation } = transferModalData;
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const sourceStock = (article.stocks && article.stocks[sourceBoutiqueId] !== undefined)
      ? article.stocks[sourceBoutiqueId]
      : (article.projetId === sourceBoutiqueId ? (article.stock || 0) : 0);

    const destStock = (article.stocks && article.stocks[destBoutiqueId] !== undefined)
      ? article.stocks[destBoutiqueId]
      : (article.projetId === destBoutiqueId ? (article.stock || 0) : 0);

    if (sourceStock < transferQuantity) {
      alert("Le stock disponible dans la boutique source est insuffisant pour ce transfert.");
      return;
    }

    const newSourceStock = sourceStock - transferQuantity;
    const newDestStock = destStock + transferQuantity;

    // Update article stock mapping
    const updatedStocks = { ...(article.stocks || {}) };
    updatedStocks[sourceBoutiqueId] = newSourceStock;
    updatedStocks[destBoutiqueId] = newDestStock;

    const updatedArticle: Article = {
      ...article,
      stocks: updatedStocks,
      stock: Object.values(updatedStocks).reduce((sum, q) => sum + (q || 0), 0)
    };

    const updatedArticles = articles.map(a => a.id === articleId ? updatedArticle : a);
    onArticlesChange(updatedArticles);

    // Create 2 Stock Movements (Sortie source + Entrée dest)
    const timestamp = Date.now();
    const sourceProjetNom = projets.find(p => p.id === sourceBoutiqueId)?.nom || 'Boutique Source';
    const destProjetNom = projets.find(p => p.id === destBoutiqueId)?.nom || 'Boutique Destination';

    const mvtSortie: MouvementStock = {
      id: `mvt-tr-out-${timestamp}`,
      projetId: sourceBoutiqueId,
      articleId,
      designation,
      type: 'Transfert',
      quantite: transferQuantity,
      date: new Date().toISOString().split('T')[0],
      motif: `Transfert inter-boutiques sortant vers ${destProjetNom} (P3 Rééquilibrage Intelligent)`,
      auteur: currentUser?.nom || 'Responsable Stock',
      boutique: sourceProjetNom,
      stockAvant: sourceStock,
      stockApres: newSourceStock
    };

    const mvtEntree: MouvementStock = {
      id: `mvt-tr-in-${timestamp}`,
      projetId: destBoutiqueId,
      articleId,
      designation,
      type: 'Transfert',
      quantite: transferQuantity,
      date: new Date().toISOString().split('T')[0],
      motif: `Transfert inter-boutiques entrant depuis ${sourceProjetNom} (P3 Rééquilibrage Intelligent)`,
      auteur: currentUser?.nom || 'Responsable Stock',
      boutique: destProjetNom,
      stockAvant: destStock,
      stockApres: newDestStock
    };

    onMouvementsChange([mvtSortie, mvtEntree, ...mouvements]);

    showToast(`Transfert réussi : ${transferQuantity}x ${designation} transféré(s) de ${sourceProjetNom} vers ${destProjetNom}.`);
    setTransferModalData(null);
  };

  // 1-Click Purchase Order Generation
  const handleConfirmPurchase = () => {
    if (!purchaseModalArticle || purchaseQuantity <= 0) return;

    const four = fournisseurs.find(f => f.id === purchaseSupplierId) || fournisseurs[0];
    const montantHT = purchaseQuantity * (purchaseModalArticle.prixAchatHT || 0);
    const montantTTC = montantHT * 1.19;

    const nouvelAchat: Partial<Achat> = {
      id: `ach-smart-${Date.now()}`,
      numero: `CMD-AUTO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      fournisseurId: four?.id || '1',
      fournisseurNom: four?.nom || 'Fournisseur Principal',
      projetId: filterBoutique === 'all' ? '1' : filterBoutique,
      date: new Date().toISOString().split('T')[0],
      dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      montantHT,
      montantTTC,
      montantPaye: 0,
      statut: 'Commandé',
      modePaiement: 'Virement',
      notes: `Généré automatiquement par le Moteur Intelligent P3 (Vitesse: ${purchaseModalArticle.vitesseJournaliere} u/j, Stock initial: ${purchaseModalArticle.currentStock})`,
      lignes: [
        {
          articleId: purchaseModalArticle.id,
          code: purchaseModalArticle.code,
          designation: purchaseModalArticle.designation,
          quantite: purchaseQuantity,
          prixUnitaireHT: purchaseModalArticle.prixAchatHT,
          totalHT: montantHT,
          totalTTC: montantTTC
        }
      ]
    };

    if (onGenerateAchat) {
      onGenerateAchat(nouvelAchat);
    }

    showToast(`Bon de commande fournisseur ${nouvelAchat.numero} généré (${purchaseQuantity} unités pour ${purchaseModalArticle.designation}).`);
    setPurchaseModalArticle(null);
  };

  // 1-Click Flash Promo for Dead Stock
  const handleApplyPromo = () => {
    if (!promoModalArticle) return;

    const nouveauPrixPromo = Math.round(promoModalArticle.prixVenteHT * (1 - promoDiscountPct / 100));
    const updatedArticles = articles.map(a => {
      if (a.id === promoModalArticle.id) {
        return {
          ...a,
          prixPromotionnelHT: nouveauPrixPromo
        };
      }
      return a;
    });

    onArticlesChange(updatedArticles);
    showToast(`Remise de -${promoDiscountPct}% appliquée sur ${promoModalArticle.designation} (Nouveau prix: ${nouveauPrixPromo} DT HT).`);
    setPromoModalArticle(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
            <p className="text-sm font-semibold">{toastMessage.text}</p>
          </div>
          {onNavigate && (
            <button 
              onClick={() => onNavigate('stock')}
              className="px-3 py-1 bg-white text-emerald-800 font-bold rounded-lg text-xs hover:bg-emerald-50 transition-colors"
            >
              Voir Stocks
            </button>
          )}
        </div>
      )}

      {/* TOP HEADER & ARCHITECTURE BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">psychology</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Pilotage Logistique UGS
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Centrale UGS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribution & Approvisionnement : Ruptures • Transferts inter-boutiques • Stock de sécurité
              </p>
            </div>
          </div>

          {/* Quick Scope Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="material-symbols-outlined text-indigo-400 text-lg">storefront</span>
              <select
                value={filterBoutique}
                onChange={(e) => setFilterBoutique(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">🏢 Réseau Global (Consolidé)</option>
                {projets.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900">🏪 {p.nom}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Dynamic Sub-Navigation Tabs */}
        <div className="pt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSmartTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              smartTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Vue d'ensemble
          </button>

          <button
            onClick={() => setSmartTab('ruptures')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              smartTab === 'ruptures'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            Ruptures prévues ({smartSummary.articlesEnRupture + smartSummary.articlesEnAlerte})
          </button>

          <button
            onClick={() => setSmartTab('dormants')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              smartTab === 'dormants'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">bedtime</span>
            Produits Dormants ({smartSummary.articlesDormantsCount})
          </button>

          <button
            onClick={() => setSmartTab('surstocks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              smartTab === 'surstocks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">inventory</span>
            Surstocks ({smartSummary.articlesSurstockCount})
          </button>

          <button
            onClick={() => setSmartTab('optimal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              smartTab === 'optimal'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Stock Optimal & Sécurité
          </button>
        </div>
      </div>

      {/* PARAMETERS CONTROL BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 text-xl">settings_input_component</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Variables du Moteur d'Optimisation :
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            {/* Historique */}
            <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-semibold">Historique Ventes</span>
              <select
                value={historiqueJours}
                onChange={(e) => setHistoriqueJours(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer w-full"
              >
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours (Optimal)</option>
                <option value={90}>90 jours</option>
              </select>
            </div>

            {/* Horizon */}
            <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-semibold">Horizon Cible</span>
              <select
                value={horizonCouvertureJours}
                onChange={(e) => setHorizonCouvertureJours(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer w-full"
              >
                <option value={15}>J+15 (Bimensuel)</option>
                <option value={30}>J+30 (Mensuel)</option>
                <option value={60}>J+60 (Bimestriel)</option>
              </select>
            </div>

            {/* Lead time */}
            <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-semibold">Délai Fournisseur</span>
              <select
                value={delaiFournisseurJours}
                onChange={(e) => setDelaiFournisseurJours(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-amber-600 outline-none cursor-pointer w-full"
              >
                <option value={2}>2 jours</option>
                <option value={5}>5 jours (Standard)</option>
                <option value={10}>10 jours</option>
                <option value={15}>15 jours</option>
              </select>
            </div>

            {/* Safety buffer */}
            <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-semibold">Stock Sécurité</span>
              <select
                value={stockSecuriteJours}
                onChange={(e) => setStockSecuriteJours(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-purple-600 outline-none cursor-pointer w-full"
              >
                <option value={3}>3 jours (Tendu)</option>
                <option value={7}>7 jours (Conseillé)</option>
                <option value={14}>14 jours (Sécurisé)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: VUE D'ENSEMBLE 360° */}
      {smartTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 BENTO KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Ruptures & Risques */}
            <div 
              onClick={() => setSmartTab('ruptures')}
              className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-5 shadow-xs hover:border-rose-300 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Ruptures Imminentes
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {smartSummary.articlesEnRupture}
                </span>
                <span className="text-xs font-semibold text-rose-500">
                  + {smartSummary.articlesEnAlerte} sous seuil
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <span>Cliquez pour voir les priorités</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </p>
            </div>

            {/* Card 2: Distribution & Transferts Réseau */}
            <div 
              onClick={() => setSmartTab('distribution')}
              className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-5 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Distribution Suggérée
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {smartSummary.totalTransfertsPossibles}
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  ordres de distribution
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <span>Optimiser le stock du réseau UGS</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </p>
            </div>

            {/* Card 3: Produits Dormants & Cash Immobilisé */}
            <div 
              onClick={() => setSmartTab('dormants')}
              className="bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/30 rounded-3xl p-5 shadow-xs hover:border-purple-300 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Produits Dormants (Dead Stock)
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">bedtime</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {smartSummary.articlesDormantsCount}
                </span>
                <span className="text-xs font-bold text-purple-600">
                  {smartSummary.capitalDormantTotalHT.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DT HT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <span>Capital immobilisé sans vente</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </p>
            </div>

            {/* Card 4: Surstocks & Excès */}
            <div 
              onClick={() => setSmartTab('surstocks')}
              className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-5 shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Surstocks Détectés
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">inventory</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {smartSummary.articlesSurstockCount}
                </span>
                <span className="text-xs font-bold text-blue-600">
                  {smartSummary.capitalSurstockTotalHT.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DT HT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <span>Couverture excessive &gt; 60j</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </p>
            </div>
          </div>

          {/* TWO COLUMN HEALTH METRICS & SIMULATOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Health Distribution Pie */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                  Répartition de la Santé des Stocks
                </h3>
                <p className="text-xs text-slate-500">
                  Ventilation des {smartSummary.totalArticles} articles selon leur statut d'optimisation
                </p>
              </div>

              <div className="h-56 w-full my-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {healthDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderRadius: '12px', 
                        color: '#fff', 
                        fontSize: '12px' 
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {healthDistribution.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Simulation Deep-Dive Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold">
                      {activeArticle?.code}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {activeArticle?.designation}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Simulation de décrémentation temporelle vs Réapprovisionnement intelligent à J+{delaiFournisseurJours}
                  </p>
                </div>

                {activeArticle && (
                  <button
                    onClick={() => {
                      setPurchaseModalArticle(activeArticle);
                      setPurchaseQuantity(activeArticle.quantiteACommander || Math.round(activeArticle.vitesseJournaliere * 30));
                      setPurchaseSupplierId(activeArticle.article.fournisseurPrincipalId || fournisseurs[0]?.id || '');
                    }}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                    Commander (+{activeArticle.quantiteACommander} u)
                  </button>
                )}
              </div>

              {/* Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trajectoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSans" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAvec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="jour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderRadius: '12px', 
                        border: 'none', 
                        color: '#fff', 
                        fontSize: '12px' 
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area 
                      type="monotone" 
                      dataKey="Sans réassort" 
                      stroke="#ef4444" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorSans)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Avec réassort intelligent" 
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorAvec)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Mini Quick Stats for this product */}
              {activeArticle && (
                <div className="grid grid-cols-4 gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Stock Actuel</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{activeArticle.currentStock} u</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Vélocité Ventes</span>
                    <span className="text-xs font-black text-indigo-600">{activeArticle.vitesseJournaliere} u/j</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Autonomie</span>
                    <span className={`text-xs font-black ${activeArticle.joursAutonomie <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {activeArticle.joursAutonomie} jours
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Stock Optimal</span>
                    <span className="text-xs font-black text-purple-600">{activeArticle.stockOptimalRecommande} u</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRÉVISION DES RUPTURES */}
      {smartTab === 'ruptures' && (
        <div className="space-y-4">
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">alarm</span>
            </div>
            <div>
              <h3 className="font-bold text-rose-950 dark:text-rose-300 text-sm">
                Anticipation & Détection Préventive des Ruptures de Stock
              </h3>
              <p className="text-xs text-rose-800 dark:text-rose-400 mt-0.5 leading-relaxed">
                Articles dont l'autonomie restante est inférieure ou égale au délai de réapprovisionnement fournisseur ({delaiFournisseurJours} jours).
                Passez commande avant que le stock ne tombe à zéro.
              </p>
            </div>
          </div>

          {/* Table of Stockout Risks */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">
                {rupturesList.length} Article(s) sous surveillance critique
              </span>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-3 text-center">Stock Actuel</th>
                    <th className="py-3 px-3 text-center">Vélocité</th>
                    <th className="py-3 px-3 text-center">Autonomie</th>
                    <th className="py-3 px-3 text-center">Date Épuisement</th>
                    <th className="py-3 px-3 text-center">Besoin Recommandé</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rupturesList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">{item.designation}</span>
                        <span className="text-[10px] text-slate-400">{item.code} • {item.famille}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span className={`px-2.5 py-1 rounded-lg ${
                          item.currentStock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.currentStock} u
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-600">
                        {item.vitesseJournaliere} u/j
                      </td>
                      <td className="py-3 px-3 text-center font-black">
                        <span className={item.joursAutonomie <= delaiFournisseurJours ? 'text-rose-600' : 'text-amber-600'}>
                          {item.joursAutonomie} jours
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-600 dark:text-slate-300">
                        {item.dateEstimeeRupture}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">
                        +{item.quantiteACommander} u (~{item.budgetReassortHT.toLocaleString('fr-FR')} DT)
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setPurchaseModalArticle(item);
                            setPurchaseQuantity(item.quantiteACommander > 0 ? item.quantiteACommander : 20);
                            setPurchaseSupplierId(item.article.fournisseurPrincipalId || fournisseurs[0]?.id || '');
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                          Commander
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rupturesList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Aucun article en risque de rupture immédiate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRODUITS DORMANTS (DEAD STOCK) */}
      {smartTab === 'dormants' && (
        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">bedtime</span>
            </div>
            <div>
              <h3 className="font-bold text-purple-950 dark:text-purple-300 text-sm">
                Détection du Stock Dormant & Libération du Capital Immobilisé
              </h3>
              <p className="text-xs text-purple-800 dark:text-purple-400 mt-0.5 leading-relaxed">
                Articles en stock sans vente ni rotation depuis plus de 45 jours. 
                Ces articles immobilisent <strong>{smartSummary.capitalDormantTotalHT.toLocaleString('fr-FR')} DT HT</strong> de trésorerie.
                Déclenchez une remise promotionnelle ou un transfert pour libérer de la valeur.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dormantsList.map((item) => (
              <div 
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-purple-400 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      Inactif depuis {item.joursDepuisDernierMouvement}j
                    </span>
                    <span className="font-bold text-xs text-slate-400">
                      {item.famille}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {item.designation}
                  </h4>
                  <p className="text-[11px] text-slate-400">{item.code}</p>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 my-3 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Stock Bloqué</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">{item.currentStock} u</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Capital Coincé</span>
                      <span className="text-sm font-black text-purple-600">
                        {item.capitalImmobiliseDormantHT.toLocaleString('fr-FR')} DT
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <button
                    onClick={() => {
                      setPromoModalArticle(item);
                      setPromoDiscountPct(20);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">sell</span>
                    Lancer Promo Flash
                  </button>
                  <button
                    onClick={() => setSmartTab('transferts')}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                    title="Réallouer vers autre boutique"
                  >
                    <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                  </button>
                </div>
              </div>
            ))}

            {dormantsList.length === 0 && (
              <div className="col-span-3 py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-40 block">check_circle</span>
                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Aucun produit dormant détecté</p>
                <p className="text-xs text-slate-500 mt-1">Tous vos articles ont une rotation saine sur les 30 derniers jours.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SURSTOCKS & OPTIMISATION */}
      {smartTab === 'surstocks' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">inventory</span>
            </div>
            <div>
              <h3 className="font-bold text-blue-950 dark:text-blue-300 text-sm">
                Détection des Surstocks & Réduction du Coût de Possession
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-400 mt-0.5 leading-relaxed">
                Articles présentant plus de 60 jours d'autonomie avec un stock supérieur à 150% de la cible optimale.
                L'excédent représente <strong>{smartSummary.capitalSurstockTotalHT.toLocaleString('fr-FR')} DT HT</strong> de surplus.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-3 text-center">Stock Actuel</th>
                    <th className="py-3 px-3 text-center">Stock Optimal</th>
                    <th className="py-3 px-3 text-center">Excédent</th>
                    <th className="py-3 px-3 text-center">Autonomie</th>
                    <th className="py-3 px-3 text-right">Capital Excédentaire</th>
                    <th className="py-3 px-4 text-center">Recommandation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {surstocksList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">{item.designation}</span>
                        <span className="text-[10px] text-slate-400">{item.code}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-black text-blue-600">
                        {item.currentStock} u
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {item.stockOptimalRecommande} u
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">
                        +{item.unitesSurstock} u
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                        {item.joursAutonomie} jours
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                        {item.capitalImmobiliseSurstockHT.toLocaleString('fr-FR')} DT HT
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200 inline-block">
                          Geler les commandes / Déstocker
                        </span>
                      </td>
                    </tr>
                  ))}
                  {surstocksList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Aucun surstock excessif détecté.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: STOCK OPTIMAL & STOCK DE SÉCURITÉ */}
      {smartTab === 'optimal' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">calculate</span>
            </div>
            <div>
              <h3 className="font-bold text-amber-950 dark:text-amber-300 text-sm">
                Matrice Dynamique du Stock Optimal & Stock de Sécurité
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5 leading-relaxed">
                Formules mathématiques appliquées : 
                <span className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded mx-1 text-[11px]">
                  Stock Sécurité = Vélocité × {stockSecuriteJours}j tampon
                </span> 
                et 
                <span className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded mx-1 text-[11px]">
                  Stock Optimal = (Vélocité × {horizonCouvertureJours}j) + Stock Sécurité
                </span>.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-3 text-center">Vélocité</th>
                    <th className="py-3 px-3 text-center">Stock Sécurité (Buffer)</th>
                    <th className="py-3 px-3 text-center">Stock Optimal (Cible)</th>
                    <th className="py-3 px-3 text-center">Stock Actuel</th>
                    <th className="py-3 px-3 text-right">Quantité à Commander</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAnalyses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">{item.designation}</span>
                        <span className="text-[10px] text-slate-400">{item.code} • {item.famille}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-600">
                        {item.vitesseJournaliere} u/j
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-purple-600">
                        {item.stockSecuriteRecommande} u
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600">
                        {item.stockOptimalRecommande} u
                      </td>
                      <td className="py-3 px-3 text-center font-black">
                        <span className={`px-2 py-0.5 rounded ${
                          item.currentStock < item.stockSecuriteRecommande 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.currentStock} u
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        {item.quantiteACommander > 0 ? (
                          <span className="text-emerald-600">
                            +{item.quantiteACommander} u (~{item.budgetReassortHT.toLocaleString('fr-FR')} DT)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Cible atteinte</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setPurchaseModalArticle(item);
                            setPurchaseQuantity(item.quantiteACommander > 0 ? item.quantiteACommander : 15);
                            setPurchaseSupplierId(item.article.fournisseurPrincipalId || fournisseurs[0]?.id || '');
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl font-bold text-xs transition-all inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
                          Commander
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TRANSFERT INTER-BOUTIQUES */}
      {transferModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">sync_alt</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Confirmer le Transfert Inter-Boutiques
                  </h3>
                  <p className="text-xs text-slate-500">
                    {transferModalData.designation} ({transferModalData.code})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setTransferModalData(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Départ (Source)</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{transferModalData.sourceBoutiqueNom}</span>
                  <span className="text-xs text-emerald-600 font-semibold block">Stock : {transferModalData.sourceStockActuel} u</span>
                </div>
                <span className="material-symbols-outlined text-emerald-600 text-2xl">arrow_forward</span>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Arrivée (Dest.)</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{transferModalData.destBoutiqueNom}</span>
                  <span className="text-xs text-rose-600 font-semibold block">Stock : {transferModalData.destStockActuel} u</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quantité à Transférer (Unités) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={transferModalData.sourceStockActuel}
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Maximum transférable sans impacter la source : {transferModalData.sourceStockActuel} unités
                </span>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setTransferModalData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleExecuteTransfer}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Valider & Déplacer le Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: COMMANDE FOURNISSEUR */}
      {purchaseModalArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">shopping_cart_checkout</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Générer Bon de Commande Fournisseur
                  </h3>
                  <p className="text-xs text-slate-500">
                    {purchaseModalArticle.designation} ({purchaseModalArticle.code})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPurchaseModalArticle(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fournisseur Partenaire *
                </label>
                <select
                  value={purchaseSupplierId}
                  onChange={(e) => setPurchaseSupplierId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                >
                  {fournisseurs.map(f => (
                    <option key={f.id} value={f.id}>{f.nom} ({f.code || 'FOUR'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quantité Recommandée à Commander *
                </label>
                <input
                  type="number"
                  min="1"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Prix unitaire achat HT :</span>
                  <span className="font-bold">{purchaseModalArticle.prixAchatHT} DT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total HT Estimé :</span>
                  <span className="font-black text-indigo-600">
                    {(purchaseQuantity * purchaseModalArticle.prixAchatHT).toLocaleString('fr-FR')} DT HT
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Délai de livraison estimé :</span>
                  <span>{delaiFournisseurJours} jours ouvrés</span>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setPurchaseModalArticle(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Créer la Commande d'Achat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PROMO FLASH DÉSTOCKAGE */}
      {promoModalArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-purple-50/50 dark:bg-purple-950/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">sell</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Appliquer Promo Flash Déstockage
                  </h3>
                  <p className="text-xs text-slate-500">
                    {promoModalArticle.designation}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPromoModalArticle(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                  <span>Pourcentage de Remise :</span>
                  <span className="text-purple-600 font-bold">-{promoDiscountPct}%</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={promoDiscountPct}
                  onChange={(e) => setPromoDiscountPct(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Prix public initial :</span>
                  <span className="line-through text-slate-400">{promoModalArticle.prixVenteHT} DT HT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nouveau prix remisé :</span>
                  <span className="font-black text-purple-600 text-sm">
                    {Math.round(promoModalArticle.prixVenteHT * (1 - promoDiscountPct / 100))} DT HT
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setPromoModalArticle(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleApplyPromo}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">done</span>
                Activer le Prix Promo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
