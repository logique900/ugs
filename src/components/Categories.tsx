import React, { useState } from 'react';
import { Article, Projet, Utilisateur, CategorieItem, TabType } from '../types';

interface CategoriesProps {
  currentUser: Utilisateur | null;
  selectedProjectId: string;
  articles: Article[];
  projets: Projet[];
  onTabChange?: (tab: TabType) => void;
}

export function Categories({
  currentUser,
  selectedProjectId,
  articles,
  projets,
  onTabChange
}: CategoriesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Actif' | 'Inactif'>('all');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Flat initial categories list
  const [categories, setCategories] = useState<CategorieItem[]>([
    { id: 'cat-1', nom: 'Informatique', code: 'CAT-INFO', description: 'Ordinateurs, PC portables, moniteurs et périphériques', statut: 'Actif' },
    { id: 'cat-2', nom: 'Téléphonie & Tablettes', code: 'CAT-TEL', description: 'Smartphones, tablettes et accessoires de recharge', statut: 'Actif' },
    { id: 'cat-3', nom: 'Réseau & Câblage', code: 'CAT-NET', description: 'Switches, routeurs, câbles Ethernet et baies de brassage', statut: 'Actif' },
    { id: 'cat-4', nom: 'Matériaux BTP', code: 'CAT-BTP', description: 'Sable, ciment, briques, fers et éléments de structure', statut: 'Actif' },
    { id: 'cat-5', nom: 'Outillage & Quincaillerie', code: 'CAT-OUT', description: 'Outillage à main, électroportatif et vissterie', statut: 'Actif' },
    { id: 'cat-6', nom: 'Électricité', code: 'CAT-ELEC', description: 'Disjoncteurs, câbles électriques, prises et interrupteurs', statut: 'Actif' },
    { id: 'cat-7', nom: 'Bureautique & Papeterie', code: 'CAT-BUR', description: 'Papiers, cartouches d\'encre, fournitures de bureau', statut: 'Actif' },
    { id: 'cat-8', nom: 'Services & Prestations', code: 'CAT-SRV', description: 'Main d\'œuvre, installation et contrat de maintenance', statut: 'Actif' }
  ]);

  // Add Form states
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingCode, setEditingCode] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  const currentProject = projets.find(p => p.id === selectedProjectId);
  const isGlobal = selectedProjectId === 'all';

  // Articles filtered by current selected project
  const scopedArticles = isGlobal ? articles : articles.filter(a => a.projetId === selectedProjectId);

  // Handle Add Category
  const handleAddCategory = () => {
    if (!newName.trim()) return;

    if (categories.some(c => c.nom.toLowerCase() === newName.trim().toLowerCase())) {
      alert('Une catégorie portant ce nom existe déjà.');
      return;
    }

    const newCat: CategorieItem = {
      id: `cat-${Date.now()}`,
      nom: newName.trim(),
      code: newCode.trim() || `CAT-${newName.trim().substring(0, 3).toUpperCase()}`,
      description: newDesc.trim() || undefined,
      statut: 'Actif',
      projetId: isGlobal ? undefined : selectedProjectId
    };

    setCategories([...categories, newCat]);
    setNewName('');
    setNewCode('');
    setNewDesc('');
  };

  // Handle Edit Category
  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;

    setCategories(categories.map(c => c.id === id ? {
      ...c,
      nom: editingName.trim(),
      code: editingCode.trim() || c.code,
      description: editingDesc.trim() || undefined
    } : c));

    setEditingId(null);
    setEditingName('');
    setEditingCode('');
    setEditingDesc('');
  };

  // Handle Toggle Status
  const handleToggleStatus = (id: string) => {
    setCategories(categories.map(c => c.id === id ? {
      ...c,
      statut: c.statut === 'Actif' ? 'Inactif' : 'Actif'
    } : c));
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    const attachedCount = scopedArticles.filter(a => a.famille === cat.nom || a.categorie === cat.nom).length;
    
    if (attachedCount > 0) {
      if (!confirm(`Cette catégorie contient ${attachedCount} article(s). Êtes-vous sûr de vouloir la supprimer ?`)) {
        return;
      }
    }
    setCategories(categories.filter(c => c.id !== id));
  };

  // Filter categories
  const filteredCategories = categories.filter(c => {
    const matchesSearch = c.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = categories.filter(c => c.statut === 'Actif').length;
  const inactiveCount = categories.filter(c => c.statut === 'Inactif').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Header Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20 shrink-0">
            <span className="material-symbols-outlined text-[30px]">category</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Système de Gestion des Catégories</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs">
                Classification Produits
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
              <span>Boutique / Projet :</span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-800 border border-slate-200">
                {isGlobal ? '🏢 Toutes les boutiques (Vue Globale)' : `📁 ${currentProject?.nom || 'Projet Actif'}`}
              </span>
            </p>
          </div>
        </div>

        {onTabChange && (
          <button
            onClick={() => onTabChange('articles')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer self-stretch md:self-auto justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            Catalogue Produits
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Catégories</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{categories.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">category</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Catégories Actives</p>
            <p className="text-2xl font-black text-emerald-900 mt-1">{activeCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Désactivées</p>
            <p className="text-2xl font-black text-rose-900 mt-1">{inactiveCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">block</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Articles Classés</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{scopedArticles.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">inventory_2</span>
          </div>
        </div>
      </div>

      {/* Form: Nouvelle Catégorie */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="material-symbols-outlined text-indigo-600 text-[20px]">add_circle</span>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Ajouter une catégorie</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Code / Réf <span className="text-slate-400 font-normal">(Optionnel)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: CAT-INFO"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nom de la catégorie <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Informatique, Outillage..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description <span className="text-slate-400 font-normal">(Optionnel)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Équipements informatiques et matériel"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button
                onClick={handleAddCategory}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 shrink-0 hover:scale-[1.01]"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Créer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input
            type="text"
            placeholder="Rechercher une catégorie par nom, code ou description..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 shrink-0">Statut :</span>
          <select
            className="w-full sm:w-40 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Toutes les catégories</option>
            <option value="Actif">🟢 Actives uniquement</option>
            <option value="Inactif">🔴 Inactives uniquement</option>
          </select>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
          Liste des Catégories ({filteredCategories.length})
        </h3>

        {filteredCategories.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <span className="material-symbols-outlined text-[48px] text-slate-300">category</span>
            <p className="text-sm font-bold text-slate-800">Aucune catégorie trouvée</p>
            <p className="text-xs text-slate-500">Modifiez la recherche ou créez une nouvelle catégorie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredCategories.map((cat) => {
              const attachedProducts = scopedArticles.filter(
                a => a.famille?.toLowerCase() === cat.nom.toLowerCase() || a.categorie?.toLowerCase() === cat.nom.toLowerCase()
              );
              const isEditing = editingId === cat.id;
              const isExpanded = expandedCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`bg-white border rounded-2xl transition-all shadow-2xs overflow-hidden ${
                    cat.statut === 'Inactif' ? 'border-slate-200 opacity-70 bg-slate-50/50' : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {isEditing ? (
                      <div className="flex-1 w-full flex flex-col sm:flex-row gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Code (Ex: CAT-INFO)"
                          className="w-full sm:w-36 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                          value={editingCode}
                          onChange={(e) => setEditingCode(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Nom de la catégorie"
                          className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          className="flex-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                        />
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleSaveEdit(cat.id)}
                            className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 cursor-pointer"
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            cat.statut === 'Actif' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-200 text-slate-500'
                          }`}>
                            <span className="material-symbols-outlined text-[22px]">category</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {cat.code && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-extrabold border border-slate-200">
                                  {cat.code}
                                </span>
                              )}
                              <h4 className="text-sm font-black text-slate-900">{cat.nom}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                cat.statut === 'Actif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {cat.statut}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {cat.description || 'Aucune description'} — <span className="font-bold text-slate-700">{attachedProducts.length} article(s) rattaché(s)</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                          <button
                            onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                            {isExpanded ? 'Masquer articles' : `Voir articles (${attachedProducts.length})`}
                          </button>

                          <button
                            onClick={() => handleToggleStatus(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              cat.statut === 'Actif'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {cat.statut === 'Actif' ? 'block' : 'check_circle'}
                            </span>
                            {cat.statut === 'Actif' ? 'Désactiver' : 'Activer'}
                          </button>

                          <button
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditingName(cat.nom);
                              setEditingCode(cat.code || '');
                              setEditingDesc(cat.description || '');
                            }}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                            title="Modifier la catégorie"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>

                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Supprimer la catégorie"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Expandable Attached Products */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 border-t border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-extrabold uppercase text-slate-700 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-indigo-600">inventory_2</span>
                          Articles enregistrés dans la catégorie "{cat.nom}" ({attachedProducts.length})
                        </h5>
                      </div>

                      {attachedProducts.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-white rounded-xl border border-slate-200">
                          Aucun produit n'est attribué à cette catégorie dans ce projet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {attachedProducts.map((art) => (
                            <div key={art.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                              <div>
                                <p className="text-xs font-black text-slate-900 truncate">{art.designation}</p>
                                <p className="text-[11px] text-slate-500 font-mono">Ref: {art.code}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-indigo-600">{art.prixVenteHT?.toFixed(3)} DT</p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  art.stock > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  Stock: {art.stock}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
