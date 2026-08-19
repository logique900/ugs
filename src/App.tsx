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
import { ProjectPortal } from './components/ProjectPortal';
import { 
  mockProjets as initialProjets, 
  mockArticles as initialArticles, 
  mockMouvements as initialMouvements, 
  mockClients as initialClients, 
  mockFournisseurs as initialFournisseurs,
  mockVentes as initialVentes,
  mockAchats as initialAchats,
  mockReglements as initialReglements,
  mockRelances as initialRelances
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
  TabType, 
  Utilisateur 
} from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [showPortal, setShowPortal] = useState(true);
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

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleLogin = (user: Utilisateur) => {
    setCurrentUser(user);
    
    const affectations = user.projetsAffectes || [];
    
    if (user.role === 'admin' || user.role === 'directeur') {
      setShowPortal(true);
      setSelectedProjectId('all');
      setActiveTab('dashboard');
    } else if (affectations.length > 1) {
      // User has multiple assigned boutiques, must choose one
      setShowPortal(true);
      setSelectedProjectId('all');
      setActiveTab(user.role === 'comptable' ? 'dashboard' : 'ventes');
    } else {
      // Single boutique or no specific assignment
      setShowPortal(false);
      setSelectedProjectId(affectations[0] || user.projetId || '1');
      setActiveTab(user.role === 'comptable' ? 'dashboard' : 'ventes');
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (showPortal) {
    // Only admins or multi-boutique users see the portal
    return (
      <ProjectPortal 
        currentUser={currentUser}
        onLogout={handleLogout} 
        projets={projets}
        onProjetsChange={setProjets}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setActiveTab(currentUser.role === 'comptable' || currentUser.role === 'admin' ? 'dashboard' : 'ventes');
          setShowPortal(false);
        }} 
      />
    );
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
      case 'projets':
        return (
          <Projets 
            projets={projets}
 
            onProjetsChange={setProjets} 
            onSelectProject={(id) => { setSelectedProjectId(id); setActiveTab('dashboard'); }} 
          />
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
          <Stock currentUser={currentUser} articles={articles} 
            selectedProjectId={selectedProjectId} 
    
            onArticlesChange={setArticles}
            mouvements={mouvements}
            onMouvementsChange={setMouvements}
            projets={projets}

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
      case 'ventes':
        return (
          <Ventes currentUser={currentUser} articles={articles} 
            selectedProjectId={selectedProjectId}
            ventes={ventes}
            clients={clients}
    
            projets={projets}

            reglements={reglements}
            onVentesChange={setVentes}
            onReglementsChange={setReglements}
            onClientsChange={setClients}
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
            reglements={reglements}
            projets={projets}

            ventes={ventes}
            achats={achats}
            clients={clients}
            fournisseurs={fournisseurs}
            onReglementsChange={setReglements}
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
      {/* Sidebar Pro per Project Workspace */}
      <Sidebar activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setActiveTab('dashboard');
        }}
        projets={projets}

        currentUser={currentUser} onReturnToPortal={() => setShowPortal(true)}
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
                  ? 'Système Central ERP' 
                  : projets.find(p => p.id === selectedProjectId)?.nom || 'Projet'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-surface-container-lowest/50">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
