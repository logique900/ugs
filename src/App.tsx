import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWidget } from './components/ChatWidget';
import { Dashboard } from './components/Dashboard';
import { Projets } from './components/Projets';
import { Articles } from './components/Articles';
import { Categories } from './components/Categories';
import { Clients } from './components/Clients';
import { Fournisseurs } from './components/Fournisseurs';
import { Stock } from './components/Stock';
import { Ventes } from './components/Ventes';
import { Achats } from './components/Achats';
import { Credits } from './components/Credits';
import { Caisse } from './components/Caisse';
import { Login } from './components/Login';
import { AdminUsers } from './components/AdminUsers';
import { AdminStatistics } from './components/AdminStatistics';
import { AdminAuditLogs } from './components/AdminAuditLogs';
import { GlobalSearch } from './components/GlobalSearch';
import { Rapports } from './components/Rapports';
import { PredictiveAnalytics } from './components/PredictiveAnalytics';
import { Objectifs } from './components/Objectifs';
import GestionStocks from './components/GestionStocks';
import { NotificationsPanel } from './components/NotificationsPanel';
import BonsDeLivraison from './components/BonsDeLivraison';
import BonsDAchat from './components/BonsDAchat';
import BonsDeSortie from './components/BonsDeSortie';
import { OfflineIndicator } from './components/OfflineIndicator';
import { 
  mockProjets as initialProjets, 
  mockArticles as initialArticles, 
  mockMouvements as initialMouvements, 
  mockClients as initialClients, 
  mockFournisseurs as initialFournisseurs,
  mockVentes as initialVentes,
  mockAchats as initialAchats,
  mockReglements as initialReglements,
  mockRelances as initialRelances,
  mockObjectifs as initialObjectifs,
  mockBonsDeLivraison as initialBonsDeLivraison,
  mockStockOperations as initialStockOperations,
  mockRetoursMarchandise as initialRetoursMarchandise,
  mockBonsDAchat as initialBonsDAchat,
  mockBonsDeSortie as initialBonsDeSortie,
  mockUsers,
  mockSessionsCaisse as initialSessionsCaisse,
  mockActionLogsCaisse as initialActionLogsCaisse
} from './data';
import { 
  Projet, 
  Article, 
  MouvementStock, 
  Client, 
  Fournisseur, 
  Vente, 
  Achat, 
  Reglement, 
  RelanceClient, 
  SessionActionLog,
  SessionCaisse,
  BonDeLivraison,
  StockOperation,
  RetourMarchandise,
  BonDAchat,
  BonDeSortie,
  AuditLog,
  TabType, 
  Utilisateur 
} from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [impersonatorAdmin, setImpersonatorAdmin] = useState<Utilisateur | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global State for ERP Entities
  const [projets, setProjets] = useState<Projet[]>(initialProjets);
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [mouvements, setMouvements] = useState<MouvementStock[]>(initialMouvements);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(initialFournisseurs);
  const [ventes, setVentes] = useState<Vente[]>(initialVentes);
  const [achats, setAchats] = useState<Achat[]>(initialAchats);
  const [reglements, setReglements] = useState<Reglement[]>(initialReglements);
  const [relances, setRelances] = useState<RelanceClient[]>(initialRelances);
  const [objectifs, setObjectifs] = useState<any[]>(initialObjectifs);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>(() => {
    try {
      const saved = localStorage.getItem('erp_management_users_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return mockUsers;
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('erp_management_users_v2', JSON.stringify(utilisateurs));
    } catch (e) {
      console.error(e);
    }
  }, [utilisateurs]);
  const [sessionsCaisse, setSessionsCaisse] = useState<SessionCaisse[]>(initialSessionsCaisse);
  const [actionLogs, setActionLogs] = useState<SessionActionLog[]>(initialActionLogsCaisse);

  // Bon de Livraison (BL), Bon d'Achat (BA), Bon de Sortie (BS) States
  const [bonsDeLivraison, setBonsDeLivraison] = useState<BonDeLivraison[]>(initialBonsDeLivraison);
  const [bonsDAchat, setBonsDAchat] = useState<BonDAchat[]>(initialBonsDAchat);
  const [bonsDeSortie, setBonsDeSortie] = useState<BonDeSortie[]>(initialBonsDeSortie);
  const [stockOperations, setStockOperations] = useState<StockOperation[]>(initialStockOperations);
  const [retoursMarchandise, setRetoursMarchandise] = useState<RetourMarchandise[]>(initialRetoursMarchandise);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Règle d'accès stricte : L'administrateur a l'accès sur Société UGS ('1') uniquement
  React.useEffect(() => {
    if (currentUser?.role === 'admin' && selectedProjectId !== '1') {
      setSelectedProjectId('1');
    }
  }, [currentUser, selectedProjectId]);

  const handleLogout = () => {
    setCurrentUser(null);
    setImpersonatorAdmin(null);
  };

  const handleLogin = (user: Utilisateur) => {
    setCurrentUser(user);
    
    const affectations = user.projetsAffectes || [];
    
    if (user.role === 'super_admin' || user.role === 'directeur') {
      setSelectedProjectId('all');
      setActiveTab('dashboard');
    } else if (user.role === 'admin') {
      // L'administrateur a l'accès sur Société UGS seulement ('1')
      setSelectedProjectId('1');
      setActiveTab('dashboard');
    } else if (user.role === 'comptable') {
      setSelectedProjectId('all');
      setActiveTab('dashboard');
    } else if (user.role === 'caissier') {
      setSelectedProjectId(affectations[0] || user.projetId || '2');
      setActiveTab('caisse');
    } else {
      // Agent commercial
      setSelectedProjectId(affectations[0] || user.projetId || '1');
      setActiveTab('ventes');
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} users={utilisateurs} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard articles={articles} 
            currentUser={currentUser} selectedProjectId={selectedProjectId} 
            projets={projets}

            ventes={ventes}
            achats={achats}
            clients={clients}
            fournisseurs={fournisseurs}
    
            reglements={reglements}
            relances={relances}
            mouvements={mouvements}
            onTabChange={setActiveTab}
            onVentesChange={setVentes}
            onAchatsChange={setAchats}
            onArticlesChange={setArticles}
            onReglementsChange={setReglements}
            onMouvementsChange={setMouvements}
          />
        );
      case 'admin':
      case 'projets':
        if (currentUser?.role !== 'super_admin') {
          return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200 m-6 max-w-2xl mx-auto">
              <span className="material-symbols-outlined text-5xl text-amber-500 mb-3">lock</span>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Accès Réseau & Système Restreint</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                L'administrateur de la société ERP Management n'a pas accès au module Réseau & Système (Gestion des boutiques et points de vente du réseau). Cet accès est strictement réservé au Super Administrateur du groupe.
              </p>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Retour au Tableau de bord
              </button>
            </div>
          );
        }
        return (
          <Projets 
            projets={projets}
            onProjetsChange={setProjets} 
            currentUser={currentUser}
            onSelectProject={(id) => { setSelectedProjectId(id); setActiveTab('dashboard'); }} 
            ventes={ventes}
            achats={achats}
            articles={articles}
            clients={clients}
            utilisateurs={utilisateurs}
          />
        );
      case 'utilisateurs':
        if (currentUser?.role !== 'super_admin') {
          return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200 m-6 max-w-2xl mx-auto">
              <span className="material-symbols-outlined text-5xl text-amber-500 mb-3">lock</span>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Accès Réseau & Système Restreint</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                L'administrateur de la société ERP Management n'a pas accès à la gestion des équipes, comptes d'accès et droits système. Cette fonction est réservée exclusivement au Super Administrateur.
              </p>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Retour au Tableau de bord
              </button>
            </div>
          );
        }
        return (
          <AdminUsers 
            projets={projets} 
            users={utilisateurs} 
            onUsersChange={setUtilisateurs} 
            currentUser={currentUser} 
            onSwitchUser={(user) => {
              setImpersonatorAdmin(currentUser);
              handleLogin(user);
            }}
          />
        );
      case 'statistiques':
        if (currentUser?.role !== 'super_admin') {
          return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200 m-6 max-w-2xl mx-auto">
              <span className="material-symbols-outlined text-5xl text-amber-500 mb-3">lock</span>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Accès Analyses Groupe Restreint</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Les analyses financières consolidées du groupe sont réservées exclusivement au Super Administrateur.
              </p>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Retour au Tableau de bord
              </button>
            </div>
          );
        }
        return (
          <AdminStatistics projets={projets} />
        );
      case 'audit':
        return (
          <AdminAuditLogs projets={projets} />
        );
      case 'articles':
      case 'categories':
        return (
          <GestionStocks 
            currentUser={currentUser} 
            articles={articles} 
            selectedProjectId={selectedProjectId} 
            onArticlesChange={setArticles}
            mouvements={mouvements}
            onMouvementsChange={setMouvements}
            projets={projets}
            ventes={ventes}
            fournisseurs={fournisseurs}
            onGenerateAchat={(nouvelAchat) => setAchats(prev => [nouvelAchat as any, ...prev])}
            onNavigate={setActiveTab}
            initialSubTab="catalogue"
          />
        );
      case 'clients':
        return (
          <Clients currentUser={currentUser} selectedProjectId={selectedProjectId} 
            clients={clients}
            onClientsChange={setClients}
            projets={projets}

            ventes={ventes}
            onVentesChange={setVentes}
            reglements={reglements}
            onReglementsChange={setReglements}
            onTabChange={setActiveTab}
          />
        );
      case 'stock':
        return (
          <GestionStocks 
            currentUser={currentUser} 
            articles={articles} 
            selectedProjectId={selectedProjectId} 
            onArticlesChange={setArticles}
            mouvements={mouvements}
            onMouvementsChange={setMouvements}
            projets={projets}
            ventes={ventes}
            fournisseurs={fournisseurs}
            onGenerateAchat={(nouvelAchat) => setAchats(prev => [nouvelAchat as any, ...prev])}
            onNavigate={setActiveTab}
            initialSubTab="catalogue"
          />
        );
      case 'fournisseurs':
        return (
          <Fournisseurs currentUser={currentUser} articles={articles} 
            selectedProjectId={selectedProjectId}
            fournisseurs={fournisseurs}
            onFournisseursChange={setFournisseurs}
            projets={projets}

            achats={achats}
            onAchatsChange={setAchats}
            reglements={reglements}
            onReglementsChange={setReglements}
    
            onTabChange={setActiveTab}
          />
        );
      case 'rapports':
        return (
          <Rapports 
            ventes={ventes}
            projets={projets}
            articles={articles}
            clients={clients}
            fournisseurs={fournisseurs}
            selectedProjectId={selectedProjectId}
            sessions={sessionsCaisse}
            actionLogs={actionLogs}
            bonsDeLivraison={bonsDeLivraison}
            users={utilisateurs}
            currentUser={currentUser}
          />
        );
      case 'predictive':
        return (
          <PredictiveAnalytics
            articles={articles}
            ventes={ventes}
            projets={projets}
            fournisseurs={fournisseurs}
            selectedProjectId={selectedProjectId}
            onNavigate={setActiveTab}
            onGenerateAchat={(nouvelAchat) => {
              setAchats(prev => [nouvelAchat as Achat, ...prev]);
            }}
          />
        );
      case 'objectifs':
        return (
          <Objectifs 
            objectifs={objectifs}
            setObjectifs={setObjectifs}
            ventes={ventes}
            projets={projets}
            utilisateurs={utilisateurs}
          />
        );
      case 'ventes':
        return (
          <Ventes currentUser={currentUser} articles={articles} 
            selectedProjectId={selectedProjectId}
            ventes={ventes}
            clients={clients}
            projets={projets}
            reglements={reglements}
            mouvements={mouvements}
            onVentesChange={setVentes}
            onReglementsChange={setReglements}
            onClientsChange={setClients}
            onArticlesChange={setArticles}
            onMouvementsChange={setMouvements}
          />
        );
      case 'achats':
        return (
          <Achats currentUser={currentUser} articles={articles} 
            selectedProjectId={selectedProjectId}
            achats={achats}
            fournisseurs={fournisseurs}
            projets={projets}
            reglements={reglements}
            onAchatsChange={setAchats}
            onReglementsChange={setReglements}
            onArticlesChange={setArticles}
            mouvements={mouvements}
            onMouvementsChange={setMouvements}
          />
        );
      case 'credits':
        return (
          <Credits currentUser={currentUser} articles={articles} 
            selectedProjectId={selectedProjectId} 
            clients={clients}
            ventes={ventes}
            reglements={reglements}
            relances={relances}
            projets={projets}
            onVentesChange={setVentes}
            onReglementsChange={setReglements}
            onRelancesChange={setRelances}
            onClientsChange={setClients}
          />
        );
      case 'caisse':
        return (
          <Caisse
            currentUser={currentUser!}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            reglements={reglements}
            projets={projets}
            ventes={ventes}
            achats={achats}
            clients={clients}
            fournisseurs={fournisseurs}
            articles={articles}
            mouvements={mouvements}
            sessions={sessionsCaisse}
            actionLogs={actionLogs}
            onReglementsChange={setReglements}
            onVentesChange={setVentes}
            onArticlesChange={setArticles}
            onClientsChange={setClients}
            onMouvementsChange={setMouvements}
            onSessionsChange={setSessionsCaisse}
            onActionLogsChange={setActionLogs}
          />
        );
      case 'livraisons':
        return (
          <BonsDeLivraison
            bonsDeLivraison={bonsDeLivraison}
            setBonsDeLivraison={setBonsDeLivraison}
            clients={clients}
            articles={articles}
            setArticles={setArticles}
            ventes={ventes}
            setVentes={setVentes}
            stockOperations={stockOperations}
            setStockOperations={setStockOperations}
            retoursMarchandise={retoursMarchandise}
            setRetoursMarchandise={setRetoursMarchandise}
            projets={projets}
            selectedProjectId={selectedProjectId}
            currentUser={currentUser}
            auditLogs={auditLogs}
            setAuditLogs={setAuditLogs}
            onNavigateToInvoice={() => setActiveTab('ventes')}
          />
        );
      case 'bons_achat':
        return (
          <BonsDAchat
            bonsDAchat={bonsDAchat}
            setBonsDAchat={setBonsDAchat}
            fournisseurs={fournisseurs}
            articles={articles}
            setArticles={setArticles}
            stockOperations={stockOperations}
            setStockOperations={setStockOperations}
            projets={projets}
            selectedProjectId={selectedProjectId}
            currentUser={currentUser}
            auditLogs={auditLogs}
            setAuditLogs={setAuditLogs}
            onNavigateToAchats={() => setActiveTab('achats')}
          />
        );
      case 'bons_sortie':
        return (
          <BonsDeSortie
            bonsDeSortie={bonsDeSortie}
            setBonsDeSortie={setBonsDeSortie}
            articles={articles}
            setArticles={setArticles}
            stockOperations={stockOperations}
            setStockOperations={setStockOperations}
            projets={projets}
            selectedProjectId={selectedProjectId}
            currentUser={currentUser}
            auditLogs={auditLogs}
            setAuditLogs={setAuditLogs}
          />
        );
      case 'transferts':
        return (
          <BonsDeSortie
            bonsDeSortie={bonsDeSortie}
            setBonsDeSortie={setBonsDeSortie}
            articles={articles}
            setArticles={setArticles}
            stockOperations={stockOperations}
            setStockOperations={setStockOperations}
            projets={projets}
            selectedProjectId={selectedProjectId}
            currentUser={currentUser}
            auditLogs={auditLogs}
            setAuditLogs={setAuditLogs}
            forceMotif="Transfert"
          />
        );
      default:
        return (
          <Dashboard articles={articles} 
            currentUser={currentUser} selectedProjectId={selectedProjectId} 
            projets={projets}

            ventes={ventes}
            achats={achats}
            clients={clients}
            fournisseurs={fournisseurs}
    
            reglements={reglements}
            relances={relances}
            mouvements={mouvements}
            onTabChange={setActiveTab}
            onVentesChange={setVentes}
            onAchatsChange={setAchats}
            onArticlesChange={setArticles}
            onReglementsChange={setReglements}
            onMouvementsChange={setMouvements}
          />
        );
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-background">
      <OfflineIndicator />
      <GlobalSearch 
        articles={articles} 
        clients={clients} 
        ventes={ventes} 
        projets={projets} 
        onNavigate={setActiveTab} 
      />
      {/* Sidebar Pro per Project Workspace */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          const targetId = currentUser?.role === 'admin' ? '1' : id;
          setSelectedProjectId(targetId);
          setActiveTab('dashboard');
        }}
        projets={projets}
        articles={articles}
        currentUser={currentUser}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Impersonation / Test Session Banner */}
        {impersonatorAdmin && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 font-bold px-4 py-2 flex items-center justify-between text-xs z-30 shadow-md shrink-0 border-b border-amber-600">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-slate-950">visibility</span>
              <span>
                Mode Simulation Actif : Vous naviguez sous le compte de <strong>{currentUser?.nom}</strong> ({currentUser?.role}).
              </span>
            </div>
            <button
              onClick={() => {
                const original = impersonatorAdmin;
                setImpersonatorAdmin(null);
                handleLogin(original);
                setActiveTab('utilisateurs');
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[15px]">undo</span>
              Quitter la simulation & Revenir au Super-Admin
            </button>
          </div>
        )}

        {/* Enterprise SaaS Workspace Header */}
        <header className="flex justify-between items-center h-16 px-4 md:px-6 bg-white border-b border-slate-200 z-10 shrink-0 shadow-sm">
          {/* Left section: Hamburger, Home, Project */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-slate-500">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Ouvrir le menu"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>
            </div>
          </div>

          {/* Center section: Global Search */}
          <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span className="text-sm font-medium">Rechercher (produits, clients, factures...)</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-500 font-bold shadow-sm">
                Ctrl + K
              </kbd>
            </button>
          </div>

          {/* Right section: Notifications, Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Mobile Search */}
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            <NotificationsPanel 
              articles={articles} 
              ventes={ventes} 
              achats={achats} 
              objectifs={objectifs} 
              projets={projets} 
              bonsDeLivraison={bonsDeLivraison}
              bonsDeSortie={bonsDeSortie}
              currentUser={currentUser}
              onNavigate={setActiveTab} 
            />
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Profile Dropdown */}
            <button className="flex items-center gap-3 pl-1 pr-2 py-1 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-200 shadow-sm shrink-0">
                {currentUser?.nom?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="font-bold text-sm text-slate-800 leading-tight">{currentUser?.nom || 'Admin Magasin Principal'}</span>
                <span className="text-[11px] font-semibold text-slate-500 leading-tight">Administrateur</span>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-24 md:pb-8 bg-surface-container-lowest/50">
          {renderContent()}
        </main>

        {/* Mobile Ergonomic Bottom Navigation Bar (md:hidden) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">dashboard</span>
            <span className="text-[10px] tracking-tight mt-0.5">Tableau</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('livraisons')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'livraisons' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            <span className="text-[10px] tracking-tight mt-0.5">BL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bons_sortie')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'bons_sortie' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">output</span>
            <span className="text-[10px] tracking-tight mt-0.5">BS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'stock' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">warehouse</span>
            <span className="text-[10px] tracking-tight mt-0.5">Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
            <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
