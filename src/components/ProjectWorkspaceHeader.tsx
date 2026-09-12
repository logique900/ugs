import React from 'react';
import { mockVentes, mockArticles, mockClients, mockAchats } from '../data';
import { Projet, TabType } from '../types';

interface ProjectWorkspaceHeaderProps {
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  projets: Projet[];
  onReturnToPortal: () => void;
  currentUserRole?: string;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function ProjectWorkspaceHeader({
  selectedProjectId,
  onSelectProject,
  projets,
  onReturnToPortal,
  currentUserRole,
  activeTab,
  onTabChange
}: ProjectWorkspaceHeaderProps) {
  const isGlobal = selectedProjectId === 'all';
  const currentProject = projets.find(p => p.id === selectedProjectId);

  // Filter metrics
  const ventesProj = isGlobal ? mockVentes : mockVentes.filter(v => v.projetId === selectedProjectId);
  const achatsProj = isGlobal ? mockAchats : mockAchats.filter(a => a.projetId === selectedProjectId);
  const clientsProj = isGlobal ? mockClients : mockClients.filter(c => c.projetId === selectedProjectId);
  const articlesProj = isGlobal ? mockArticles : mockArticles.filter(a => a.projetId === selectedProjectId);

  const caTotal = ventesProj.filter(v => v.statut === 'Payée').reduce((acc, v) => acc + v.montantHT, 0);

  // Unified Clean Theme
  const label = isGlobal 
    ? 'Vue Générale' 
    : selectedProjectId === '1' 
      ? 'Entrepôt Principal' 
      : 'Boutique';

  return (
    <div className="bg-white border-b border-slate-200 text-slate-900 transition-all flex-shrink-0">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          {/* Project Title & Badge Info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center font-bold shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                {isGlobal ? 'domain' : selectedProjectId === '1' ? 'warehouse' : 'storefront'}
              </span>
            </div>
            
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider">
                  {label}
                </span>
                {currentProject && (
                  <span className="px-2 py-0.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider">
                    {currentProject.statut}
                  </span>
                )}
                {selectedProjectId === '1' && (
                  <span className="px-2 py-0.5 border border-amber-200 bg-amber-50 text-amber-700 rounded text-[10px] font-bold uppercase tracking-wider">
                    Société UGS
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-display-sm text-slate-900 tracking-tight flex items-center gap-2">
                {isGlobal ? 'ERP Management (Dépôt & Boutiques)' : currentProject?.nom}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium">
                {isGlobal 
                  ? 'Vue d\'ensemble sur le magasin principal et l\'ensemble des boutiques.'
                  : selectedProjectId === '1'
                  ? 'Société UGS : Réception des marchandises, stockage et envois vers les boutiques.'
                  : currentProject?.description || 'Boutique de vente reliée à la Société UGS.'}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">payments</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Chiffre d'affaires</span>
                <span className="text-sm font-bold text-slate-900">{caTotal.toLocaleString('fr-FR')} DT</span>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-600 text-[20px]">inventory_2</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Articles / Stock</span>
                <span className="text-sm font-bold text-slate-900">{articlesProj.length} refs</span>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">group</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Clients</span>
                <span className="text-sm font-bold text-slate-900">{clientsProj.length} clients</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Navigation Bar for THIS Project Interface */}
        <div className="mt-6 flex items-center gap-1 overflow-x-auto text-sm font-medium scrollbar-none pb-1">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Tableau de Bord
          </button>
          <button
            onClick={() => onTabChange('articles')}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'articles' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            Articles ({articlesProj.length})
          </button>
          <button
            onClick={() => onTabChange('stock')}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'stock' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">inventory</span>
            Stock & Mouvements
          </button>
          <button
            onClick={() => onTabChange('clients')}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'clients' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            Clients ({clientsProj.length})
          </button>
          <button
            onClick={() => onTabChange('ventes')}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'ventes' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">assignment</span>
            Factures & Devis ({ventesProj.length})
          </button>
          <button
            onClick={() => onTabChange('achats')}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'achats' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            Achats ({achatsProj.length})
          </button>
          <button
            onClick={() => onTabChange('fournisseurs')}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'fournisseurs' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            Rapports
          </button>
        </div>
      </div>
    </div>
  );
}
