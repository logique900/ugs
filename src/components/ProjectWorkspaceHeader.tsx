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

  // Distinct Theme Styles per Project
  const getProjectTheme = () => {
    switch (selectedProjectId) {
      case '1':
        return {
          bgGradient: 'from-blue-900 via-indigo-900 to-slate-900',
          accentBorder: 'border-blue-400/40',
          badgeBg: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
          pillActive: 'bg-blue-600 text-white shadow-md',
          titleColor: 'text-blue-300',
          iconBg: 'bg-blue-600 text-white',
          label: 'Espace Projet Alpha — Construction & Bâtiment'
        };
      case '2':
        return {
          bgGradient: 'from-emerald-900 via-teal-900 to-slate-900',
          accentBorder: 'border-emerald-400/40',
          badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
          pillActive: 'bg-emerald-600 text-white shadow-md',
          titleColor: 'text-emerald-300',
          iconBg: 'bg-emerald-600 text-white',
          label: 'Espace Projet Beta — Rénovation & Locaux'
        };
      case '3':
        return {
          bgGradient: 'from-purple-900 via-violet-900 to-slate-900',
          accentBorder: 'border-purple-400/40',
          badgeBg: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
          pillActive: 'bg-purple-600 text-white shadow-md',
          titleColor: 'text-purple-300',
          iconBg: 'bg-purple-600 text-white',
          label: 'Espace Projet Gamma — Infrastructure'
        };
      default:
        return {
          bgGradient: 'from-red-950 via-rose-900 to-slate-900',
          accentBorder: 'border-red-500/40',
          badgeBg: 'bg-red-500/20 text-red-200 border-red-400/30',
          pillActive: 'bg-red-600 text-white shadow-md',
          titleColor: 'text-red-300',
          iconBg: 'bg-red-600 text-white',
          label: 'Système Central ERP (Consolidé Global)'
        };
    }
  };

  const theme = getProjectTheme();

  return (
    <div className={`bg-gradient-to-r ${theme.bgGradient} text-white shadow-xl border-b ${theme.accentBorder} transition-all`}>
      {/* Upper Banner Section */}
      <div className="w-full p-4 sm:p-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Project Title & Badge Info */}
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl ${theme.iconBg} flex items-center justify-center font-bold text-xl shadow-lg border border-white/20 shrink-0 mt-0.5`}>
              <span className="material-symbols-outlined text-[26px]">
                {isGlobal ? 'domain' : 'folder_managed'}
              </span>
            </div>
            
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${theme.badgeBg}`}>
                  {theme.label}
                </span>
                {currentProject && (
                  <span className="px-2 py-0.5 bg-white/10 text-white rounded text-[11px] font-semibold">
                    Statut: {currentProject.statut}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold font-display-sm text-white tracking-tight flex items-center gap-2">
                {isGlobal ? 'Vue Consolidée Tous Projets' : currentProject?.nom}
              </h1>

              <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl font-body-sm">
                {isGlobal 
                  ? 'Gestion centralisée globale du système ERP. Données cumulées de tous les chantiers.'
                  : currentProject?.description || 'Interface isolée et dédiée à la gestion commerciale, aux stocks et clients de ce projet.'}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400 text-[20px]">payments</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-white/70 block">CA Projet</span>
                <span className="text-sm font-black text-white">{caTotal.toLocaleString('fr-FR')} DT</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-300 text-[20px]">inventory_2</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-white/70 block">Articles / Stock</span>
                <span className="text-sm font-black text-white">{articlesProj.length} refs</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-300 text-[20px]">group</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-white/70 block">Clients Tiers</span>
                <span className="text-sm font-black text-white">{clientsProj.length} clients</span>
              </div>
            </div>


          </div>
        </div>

        {/* Dedicated Navigation Bar for THIS Project Interface */}
        <div className="mt-5 pt-3 border-t border-white/15 flex items-center gap-2 overflow-x-auto text-xs font-medium scrollbar-none">
          <span className="text-white/60 font-semibold text-[11px] uppercase mr-1 whitespace-nowrap">
            Module {isGlobal ? 'Global' : 'Projet'}:
          </span>

          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'dashboard' ? theme.pillActive : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">dashboard</span>
            Tableau de Bord
          </button>

          <button
            onClick={() => onTabChange('articles')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'articles' ? theme.pillActive : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
            Articles ({articlesProj.length})
          </button>

          <button
            onClick={() => onTabChange('stock')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stock' ? theme.pillActive : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">inventory</span>
            Stock & Mouvements
          </button>

          <button
            onClick={() => onTabChange('clients')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'clients' ? theme.pillActive : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            Clients ({clientsProj.length})
          </button>

          <button
            onClick={() => onTabChange('ventes')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ventes' ? theme.pillActive : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            Ventes & Factures ({ventesProj.length})
          </button>

          <button
            onClick={() => onTabChange('achats')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'achats' ? theme.pillActive : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
            Achats ({achatsProj.length})
          </button>

          <button
            onClick={() => onTabChange('fournisseurs')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'fournisseurs' ? theme.pillActive : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            Rapports
          </button>
        </div>
      </div>
    </div>
  );
}
