import React, { useState } from 'react';
import { Utilisateur, Role, Projet } from '../types';
import { mockUsers } from '../data';

interface AdminUsersProps {
  projets: Projet[];
}

export function AdminUsers({ projets }: AdminUsersProps) {
  const [users, setUsers] = useState<Utilisateur[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    nom: string;
    email: string;
    role: Role;
    statut: 'Actif' | 'Inactif';
    projetId: string;
    projetsAffectes: string[];
  }>({
    nom: '',
    email: '',
    role: 'caissier',
    statut: 'Actif',
    projetId: '1',
    projetsAffectes: ['1'],
  });

  const filteredUsers = users.filter(u => {
    const assignedProject = projets.find(p => p.id === u.projetId);
    const search = searchTerm.toLowerCase();
    return u.nom.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search) ||
      u.role.toLowerCase().includes(search) ||
      (assignedProject && assignedProject.nom.toLowerCase().includes(search));
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      nom: '',
      email: '',
      role: 'caissier',
      statut: 'Actif',
      projetId: projets[0]?.id || '1',
      projetsAffectes: [projets[0]?.id || '1'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: Utilisateur) => {
    setEditingUser(user);
    setFormData({
      nom: user.nom,
      email: user.email,
      role: user.role,
      statut: user.statut || 'Actif',
      projetId: user.projetId || '1',
      projetsAffectes: user.projetsAffectes || (user.projetId ? [user.projetId] : []),
    });
    setIsModalOpen(true);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, statut: u.statut === 'Actif' ? 'Inactif' : 'Actif' };
      }
      return u;
    }));
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.email) return;

    const userToSave = {
      ...formData,
      projetsAffectes: (formData.role === 'super_admin' || formData.role === 'admin') ? projets.map(p => p.id) : formData.projetsAffectes,
      projetId: formData.projetsAffectes.length > 0 ? formData.projetsAffectes[0] : formData.projetId
    };

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        ...userToSave
      } : u));
    } else {
      const newUser: Utilisateur = {
        id: `u-${Date.now()}`,
        ...userToSave,
        motDePasse: 'default123'
      };
      setUsers(prev => [newUser, ...prev]);
    }
    setIsModalOpen(false);
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-700 rounded-md text-xs font-bold uppercase tracking-wide border border-indigo-500/20 flex w-fit items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">security</span>
            Super-Admin
          </span>
        );
      case 'admin':
        return (
          <span className="px-2.5 py-1 bg-red-500/10 text-red-700 rounded-md text-xs font-bold uppercase tracking-wide border border-red-500/20 flex w-fit items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">shield_person</span>
            Admin
          </span>
        );
      case 'chef_projet':
        return (
          <span className="px-2.5 py-1 bg-purple-500/10 text-purple-700 rounded-md text-xs font-bold uppercase tracking-wide border border-purple-500/20 flex w-fit items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">manage_accounts</span>
            Chef de Boutique
          </span>
        );
      case 'comptable':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 rounded-md text-xs font-bold uppercase tracking-wide border border-emerald-500/20 flex w-fit items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
            Comptable
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-surface-container-highest text-on-surface-variant rounded-md text-xs font-bold uppercase tracking-wide border border-outline-variant flex w-fit items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">support_agent</span>
            Agent
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="font-display-sm text-display-sm text-on-surface mb-1">Gestion des Utilisateurs & Rôles (MOD-02)</h2>
          <p className="font-body-md text-on-surface-variant">Créez, modifiez et affectez les droits d'accès aux boutiques</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-primary hover:bg-red-700 text-white font-label-md text-label-md py-2.5 px-5 rounded-xl flex items-center gap-2 transition-colors shadow-md shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Nouvel Utilisateur
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest shrink-0">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Rechercher (nom, email, rôle, boutique)..." 
              className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-container-lowest shadow-sm">
              <tr className="border-b border-outline-variant bg-surface-container-low/50">
                <th className="p-4 font-label-sm text-on-surface-variant">Utilisateur</th>
                <th className="p-4 font-label-sm text-on-surface-variant">Rôle & Permissions</th>
                <th className="p-4 font-label-sm text-on-surface-variant">Projet Attribué</th>
                <th className="p-4 font-label-sm text-on-surface-variant">Statut</th>
                <th className="p-4 font-label-sm text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {filteredUsers.map((user) => {
                const assignedProject = projets.find(p => p.id === user.projetId);
                const isActive = (user.statut || 'Actif') === 'Actif';
                
                return (
                  <tr key={user.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-label-lg font-bold shadow-sm ${user.role === 'super_admin' ? 'bg-indigo-700 text-white' : user.role === 'admin' ? 'bg-red-700 text-white' : 'bg-surface-container-highest text-on-surface'}`}>
                          {user.nom.charAt(0)}
                        </div>
                        <div>
                          <p className="font-label-md text-on-surface font-bold">{user.nom}</p>
                          <p className="font-body-sm text-on-surface-variant text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="p-4">
                      {(user.role === 'super_admin' || user.role === 'admin') ? (
                        <span className="text-emerald-700 font-label-sm font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">domain_add</span>
                          Accès Global (Toutes Boutiques)
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-primary">folder</span>
                          <span className="font-label-md text-on-surface font-semibold">{assignedProject?.nom || 'Aucun'}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${isActive ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-600 border border-slate-300'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {user.statut || 'Actif'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                          title="Modifier l'utilisateur"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        {(user.role !== 'super_admin' && user.role !== 'admin') && (
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors" 
                            title="Supprimer l'utilisateur"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant font-body-md">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-6 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div>
                  <h3 className="font-title-lg font-bold text-on-surface">
                    {editingUser ? "Modifier l'Utilisateur" : "Nouvel Utilisateur"}
                  </h3>
                  <p className="text-xs text-on-surface-variant">Rôles, affectations et sécurité ERP</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-container-highest rounded-full text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Nom Complet</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Mohamed Ali"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Adresse Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="Ex: m.ali@ugs-distribution.tn"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Rôle</label>
                  <select 
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as Role;
                      setFormData(prev => ({
                        ...prev,
                        role: newRole,
                        // Si le nouveau rôle est caissier et qu'il a déjà plus d'une boutique, on garde que la première
                        projetsAffectes: (newRole === 'caissier' || newRole === 'agent') && prev.projetsAffectes.length > 1 
                          ? [prev.projetsAffectes[0]] 
                          : prev.projetsAffectes
                      }));
                    }}
                  >
                    <option value="super_admin">Super-Admin</option>
                    <option value="admin">Administrateur</option>
                    <option value="chef_projet">Chef de Boutique</option>
                    <option value="agent">Agent Commercial</option>
                    <option value="caissier">Caissier</option>
                    <option value="comptable">Comptable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Statut</label>
                  <select 
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                    value={formData.statut}
                    onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as 'Actif' | 'Inactif' }))}
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>

              {(formData.role !== 'super_admin' && formData.role !== 'admin') && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-3">Boutiques d'Affectation {formData.role === 'caissier' ? '(Caissier: 1 boutique max)' : ''}</label>
                  <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 max-h-[160px] overflow-y-auto flex flex-col gap-2">
                    {projets.map(p => {
                      const isSelected = formData.projetsAffectes.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-outline-variant shadow-sm hover:shadow-md">
                          <input 
                            type={formData.role === 'caissier' ? "radio" : "checkbox"}
                            name={formData.role === 'caissier' ? "boutique_selection" : undefined}
                            className={`w-4 h-4 text-primary border-outline-variant focus:ring-primary focus:ring-2 ${formData.role === 'caissier' ? 'rounded-full' : 'rounded'}`}
                            checked={isSelected}
                            onChange={(e) => {
                              if (formData.role === 'caissier') {
                                setFormData(prev => ({ ...prev, projetsAffectes: [p.id] }));
                              } else {
                                if (e.target.checked) {
                                  setFormData(prev => ({ ...prev, projetsAffectes: [...prev.projetsAffectes, p.id] }));
                                } else {
                                  setFormData(prev => ({ ...prev, projetsAffectes: prev.projetsAffectes.filter(id => id !== p.id) }));
                                }
                              }
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-on-surface">{p.nom}</span>
                            <span className="text-[10px] text-on-surface-variant font-mono">{p.codeBoutique || 'SANS CODE'}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {formData.projetsAffectes.length === 0 && (
                    <p className="text-[11px] text-error mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      Veuillez sélectionner au moins une boutique
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low rounded-xl"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-red-700 rounded-xl shadow-md"
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
