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
import { Caisse } from './components/Caisse';
import { Credits } from './components/Credits';
import { Login } from './components/Login';
import { AdminUsers } from './components/AdminUsers';
import { AdminStatistics } from './components/AdminStatistics';
import { AdminAuditLogs } from './components/AdminAuditLogs';
import { GlobalSearch } from './components/GlobalSearch';
import { Rapports } from './components/Rapports';
import { PredictiveAnalytics } from './components/PredictiveAnalytics';
import { Objectifs } from './components/Objectifs';
import { NotificationsPanel } from './components/NotificationsPanel';
import BonsDeLivraison from './components/BonsDeLivraison';
import BonsDAchat from './components/BonsDAchat';
import BonsDeSortie from './components/BonsDeSortie';
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
  mockUsers
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
  const [utilisateurs, setUtilisateurs] = useState<any[]>(mockUsers);
  const [sessions, setSessions] = useState<SessionCaisse[]>([]);
  const [actionLogs, setActionLogs] = useState<SessionActionLog[]>([]);

  // Bon de Livraison (BL), Bon d'Achat (BA), Bon de Sortie (BS) States
  const [bonsDeLivraison, setBonsDeLivraison] = useState<BonDeLivraison[]>(initialBonsDeLivraison);
  const [bonsDAchat, setBonsDAchat] = useState<BonDAchat[]>(initialBonsDAchat);
  const [bonsDeSortie, setBonsDeSortie] = useState<BonDeSortie[]>(initialBonsDeSortie);
  const [stockOperations, setStockOperations] = useState<StockOperation[]>(initialStockOperations);
  const [retoursMarchandise, setRetoursMarchandise] = useState<RetourMarchandise[]>(initialRetoursMarchandise);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleLogin = (user: Utilisateur) => {
    setCurrentUser(user);
    
    const affectations = user.projetsAffectes || [];
    
    if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'directeur') {
      setSelectedProjectId('all');
      setActiveTab('dashboard');
    } else if (user.role === 'comptable') {
      setSelectedProjectId('all');
      setActiveTab('dashboard');
    } else if (user.role === 'caissier') {
      // Le caissier accède directement à l'espace Caisse / Terminal POS
      setSelectedProjectId(affectations[0] || user.projetId || '1');
      setActiveTab('caisse');
    } else {
      // Agent commercial
      setSelectedProjectId(affectations[0] || user.projetId || '1');
      setActiveTab('ventes');
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
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
            <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200 m-6 max-w-2xl mx-auto">
              <span className="material-symbols-outlined text-5xl text-amber-500 mb-3">lock</span>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Accès Réseau & Système Restreint</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                L'administrateur de la société UGS n'a pas accès au module Réseau & Système (Gestion des boutiques et points de vente du réseau). Cet accès est strictement réservé au Super Administrateur du groupe.
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
            <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200 m-6 max-w-2xl mx-auto">
              <span className="material-symbols-outlined text-5xl text-amber-500 mb-3">lock</span>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Accès Réseau & Système Restreint</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                L'administrateur de la société UGS n'a pas accès à la gestion des équipes, comptes d'accès et droits système. Cette fonction est réservée exclusivement au Super Administrateur.
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
          <AdminUsers projets={projets} />
        );
      case 'statistiques':
        return (
          <AdminStatistics projets={projets} />
        );
      case 'audit':
        return (
          <AdminAuditLogs projets={projets} />
        );
      case 'articles':
        return (
          <Articles currentUser={currentUser} articles={articles} 
            selectedProjectId={selectedProjectId} 
     
            onArticlesChange={setArticles}
            projets={projets}
 
          />
        );
      case 'categories':
        return (
          <Articles currentUser={currentUser} articles={articles} 
            selectedProjectId={selectedProjectId} 
            onArticlesChange={setArticles}
            projets={projets}
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
          <Stock 
            currentUser={currentUser} 
            articles={articles} 
            selectedProjectId={selectedProjectId} 
            onArticlesChange={setArticles}
            mouvements={mouvements}
            onMouvementsChange={setMouvements}
            projets={projets}
            ventes={ventes}
            fournisseurs={fournisseurs}
            onGenerateAchat={(nouvelAchat) => setAchats(prev => [nouvelAchat as Achat, ...prev])}
            onNavigate={setActiveTab}
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
            selectedProjectId={selectedProjectId}
            sessions={sessions}
            actionLogs={actionLogs}
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
          <Caisse currentUser={currentUser} selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            reglements={reglements}
            projets={projets}
            ventes={ventes}
            achats={achats}
            clients={clients}
            fournisseurs={fournisseurs}
            articles={articles}
            mouvements={mouvements}
            sessions={sessions}
            actionLogs={actionLogs}
            onReglementsChange={setReglements}
            onVentesChange={setVentes}
            onArticlesChange={setArticles}
            onClientsChange={setClients}
            onMouvementsChange={setMouvements}
            onSessionsChange={setSessions}
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
          setSelectedProjectId(id);
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
        {/* Minimal Workspace Header */}
        <header className="flex justify-between items-center h-14 px-4 md:px-6 bg-surface border-b border-outline-variant z-10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-lg"
              title="Ouvrir le menu"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            {/* Active Project Title Badge */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                {selectedProjectId === 'all' ? 'domain' : 'folder_managed'}
              </span>
              <span className="font-bold text-sm text-on-surface">
                {selectedProjectId === 'all' 
                  ? 'Société UGS - Siège Central' 
                  : projets.find(p => p.id === selectedProjectId)?.nom || 'Projet'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant rounded-lg border border-outline-variant/50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span className="text-xs font-bold hidden sm:inline">Rechercher</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 rounded bg-surface border border-outline-variant text-[10px] font-mono text-on-surface-variant">
                <span className="text-xs">⌘</span>K
              </kbd>
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
            <div className="flex items-center gap-2 pl-2 border-l border-outline-variant ml-2">
              <div className="w-7 h-7 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center border border-outline-variant shadow-xs">
                {currentUser?.nom?.charAt(0) || 'U'}
              </div>
              <span className="hidden sm:inline font-bold text-xs text-on-surface">{currentUser?.nom}</span>
              <button
                onClick={handleLogout}
                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors ml-1 cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Se déconnecter"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-24 md:pb-8 bg-surface-container-lowest/50">
          {renderContent()}
        </main>

        {/* Mobile Ergonomic Bottom Navigation Bar (md:hidden) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
          {currentUser?.role === 'caissier' ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('caisse')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'caisse' ? 'text-purple-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
                <span className="text-[10px] tracking-tight mt-0.5">Caisse</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ventes')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'ventes' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                <span className="text-[10px] tracking-tight mt-0.5">Ventes</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'stock' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                <span className="text-[10px] tracking-tight mt-0.5">Stock</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('articles')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'articles' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">category</span>
                <span className="text-[10px] tracking-tight mt-0.5">Articles</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
                <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
              </button>
            </>
          ) : currentUser?.role === 'comptable' ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">dashboard</span>
                <span className="text-[10px] tracking-tight mt-0.5">Tableau</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('credits')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'credits' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                <span className="text-[10px] tracking-tight mt-0.5">Crédits</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('caisse')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'caisse' ? 'text-purple-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
                <span className="text-[10px] tracking-tight mt-0.5">Caisse</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ventes')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'ventes' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                <span className="text-[10px] tracking-tight mt-0.5">Ventes</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
                <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">dashboard</span>
                <span className="text-[10px] tracking-tight mt-0.5">Tableau</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('caisse')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'caisse' ? 'text-purple-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
                <span className="text-[10px] tracking-tight mt-0.5">Caisse</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ventes')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'ventes' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                <span className="text-[10px] tracking-tight mt-0.5">Ventes</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'stock' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                <span className="text-[10px] tracking-tight mt-0.5">Stock</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
                <span className="text-[10px] tracking-tight mt-0.5">Plus</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
