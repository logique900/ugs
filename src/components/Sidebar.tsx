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
  
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'directeur';
  const isComptable = currentUser?.role === 'comptable';
  const isAdmin = isSuperAdmin;
  const hasGlobalScope = isSuperAdmin || isComptable;
  
  const allowedProjets = hasGlobalScope 
    ? projets 
    : currentUser?.role === 'admin'
      ? projets.filter(p => p.id === '1')
      : projets.filter(p => currentUser?.projetsAffectes?.includes(p.id) || p.id === currentUser?.projetId);
  
  const currentProject = allowedProjets.find(p => p.id === selectedProjectId);
  const isGlobal = selectedProjectId === 'all';
  
  const scopedArticles = isGlobal ? articles : articles.filter(a => a.projetId === selectedProjectId);
  const lowStockCount = scopedArticles.filter(a => getArticleStock(a, 'all') > 0 && getArticleStock(a, selectedProjectId) < ((a.stockMinimums || {})[selectedProjectId === 'all' ? '1' : selectedProjectId] || a.seuilAlerte || 15)).length;

  // Filtre les sections et items selon le rôle - Épuré et centré sur les flux essentiels
  const getFilteredMenuSections = () => {
    let sections: { title: string; items: { id: TabType; label: string; icon: string; badge?: string }[] }[] = [];

    // --- ARCHITECTURE : RÔLE COMPTABLE (Contrôle Financier & Fiscalité) ---
    if (isComptable) {
      sections = [
        {
          title: 'SYNTHÈSE FINANCIÈRE',
          items: [
            { id: 'dashboard', label: 'Synthèse Financière', icon: 'dashboard' },
            { id: 'rapports', label: 'Rapports & Fiscalité (TVA)', icon: 'picture_as_pdf' }
          ]
        },
        {
          title: 'DOCUMENTS COMMERCIAUX & CONTRÔLE',
          items: [
            { id: 'ventes', label: 'Factures & Tickets (POS)', icon: 'assignment' },
            { id: 'livraisons', label: 'Bons de Livraison (BL)', icon: 'local_shipping' },
            { id: 'bons_sortie', label: 'Bons de Sortie (BS)', icon: 'output' },
            { id: 'bons_achat', label: 'Bons d\'Achat (BA)', icon: 'shopping_bag' }
          ]
        },
        {
          title: 'TRÉSORERIE & CONTRÔLE CAISSES',
          items: [
            { id: 'caisse', label: 'Audit Caisses & Clôtures (Z)', icon: 'point_of_sale' },
            { id: 'credits', label: 'Carnet de Crédit & Échéances', icon: 'account_balance_wallet' }
          ]
        },
        {
          title: 'COMPTES TIERS & CRÉANCES',
          items: [
            { id: 'clients', label: 'Comptes Clients & Encours', icon: 'groups' },
            { id: 'fournisseurs', label: 'Comptes Fournisseurs & Dettes', icon: 'local_shipping' }
          ]
        },
        {
          title: 'VALORISATION DES STOCKS',
          items: [
            { id: 'stock', label: 'Catalogue & Valorisation', icon: 'inventory_2' }
          ]
        }
      ];
      return sections;
    }

    // --- ARCHITECTURE : RÔLE CAISSIER ---
    if (currentUser?.role === 'caissier') {
      sections = [
        { title: 'TERMINAL DE VENTE (POS)', items: [{ id: 'caisse', label: 'Caisse & Vente Directe', icon: 'point_of_sale' }] },
        { title: 'CONSULTATION BOUTIQUE', items: [
          { id: 'ventes', label: 'Historique des Ventes', icon: 'receipt_long' },
          { id: 'stock', label: 'Disponibilité du Stock', icon: 'warehouse' },
          { id: 'clients', label: 'Clients Boutique', icon: 'groups' },
          { id: 'credits', label: 'Carnet de Crédit', icon: 'account_balance_wallet' }
        ] }
      ];
    }
    // --- ARCHITECTURE : Société UGS (Dépôt Central) ---
    // According to the new simplified setup, the admin only manages wholesale (distribution to boutiques).
    // No POS (Caisse), only factures, bons de livraison, bons de sortie, bons d'achat, stock.
    else if (selectedProjectId === '1' || currentUser?.role === 'admin') {
      sections = [
        { title: 'TABLEAU DE BORD', items: [{ id: 'dashboard', label: 'Vue générale', icon: 'dashboard' }] },
        { title: 'DOCUMENTS COMMERCIAUX', items: [
          { id: 'ventes', label: 'Factures & Devis', icon: 'assignment' },
          { id: 'livraisons', label: 'Bons de Livraison (BL)', icon: 'local_shipping' },
          { id: 'bons_sortie', label: 'Bons de Sortie (BS)', icon: 'output' },
          { id: 'bons_achat', label: 'Bons d\'Achat (BA)', icon: 'shopping_bag' }
        ] },
        { title: 'ARTICLES & CATALOGUE', items: [
          { id: 'stock', label: 'Catalogue Articles', icon: 'inventory_2' },
          { id: 'transferts', label: 'Transferts UGS ➔ Boutiques', icon: 'swap_horiz' }
        ] },
        { title: 'TIERS', items: [
          { id: 'clients', label: 'Clients B2B', icon: 'groups' },
          { id: 'fournisseurs', label: 'Fournisseurs', icon: 'local_shipping' }
        ] }
      ];
    } 
    // --- ARCHITECTURE : BOUTIQUES ---
    else if (selectedProjectId !== '1' && selectedProjectId !== 'all') {
      sections = [
        { title: 'TERMINAL DE VENTE (POS)', items: [{ id: 'caisse', label: 'Caisse & Encaissement', icon: 'point_of_sale' }] },
        { title: 'PILOTAGE BOUTIQUE', items: [{ id: 'dashboard', label: 'Synthèse', icon: 'dashboard' }] },
        { title: 'VENTES BOUTIQUE', items: [{ id: 'ventes', label: 'Historique des Ventes', icon: 'receipt_long' }] },
        { title: 'RAYONS & STOCK', items: [{ id: 'stock', label: 'Produits & Stock', icon: 'warehouse' }] },
        { title: 'CLIENTS', items: [{ id: 'clients', label: 'Comptes Clients', icon: 'groups' }, { id: 'credits', label: 'Carnet de Crédit', icon: 'account_balance_wallet' }] },
      ];
    }
    // --- ARCHITECTURE : GLOBALE / SIÈGE (Toutes les boutiques) ---
    else {
      sections = [
        { title: 'TABLEAU DE BORD', items: [{ id: 'dashboard', label: 'Vue générale', icon: 'dashboard' }] },
        { title: 'DOCUMENTS COMMERCIAUX', items: [
          { id: 'ventes', label: 'Factures & Devis', icon: 'assignment' },
          { id: 'livraisons', label: 'Bons de Livraison (BL)', icon: 'local_shipping' },
          { id: 'bons_sortie', label: 'Bons de Sortie (BS)', icon: 'output' },
          { id: 'bons_achat', label: 'Commandes d\'Achat (BA)', icon: 'shopping_bag' }
        ] },
        { title: 'ARTICLES & CATALOGUE', items: [
          { id: 'stock', label: 'Catalogue Articles', icon: 'inventory_2' },
          { id: 'transferts', label: 'Transferts UGS ➔ Boutiques', icon: 'swap_horiz' }
        ] },
        { title: 'TIERS', items: [
          { id: 'clients', label: 'Base Clients', icon: 'groups' },
          { id: 'fournisseurs', label: 'Fournisseurs', icon: 'local_shipping' }
        ] }
      ];
    }

    const isSuperAdmin = currentUser?.role === 'super_admin';
    if (isSuperAdmin) {
      const adminItems = [
        { id: 'projets', label: 'Boutiques', icon: 'storefront' },
        { id: 'utilisateurs', label: 'Équipe & Accès', icon: 'group' },
        { id: 'rapports', label: 'Rapports & Exports', icon: 'picture_as_pdf' },
        { id: 'audit', label: 'Journal d\'Audit', icon: 'manage_search' }
      ];
      sections.push({
        title: 'SUPER-ADMIN & AUDIT',
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
          className="fixed inset-0 bg-transparent backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Pro Sidebar */}
      <aside
        className={`bg-zinc-950 text-zinc-400 flex flex-col fixed md:sticky top-0 left-0 z-50 transition-all duration-300 ease-in-out shrink-0 md:my-3 md:ml-3 md:h-[calc(100vh-1.5rem)] md:rounded-xl md:border md:border-white/10 md:shadow-2xl shadow-slate-950/50 ${
          effectiveCollapsed ? 'w-20' : 'w-72 max-w-[85vw]'
        } ${
          isMobileOpen ? 'translate-x-0 h-screen shadow-2xl rounded-r-2xl border-r border-white/10' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Workspace Brand / Project Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between h-18 shrink-0 bg-white/5 md:rounded-t-2xl">
          {!effectiveCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="shrink-0">
                <img src="/logo.png" alt="UGS" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                    {isGlobal ? 'Vue Globale' : currentProject?.id === '1' ? 'Société UGS' : 'Boutique'}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${currentProject?.id === '1' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}></span>
                </div>
                <p className="font-extrabold text-xs text-white truncate tracking-tight mt-0.5" title={isGlobal ? 'Toutes les Boutiques' : currentProject?.nom || 'Espace de Travail'}>
                  {isGlobal ? 'Toutes les Boutiques' : currentProject?.nom || 'Espace de Travail'}
                </p>
                <span className="text-[9px] font-semibold text-slate-400 truncate block">
                  {isGlobal ? 'Dépôt et Boutiques' : currentProject?.id === '1' ? 'Entrepôt Principal' : 'Boutique de vente'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto" title={isGlobal ? 'Toutes les Boutiques' : currentProject?.nom || 'Espace de Travail'}>
              <img src="/logo.png" alt="UGS" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-700"
            title={isCollapsed ? 'Déplier le menu' : 'Réduire le menu'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Project Switcher Dropdown in Sidebar for Super Admin, Comptable & Multi-assigned users */}
        {currentUser?.role !== 'admin' && (hasGlobalScope || allowedProjets.length > 1) && !effectiveCollapsed && (
          <div className="p-3 bg-slate-950/30 border-b border-white/10/60">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Emplacement Actif
              </label>
              <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Multi-Boutiques</span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
                swap_horiz
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                disabled={!hasGlobalScope && allowedProjets.length <= 1}
                className={`w-full pl-8 pr-7 py-2 bg-white/10/90 hover:bg-white/10 text-white border border-slate-700/80 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 appearance-none transition-all shadow-xs ${!hasGlobalScope && allowedProjets.length <= 1 ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                {hasGlobalScope && <option value="all">🌐 Toutes les boutiques et le dépôt</option>}
                <optgroup label="DÉPÔT CENTRAL">
                  {allowedProjets.filter(p => p.id === '1').map(p => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
                  ))}
                </optgroup>
                <optgroup label="BOUTIQUES DE VENTE">
                  {allowedProjets.filter(p => p.id !== '1').map(p => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500/80">
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
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer group relative overflow-hidden ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-100 shadow-sm'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    } ${effectiveCollapsed ? 'justify-center px-2' : ''}`}
                    title={effectiveCollapsed ? item.label : undefined}
                  >
                    {/* Vertical Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                    )}
                    <span className={`material-symbols-outlined text-[20px] shrink-0 transition-transform ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                    }`}>
                      {item.icon}
                    </span>
                    {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
                    {!effectiveCollapsed && item.badge && (
                      <span className={`ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest shadow-sm ${
                        isActive ? 'bg-blue-500/20 text-blue-200' : 'bg-white/10 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Profile Snippet */}
        <div className="p-4 border-t border-slate-800 bg-transparent space-y-3">
          {/* User Profile Footer Badge */}
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 shadow-sm ${
            effectiveCollapsed ? 'justify-center p-2' : ''
          }`}>
            <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-100 font-bold text-sm flex items-center justify-center shrink-0 shadow-inner">
              {currentUser?.nom?.charAt(0) || 'U'}
            </div>
            {!effectiveCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-slate-100 truncate">{currentUser?.nom || 'Admin Magasin Principal'}</p>
                <p className="text-[11px] text-slate-400 capitalize truncate font-medium">
                  {currentUser?.role?.replace('_', ' ') || 'Administrateur'}
                </p>
              </div>
            )}
          </div>

          {/* Dedicated Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer ${
                effectiveCollapsed ? 'justify-center px-2' : ''
              }`}
              title="Se déconnecter"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              {!effectiveCollapsed && <span className="truncate">Déconnexion</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
