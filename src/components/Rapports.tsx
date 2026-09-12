import React, { useState, useMemo } from 'react';
import { 
  Vente, 
  Projet, 
  Article, 
  Client, 
  Fournisseur,
  SessionCaisse, 
  SessionActionLog,
  BonDeLivraison,
  Utilisateur 
} from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { getArticleStock } from '../utils/stockUtils';
import { 
  generateSuperAdminFinancialReportPdf,
  generateSuperAdminInventoryValuationPdf,
  generateSuperAdminCreditAgingReportPdf,
  generateSuperAdminCashSessionsReportPdf,
  generateSuperAdminLogisticsReportPdf,
  generateSuperAdminSecurityAuditPdf
} from '../utils/superAdminReportsEngine';

interface RapportsProps {
  ventes: Vente[];
  projets: Projet[];
  articles: Article[];
  clients: Client[];
  fournisseurs?: Fournisseur[];
  selectedProjectId: string;
  sessions: SessionCaisse[];
  actionLogs: SessionActionLog[];
  bonsDeLivraison?: BonDeLivraison[];
  users?: Utilisateur[];
  currentUser?: Utilisateur | null;
}

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function Rapports({ 
  ventes, 
  projets, 
  articles, 
  clients, 
  fournisseurs = [],
  selectedProjectId, 
  sessions, 
  actionLogs,
  bonsDeLivraison = [],
  users = [],
  currentUser
}: RapportsProps) {
  const [activeTab, setActiveTab] = useState<'hub' | 'sales' | 'inventory' | 'credits' | 'caisse' | 'logistics'>('hub');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'semi' | 'month' | 'year' | 'all'>('month');
  const [filterBoutique, setFilterBoutique] = useState<string>(selectedProjectId === 'all' ? 'all' : selectedProjectId);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const selectedProjectObj = useMemo(() => {
    if (filterBoutique === 'all') return null;
    return projets.find(p => p.id === filterBoutique) || null;
  }, [filterBoutique, projets]);

  const selectedProjectNom = selectedProjectObj ? selectedProjectObj.nom : 'Toutes les Boutiques (Réseau Global)';

  const getPeriodeLabel = () => {
    switch (dateRange) {
      case 'today': return "Aujourd'hui";
      case 'week': return '7 derniers jours';
      case 'semi': return '15 derniers jours';
      case 'month': return '30 derniers jours';
      case 'year': return '12 derniers mois';
      case 'all': return 'Historique complet';
      default: return 'Période personnalisée';
    }
  };

  const notifyDownload = (reportTitle: string) => {
    setDownloadSuccessMessage(`Le rapport "${reportTitle}" a été généré et téléchargé avec succès.`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  // 1. Filter Ventes
  const filteredVentes = useMemo(() => {
    return ventes.filter(v => {
      if (v.statut === 'Devis' || v.statut === 'Annulée') return false;
      if (filterBoutique !== 'all' && v.projetId !== filterBoutique) return false;

      if (dateRange !== 'all') {
        const dateVente = new Date(v.date);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (dateRange === 'today') {
          if (dateVente < startOfDay) return false;
        } else if (dateRange === 'week') {
          const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (dateVente < weekAgo) return false;
        } else if (dateRange === 'semi') {
          const semiAgo = new Date(startOfDay.getTime() - 15 * 24 * 60 * 60 * 1000);
          if (dateVente < semiAgo) return false;
        } else if (dateRange === 'month') {
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (dateVente < monthAgo) return false;
        } else if (dateRange === 'year') {
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          if (dateVente < yearAgo) return false;
        }
      }

      return true;
    });
  }, [ventes, filterBoutique, dateRange]);

  // 2. Metrics & KPI
  const totalCA = filteredVentes.reduce((sum, v) => sum + v.montantTTC, 0);
  const totalCAHT = filteredVentes.reduce((sum, v) => sum + (v.montantHT || 0), 0);
  const totalVentesCount = filteredVentes.length;
  
  // Estimation marge brute
  let totalCoutAchat = 0;
  filteredVentes.forEach(v => {
    (v.lignes || []).forEach(l => {
      const art = articles.find(a => a.id === l.articleId || a.code === l.code);
      const pAchat = art ? art.prixAchatHT : (l.prixUnitaireHT * 0.7);
      totalCoutAchat += pAchat * l.quantite;
    });
  });
  const margeBruteGlobale = totalCAHT - totalCoutAchat;
  
  // Articles Count & Stock Value
  const articlesInScope = filterBoutique === 'all' 
    ? articles 
    : articles.filter(a => a.projetId === filterBoutique || (a.stocks && a.stocks[filterBoutique] !== undefined));
  
  const stockValuationVente = articlesInScope.reduce((sum, a) => {
    const qte = getArticleStock(a, filterBoutique);
    return sum + (qte * (a.prixVenteHT || 0));
  }, 0);

  const stockValuationAchat = articlesInScope.reduce((sum, a) => {
    const qte = getArticleStock(a, filterBoutique);
    return sum + (qte * (a.prixAchatHT || 0));
  }, 0);

  // Clients encours
  const clientsInScope = filterBoutique === 'all'
    ? clients
    : clients.filter(c => c.projetId === filterBoutique);
  
  const totalCreditsClients = clientsInScope.reduce((sum, c) => {
    const cv = ventes.filter(v => v.clientId === c.id && v.statut !== 'Annulée' && v.statut !== 'Devis');
    const soldeDu = cv.reduce((s, v) => s + Math.max(0, v.montantTTC - (v.montantPaye || 0)), 0);
    return sum + soldeDu;
  }, 0);

  // 3. CA par Boutique (if global)
  const caParBoutique = useMemo(() => {
    const data: Record<string, number> = {};
    filteredVentes.forEach(v => {
      const p = projets.find(pr => pr.id === v.projetId);
      const name = p ? p.nom : 'Inconnu';
      data[name] = (data[name] || 0) + v.montantTTC;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredVentes, projets]);

  // 4. Produits les plus/moins vendus
  const topProducts = useMemo(() => {
    const map: Record<string, { qty: number, total: number }> = {};
    filteredVentes.forEach(v => {
      (v.lignes || []).forEach(l => {
        if (!map[l.designation]) map[l.designation] = { qty: 0, total: 0 };
        map[l.designation].qty += l.quantite;
        map[l.designation].total += l.totalTTC;
      });
    });
    const sorted = Object.entries(map).map(([name, stats]) => ({ name, qty: stats.qty, total: stats.total })).sort((a, b) => b.qty - a.qty);
    return {
      top: sorted.slice(0, 5),
      bottom: sorted.slice(-5).reverse().filter(x => x.qty > 0)
    };
  }, [filteredVentes]);

  // 5. CA par Période (Evolution)
  const evolutionCA = useMemo(() => {
    const data: Record<string, number> = {};
    filteredVentes.forEach(v => {
      const d = new Date(v.date);
      let key = d.toLocaleDateString('fr-FR');
      if (dateRange === 'year' || dateRange === 'all') {
        key = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      }
      data[key] = (data[key] || 0) + v.montantTTC;
    });
    return Object.entries(data).map(([date, ca]) => ({ date, ca }));
  }, [filteredVentes, dateRange]);

  // 6. Filter Sessions & Logs
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (filterBoutique !== 'all' && s.projetId !== filterBoutique) return false;
      
      const dateSession = new Date(s.dateOuverture);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateRange === 'today') {
        if (dateSession < startOfDay) return false;
      } else if (dateRange === 'week') {
        const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (dateSession < weekAgo) return false;
      } else if (dateRange === 'semi') {
        const semiAgo = new Date(startOfDay.getTime() - 15 * 24 * 60 * 60 * 1000);
        if (dateSession < semiAgo) return false;
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        if (dateSession < monthAgo) return false;
      } else if (dateRange === 'year') {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        if (dateSession < yearAgo) return false;
      }
      return true;
    });
  }, [sessions, filterBoutique, dateRange]);

  // Filter BL
  const filteredBL = useMemo(() => {
    return bonsDeLivraison.filter(bl => {
      if (filterBoutique !== 'all' && bl.projetId !== filterBoutique) return false;
      return true;
    });
  }, [bonsDeLivraison, filterBoutique]);

  // Actions de génération de rapports
  const handleGenFinancial = () => {
    generateSuperAdminFinancialReportPdf(filteredVentes, projets, articles, getPeriodeLabel(), selectedProjectNom);
    notifyDownload('Rapport Financier Consolidé');
  };

  const handleGenInventory = () => {
    generateSuperAdminInventoryValuationPdf(articles, projets, filterBoutique, selectedProjectNom);
    notifyDownload('Inventaire & Valorisation du Stock');
  };

  const handleGenCredits = () => {
    generateSuperAdminCreditAgingReportPdf(clientsInScope, ventes, projets, selectedProjectNom);
    notifyDownload('Balance Âgée & Recouvrement');
  };

  const handleGenCaisse = () => {
    generateSuperAdminCashSessionsReportPdf(filteredSessions, projets, getPeriodeLabel(), selectedProjectNom);
    notifyDownload('Audit & Clôtures des Caisses');
  };

  const handleGenLogistics = () => {
    generateSuperAdminLogisticsReportPdf(filteredBL, projets, getPeriodeLabel(), selectedProjectNom);
    notifyDownload('Rapport Logistique & Expéditions (BL)');
  };

  const handleGenSecurity = () => {
    generateSuperAdminSecurityAuditPdf(users, projets);
    notifyDownload('Audit Sécurité & Gouvernance');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Alert toast on report generation */}
      {downloadSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-md transition-all animate-bounce">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <p className="text-xs font-bold">{downloadSuccessMessage}</p>
          </div>
          <button onClick={() => setDownloadSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Main Enterprise Header Banner */}
      <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Centre des Rapports Super-Admin</h2>
            <span className="bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
              Génération 1-Clic
            </span>
            <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-slate-200">
              SOCIETE UNIVERS GSM DE SUD
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Générez et téléchargez instantanément tous les rapports officiels consolidés du groupe en PDF haute résolution avec entête officiel, matricule fiscal et calculs d'audit automatisés.
          </p>
        </div>

        {/* Global Controls & Scope Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Périmètre Boutique</label>
            <select 
              value={filterBoutique}
              onChange={e => setFilterBoutique(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500 shadow-2xs"
            >
              <option value="all">🌐 Toutes les Boutiques (Réseau Global)</option>
              {projets.map(p => (
                <option key={p.id} value={p.id}>{p.nom} ({p.codeBoutique || p.ville || 'Dépôt'})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Période d'Analyse</label>
            <select 
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500 shadow-2xs"
            >
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="semi">15 derniers jours</option>
              <option value="month">30 derniers jours</option>
              <option value="year">12 derniers mois</option>
              <option value="all">Historique complet</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl w-full sm:w-max border border-slate-200 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('hub')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'hub' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
          Générateur de Rapports (Exports PDF)
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'sales' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">analytics</span>
          Ventes & Marges
        </button>

        <button
          onClick={() => setActiveTab('caisse')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'caisse' ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
          Audit Caisses & Écarts
        </button>
      </div>

      {/* =========================================================================
          SECTION 1 : HUB DES RAPPORTS EXCLUSIFS SUPER-ADMIN (GENERATION EN 1 CLIC)
          ========================================================================= */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CA Réseau Période</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-xs text-slate-500 font-normal">DT</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">{totalVentesCount}</span> factures émises
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Marge Brute Réalisée</span>
              <p className="text-xl font-black text-emerald-600 mt-1">
                {margeBruteGlobale.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-xs text-slate-500 font-normal">DT</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                Taux moyen : <span className="font-bold text-emerald-700">{totalCAHT > 0 ? ((margeBruteGlobale / totalCAHT) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valorisation Stock Achat</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {stockValuationAchat.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-xs text-slate-500 font-normal">DT</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                Valeur vente : <span className="font-bold text-slate-700">{stockValuationVente.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DT</span>
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Crédits Clients</span>
              <p className="text-xl font-black text-rose-600 mt-1">
                {totalCreditsClients.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-xs text-slate-500 font-normal">DT</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="font-bold text-rose-700">{clientsInScope.length}</span> comptes suivis
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            </div>
          </div>

          {/* Grille des 6 Rapports Téléchargeables */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Catalogue des Rapports Officiels UGS</h3>
                <p className="text-xs text-slate-500">Cliquez sur un rapport pour l'exporter immédiatement en document PDF prêt pour impression ou transmission comptable.</p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                6 Rapports Disponibles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. Rapport Financier Consolidé */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[24px]">account_balance</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                      Financier
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Rapport Financier Consolidé
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Synthèse financière multi-boutiques : Chiffre d'affaires HT/TTC, marges brutes dégagées, encaissements et part de chaque boutique dans le groupe.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Format : A4 Paysage</span>
                    <span className="text-indigo-600 font-bold">{filteredVentes.length} factures analysées</span>
                  </div>
                </div>

                <button
                  onClick={handleGenFinancial}
                  className="mt-5 w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-sm cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Télécharger le Rapport Financier
                </button>
              </div>

              {/* 2. Inventaire & Valorisation du Stock */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[24px]">warehouse</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-200 text-slate-800">
                      Stock & Valeur
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-slate-900 transition-colors">
                      État d'Inventaire & Valorisation
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Inventaire chiffré des stocks physiques : Valorisation au prix d'achat HT (capital immobilisé), valorisation au prix de vente et alertes de rupture.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Format : A4 Paysage</span>
                    <span className="text-slate-700 font-bold">{articlesInScope.length} articles répertoriés</span>
                  </div>
                </div>

                <button
                  onClick={handleGenInventory}
                  className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-sm cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Télécharger l'Inventaire Valorisé
                </button>
              </div>

              {/* 3. Balance Âgée & Recouvrement */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-rose-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[24px]">pending_actions</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800">
                      Recouvrement
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-rose-600 transition-colors">
                      Balance Âgée & Crédits Clients
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Suivi détaillé des créances clients : Ventilation des retards de paiement (≤30j, 31-60j, 61-90j et &gt;90j), plafonds de crédit et identification des risques.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Format : A4 Portrait</span>
                    <span className="text-rose-600 font-bold">{totalCreditsClients.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DT d'encours</span>
                  </div>
                </div>

                <button
                  onClick={handleGenCredits}
                  className="mt-5 w-full bg-slate-900 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-sm cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Télécharger la Balance Âgée
                </button>
              </div>

              {/* 4. Audit & Clôtures de Caisses */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                      Audit Caisses
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                      Audit des Caisses & Écarts Réseau
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Contrôle strict des flux d'espèces : Vérification des soldes initiaux, soldes théoriques, montants réels comptés et mise en évidence des écarts (surplus / déficit).
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Format : A4 Paysage</span>
                    <span className="text-purple-600 font-bold">{filteredSessions.length} sessions contrôlées</span>
                  </div>
                </div>

                <button
                  onClick={handleGenCaisse}
                  className="mt-5 w-full bg-slate-900 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-sm cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Télécharger le Rapport de Caisse
                </button>
              </div>

              {/* 5. Rapport Logistique & Expéditions (BL) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-cyan-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[24px]">local_shipping</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-100 text-cyan-800">
                      Logistique & BL
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-600 transition-colors">
                      Rapport Logistique & Expéditions
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Traçabilité complète des expéditions de marchandises : Suivi des Bons de Livraison (BL), transporteurs, chauffeurs assignés et statut de réception client.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Format : A4 Paysage</span>
                    <span className="text-cyan-700 font-bold">{filteredBL.length} bons de livraison</span>
                  </div>
                </div>

                <button
                  onClick={handleGenLogistics}
                  className="mt-5 w-full bg-slate-900 hover:bg-cyan-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-sm cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Télécharger le Rapport Logistique
                </button>
              </div>

              {/* 6. Audit Sécurité & Gouvernance Utilisateurs */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-500 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[24px]">security</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-200 text-slate-800">
                      Gouvernance
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-slate-900 transition-colors">
                      Audit Sécurité & Droits d'Accès
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Cartographie des accès collaborateurs : Rôles attribués, boutiques affectées, permissions spéciales (remises, prix, marges) et dates de connexion.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Format : A4 Portrait</span>
                    <span className="text-slate-700 font-bold">{users.length} comptes audités</span>
                  </div>
                </div>

                <button
                  onClick={handleGenSecurity}
                  className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-sm cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Télécharger l'Audit de Sécurité
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2 : VISUALISATION VENTES & MARGES (GRAPHIQUES INTERACTIFS)
          ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CA Réseau TTC</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500">DT</span></p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre de Ventes</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalVentesCount}</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Panier Moyen</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalVentesCount > 0 ? (totalCA / totalVentesCount).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '0,00'} <span className="text-xs text-slate-500">DT</span></p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Valorisation Stock Vente</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{stockValuationVente.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500">DT</span></p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
            </div>
          </div>

          {/* Quick Action Button for PDF */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-indigo-600 text-2xl">description</span>
              <div>
                <p className="text-xs font-bold text-indigo-950">Besoin d'une version papier certifiée de ces données ?</p>
                <p className="text-[11px] text-indigo-700">Exportez le rapport consolidé avec entête légal de la Société UGS et détails des marges.</p>
              </div>
            </div>
            <button
              onClick={handleGenFinancial}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Générer PDF Financier
            </button>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution CA */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
              <h3 className="font-bold text-slate-800 mb-4">Évolution du Chiffre d'Affaires</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionCA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="ca" name="CA (DT)" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CA par Boutique */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
              <h3 className="font-bold text-slate-800 mb-4">Répartition du CA par Boutique</h3>
              {caParBoutique.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={caParBoutique}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {caParBoutique.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {caParBoutique.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                 <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs font-bold">Aucune donnée sur la période</div>
              )}
            </div>
          </div>

          {/* Top & Flop Products Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Top 5 Produits les Plus Vendus</h3>
                <span className="material-symbols-outlined text-emerald-500">trending_up</span>
              </div>
              {topProducts.top.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.top.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}</div>
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]" title={p.name}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold text-slate-900">{p.qty} <span className="text-xs text-slate-500 font-normal">unités</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-bold">Aucune donnée sur la période</div>
              )}
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Produits à Faible Rotation</h3>
                <span className="material-symbols-outlined text-rose-500">trending_down</span>
              </div>
              {topProducts.bottom.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.bottom.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{topProducts.bottom.length - i}</div>
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]" title={p.name}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold text-slate-900">{p.qty} <span className="text-xs text-slate-500 font-normal">unités</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-bold">Aucune donnée sur la période</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3 : AUDIT DES CAISSES & HISTORIQUE DES SESSIONS
          ========================================================================= */}
      {activeTab === 'caisse' && (
        <div className="space-y-6">
          {/* Quick PDF button */}
          <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-purple-600 text-2xl">point_of_sale</span>
              <div>
                <p className="text-xs font-bold text-purple-950">Télécharger le Procès-Verbal d'Audit des Caisses</p>
                <p className="text-[11px] text-purple-700">Document certifié avec détail des fonds de caisse, soldes de clôture et écarts constatés.</p>
              </div>
            </div>
            <button
              onClick={handleGenCaisse}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Générer PDF Audit Caisses
            </button>
          </div>

          {/* Caisse Sessions History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-purple-600">history</span>
                Historique des Sessions de Caisse Réseau
              </h3>
              <span className="text-xs text-slate-500 font-bold">{filteredSessions.length} sessions enregistrées</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Boutique</th>
                    <th className="py-3 px-5">Caissier</th>
                    <th className="py-3 px-5">Ouverture</th>
                    <th className="py-3 px-5">Fermeture</th>
                    <th className="py-3 px-5 text-right">Solde Initial</th>
                    <th className="py-3 px-5 text-right">Solde Réel</th>
                    <th className="py-3 px-5 text-right">Écart</th>
                    <th className="py-3 px-5 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.map(session => {
                    const boutiqueNom = projets.find(p => p.id === session.projetId)?.nom || 'Boutique';
                    return (
                      <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-5 font-bold text-slate-800">{boutiqueNom}</td>
                        <td className="py-3 px-5 text-slate-700 font-medium">{session.utilisateurNom}</td>
                        <td className="py-3 px-5 text-slate-500">
                          {new Date(session.dateOuverture).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-5 text-slate-500">
                          {session.dateFermeture ? new Date(session.dateFermeture).toLocaleString('fr-FR') : 'En cours'}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-slate-600">
                          {session.soldeInitial.toFixed(3)} DT
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-bold text-slate-900">
                          {session.soldeFinalReel !== undefined ? `${session.soldeFinalReel.toFixed(3)} DT` : '-'}
                        </td>
                        <td className={`py-3 px-5 text-right font-mono font-bold ${ (session.ecart || 0) < 0 ? 'text-rose-600' : (session.ecart || 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {session.ecart !== undefined ? (session.ecart > 0 ? `+${session.ecart.toFixed(3)} DT` : `${session.ecart.toFixed(3)} DT`) : '-'}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            session.statut === 'Ouverte' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {session.statut}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSessions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-bold italic text-xs">
                        Aucune session enregistrée sur cette période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-amber-600">list_alt</span>
                Journal des Événements & Enregistrements Caissiers
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-5">Horodatage</th>
                    <th className="py-3 px-5">Action</th>
                    <th className="py-3 px-5">Type</th>
                    <th className="py-3 px-5 text-right">Montant</th>
                    <th className="py-3 px-5">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {actionLogs.slice(0, 15).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-5 text-slate-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2.5 px-5 font-bold text-slate-900">{log.action}</td>
                      <td className="py-2.5 px-5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.type === 'Vente' ? 'bg-indigo-100 text-indigo-700' :
                          log.type === 'Ouverture' ? 'bg-emerald-100 text-emerald-700' :
                          log.type === 'Fermeture' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-5 text-right font-bold text-slate-900 font-mono">
                        {log.montant ? `${log.montant.toFixed(3)} DT` : '-'}
                      </td>
                      <td className="py-2.5 px-5 text-slate-500 italic max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                  {actionLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold italic text-xs">
                        Aucune action enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
