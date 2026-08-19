import { canPerformAction } from '../lib/permissions';
import React, { useState } from 'react';
import { mockVentes, mockArticles, mockClients, mockFournisseurs, mockAchats, mockUsers } from '../data';
import { AdminProjectDetails } from './AdminProjectDetails';
import { Projet } from '../types';
import { AdminUsers } from './AdminUsers';
import { AdminOverview } from './AdminOverview';
import { AdminStatistics } from './AdminStatistics';
import { AdminAuditLogs } from './AdminAuditLogs';

import { Utilisateur } from '../types';

interface ProjectPortalProps {
  currentUser?: Utilisateur;
  onSelectProject: (id: string) => void;
  onLogout?: () => void;
  projets: Projet[];
  onProjetsChange: (projets: Projet[]) => void;
}

export function ProjectPortal({ currentUser, onSelectProject, onLogout, projets, onProjetsChange }: ProjectPortalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'directeur';
  const allowedProjets = isAdmin ? projets : projets.filter(p => currentUser?.projetsAffectes?.includes(p.id));
  
  const [portalView, setPortalView] = useState<'overview' | 'projects' | 'users' | 'statistics' | 'audit'>(isAdmin ? 'overview' : 'projects');
  const [selectedProjectModal, setSelectedProjectModal] = useState<Projet | null>(null);
  
  // Nouveaux états pour la gestion de l'ajout/modification
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState('all');
  const [villeFilter, setVilleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [sortConfig, setSortConfig] = useState<{ key: keyof Projet, direction: 'asc' | 'desc' }>({ key: 'nom', direction: 'asc' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Projet | null>(null);
  const [formData, setFormData] = useState<Partial<Projet>>({
    nom: '',
    codeBoutique: '',
    adresse: '',
    ville: '',
    gouvernorat: '',
    telephone: '',
    email: '',
    description: '',
    responsable: '',
    statut: 'Active',
  });
  const [formError, setFormError] = useState('');

  // Extraction des villes uniques
  const uniqueVilles = Array.from(new Set(allowedProjets.map(p => p.ville).filter(Boolean)));

  const filteredProjets = allowedProjets.filter(p => {
    const matchesSearch = p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.responsable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.codeBoutique?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.statut === statusFilter;
    const matchesVille = villeFilter === 'all' || p.ville === villeFilter;
    return matchesSearch && matchesStatus && matchesVille;
  }).sort((a, b) => {
    const aValue = String(a[sortConfig.key] || '').toLowerCase();
    const bValue = String(b[sortConfig.key] || '').toLowerCase();
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(filteredProjets.length / itemsPerPage);
  const paginatedProjets = filteredProjets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: keyof Projet) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const handleToggleStatus = (projet: Projet, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatut = projet.statut === 'Active' ? 'Inactive' : 'Active';
    onProjetsChange(projets.map(p => p.id === projet.id ? { ...p, statut: newStatut } : p));
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'Actif':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold border border-emerald-200">Actif</span>;
      case 'En pause':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold border border-amber-200">En pause</span>;
      case 'Archivé':
        return <span className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-bold border border-gray-300">Archivé</span>;
      default:
        return null;
    }
  };

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormData({ nom: '', description: '', responsable: '', statut: 'Actif' });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (projet: Projet, e: React.MouseEvent) => {
    e.stopPropagation(); // Évite de déclencher onSelectProject
    setEditingProject(projet);
    setFormError('');
    setFormData({ 
      nom: projet.nom,
      codeBoutique: projet.codeBoutique || '',
      adresse: projet.adresse || '',
      ville: projet.ville || '',
      gouvernorat: projet.gouvernorat || '',
      telephone: projet.telephone || '',
      email: projet.email || '',
      description: projet.description || '', 
      responsable: projet.responsable || '', 
      statut: projet.statut 
    });
    setIsEditModalOpen(true);
  };
  
  const handleOpenNewModal = () => {
    setEditingProject(null);
    setFormError('');
    setFormData({
      nom: '',
      codeBoutique: '',
      adresse: '',
      ville: '',
      gouvernorat: '',
      telephone: '',
      email: '',
      description: '',
      responsable: '',
      statut: 'Active',
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Évite de déclencher onSelectProject
    if (!canPerformAction(currentUser, 'delete')) {
      alert("Action non autorisée pour votre profil (Droits insuffisants).");
      return;
    }
    if(confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
        onProjetsChange(projets.filter(p => p.id !== id));
    }
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nom || !formData.codeBoutique || !formData.adresse || !formData.ville || !formData.telephone) {
      setFormError('Veuillez remplir tous les champs obligatoires (*).');
      return;
    }

    // Code boutique doit être unique
    const isCodeDuplicate = projets.some(p => p.codeBoutique?.toLowerCase() === formData.codeBoutique?.toLowerCase() && p.id !== editingProject?.id);
    if (isCodeDuplicate) {
      setFormError('Le code boutique est déjà utilisé par une autre boutique.');
      return;
    }

    if (editingProject) {
      onProjetsChange(projets.map(p => p.id === editingProject.id ? { ...p, ...formData as Projet } : p));
    } else {
      const newProject: Projet = {
        id: `p-${Date.now()}`,
        ...(formData as Projet),
        dateCreation: new Date().toISOString().split('T')[0],
      };
      onProjetsChange([newProject, ...projets]);
    }
    setIsEditModalOpen(false);
  };

  return (
    <div className="flex w-full flex-col md:flex-row h-screen bg-surface-container-low overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col z-20 shrink-0 md:my-4 md:ml-4 md:h-[calc(100vh-2rem)] md:rounded-2xl border border-slate-800 shadow-2xl">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-md border border-white/20">
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            </div>
            <div>
              <p className="font-bold text-sm text-white tracking-wide">ADMINISTRATION</p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Portail ERP Tunisie</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1.5">
          {isAdmin && (
            <button 
              onClick={() => setPortalView('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'overview' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'overview' ? "fill" : "regular"}>dashboard</span>
              <span className="font-label-md text-sm">Vue d'ensemble</span>
            </button>
          )}
          <button 
            onClick={() => setPortalView('projects')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'projects' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'projects' ? "fill" : "regular"}>folder_managed</span>
            <span className="font-label-md text-sm">Boutiques</span>
          </button>
          {isAdmin && (
            <button 
              onClick={() => setPortalView('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'users' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'users' ? "fill" : "regular"}>group</span>
              <span className="font-label-md text-sm">Utilisateurs</span>
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setPortalView('statistics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'statistics' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'statistics' ? "fill" : "regular"}>bar_chart</span>
              <span className="font-label-md text-sm">Statistiques</span>
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setPortalView('audit')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'audit' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'audit' ? "fill" : "regular"}>history</span>
              <span className="font-label-md text-sm">Audit & Logs</span>
            </button>
          )}

          {/* Logout Button in Admin Portal Sidebar */}
          {onLogout && (
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-rose-400 border border-transparent hover:border-slate-700 mt-6 cursor-pointer"
              title="Se déconnecter"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="font-label-md text-sm font-bold">Déconnexion</span>
            </button>
          )}
        </nav>
      </aside>

      {/* Mobile Header & Nav */}
      <div className="md:hidden flex flex-col bg-red-900 text-white border-b border-red-800 z-20 shrink-0 shadow-md">
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-yellow-300">shield</span>
            <p className="font-label-sm text-xs text-white uppercase tracking-wider font-bold">ADMINISTRATION ERP</p>
          </div>
        </div>
        <div className="flex border-t border-red-800/60 overflow-x-auto bg-red-950/40">
          {isAdmin && (
            <button 
              onClick={() => setPortalView('overview')}
              className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'overview' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span className="whitespace-nowrap">Vue d'ensemble</span>
            </button>
          )}
          <button 
            onClick={() => setPortalView('projects')}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'projects' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[16px]">folder_managed</span>
            <span className="whitespace-nowrap">Boutiques</span>
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={() => setPortalView('users')}
                className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'users' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[16px]">group</span>
                <span className="whitespace-nowrap">Utilisateurs</span>
              </button>
              <button 
                onClick={() => setPortalView('statistics')}
                className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'statistics' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                <span className="whitespace-nowrap">Statistiques</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-surface-container-lowest md:bg-surface-container-low">
        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto ${portalView === 'projects' ? 'p-4 sm:p-6 md:p-10' : 'p-4 sm:p-6'}`}>
          <div className="w-full h-full">
            {selectedProjectModal ? (
              <AdminProjectDetails 
                projet={selectedProjectModal} 
                onClose={() => setSelectedProjectModal(null)} 
                onAccessWorkspace={() => {
                  const id = selectedProjectModal.id;
                  setSelectedProjectModal(null);
                  onSelectProject(id);
                }}
                ventes={mockVentes}
                achats={mockAchats}
                articles={mockArticles}
                clients={mockClients}
                utilisateurs={mockUsers}
              />
            ) : (
              <>
                {portalView === 'overview' && <AdminOverview onSelectProject={onSelectProject} projets={projets} />}
            {portalView === 'statistics' && <AdminStatistics projets={projets} />}
            {portalView === 'users' && <AdminUsers projets={projets} />}
            {portalView === 'audit' && <AdminAuditLogs projets={projets} />}
            {portalView === 'projects' && (
              <>
                <div className="mb-6 md:mb-8 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display-sm md:font-display-md text-display-sm md:text-display-md text-on-surface mb-1 md:mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600">storefront</span>
                        Boutiques & Succursales
                      </h2>
                      <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant">Sélectionnez une boutique pour accéder à sa gestion commerciale et logistique ou consulter sa fiche détaillée.</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2 shrink-0">
                        <button 
                          onClick={() => onSelectProject('all')}
                          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-all"
                        >
                          <span className="material-symbols-outlined">public</span>
                          Toutes les boutiques
                        </button>
                        <button 
                          onClick={handleOpenNewModal}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all"
                        >
                          <span className="material-symbols-outlined">add_business</span>
                          Nouvelle Boutique
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
                      <div className="relative flex-1 min-w-[200px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                        <input 
                          type="text" 
                          placeholder="Rechercher (nom, code, resp.)..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Archivée">Archivée</option>
                      </select>
                      <select 
                        value={villeFilter}
                        onChange={(e) => setVilleFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="all">Toutes les villes</option>
                        {uniqueVilles.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                      <button 
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Vue Liste (Tableau)"
                      >
                        <span className="material-symbols-outlined text-[20px]">table_rows</span>
                      </button>
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Vue Grille (Cartes)"
                      >
                        <span className="material-symbols-outlined text-[20px]">grid_view</span>
                      </button>
                    </div>
                  </div>
                </div>

                {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Project Cards */}
          {paginatedProjets.map(projet => {
            const caProj = mockVentes.filter(v => v.projetId === projet.id && v.statut === 'Payée').reduce((acc, v) => acc + v.montantHT, 0);
            const clientsCount = mockClients.filter(c => c.projetId === projet.id).length;
            const articlesCount = mockArticles.filter(a => a.projetId === projet.id).length;

            return (
              <div 
                key={projet.id}
                onClick={() => onSelectProject(projet.id)}
                className="bg-surface-container-lowest border border-outline-variant hover:border-red-500/50 rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-red-50 text-red-700 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">folder_managed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(projet.statut)}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-title-lg text-title-lg text-on-surface font-bold line-clamp-1 group-hover:text-red-700 transition-colors">{projet.nom}</h3>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200">{projet.codeBoutique || 'SANS CODE'}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-2 min-h-[40px]">{projet.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-xl mb-4">
                      <div>
                        <span className="text-gray-500 block">Ville:</span>
                        <span className="font-bold text-on-surface truncate block">{projet.ville || 'Non spécifiée'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Responsable:</span>
                        <span className="font-semibold text-on-surface truncate block">{projet.responsable || 'Non assigné'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-outline-variant/60 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Chiffre d'Affaires</span>
                      <span className="font-bold text-emerald-600 text-base">{caProj.toLocaleString('fr-FR')} DT</span>
                    </div>
                    <div className="text-right text-xs text-on-surface-variant">
                      <span className="font-semibold text-on-surface block">{clientsCount} Clients</span>
                      <span>{articlesCount} Articles</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectModal(projet);
                      }}
                      className="py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-outline-variant flex items-center justify-center gap-1.5 transition-colors"
                      title="Détails"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span className="hidden lg:inline">Détails</span>
                    </button>
                    <button 
                      onClick={(e) => handleOpenEditModal(projet, e)}
                      className="py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-outline-variant flex items-center justify-center gap-1.5 transition-colors"
                      title="Modifier"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span className="hidden lg:inline">Modifier</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={(e) => handleDeleteProject(projet.id, e)}
                      className="py-2 px-3 bg-error/10 hover:bg-error/20 text-error text-xs font-bold rounded-xl border border-error/20 flex items-center justify-center gap-1.5 transition-colors"
                      title="Supprimer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span className="hidden lg:inline">Supprimer</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(projet.id);
                      }}
                      className="py-2 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
                      title="Ouvrir Boutique"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span className="hidden lg:inline">Ouvrir Boutique</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Project Card */}
          <div 
             onClick={handleOpenAddModal}
             className="border-2 border-dashed border-outline-variant rounded-2xl p-6 cursor-pointer hover:bg-red-50/50 hover:border-red-400 transition-all group flex flex-col items-center justify-center text-center min-h-[280px]"
          >
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors text-on-surface-variant shadow-sm">
              <span className="material-symbols-outlined text-[32px]">add</span>
            </div>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold mb-1 group-hover:text-red-700 transition-colors">Nouvelle Boutique</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Créer un nouvel espace de travail indépendant.</p>
          </div>
        </div>
    ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('codeBoutique')}>
                    <div className="flex items-center gap-2">Code {sortConfig.key === 'codeBoutique' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('nom')}>
                    <div className="flex items-center gap-2">Boutique {sortConfig.key === 'nom' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('ville')}>
                    <div className="flex items-center gap-2">Ville {sortConfig.key === 'ville' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('responsable')}>
                    <div className="flex items-center gap-2">Responsable {sortConfig.key === 'responsable' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('statut')}>
                    <div className="flex items-center gap-2">Statut {sortConfig.key === 'statut' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</div>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProjets.map(projet => (
                  <tr key={projet.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{projet.codeBoutique || '---'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{projet.nom}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{projet.description}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-600 font-medium">{projet.ville || '---'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-700 font-medium">{projet.responsable || '---'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(projet.statut)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedProjectModal(projet); }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Voir Détails"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={(e) => handleOpenEditModal(projet, e)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button 
                              onClick={(e) => handleToggleStatus(projet, e)}
                              className={`p-2 rounded-lg transition-colors ${projet.statut === 'Active' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                              title={projet.statut === 'Active' ? 'Désactiver' : 'Activer'}
                            >
                              <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                            </button>
                          </>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); onSelectProject(projet.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Accéder à l'espace de travail"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedProjets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Aucune boutique trouvée correspondant à vos critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    )}
    
    {/* Pagination Controls */}
    {totalPages > 1 && (
      <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-sm text-slate-500">
          Affichage {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredProjets.length)} sur {filteredProjets.length}
        </span>
        <div className="flex items-center gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          
          {Array.from({length: totalPages}).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {i + 1}
            </button>
          ))}
          
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>
    )}
          </>
        )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Edit/Add Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">storefront</span>
                </div>
                <div>
                  <h3 className="font-title-lg font-bold text-slate-900">
                    {editingProject ? "Modifier la Boutique" : "Ajouter une Boutique"}
                  </h3>
                  <p className="text-xs text-slate-500">Remplissez les informations de la succursale</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-6">
              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
                  <span className="material-symbols-outlined text-[20px]">error</span>
                  {formError}
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Informations Principales */}
                <div className="space-y-5">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">info</span>
                    Informations Principales
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Nom de la boutique <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: UGS Sfax Centre"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.nom}
                        onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Code boutique <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        disabled={!!editingProject}
                        placeholder="Ex: SF-CENTRE-001"
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all uppercase ${editingProject ? 'bg-slate-100 border-transparent text-slate-500 cursor-not-allowed' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}
                        value={formData.codeBoutique}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeBoutique: e.target.value.toUpperCase() }))}
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Identifiant unique de la boutique.</p>
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Statut <span className="text-red-500">*</span></label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.statut}
                        onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as Projet['statut'] }))}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Archivée">Archivée</option>
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">Une boutique inactive n'accepte pas de nouvelles opérations.</p>
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Responsable</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Mohamed Ali"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.responsable}
                        onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Coordonnées & Localisation */}
                <div className="space-y-5">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">location_on</span>
                    Coordonnées & Localisation
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Adresse physique <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Avenue Habib Bourguiba"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.adresse}
                        onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Ville <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Sfax"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          value={formData.ville}
                          onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Gouvernorat</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Sfax"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          value={formData.gouvernorat}
                          onChange={(e) => setFormData(prev => ({ ...prev, gouvernorat: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Téléphone <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: 74 000 001"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          value={formData.telephone}
                          onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Email</label>
                        <input 
                          type="email" 
                          placeholder="Ex: contact@boutique.tn"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description supplémentaire</label>
                      <textarea 
                        rows={2}
                        placeholder="Notes internes..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
