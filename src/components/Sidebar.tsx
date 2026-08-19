import React, { useState } from 'react';
import { Projet, TabType, Utilisateur, Article } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  currentUser: Utilisateur | null;
  projets: Projet[];
  articles?: Article[];
  onReturnToPortal: () => void;
  onLogout?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  selectedProjectId,
  onSelectProject,
  currentUser,
  projets,
  articles = [],
  onReturnToPortal,
  onLogout,
  isMobileOpen,
  onCloseMobile
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'directeur';
  const allowedProjets = isAdmin ? projets : projets.filter(p => currentUser?.projetsAffectes?.includes(p.id));
  
  const currentProject = allowedProjets.find(p => p.id === selectedProjectId);
  const isGlobal = selectedProjectId === 'all';
  
  const scopedArticles = isGlobal ? articles : articles.filter(a => a.projetId === selectedProjectId);
  const lowStockCount = scopedArticles.filter(a => a.stock > 0 && a.stock < (a.stockMinimum || a.seuilAlerte || 15)).length;

  // Filtre les sections et items selon le rôle
  const getFilteredMenuSections = () => {
    let sections = [
      {
        title: 'PILOTAGE & STRATÉGIE',
        items: [
          { id: 'dashboard' as TabType, label: 'Tableau de bord', icon: 'dashboard', badge: 'Vue 360' },
          { id: 'projets' as TabType, label: 'Gestion des Boutiques', icon: 'storefront' }
        ]
      },
      {
        title: 'GESTION COMMERCIALE',
        items: [
          { id: 'articles' as TabType, label: 'Articles & Catalogue', icon: 'inventory_2' },
          { id: 'stock' as TabType, label: 'Gestion des Stocks', icon: 'warehouse', badge: lowStockCount > 0 ? `${lowStockCount} alertes` : undefined },
          { id: 'clients' as TabType, label: 'Clients & Tiers', icon: 'groups' },
          { id: 'fournisseurs' as TabType, label: 'Fournisseurs', icon: 'local_shipping' }
        ]
      },
      {
        title: 'FINANCE & COMPTABILITÉ',
        items: [
          { id: 'ventes' as TabType, label: 'Ventes & Factures', icon: 'receipt_long' },
          { id: 'achats' as TabType, label: 'Achats & Commandes', icon: 'shopping_cart' },
          { id: 'credits' as TabType, label: 'Gestion des Crédits', icon: 'account_balance', badge: 'Suivi' },
          { id: 'caisse' as TabType, label: 'Caisse & Trésorerie', icon: 'account_balance_wallet' }
        ]
      }
    ];

    if (currentUser?.role === 'agent' || currentUser?.role === 'caissier') {
      sections = [
        {
          title: 'ESPACE CAISSE & VENTES',
          items: [
            { id: 'articles' as TabType, label: 'Produits', icon: 'inventory_2' },
            { id: 'stock' as TabType, label: 'Stock', icon: 'warehouse' },
            { id: 'caisse' as TabType, label: 'Caisse', icon: 'account_balance_wallet' },
            { id: 'ventes' as TabType, label: 'Ventes', icon: 'receipt_long' },
            { id: 'clients' as TabType, label: 'Clients', icon: 'groups' }
          ]
        }
      ];
    } else if (currentUser?.role === 'comptable') {
       // comptable example: mostly finance
       sections = [
         {
           title: 'FINANCE & COMPTABILITÉ',
           items: [
             { id: 'dashboard' as TabType, label: 'Tableau de bord', icon: 'dashboard' },
             { id: 'ventes' as TabType, label: 'Ventes & Factures', icon: 'receipt_long' },
             { id: 'achats' as TabType, label: 'Achats & Commandes', icon: 'shopping_cart' },
             { id: 'credits' as TabType, label: 'Gestion des Crédits', icon: 'account_balance', badge: 'Suivi' },
             { id: 'caisse' as TabType, label: 'Caisse & Trésorerie', icon: 'account_balance_wallet' }
           ]
         }
       ];
    }

    return sections;
  };

  const menuSections = getFilteredMenuSections();

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Pro Sidebar */}
      <aside
        className={`bg-slate-900 text-slate-200 flex flex-col fixed md:sticky top-0 z-50 transition-all duration-300 ease-in-out shrink-0 md:my-3 md:ml-3 md:h-[calc(100vh-1.5rem)] md:rounded-2xl md:border md:border-slate-800/80 md:shadow-2xl shadow-slate-950/50 ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          isMobileOpen ? 'translate-x-0 h-screen shadow-2xl rounded-r-2xl border-r border-slate-800' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Workspace Brand / Project Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between h-18 shrink-0 bg-slate-950/50 md:rounded-t-2xl">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-white shadow-sm shrink-0 ${
                isGlobal ? 'bg-indigo-600' : 'bg-slate-700'
              }`}>
                <span className="material-symbols-outlined text-[24px]">
                  {isGlobal ? 'domain' : 'folder_managed'}
                </span>
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">Espace Actif</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <p className="font-extrabold text-xs text-white truncate tracking-tight mt-0.5" title={isGlobal ? 'Système Central' : currentProject?.nom || 'Espace Projet'}>
                  {isGlobal ? 'Système Central' : currentProject?.nom || 'Espace Projet'}
                </p>
              </div>
            </div>
          ) : (
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-white mx-auto shadow-sm ${
              isGlobal ? 'bg-indigo-600' : 'bg-slate-700'
            }`} title={isGlobal ? 'Système Central' : currentProject?.nom || 'Espace Projet'}>
              <span className="material-symbols-outlined text-[22px]">
                {isGlobal ? 'domain' : 'folder_managed'}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-700"
            title={isCollapsed ? 'Déplier le menu' : 'Réduire le menu'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Project Switcher Dropdown in Sidebar */}
        {(isAdmin || allowedProjets.length > 1) && !isCollapsed && (
          <div className="p-3 bg-slate-950/30 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Périmètre Projet
              </label>
              <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Admin</span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
                swap_horiz
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                disabled={!isAdmin && allowedProjets.length <= 1}
                className={`w-full pl-8 pr-7 py-2 bg-slate-800/90 hover:bg-slate-800 text-white border border-slate-700/80 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 appearance-none transition-all shadow-xs ${!isAdmin && allowedProjets.length <= 1 ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                {isAdmin && <option value="all">🏢 Toutes les boutiques</option>}
                <optgroup label={isAdmin ? "Boutiques Actives" : "Mes Boutiques"}>
                  {allowedProjets.map(p => (
                    <option key={p.id} value={p.id}>📁 {p.nom}</option>
                  ))}
                </optgroup>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
                unfold_more
              </span>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              {!isCollapsed && (
                <div className="px-3 flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400/90">
                    {section.title}
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-800/60 ml-2"></div>
                </div>
              )}
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer group relative ${
                      isActive
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className={`material-symbols-outlined text-[20px] shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}>
                      {item.icon}
                    </span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {!isCollapsed && item.badge && (
                      <span className={`ml-auto px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wide uppercase ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800/90 text-slate-300 border border-slate-700/60'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {/* Active Indicator Glow / Dot when collapsed */}
                    {isCollapsed && isActive && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Profile Snippet */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/70 space-y-2.5 md:rounded-b-2xl">
          {/* User Profile Footer Badge */}
          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 shadow-xs ${
            isCollapsed ? 'justify-center' : ''
          }`}>
            <div className="w-9 h-9 rounded-xl bg-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
              {currentUser?.nom?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate">{currentUser?.nom || 'Utilisateur'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] text-slate-400 capitalize truncate font-medium">
                    {currentUser?.role?.replace('_', ' ') || 'Membre'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-xs hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-transparent transition-all cursor-pointer ${
                isCollapsed ? 'justify-center px-2' : ''
              }`}
              title="Se déconnecter"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              {!isCollapsed && <span className="truncate">Déconnexion</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
