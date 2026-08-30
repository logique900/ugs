import React, { useState } from 'react';
import { Projet, Vente, Achat, Article, Client, Utilisateur } from '../types';
import { AdminProjectDetails } from './AdminProjectDetails';
import { canPerformAction } from '../lib/permissions';

interface ProjetsProps {
  onSelectProject?: (id: string) => void;
  projets: Projet[];
  onProjetsChange: (projets: Projet[]) => void;
  currentUser?: Utilisateur | null;
  ventes?: Vente[];
  achats?: Achat[];
  articles?: Article[];
  clients?: Client[];
  utilisateurs?: Utilisateur[];
}

export function Projets({ 
  onSelectProject, 
  projets, 
  onProjetsChange,
  currentUser,
  ventes = [],
  achats = [],
  articles = [],
  clients = [],
  utilisateurs = []
}: ProjetsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [villeFilter, setVilleFilter] = useState<string>('all');
  const [selectedProjectModal, setSelectedProjectModal] = useState<Projet | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Projet | null>(null);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState<{
    nom: string;
    codeBoutique: string;
    description: string;
    responsable: string;
    statut: Projet['statut'];
    adresse: string;
    ville: string;
    gouvernorat: string;
    telephone: string;
    email: string;
    entrepriseNom: string;
    matriculeFiscal: string;
    banque: string;
    rib: string;
  }>({
    nom: '',
    codeBoutique: '',
    description: '',
    responsable: '',
    statut: 'Active',
    adresse: '',
    ville: '',
    gouvernorat: '',
    telephone: '',
    email: '',
    entrepriseNom: '',
    matriculeFiscal: '',
    banque: '',
    rib: '',
  });

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'directeur';
  const allowedProjets = isAdmin 
    ? projets 
    : projets.filter(p => currentUser?.projetsAffectes?.includes(p.id) || p.id === currentUser?.projetId);

  // Extract unique cities
  const uniqueVilles = Array.from(new Set(allowedProjets.map(p => p.ville).filter(Boolean))) as string[];

  const filteredProjets = allowedProjets.filter(p => {
    const matchesSearch = 
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.codeBoutique && p.codeBoutique.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.ville && p.ville.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || p.statut === statusFilter || 
      (statusFilter === 'Active' && p.statut === 'Actif') ||
      (statusFilter === 'Inactive' && p.statut === 'En pause') ||
      (statusFilter === 'Archivée' && p.statut === 'Archivé');

    const matchesVille = villeFilter === 'all' || p.ville === villeFilter;

    return matchesSearch && matchesStatus && matchesVille;
  });

  // Global KPIs
  const totalBoutiques = allowedProjets.length;
  const activeBoutiques = allowedProjets.filter(p => p.statut === 'Active' || p.statut === 'Actif').length;
  const totalCA = ventes.filter(v => v.statut === 'Payée').reduce((acc, v) => acc + v.montantHT, 0);

  const getStatusBadge = (statut: Projet['statut']) => {
    switch (statut) {
      case 'Active':
      case 'Actif':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Active</span>;
      case 'Inactive':
      case 'En pause':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Inactive</span>;
      case 'Archivée':
      case 'Archivé':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 inline-flex items-center gap-1">Archivée</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">{statut}</span>;
    }
  };

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormError('');
    setFormData({ 
      nom: '', 
      codeBoutique: `BTQ-0${projets.length + 1}`,
      description: '', 
      responsable: '', 
      statut: 'Active',
      adresse: '',
      ville: 'Tunis',
      gouvernorat: 'Tunis',
      telephone: '+216 ',
      email: '',
      entrepriseNom: 'ERP TUNISIE SARL',
      matriculeFiscal: '1234567/A/M/000',
      banque: 'BIAT',
      rib: '08 001 0001234567890 45'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (projet: Projet, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(projet);
    setFormError('');
    setFormData({ 
      nom: projet.nom, 
      codeBoutique: projet.codeBoutique || `BTQ-${projet.id}`,
      description: projet.description || '', 
      responsable: projet.responsable || '', 
      statut: projet.statut,
      adresse: projet.adresse || '',
      ville: projet.ville || '',
      gouvernorat: projet.gouvernorat || '',
      telephone: projet.telephone || '',
      email: projet.email || '',
      entrepriseNom: projet.entrepriseNom || '',
      matriculeFiscal: projet.matriculeFiscal || '',
      banque: projet.banque || '',
      rib: projet.rib || ''
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = (projet: Projet, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatut: Projet['statut'] = (projet.statut === 'Active' || projet.statut === 'Actif') ? 'Inactive' : 'Active';
    onProjetsChange(projets.map(p => p.id === projet.id ? { ...p, statut: newStatut } : p));
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nom.trim() || !formData.responsable.trim()) {
      setFormError('Le nom de la boutique et le responsable sont obligatoires.');
      return;
    }

    if (editingProject) {
      onProjetsChange(projets.map(p => p.id === editingProject.id ? { ...p, ...formData } : p));
    } else {
      const newProject: Projet = {
        id: `p-${Date.now()}`,
        ...formData,
        dateCreation: new Date().toISOString().split('T')[0],
      };
      onProjetsChange([newProject, ...projets]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteProject = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canPerformAction(currentUser || undefined, 'delete')) {
      alert("Action non autorisée pour votre profil.");
      return;
    }
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement cette boutique ?')) {
      onProjetsChange(projets.filter(p => p.id !== id));
      if (selectedProjectModal?.id === id) {
        setSelectedProjectModal(null);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-2xl md:text-3xl font-black text-on-surface flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">storefront</span>
            </span>
            Boutiques & Succursales
          </h1>
          <p className="font-body-md text-on-surface-variant mt-1">
            Gestion du parc de points de vente, affectations et suivi consolidé de l'activité.
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            <span>Nouvelle Boutique</span>
          </button>
        )}
      </div>

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">store</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Boutiques</p>
            <p className="text-2xl font-black text-on-surface mt-0.5">{totalBoutiques}</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Boutiques Actives</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{activeBoutiques} / {totalBoutiques}</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">payments</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">CA Réalisé Global</p>
            <p className="text-2xl font-black text-on-surface mt-0.5">{totalCA.toLocaleString('fr-FR')} DT</p>
          </div>
        </div>
      </div>

      {/* Filter & View Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input
            type="text"
            placeholder="Rechercher par nom, ville, responsable, code..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:border-indigo-600 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="Active">Boutiques Actives</option>
            <option value="Inactive">Boutiques Inactives</option>
            <option value="Archivée">Boutiques Archivées</option>
          </select>

          {/* Ville Filter */}
          {uniqueVilles.length > 0 && (
            <select
              value={villeFilter}
              onChange={(e) => setVilleFilter(e.target.value)}
              className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">Toutes les villes</option>
              {uniqueVilles.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
              title="Vue Cartes"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
              title="Vue Tableau"
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid View of Boutiques (as in the screenshot) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjets.map((projet) => {
            const projectVentes = ventes.filter(v => v.projetId === projet.id);
            const projectArticles = articles.filter(a => a.projetId === projet.id);
            const projectClients = clients.filter(c => c.projetId === projet.id);
            const caRealise = projectVentes.filter(v => v.statut === 'Payée').reduce((acc, v) => acc + v.montantHT, 0);

            return (
              <div 
                key={projet.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                <div>
                  {/* Card Header: Statut & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(projet.statut)}
                      {projet.codeBoutique && (
                        <span className="text-[10px] font-mono font-bold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant">
                          {projet.codeBoutique}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      <span>{projet.dateCreation || '2023-01-15'}</span>
                    </div>
                  </div>

                  {/* Boutique Title & Description */}
                  <h3 className="text-lg font-black text-on-surface group-hover:text-indigo-600 transition-colors">
                    {projet.nom}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 min-h-[32px]">
                    {projet.description || projet.adresse || 'Boutique commerciale et point de vente'}
                  </p>

                  {/* Boutique Metadata Metrics */}
                  <div className="mt-4 pt-3 border-t border-outline-variant/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant font-medium">Responsable:</span>
                      <span className="font-bold text-on-surface">{projet.responsable || 'Non assigné'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant font-medium">CA Réalisé:</span>
                      <span className="font-black text-emerald-600">{caRealise.toLocaleString('fr-FR')} DT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant font-medium">Volume Tiers & Stock:</span>
                      <span className="font-bold text-on-surface-variant">
                        {projectClients.length} clients • {projectArticles.length} articles
                      </span>
                    </div>
                    {projet.ville && (
                      <div className="flex items-center justify-between">
                        <span className="text-on-surface-variant font-medium">Localisation:</span>
                        <span className="font-bold text-on-surface">{projet.ville} {projet.gouvernorat ? `(${projet.gouvernorat})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-outline-variant/60 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProjectModal(projet)}
                      className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      <span>Ouvrir Espace & Détails du Projet</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1">
                    {onSelectProject && (
                      <button
                        type="button"
                        onClick={() => onSelectProject(projet.id)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">login</span>
                        Basculer ici
                      </button>
                    )}

                    <div className="flex items-center gap-1 ml-auto">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(projet, e)}
                            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer text-xs"
                            title={projet.statut === 'Active' ? 'Désactiver' : 'Activer'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {projet.statut === 'Active' ? 'toggle_on' : 'toggle_off'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(projet, e)}
                            className="p-1.5 text-on-surface-variant hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProject(projet.id, e)}
                            className="p-1.5 text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-md whitespace-nowrap">
              <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-md text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">Code & Nom Boutique</th>
                  <th className="px-6 py-4 font-bold">Responsable</th>
                  <th className="px-6 py-4 font-bold">Ville</th>
                  <th className="px-6 py-4 font-bold">Statut</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 text-xs font-medium">
                {filteredProjets.map((projet) => (
                  <tr key={projet.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">store</span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{projet.nom}</p>
                          <p className="text-[11px] text-on-surface-variant font-mono">{projet.codeBoutique || 'BTQ-STD'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface">
                      {projet.responsable}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {projet.ville || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(projet.statut)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedProjectModal(projet)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        Détails
                      </button>
                      {onSelectProject && (
                        <button
                          onClick={() => onSelectProject(projet.id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">login</span>
                          Accéder
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => handleOpenEditModal(projet, e)}
                            className="p-1.5 text-on-surface-variant hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteProject(projet.id, e)}
                            className="p-1.5 text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Détails Projet / Espace Métier */}
      {selectedProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">storefront</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    {selectedProjectModal.nom}
                    <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded">
                      {selectedProjectModal.codeBoutique || 'BTQ-STD'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Fiche détaillée et métriques de la succursale</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProjectModal(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <AdminProjectDetails
                projet={selectedProjectModal}
                onClose={() => setSelectedProjectModal(null)}
                onAccessWorkspace={() => {
                  if (onSelectProject) {
                    onSelectProject(selectedProjectModal.id);
                  }
                  setSelectedProjectModal(null);
                }}
                ventes={ventes}
                achats={achats}
                articles={articles}
                clients={clients}
                utilisateurs={utilisateurs}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Création / Modification Boutique */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">store</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface">
                    {editingProject ? 'Modifier la Boutique' : 'Créer une Nouvelle Boutique'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">Configuration de la boutique et paramètres fiscaux</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-surface-container-highest rounded-lg text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Nom de la boutique *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Boutique Sfax Centre"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600"
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Code Boutique</label>
                  <input
                    type="text"
                    placeholder="Ex: BTQ-SFX-01"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600 uppercase font-mono"
                    value={formData.codeBoutique}
                    onChange={(e) => setFormData(prev => ({ ...prev, codeBoutique: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Responsable *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mohamed Ali"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600"
                    value={formData.responsable}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Statut</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600"
                    value={formData.statut}
                    onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as Projet['statut'] }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Archivée">Archivée</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Description concise du point de vente..."
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:border-indigo-600"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Ville</label>
                  <input
                    type="text"
                    placeholder="Ex: Tunis, Sfax, Sousse..."
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600"
                    value={formData.ville}
                    onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Gouvernorat</label>
                  <input
                    type="text"
                    placeholder="Ex: Tunis"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600"
                    value={formData.gouvernorat}
                    onChange={(e) => setFormData(prev => ({ ...prev, gouvernorat: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Téléphone</label>
                  <input
                    type="text"
                    placeholder="Ex: +216 71 123 456"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600"
                    value={formData.telephone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="Ex: contact@boutique.tn"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              {/* Mentions Légales & Fiscale */}
              <div className="pt-4 border-t border-outline-variant space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600">
                  Données de Facturation & Entreprise
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Raison Sociale</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600"
                      value={formData.entrepriseNom}
                      onChange={(e) => setFormData(prev => ({ ...prev, entrepriseNom: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Matricule Fiscal</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-indigo-600"
                      value={formData.matriculeFiscal}
                      onChange={(e) => setFormData(prev => ({ ...prev, matriculeFiscal: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
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
