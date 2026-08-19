import React, { useState, useMemo } from 'react';
import {  Article, Projet, MouvementStock , Utilisateur } from '../types';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';

interface StockProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  articles: Article[];
  onArticlesChange: (articles: Article[]) => void;
  mouvements: MouvementStock[];
  onMouvementsChange: (mouvements: MouvementStock[]) => void;
  projets: Projet[];
}

export function Stock({ currentUser, selectedProjectId, articles, onArticlesChange, mouvements, onMouvementsChange, projets }: StockProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'rupture' | 'faible' | 'normal'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Entrée' | 'Sortie'>('Entrée');
  
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

  const articlesToShow = selectedProjectId === 'all' 
    ? articles 
    : articles.filter(a => a.projetId === selectedProjectId);

  const mouvementsToShow = selectedProjectId === 'all'
    ? mouvements
    : mouvements.filter(m => m.projetId === selectedProjectId);

  const filteredArticles = articlesToShow.filter(a => {
    const matchesSearch = a.designation.toLowerCase().includes(searchTerm.toLowerCase()) || a.code.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStatus = true;
    if (statusFilter === 'rupture') matchesStatus = a.stock === 0;
    if (statusFilter === 'faible') matchesStatus = a.stock > 0 && a.stock < 15;
    if (statusFilter === 'normal') matchesStatus = a.stock >= 15;
    return matchesSearch && matchesStatus;
  });

  const handleOpenModal = (type: 'Entrée' | 'Sortie', prefillArticleId?: string) => {
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
    if (formData.lignes.length === 0) return;

    if (modalType === 'Sortie') {
      const hasError = formData.lignes.some(ligne => {
        const article = articles.find(a => a.id === ligne.articleId);
        return !article || article.stock < ligne.quantite;
      });
      if (hasError) {
        alert("Stock insuffisant pour un ou plusieurs articles.");
        return;
      }
    }

    const timestamp = Date.now();
    const newMouvements: MouvementStock[] = [];
    let updatedArticles = [...articles];

    formData.lignes.forEach((ligne, index) => {
      const article = updatedArticles.find(a => a.id === ligne.articleId);
      if (!article) return;

      newMouvements.push({
        id: `mvt-${timestamp}-${index}`,
        projetId: article.projetId,
        articleId: ligne.articleId,
        type: modalType,
        quantite: ligne.quantite,
        date: formData.date,
        motif: formData.motif
      });

      updatedArticles = updatedArticles.map(a => {
        if (a.id === ligne.articleId) {
          return {
            ...a,
            stock: modalType === 'Entrée' ? a.stock + ligne.quantite : a.stock - ligne.quantite
          };
        }
        return a;
      });
    });

    onMouvementsChange([...newMouvements, ...mouvements]);
    onArticlesChange(updatedArticles);
    setIsModalOpen(false);
  };

  // KPIs
  const kpis = useMemo(() => {
    const value = articlesToShow.reduce((acc, a) => acc + (a.prixAchatHT * a.stock), 0);
    const lowStock = articlesToShow.filter(a => a.stock > 0 && a.stock < 15).length;
    const outOfStock = articlesToShow.filter(a => a.stock === 0).length;
    
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
          <h1 className="font-display-lg text-3xl font-bold text-on-surface flex items-center gap-3">
            Centre de Contrôle des Stocks
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </h1>
          <p className="text-on-surface-variant mt-2 text-base">
            Gérez vos flux de marchandises en temps réel et consultez la disponibilité exacte par boutique.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleOpenModal('Sortie')}
            className="group relative inline-flex items-center justify-center px-5 py-2.5 bg-surface-container-lowest text-on-surface rounded-xl font-bold transition-all border border-outline-variant hover:border-error/50 hover:bg-error/5 hover:text-error shadow-sm overflow-hidden cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] mr-2">remove_shopping_cart</span>
            Nouvelle Sortie
          </button>
          <button 
            onClick={() => handleOpenModal('Entrée')}
            className="group relative inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md overflow-hidden cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] mr-2">add_shopping_cart</span>
            Nouvelle Entrée
          </button>
        </div>
      </div>

      {/* BF-PROD-007 Multi-Boutique Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-300">storefront</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white uppercase tracking-wide">
              BF-PROD-007 — Suivi des Quantités Disponibles par Boutique
            </h3>
            <p className="text-xs text-blue-200 mt-0.5 leading-relaxed">
              Consultez instantanément les stocks disponibles dans chaque point de vente (ex. <strong>Sfax Centre : 15</strong> | <strong>Sfax Nord : 7</strong> | <strong>Gabès : 12</strong>).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold text-blue-200 border border-white/10">
            {selectedProjectId === 'all' ? 'Vue Consolidée (Toutes Boutiques)' : `Boutique Active: ${projets.find(p => p.id === selectedProjectId)?.nom || 'Projet'}`}
          </span>
        </div>
      </div>

      {/* Modern Bento Grid KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* KPI 1: Valeur Globale */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="p-3 bg-surface-container text-on-surface-variant rounded-2xl">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </span>
            <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> Actif
            </span>
          </div>
          <p className="text-on-surface-variant font-medium text-sm mb-1 relative z-10">Valeur d'Inventaire</p>
          <h3 className="text-4xl font-black text-on-surface tracking-tight relative z-10">
            {kpis.value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-xl text-on-surface-variant font-medium">DT</span>
          </h3>
        </div>

        {/* KPI 2: Articles en Péril */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
              <span className="material-symbols-outlined">warning</span>
            </span>
          </div>
          <p className="text-on-surface-variant font-medium text-sm mb-1 relative z-10">Articles en Péril</p>
          <div className="flex items-end gap-3 relative z-10">
            <div>
              <h3 className="text-4xl font-black text-orange-600 tracking-tight">{kpis.lowStock}</h3>
              <p className="text-xs font-bold text-orange-600/70 uppercase tracking-wider">Stock Faible</p>
            </div>
            <div className="w-px h-10 bg-outline-variant"></div>
            <div>
              <h3 className="text-4xl font-black text-error tracking-tight">{kpis.outOfStock}</h3>
              <p className="text-xs font-bold text-error/70 uppercase tracking-wider">Ruptures</p>
            </div>
          </div>
        </div>

        {/* KPI 3 & 4 Combined in a Chart Card */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-on-surface-variant font-medium text-sm mb-1">Dynamique sur 7 Jours</p>
              <div className="flex gap-4">
                <p className="text-sm font-bold text-green-600"><span className="text-xl">{kpis.totalEntrees}</span> Entrées</p>
                <p className="text-sm font-bold text-error"><span className="text-xl">{kpis.totalSorties}</span> Sorties</p>
              </div>
            </div>
            <span className="p-3 bg-surface-container text-on-surface-variant rounded-2xl">
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
          <div className="flex flex-col sm:flex-row justify-between items-center bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant shadow-sm gap-2">
            <div className="flex gap-1 p-1 bg-surface-container-low rounded-xl overflow-x-auto w-full sm:w-auto">
              {(['all', 'normal', 'faible', 'rupture'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                    statusFilter === status 
                      ? 'bg-white shadow text-on-surface' 
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {status === 'all' && 'Tous'}
                  {status === 'normal' && 'Normaux'}
                  {status === 'faible' && 'En Alerte'}
                  {status === 'rupture' && 'Ruptures'}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                type="text"
                placeholder="Rechercher (code, désignation)..."
                className="block w-full pl-10 pr-4 py-2.5 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent text-on-surface font-body-sm transition-shadow"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant overflow-hidden flex flex-col h-[550px]">
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
                    const percentage = Math.min((article.stock / maxStock) * 100, 100);
                    
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
                              <span className="font-black text-lg text-on-surface leading-none">{article.stock}</span>
                              <span className="text-[10px] font-bold text-on-surface-variant">/ {maxStock}</span>
                            </div>
                            {/* Health Bar */}
                            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  article.stock === 0 ? 'bg-error' : 
                                  article.stock < 15 ? 'bg-orange-500' : 'bg-green-500'
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
                            title="Voir la répartition du stock par boutique (BF-PROD-007)"
                          >
                            <span className="material-symbols-outlined text-[16px]">storefront</span>
                            Boutiques
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {article.stock === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-error/10 text-error border border-error/20">
                              Rupture
                            </span>
                          ) : article.stock < 15 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-orange-500/10 text-orange-700 border border-orange-500/20">
                              En Alerte
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-green-500/10 text-green-700 border border-green-500/20">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant flex flex-col h-full lg:h-[calc(550px+64px)] overflow-hidden">
          <div className="p-6 border-b border-outline-variant bg-surface-container-lowest/50 backdrop-blur flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="font-title-lg font-black text-on-surface">Journal des Mouvements</h2>
              <p className="text-xs font-medium text-on-surface-variant mt-1">Activité récente sur vos stocks</p>
            </div>
            <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold">{mouvementsToShow.length}</span>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative border-l-2 border-outline-variant/30 ml-4 space-y-6 pb-4">
              {mouvementsToShow.map((mvt) => {
                const article = articles.find(a => a.id === mvt.articleId) || articlesToShow.find(a => a.id === mvt.articleId);
                const isEntree = mvt.type === 'Entrée';
                return (
                  <div key={mvt.id} className="relative pl-6 group">
                    <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border-4 border-surface-container-lowest flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${isEntree ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <span className="material-symbols-outlined text-[16px]">
                        {isEntree ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>
                    
                    <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group-hover:border-outline-variant">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-sm text-on-surface truncate pr-2">
                          {article?.designation || 'Article Inconnu'}
                        </p>
                        <span className={`text-sm font-black whitespace-nowrap px-2 py-0.5 rounded-lg ${isEntree ? 'bg-green-500/10 text-green-700' : 'bg-error/10 text-error'}`}>
                          {isEntree ? '+' : '-'}{mvt.quantite}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">edit_note</span>
                          <p className="text-[11px] font-medium truncate max-w-[150px]">{mvt.motif}</p>
                        </div>
                        <p className="text-[10px] font-bold text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md">
                          {new Date(mvt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
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
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4">
            {/* Modal content unchanged logically, updated aesthetics */}
            <div className="p-6 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-inner ${modalType === 'Entrée' ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' : 'bg-gradient-to-br from-red-400 to-red-600 text-white'}`}>
                  <span className="material-symbols-outlined text-[24px]">
                    {modalType === 'Entrée' ? 'add_box' : 'indeterminate_check_box'}
                  </span>
                </div>
                <div>
                  <h3 className="font-display-sm text-xl font-black text-on-surface">
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
                            <p className={`text-lg font-black ${a.stock === 0 ? 'text-error' : a.stock < 15 ? 'text-orange-500' : 'text-green-600'}`}>
                              {a.stock}
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
                      const isError = modalType === 'Sortie' && article.stock < ligne.quantite;

                      return (
                        <div key={ligne.articleId} className={`p-3 rounded-2xl border ${isError ? 'border-error bg-error/5' : 'border-outline-variant bg-surface-container-lowest'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative group transition-colors`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-on-surface text-sm truncate">{article.designation}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded uppercase">{article.code}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${article.stock === 0 ? 'bg-error/10 text-error' : article.stock < 15 ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-700'}`}>
                                En stock: {article.stock}
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
                                   lignes: prev.lignes.map(l => l.articleId === ligne.articleId ? { ...l, quantite: article.stock } : l)
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
                  <div className="p-8 mt-4 text-center border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center">
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
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 text-blue-300 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">storefront</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight text-white">
                      Disponibilité Multi-Boutiques (BF-PROD-007)
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
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">Stock Total Consolidé</span>
                  <span className="text-xl font-black text-blue-950">
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
                  Quantités Disponibles par Point de Vente :
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
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
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
                          <span className={`text-lg font-black block ${
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
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end">
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
    </div>
  );
}
