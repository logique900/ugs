import React, { useState } from 'react';
import { Projet } from '../types';

interface ProjetsProps {
  onSelectProject?: (id: string) => void;
  projets: Projet[];
  onProjetsChange: (projets: Projet[]) => void;
}

export function Projets({ onSelectProject, projets, onProjetsChange }: ProjetsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Projet | null>(null);

  const [formData, setFormData] = useState<{
    nom: string;
    description: string;
    responsable: string;
    statut: 'Actif' | 'En pause' | 'Archivé';
    entrepriseNom: string;
    matriculeFiscal: string;
    adresse: string;
    telephone: string;
    email: string;
    banque: string;
    rib: string;
  }>({
    nom: '',
    description: '',
    responsable: '',
    statut: 'Actif',
    entrepriseNom: '',
    matriculeFiscal: '',
    adresse: '',
    telephone: '',
    email: '',
    banque: '',
    rib: '',
  });

  const filteredProjets = projets.filter(p => 
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (statut: Projet['statut']) => {
    switch (statut) {
      case 'Actif':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200">Actif</span>;
      case 'En pause':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium border border-amber-200">En pause</span>;
      case 'Archivé':
        return <span className="px-2.5 py-1 bg-surface-container-highest text-on-surface-variant rounded-lg text-xs font-medium border border-outline-variant">Archivé</span>;
    }
  };

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormData({ 
      nom: '', 
      description: '', 
      responsable: '', 
      statut: 'Actif',
      entrepriseNom: '',
      matriculeFiscal: '',
      adresse: '',
      telephone: '',
      email: '',
      banque: '',
      rib: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (projet: Projet) => {
    setEditingProject(projet);
    setFormData({ 
      nom: projet.nom, 
      description: projet.description, 
      responsable: projet.responsable, 
      statut: projet.statut,
      entrepriseNom: projet.entrepriseNom || '',
      matriculeFiscal: projet.matriculeFiscal || '',
      adresse: projet.adresse || '',
      telephone: projet.telephone || '',
      email: projet.email || '',
      banque: projet.banque || '',
      rib: projet.rib || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.responsable) return;

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

  const handleDeleteProject = (id: string) => {
     if(confirm('Êtes-vous sûr de vouloir supprimer cette boutique ?')) {
         onProjetsChange(projets.filter(p => p.id !== id));
     }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Gestion des Boutiques</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">Créez et configurez vos différents projets métiers.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-primary hover:bg-red-700 text-white rounded-lg font-label-md text-label-md transition-colors shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] mr-2">add</span>
          Nouvelle Boutique
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-outline-variant bg-surface flex items-center justify-between">
          <div className="relative max-w-md w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input
              type="text"
              placeholder="Rechercher un projet (nom, responsable, description)..."
              className="block w-full pl-11 pr-4 py-2.5 border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest text-on-surface font-body-md transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md whitespace-nowrap">
            <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Nom de la boutique</th>
                <th className="px-6 py-4 font-semibold">Responsable</th>
                <th className="px-6 py-4 font-semibold">Date de création</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {filteredProjets.map((projet) => (
                <tr key={projet.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-semibold text-on-surface">{projet.nom}</p>
                    <p className="text-sm text-on-surface-variant mt-0.5 truncate max-w-xs">{projet.description}</p>
                  </td>
                  <td className="px-6 py-5 text-on-surface">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {projet.responsable.charAt(0)}
                      </div>
                      {projet.responsable}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-on-surface-variant">
                    {new Date(projet.dateCreation).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(projet.statut)}
                  </td>
                  <td className="px-6 py-5 text-right space-x-2">
                    {onSelectProject && (
                      <button 
                        onClick={() => onSelectProject(projet.id)}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary hover:text-white text-primary text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        title="Basculer dans cet espace de travail"
                      >
                        <span className="material-symbols-outlined text-[16px]">logout</span>
                        Accéder
                      </button>
                    )}
                    <button 
                      onClick={() => handleOpenEditModal(projet)}
                      className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer" 
                      title="Modifier"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteProject(projet.id)}
                      className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer" 
                      title="Supprimer"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProjets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    Aucune boutique ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-6 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">folder_managed</span>
                </div>
                <div>
                  <h3 className="font-title-lg font-bold text-on-surface">
                    {editingProject ? "Modifier la Boutique" : "Nouvelle Boutique"}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-container-highest rounded-full text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Nom de la boutique</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Boutique Centre-Ville"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Description détaillée de la boutique..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Responsable</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Sarah Connor"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                  value={formData.responsable}
                  onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Statut</label>
                <select 
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                  value={formData.statut}
                  onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as Projet['statut'] }))}
                >
                  <option value="Actif">Actif</option>
                  <option value="En pause">En pause</option>
                  <option value="Archivé">Archivé</option>
                </select>
              </div>

              <div className="border-t border-outline-variant pt-4 mt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-primary mb-3">Données & Identité Entreprise pour factures & devis</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Nom de l'Entreprise / Émetteur</label>
                    <input 
                      type="text" 
                      placeholder="Ex: UGS Construction SARL"
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                      value={formData.entrepriseNom}
                      onChange={(e) => setFormData(prev => ({ ...prev, entrepriseNom: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Matricule Fiscal</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 1234567/A/M/000"
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                      value={formData.matriculeFiscal}
                      onChange={(e) => setFormData(prev => ({ ...prev, matriculeFiscal: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Adresse Siège</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Zone Industrielle Voie 12, Tunis"
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                      value={formData.adresse}
                      onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Téléphone</label>
                    <input 
                      type="text" 
                      placeholder="Ex: +216 71 000 111"
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                      value={formData.telephone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Email Facturation</label>
                    <input 
                      type="email" 
                      placeholder="Ex: contact@ugs.com"
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Banque</label>
                    <input 
                      type="text" 
                      placeholder="Ex: BIAT"
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                      value={formData.banque}
                      onChange={(e) => setFormData(prev => ({ ...prev, banque: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">RIB Bancaire</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 08 001 0001234567890 45"
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                      value={formData.rib}
                      onChange={(e) => setFormData(prev => ({ ...prev, rib: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-red-700 rounded-xl shadow-md cursor-pointer"
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
