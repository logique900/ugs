import { getArticleStock } from '../utils/stockUtils';
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
  onLogout,
  isMobileOpen,
  onCloseMobile
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'directeur';
  const allowedProjets = isAdmin ? projets : projets.filter(p => currentUser?.projetsAffectes?.includes(p.id) || p.id === currentUser?.projetId);
  
  const currentProject = allowedProjets.find(p => p.id === selectedProjectId);
  const isGlobal = selectedProjectId === 'all';
  
  const scopedArticles = isGlobal ? articles : articles.filter(a => a.projetId === selectedProjectId);
  const lowStockCount = scopedArticles.filter(a => getArticleStock(a, 'all') > 0 && getArticleStock(a, selectedProjectId) < ((a.stockMinimums || {})[selectedProjectId === 'all' ? '1' : selectedProjectId] || a.seuilAlerte || 15)).length;

  // Filtre les sections et items selon le rôle - Épuré et centré sur les flux essentiels
  const getFilteredMenuSections = () => {
    let sections: { title: string; items: { id: TabType; label: string; icon: string; badge?: string }[] }[] = [];

    // --- ARCHITECTURE : SCOLAIRE PLUS (Boutique 2) ---
    if (selectedProjectId === '2') {
      if (currentUser?.role === 'agent' || currentUser?.role === 'caissier') {
        sections = [
          { title: 'POINT DE VENTE', items: [{ id: 'caisse', label: 'Caisse Rapide', icon: 'point_of_sale' }] },
          { title: 'RAYONS', items: [{ id: 'articles', label: 'Fournitures', icon: 'school' }, { id: 'stock', label: 'Disponibilité', icon: 'warehouse' }] },
          { title: 'SUIVI', items: [{ id: 'ventes', label: 'Journal de Caisse', icon: 'receipt_long' }] },
          { title: 'CLIENTS & CRÉDITS', items: [{ id: 'clients', label: 'Fichier Clients', icon: 'groups' }, { id: 'credits', label: 'Carnet de Crédit', icon: 'menu_book' }] }
        ];
      } else {
        sections = [
          { title: 'PILOTAGE BOUTIQUE', items: [{ id: 'dashboard', label: 'Synthèse Scolaire', icon: 'dashboard' }] },
          { title: 'POINT DE VENTE', items: [{ id: 'caisse', label: 'Caisse Rapide', icon: 'point_of_sale' }, { id: 'ventes', label: 'Journal de Caisse', icon: 'receipt_long' }] },
          { title: 'RAYONS & STOCK', items: [{ id: 'articles', label: 'Fournitures Scolaires', icon: 'school' }, { id: 'stock', label: 'Stock Boutique', icon: 'warehouse' }] },
          { title: 'CLIENTS & CRÉDITS', items: [{ id: 'clients', label: 'Comptes Clients', icon: 'groups' }, { id: 'credits', label: 'Suivi des Crédits', icon: 'account_balance_wallet' }] },
          { title: 'ACHATS', items: [{ id: 'achats', label: 'Réapprovisionnement', icon: 'shopping_cart' }] }
        ];
      }
    } 
    // --- ARCHITECTURE : UGS VENTE & INSTALLATION (Boutique 1) ---
    else if (selectedProjectId === '1') {
      if (currentUser?.role === 'agent' || currentUser?.role === 'caissier') {
        sections = [
          { title: 'COMPTOIR & INTERVENTION', items: [{ id: 'caisse', label: 'Caisse Comptoir', icon: 'point_of_sale' }, { id: 'ventes', label: 'Bons & Devis', icon: 'assignment' }] },
          { title: 'LOGISTIQUE', items: [{ id: 'stock', label: 'Stock Technique', icon: 'warehouse' }, { id: 'articles', label: 'Matériel & Services', icon: 'build_circle' }] },
          { title: 'PARTENAIRES', items: [{ id: 'clients', label: 'Fichier Clients', icon: 'groups' }] }
        ];
      } else {
        sections = [
          { title: 'PILOTAGE UGS', items: [{ id: 'dashboard', label: 'Tableau de bord UGS', icon: 'dashboard' }] },
          { title: 'COMMERCIAL B2B', items: [{ id: 'ventes', label: 'Ventes & Devis', icon: 'assignment' }, { id: 'credits', label: 'Recouvrement B2B', icon: 'account_balance' }] },
          { title: 'COMPTOIR', items: [{ id: 'caisse', label: 'Caisse Rapide', icon: 'point_of_sale' }] },
          { title: 'LOGISTIQUE TECHNIQUE', items: [{ id: 'articles', label: 'Matériel & Services', icon: 'build_circle' }, { id: 'stock', label: 'Stock Magasin', icon: 'warehouse' }, { id: 'bons_sortie', label: 'Bons de Sortie (BS)', icon: 'output' }] },
          { title: 'APPROVISIONNEMENT', items: [{ id: 'achats', label: 'Commandes Fournisseurs', icon: 'shopping_cart' }, { id: 'bons_achat', label: 'Bons d\'Achat (BA)', icon: 'shopping_bag' }, { id: 'fournisseurs', label: 'Fournisseurs', icon: 'local_shipping' }] },
          { title: 'CLIENTÈLE', items: [{ id: 'clients', label: 'Clients B2B/B2C', icon: 'groups' }] }
        ];
      }
    } 
    // --- ARCHITECTURE : GLOBALE / SIÈGE (Toutes les boutiques) ---
    else {
      if (currentUser?.role === 'agent' || currentUser?.role === 'caissier') {
        sections = [
          { title: 'TERMINAL', items: [{ id: 'caisse', label: 'Caisse & Vente', icon: 'point_of_sale' }] },
          { title: 'SUIVI', items: [{ id: 'ventes', label: 'Historique Ventes', icon: 'receipt_long' }] },
          { title: 'LOGISTIQUE', items: [{ id: 'stock', label: 'État des Stocks', icon: 'warehouse' }, { id: 'articles', label: 'Catalogue', icon: 'inventory_2' }] },
          { title: 'PARTENAIRES', items: [{ id: 'clients', label: 'Clients', icon: 'groups' }] }
        ];
      } else if (currentUser?.role === 'comptable') {
        sections = [
          { title: 'PILOTAGE CENTRAL', items: [{ id: 'dashboard', label: 'Vue Globale', icon: 'dashboard' }] },
          { title: 'TRÉSORERIE & RECETTES', items: [{ id: 'caisse', label: 'Journal de Caisse', icon: 'account_balance_wallet' }, { id: 'ventes', label: 'Facturation Centralisée', icon: 'receipt_long' }, { id: 'credits', label: 'Recouvrement', icon: 'account_balance' }] },
          { title: 'DÉPENSES', items: [{ id: 'achats', label: 'Achats Fournisseurs', icon: 'shopping_cart' }] },
          { title: 'PARTENAIRES', items: [{ id: 'clients', label: 'Clients', icon: 'groups' }, { id: 'fournisseurs', label: 'Fournisseurs', icon: 'local_shipping' }] }
        ];
      } else {
        // Admin / Directeur Global
        const groupItems: { id: TabType; label: string; icon: string; badge?: string }[] = [
          { id: 'dashboard', label: 'Société UGS - Dashboard', icon: 'dashboard' }
        ];

        if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'directeur') {
          groupItems.push({ id: 'statistiques', label: 'Analyses Groupe', icon: 'monitoring' });
          groupItems.push({ id: 'audit', label: 'Sécurité Centrale', icon: 'security_update_good' });
        }

        sections = [
          { title: 'SOCIÉTÉ UGS (CENTRALE)', items: groupItems },
          { title: 'DISTRIBUTION RÉSEAU', items: [{ id: 'caisse', label: 'Points de Vente (POS)', icon: 'point_of_sale' }, { id: 'ventes', label: 'Ventes Globales', icon: 'receipt_long' }, { id: 'credits', label: 'Recouvrement Clients', icon: 'account_balance' }] },
          { title: 'LOGISTIQUE & DISTRIB', items: [{ id: 'articles', label: 'Catalogue Central', icon: 'inventory_2' }, { id: 'stock', label: 'Stock Central UGS & Distribution', icon: 'warehouse' }, { id: 'livraisons', label: 'Bons de Livraison (BL)', icon: 'local_shipping' }, { id: 'bons_sortie', label: 'Bons de Sortie (BS)', icon: 'output' }] },
          { title: 'APPROVISIONNEMENT', items: [{ id: 'achats', label: 'Achats UGS', icon: 'shopping_cart' }, { id: 'bons_achat', label: 'Bons d\'Achat (BA)', icon: 'shopping_bag' }, { id: 'fournisseurs', label: 'Base Fournisseurs', icon: 'local_shipping' }] },
          { title: 'RELATION CLIENT', items: [{ id: 'clients', label: 'Base Clients Unifiée', icon: 'groups' }] }
        ];
      }
    }

    const isSuperAdmin = currentUser?.role === 'super_admin';

    if (isSuperAdmin) {
      const adminItems = [
        { id: 'projets', label: 'Boutiques', icon: 'storefront' },
        { id: 'utilisateurs', label: 'Équipe & Accès', icon: 'group' }
      ];

      sections.push({
        title: 'RÉSEAU & SYSTÈME',
        items: adminItems as any
      });
    }

    return sections;
  };

  const menuSections = getFilteredMenuSections();
  // On mobile drawer, never collapse navigation text so the drawer is fully readable
  const effectiveCollapsed = isCollapsed && !isMobileOpen;

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
        className={`bg-slate-900 text-slate-200 flex flex-col fixed md:sticky top-0 left-0 z-50 transition-all duration-300 ease-in-out shrink-0 md:my-3 md:ml-3 md:h-[calc(100vh-1.5rem)] md:rounded-2xl md:border md:border-slate-800/80 md:shadow-2xl shadow-slate-950/50 ${
          effectiveCollapsed ? 'w-20' : 'w-72 max-w-[85vw]'
        } ${
          isMobileOpen ? 'translate-x-0 h-screen shadow-2xl rounded-r-2xl border-r border-slate-800' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Workspace Brand / Project Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between h-18 shrink-0 bg-slate-950/50 md:rounded-t-2xl">
          {!effectiveCollapsed ? (
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
            className="md:hidden p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Project Switcher Dropdown in Sidebar */}
        {(isAdmin || allowedProjets.length > 1) && !effectiveCollapsed && (
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
            <div key={idx} className="space-y-1">
              {!effectiveCollapsed && (
                <div className="px-3 flex items-center mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500/80">
                    {section.title}
                  </span>
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer group relative ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-white border border-transparent'
                    } ${effectiveCollapsed ? 'justify-center px-2' : ''}`}
                    title={effectiveCollapsed ? item.label : undefined}
                  >
                    <span className={`material-symbols-outlined text-[20px] shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}>
                      {item.icon}
                    </span>
                    {!effectiveCollapsed && <span className="truncate tracking-wide">{item.label}</span>}
                    {!effectiveCollapsed && item.badge && (
                      <span className={`ml-auto px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase shadow-sm ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {/* Active Indicator Glow / Dot when collapsed */}
                    {effectiveCollapsed && isActive && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
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
            effectiveCollapsed ? 'justify-center' : ''
          }`}>
            <div className="w-9 h-9 rounded-xl bg-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
              {currentUser?.nom?.charAt(0) || 'U'}
            </div>
            {!effectiveCollapsed && (
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
                effectiveCollapsed ? 'justify-center px-2' : ''
              }`}
              title="Se déconnecter"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              {!effectiveCollapsed && <span className="truncate">Déconnexion</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
