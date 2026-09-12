import React, { useState, useMemo } from 'react';
import { Utilisateur, Role, Projet, UtilisateurPermissions } from '../types';

interface AdminUsersProps {
  projets: Projet[];
  users: Utilisateur[];
  onUsersChange: (users: Utilisateur[]) => void;
  currentUser: Utilisateur | null;
  onSwitchUser?: (user: Utilisateur) => void;
}

export function AdminUsers({ projets, users, onUsersChange, currentUser, onSwitchUser }: AdminUsersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nom' | 'role' | 'date' | 'connexion'>('nom');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [viewingUser, setViewingUser] = useState<Utilisateur | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<Utilisateur | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showTablePasswords, setShowTablePasswords] = useState<{ [key: string]: boolean }>({});
  const [createdCredentialsAlert, setCreatedCredentialsAlert] = useState<{ 
    email: string; 
    pass: string; 
    name: string;
    role: string;
    phone?: string;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Form State for Create/Edit
  const [formData, setFormData] = useState<{
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    motDePasse: string;
    role: Role;
    statut: 'Actif' | 'Inactif';
    projetId: string;
    projetsAffectes: string[];
    permissions: UtilisateurPermissions;
  }>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '+216 ',
    motDePasse: '',
    role: 'caissier',
    statut: 'Actif',
    projetId: projets[0]?.id || '1',
    projetsAffectes: [projets[0]?.id || '1'],
    permissions: {
      peutAccorderRemise: false,
      peutModifierPrix: false,
      peutSupprimerDocuments: false,
      peutVoirMarge: false,
      peutCloturerCaisse: true,
    }
  });

  // Guard: Exclusive to Super Admin
  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200 m-6 max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Accès Réservé au Super-Administrateur</h3>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Le module de gestion globale des utilisateurs, des habilitations et des accès réseau est strictement réservé au Super Administrateur de <strong>SOCIETE UNIVERS GSM DE SUD</strong>.
        </p>
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-mono text-xs rounded-xl border border-slate-200">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Votre rôle actuel : {currentUser?.role || 'Non spécifié'}
        </span>
      </div>
    );
  }

  // Password Generator
  const generateSecurePassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    const specials = '!@#$%&*';
    let pass = 'Ugs';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += specials.charAt(Math.floor(Math.random() * specials.length));
    return pass;
  };

  // KPI Calculations
  const totalUsers = users.length;
  const activeUsers = users.filter(u => (u.statut || 'Actif') === 'Actif').length;
  const inactiveUsers = totalUsers - activeUsers;
  const adminCount = users.filter(u => u.role === 'super_admin' || u.role === 'admin').length;
  const storeStaffCount = users.filter(u => u.role === 'caissier' || u.role === 'chef_projet').length;
  const financialStaffCount = users.filter(u => u.role === 'comptable' || u.role === 'agent').length;

  // Filter and Sort Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Text search
      const search = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        u.nom.toLowerCase().includes(search) ||
        (u.prenom && u.prenom.toLowerCase().includes(search)) ||
        u.email.toLowerCase().includes(search) ||
        (u.telephone && u.telephone.toLowerCase().includes(search)) ||
        u.role.toLowerCase().includes(search);

      // Role filter
      const matchRole = roleFilter === 'all' || u.role === roleFilter;

      // Project filter
      let matchProject = true;
      if (projectFilter !== 'all') {
        if (projectFilter === 'multi') {
          matchProject = (u.projetsAffectes && u.projetsAffectes.length > 1) || u.role === 'super_admin';
        } else {
          matchProject = u.role === 'super_admin' || 
            (u.projetsAffectes && u.projetsAffectes.includes(projectFilter)) || 
            u.projetId === projectFilter;
        }
      }

      // Status filter
      const currentStatut = u.statut || 'Actif';
      const matchStatus = statusFilter === 'all' || currentStatut === statusFilter;

      return matchSearch && matchRole && matchProject && matchStatus;
    }).sort((a, b) => {
      if (sortBy === 'nom') {
        return a.nom.localeCompare(b.nom);
      }
      if (sortBy === 'role') {
        return a.role.localeCompare(b.role);
      }
      if (sortBy === 'date') {
        return (b.dateCreation || '').localeCompare(a.dateCreation || '');
      }
      if (sortBy === 'connexion') {
        return (b.derniereConnexion || '').localeCompare(a.derniereConnexion || '');
      }
      return 0;
    });
  }, [users, searchTerm, roleFilter, projectFilter, statusFilter, sortBy]);

  // Handle Opening Create Modal
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setShowPassword(false);
    const pass = generateSecurePassword();

    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '+216 ',
      motDePasse: pass,
      role: 'caissier',
      statut: 'Actif',
      projetId: projets[0]?.id || '1',
      projetsAffectes: [projets[0]?.id || '1'],
      permissions: {
        peutAccorderRemise: false,
        peutModifierPrix: false,
        peutSupprimerDocuments: false,
        peutVoirMarge: false,
        peutCloturerCaisse: true,
      }
    });
    setIsModalOpen(true);
  };

  // Handle Opening Edit Modal
  const handleOpenEditModal = (user: Utilisateur) => {
    setEditingUser(user);
    setShowPassword(false);
    setFormData({
      nom: user.nom,
      prenom: user.prenom || '',
      email: user.email,
      telephone: user.telephone || '+216 ',
      motDePasse: user.motDePasse || '',
      role: user.role,
      statut: user.statut || 'Actif',
      projetId: user.projetId || '1',
      projetsAffectes: user.projetsAffectes || (user.projetId ? [user.projetId] : ['1']),
      permissions: user.permissions || {
        peutAccorderRemise: user.role === 'super_admin' || user.role === 'admin',
        peutModifierPrix: user.role === 'super_admin' || user.role === 'admin',
        peutSupprimerDocuments: user.role === 'super_admin',
        peutVoirMarge: user.role !== 'caissier',
        peutCloturerCaisse: user.role === 'caissier' || user.role === 'chef_projet',
      }
    });
    setIsModalOpen(true);
  };

  // Toggle user status active/inactive
  const toggleUserStatus = (id: string) => {
    if (id === currentUser?.id) {
      alert("Vous ne pouvez pas désactiver votre propre compte Super-Admin actif.");
      return;
    }
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, statut: (u.statut === 'Actif' ? 'Inactif' : 'Actif') as 'Actif' | 'Inactif' };
      }
      return u;
    });
    onUsersChange(updated);
  };

  // Delete User
  const handleDeleteUser = (user: Utilisateur) => {
    if (user.id === currentUser?.id) {
      alert("Action refusée : Vous ne pouvez pas supprimer votre propre compte Super-Administrateur connecté.");
      return;
    }
    const remainingSuperAdmins = users.filter(u => u.role === 'super_admin' && u.id !== user.id);
    if (user.role === 'super_admin' && remainingSuperAdmins.length === 0) {
      alert("Action refusée : Le système doit conserver au moins un Super-Administrateur actif.");
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${user.nom} (${user.email}) ? Cette action révoquera immédiatement tous ses accès.`)) {
      const updated = users.filter(u => u.id !== user.id);
      onUsersChange(updated);
    }
  };

  // Save User (Create or Update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.email || !formData.motDePasse) return;

    // Enforce business rules per role
    const finalProjetsAffectes = formData.role === 'super_admin' 
      ? projets.map(p => p.id) 
      : formData.role === 'admin' 
        ? ['1'] 
        : formData.projetsAffectes.length > 0 ? formData.projetsAffectes : ['1'];

    const finalProjetId = formData.role === 'admin' 
      ? '1' 
      : finalProjetsAffectes[0] || formData.projetId || '1';

    const userToSave: Partial<Utilisateur> = {
      nom: formData.nom.trim(),
      prenom: formData.prenom.trim() || undefined,
      email: formData.email.trim().toLowerCase(),
      telephone: formData.telephone.trim() || undefined,
      motDePasse: formData.motDePasse,
      role: formData.role,
      statut: formData.statut,
      projetId: finalProjetId,
      projetsAffectes: finalProjetsAffectes,
      permissions: formData.permissions,
    };

    if (editingUser) {
      const updated = users.map(u => u.id === editingUser.id ? { ...u, ...userToSave } : u);
      onUsersChange(updated);
      setCreatedCredentialsAlert({
        email: userToSave.email!,
        pass: userToSave.motDePasse!,
        name: userToSave.nom!,
        role: getRoleLabel(userToSave.role!),
        phone: userToSave.telephone
      });
    } else {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const newUser: Utilisateur = {
        id: `u-${Date.now()}`,
        dateCreation: dateStr,
        derniereConnexion: 'Jamais connecté',
        ...(userToSave as Utilisateur)
      };
      onUsersChange([newUser, ...users]);
      setCreatedCredentialsAlert({
        email: newUser.email,
        pass: newUser.motDePasse || '',
        name: newUser.nom,
        role: getRoleLabel(newUser.role),
        phone: newUser.telephone
      });
    }
    setIsModalOpen(false);
  };

  // Quick Password Reset
  const handleQuickPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser || !resetPasswordInput) return;

    const updated = users.map(u => u.id === passwordResetUser.id ? { ...u, motDePasse: resetPasswordInput } : u);
    onUsersChange(updated);
    setCreatedCredentialsAlert({
      email: passwordResetUser.email,
      pass: resetPasswordInput,
      name: passwordResetUser.nom,
      role: getRoleLabel(passwordResetUser.role),
      phone: passwordResetUser.telephone
    });
    setPasswordResetUser(null);
    setResetPasswordInput('');
  };

  const copyCredentialsToClipboard = () => {
    if (!createdCredentialsAlert) return;
    const text = `SOCIETE UNIVERS GSM DE SUD - Identifiants d'accès ERP\n` +
      `Collaborateur : ${createdCredentialsAlert.name}\n` +
      `Email : ${createdCredentialsAlert.email}\n` +
      `Mot de passe : ${createdCredentialsAlert.pass}\n` +
      `Rôle : ${createdCredentialsAlert.role}\n` +
      `Lien d'accès : https://ais-dev-w6rfiawbhq5cm6ru3ygfed-199179289761.europe-west3.run.app\n` +
      `Merci de modifier votre mot de passe lors de votre première connexion.`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Export Users to CSV
  const handleExportCSV = () => {
    const headers = ['Nom & Prénom', 'Email', 'Téléphone', 'Rôle', 'Boutiques Affectées', 'Statut', 'Dernière Connexion', 'Date Création'];
    const rows = filteredUsers.map(u => {
      const boutiqueNames = u.role === 'super_admin' 
        ? 'Réseau Global (Toutes)' 
        : (u.projetsAffectes || [u.projetId]).map(pid => projets.find(p => p.id === pid)?.nom || pid).join(', ');
      return [
        `"${u.nom} ${u.prenom || ''}".trim()`,
        `"${u.email}"`,
        `"${u.telephone || ''}"`,
        `"${getRoleLabel(u.role)}"`,
        `"${boutiqueNames}"`,
        `"${u.statut || 'Actif'}"`,
        `"${u.derniereConnexion || 'N/A'}"`,
        `"${u.dateCreation || 'N/A'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `utilisateurs_univers_gsm_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'super_admin': return 'Super-Admin (Total Réseau)';
      case 'admin': return 'Admin Société UGS (Dépôt Central)';
      case 'chef_projet': return 'Chef de Boutique';
      case 'comptable': return 'Comptabilité & Finances';
      case 'caissier': return 'Caissier Point de Vente';
      case 'agent': return 'Agent Commercial';
      default: return role;
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-indigo-200 flex w-fit items-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-indigo-600">security</span>
            Super-Admin (Total)
          </span>
        );
      case 'admin':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold uppercase tracking-wider border border-amber-300 flex w-fit items-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-amber-700">warehouse</span>
            Admin Dépôt UGS
          </span>
        );
      case 'chef_projet':
        return (
          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-purple-200 flex w-fit items-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-purple-600">store</span>
            Chef de Boutique
          </span>
        );
      case 'comptable':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-emerald-200 flex w-fit items-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-emerald-600">account_balance</span>
            Comptabilité
          </span>
        );
      case 'caissier':
        return (
          <span className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-sky-200 flex w-fit items-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-sky-600">point_of_sale</span>
            Caissier POS
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200 flex w-fit items-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-slate-600">support_agent</span>
            Agent Commercial
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header with Enterprise Branding */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Gestion des Utilisateurs & Accès Réseau</h2>
            <span className="bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              Super-Admin Exclusif
            </span>
            <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-slate-200">
              SOCIETE UNIVERS GSM DE SUD
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
            Créez et configurez les comptes des collaborateurs, assignez les boutiques autorisées (Dépôt Central Société UGS, Boutique Scolaire Plus, Boutique Gabès) et gérez les droits de sécurité.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            title="Exporter la liste des utilisateurs en CSV"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          
          <button 
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer text-xs"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Créer un Utilisateur
          </button>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Effectif Total</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalUsers}</span>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {activeUsers} actifs
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Gouvernance & Dépôt</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{adminCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Direction & UGS</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
            <span className="material-symbols-outlined text-2xl">point_of_sale</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Boutiques & Caisse</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{storeStaffCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Points de vente</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <span className="material-symbols-outlined text-2xl">account_balance</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Finance & Commercial</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{financialStaffCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Compta & Agents</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Card after user creation or password reset */}
      {createdCredentialsAlert && (
        <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
            <div>
              <h4 className="font-black text-sm text-emerald-950">Compte Enregistré avec Succès !</h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Transmettez ces identifiants d'accès à <strong>{createdCredentialsAlert.name}</strong> ({createdCredentialsAlert.role}) :
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-mono">
                <span className="text-slate-600">Email : <strong className="text-slate-900 select-all">{createdCredentialsAlert.email}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">Mot de passe : <strong className="text-indigo-700 select-all font-bold">{createdCredentialsAlert.pass}</strong></span>
                {createdCredentialsAlert.phone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">Tél : <strong className="text-slate-900">{createdCredentialsAlert.phone}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button 
              onClick={copyCredentialsToClipboard}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copySuccess ? 'done' : 'content_copy'}
              </span>
              {copySuccess ? 'Identifiants Copiés !' : 'Copier pour SMS/WhatsApp'}
            </button>
            <button 
              onClick={() => setCreatedCredentialsAlert(null)}
              className="p-1.5 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
              title="Fermer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filters and Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Rechercher par nom, email, tél, rôle..." 
                className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-2xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600 shadow-2xs"
            >
              <option value="all">Tous les rôles</option>
              <option value="super_admin">Super-Admin (Total)</option>
              <option value="admin">Admin Dépôt UGS</option>
              <option value="chef_projet">Chef de Boutique</option>
              <option value="comptable">Comptabilité</option>
              <option value="caissier">Caissier POS</option>
              <option value="agent">Agent Commercial</option>
            </select>

            {/* Project/Store Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600 shadow-2xs"
            >
              <option value="all">Toutes les affectations</option>
              <option value="1">Société UGS (Dépôt Central)</option>
              <option value="2">Boutique Scolaire Plus</option>
              <option value="3">Boutique Gabès Sud</option>
              <option value="multi">Multi-Boutiques / Réseau</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600 shadow-2xs"
            >
              <option value="all">Tous statuts</option>
              <option value="Actif">Comptes Actifs</option>
              <option value="Inactif">Comptes Inactifs (Bloqués)</option>
            </select>

            {/* Reset Filters */}
            {(searchTerm || roleFilter !== 'all' || projectFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setProjectFilter('all');
                  setStatusFilter('all');
                }}
                className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1"
                title="Effacer les filtres"
              >
                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                Effacer
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-bold">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600 shadow-2xs"
            >
              <option value="nom">Nom (A-Z)</option>
              <option value="role">Rôle hiérarchique</option>
              <option value="connexion">Dernière connexion</option>
              <option value="date">Date de création</option>
            </select>
            <div className="text-xs font-bold text-slate-400 pl-2 border-l border-slate-200">
              {filteredUsers.length} trouvé(s)
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[980px] text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-xs border-b border-slate-200">
              <tr className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Collaborateur & Contact</th>
                <th className="py-3 px-4">Rôle & Espace</th>
                <th className="py-3 px-4">Affectations Boutiques</th>
                <th className="py-3 px-4">Permissions Clés</th>
                <th className="py-3 px-4">Mot de Passe</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isActive = (user.statut || 'Actif') === 'Actif';
                const isTablePassVisible = showTablePasswords[user.id] || false;
                const isCurrentLoggedIn = user.id === currentUser?.id;
                
                // Color palette for avatar
                const getAvatarStyle = () => {
                  switch (user.role) {
                    case 'super_admin': return 'bg-indigo-600 text-white';
                    case 'admin': return 'bg-amber-600 text-white';
                    case 'chef_projet': return 'bg-purple-600 text-white';
                    case 'comptable': return 'bg-emerald-600 text-white';
                    case 'caissier': return 'bg-sky-600 text-white';
                    default: return 'bg-slate-600 text-white';
                  }
                };

                return (
                  <tr key={user.id} className={`hover:bg-slate-50/80 transition-colors ${isCurrentLoggedIn ? 'bg-indigo-50/20' : ''}`}>
                    {/* Collaborator info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-xs shrink-0 ${getAvatarStyle()}`}>
                          {user.nom.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs text-slate-900 truncate">
                              {user.nom} {user.prenom ? `(${user.prenom})` : ''}
                            </p>
                            {isCurrentLoggedIn && (
                              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-1.5 py-0.2 rounded border border-indigo-200">
                                Vous
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-[11px] mt-0.5">
                            <span className="font-mono text-indigo-600 truncate">{user.email}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(user.email);
                                alert(`Email copié : ${user.email}`);
                              }}
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Copier l'adresse email"
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            </button>
                          </div>

                          {user.telephone && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                              <span className="material-symbols-outlined text-[12px]">phone</span>
                              {user.telephone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <div>
                        {getRoleBadge(user.role)}
                        <p className="text-[10px] text-slate-400 mt-1 pl-1">
                          {user.role === 'super_admin' ? 'Contrôle complet' :
                           user.role === 'admin' ? 'Gestion centrale UGS' :
                           user.role === 'chef_projet' ? 'Gestion point de vente' :
                           user.role === 'comptable' ? 'Consultation & règlements' :
                           user.role === 'caissier' ? 'Encaissement & clôture' : 'Devis & commandes'}
                        </p>
                      </div>
                    </td>

                    {/* Store assignments */}
                    <td className="py-3.5 px-4">
                      {user.role === 'super_admin' ? (
                        <span className="text-indigo-700 font-bold text-xs bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-200 inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">domain</span>
                          Réseau Global (Toutes)
                        </span>
                      ) : user.role === 'admin' ? (
                        <span className="text-amber-800 font-bold text-xs bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">warehouse</span>
                          Société UGS (Dépôt Seul)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {(user.projetsAffectes || [user.projetId || '1']).map(pid => {
                            const prj = projets.find(p => p.id === pid);
                            return (
                              <span key={pid} className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200 font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs">
                                <span className="material-symbols-outlined text-[13px] text-primary">storefront</span>
                                {prj?.nom || `Boutique ${pid}`}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Permissions tags */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[190px]">
                        {user.permissions?.peutAccorderRemise && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold border border-slate-200" title="Peut accorder des remises">
                            Remise %
                          </span>
                        )}
                        {user.permissions?.peutModifierPrix && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold border border-slate-200" title="Peut modifier les prix unitaires">
                            Prix Vente
                          </span>
                        )}
                        {user.permissions?.peutVoirMarge && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-200" title="Peut voir le coût d'achat et les marges">
                            Marges HT
                          </span>
                        )}
                        {user.permissions?.peutCloturerCaisse && (
                          <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded text-[10px] font-bold border border-sky-200" title="Peut clôturer et valider la caisse">
                            Clôture Caisse
                          </span>
                        )}
                        {user.permissions?.peutSupprimerDocuments && (
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-bold border border-rose-200" title="Peut supprimer des documents">
                            Suppression
                          </span>
                        )}
                        {!user.permissions?.peutAccorderRemise && 
                         !user.permissions?.peutModifierPrix && 
                         !user.permissions?.peutVoirMarge && 
                         !user.permissions?.peutCloturerCaisse && (
                          <span className="text-[11px] text-slate-400 italic">Accès standard</span>
                        )}
                      </div>
                    </td>

                    {/* Password */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                          {isTablePassVisible ? (user.motDePasse || '••••••••') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTablePasswords(prev => ({
                              ...prev,
                              [user.id]: !prev[user.id]
                            }));
                          }}
                          className="p-1 hover:bg-slate-200 text-slate-500 rounded-md transition-colors cursor-pointer"
                          title={isTablePassVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isTablePassVisible ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordResetUser(user);
                            setResetPasswordInput(generateSecurePassword());
                          }}
                          className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-md transition-colors cursor-pointer"
                          title="Réinitialiser le mot de passe"
                        >
                          <span className="material-symbols-outlined text-[16px]">key</span>
                        </button>
                      </div>
                    </td>

                    {/* Status & Last Login */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 w-fit ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Cliquer pour changer le statut (Actif / Inactif)"
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {isActive ? 'Actif' : 'Bloqué'}
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono pl-1">
                          {user.derniereConnexion || 'Connexion récente'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Impersonate / Test Session button */}
                        {onSwitchUser && (
                          <button
                            onClick={() => {
                              if (confirm(`Voulez-vous basculer sur la session de ${user.nom} (${getRoleLabel(user.role)}) pour tester son interface et ses permissions ?`)) {
                                onSwitchUser(user);
                              }
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Tester la session (Se connecter sous ce profil)"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </button>
                        )}

                        {/* View User Card */}
                        <button 
                          onClick={() => setViewingUser(user)}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" 
                          title="Voir la fiche détaillée"
                        >
                          <span className="material-symbols-outlined text-[18px]">info</span>
                        </button>

                        {/* Edit User */}
                        <button 
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                          title="Modifier l'utilisateur"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>

                        {/* Delete User */}
                        {user.id !== currentUser?.id && (
                          <button 
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                            title="Supprimer cet utilisateur"
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
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-2xl">person_search</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">Aucun utilisateur trouvé</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Modifiez vos critères de recherche ou réinitialisez les filtres.
                      </p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setRoleFilter('all');
                          setProjectFilter('all');
                          setStatusFilter('all');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                      >
                        Réinitialiser tous les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in my-8">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                  <span className="material-symbols-outlined text-[22px]">
                    {editingUser ? 'edit' : 'person_add'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingUser ? `Modifier : ${editingUser.nom}` : "Créer un Nouvel Utilisateur"}
                  </h3>
                  <p className="text-xs text-indigo-300">
                    SOCIETE UNIVERS GSM DE SUD • Gestion des accès & permissions
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto">
              {/* Section 1: Personal info & contact */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">badge</span>
                  1. Informations Personnelles & Contact
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nom Complet *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Ben Salah"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      value={formData.nom}
                      onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Prénom</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Anis"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      value={formData.prenom}
                      onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email de Connexion *</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">mail</span>
                      <input 
                        type="email" 
                        required
                        placeholder="Ex: anis.bensalah@univers-gsm.tn"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone Mobile (Tunisie)</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">phone</span>
                      <input 
                        type="text" 
                        placeholder="+216 98 000 000"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                        value={formData.telephone}
                        onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Password & Authentication */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-indigo-600">lock</span>
                    2. Sécurité & Mot de Passe d'Accès
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newPass = generateSecurePassword();
                      setFormData(prev => ({ ...prev, motDePasse: newPass }));
                      setShowPassword(true);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">autorenew</span>
                    Générer mot de passe fort
                  </button>
                </div>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">key</span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="Mot de passe sécurisé"
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                    value={formData.motDePasse}
                    onChange={(e) => setFormData(prev => ({ ...prev, motDePasse: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Section 3: Role and Store assignment */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">domain</span>
                  3. Rôle & Affectations Réseau
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Rôle dans l'ERP *</label>
                    <select 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as Role;
                        setFormData(prev => ({
                          ...prev,
                          role: newRole,
                          projetsAffectes: newRole === 'admin'
                            ? ['1']
                            : (newRole === 'caissier' || newRole === 'agent') && prev.projetsAffectes.length > 1 
                              ? [prev.projetsAffectes[0]] 
                              : prev.projetsAffectes,
                          projetId: newRole === 'admin' ? '1' : prev.projetId,
                          // Pre-adjust permissions based on role
                          permissions: {
                            peutAccorderRemise: newRole === 'super_admin' || newRole === 'admin' || newRole === 'chef_projet',
                            peutModifierPrix: newRole === 'super_admin' || newRole === 'admin',
                            peutSupprimerDocuments: newRole === 'super_admin',
                            peutVoirMarge: newRole !== 'caissier',
                            peutCloturerCaisse: newRole === 'caissier' || newRole === 'chef_projet',
                          }
                        }));
                      }}
                    >
                      <option value="super_admin">Super-Admin (Total Réseau & Finances)</option>
                      <option value="admin">Administrateur Dépôt Central (Société UGS Seul)</option>
                      <option value="chef_projet">Chef de Boutique / Responsable Point de Vente</option>
                      <option value="comptable">Comptable (Finances, Factures & Grand Livre)</option>
                      <option value="caissier">Caissier POS (Point de Vente)</option>
                      <option value="agent">Agent Commercial Terrain</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Statut d'Accès</label>
                    <select 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                      value={formData.statut}
                      onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as any }))}
                    >
                      <option value="Actif">Actif (Connexion autorisée)</option>
                      <option value="Inactif">Inactif / Suspendu (Accès bloqué)</option>
                    </select>
                  </div>
                </div>

                {/* Role explanations */}
                {formData.role === 'admin' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warehouse</span>
                    <div>
                      <span className="font-bold block text-amber-950">Affectation exclusive à Société UGS (Dépôt Central)</span>
                      <span className="text-amber-800 leading-relaxed text-[11px]">
                        L'administrateur est strictement rattaché au Dépôt Central (Société UGS). Il gère les achats, stocks de gros, factures et livraisons aux boutiques sans accès aux statistiques globales du groupe.
                      </span>
                    </div>
                  </div>
                )}

                {formData.role === 'super_admin' && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-indigo-600 text-[20px] shrink-0 mt-0.5">verified_user</span>
                    <div>
                      <span className="font-bold block text-indigo-950">Accès Réseau Total Automatique</span>
                      <span className="text-indigo-800 leading-relaxed text-[11px]">
                        Le Super-Administrateur dispose d'un accès sans restriction à l'ensemble des boutiques, des stocks consolidés, de la gestion des utilisateurs et des paramètres fiscaux.
                      </span>
                    </div>
                  </div>
                )}

                {/* Store checkboxes if not super_admin and not admin */}
                {formData.role !== 'super_admin' && formData.role !== 'admin' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Boutiques et Dépôts Autorisés *
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-2">
                      {projets.map(p => {
                        const isSelected = formData.projetsAffectes.includes(p.id);
                        return (
                          <label key={p.id} className="flex items-center gap-3 p-2 bg-white rounded-lg cursor-pointer hover:bg-slate-50 transition-colors border border-slate-200">
                            <input 
                              type={formData.role === 'caissier' ? "radio" : "checkbox"}
                              name={formData.role === 'caissier' ? "boutique_selection" : undefined}
                              className={`w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600 ${formData.role === 'caissier' ? 'rounded-full' : 'rounded'}`}
                              checked={isSelected}
                              onChange={(e) => {
                                if (formData.role === 'caissier') {
                                  setFormData(prev => ({ ...prev, projetsAffectes: [p.id], projetId: p.id }));
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
                              <span className="text-xs font-bold text-slate-900">{p.nom}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.codeBoutique || 'BOUTIQUE'}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Granular Permissions Matrix */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">tune</span>
                  4. Habilitations & Permissions Spéciales
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-colors">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                      checked={formData.permissions.peutAccorderRemise || false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, peutAccorderRemise: e.target.checked }
                      }))}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Accorder des Remises</span>
                      <span className="text-[10px] text-slate-500">Autorise les remises en % ou valeur</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-colors">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                      checked={formData.permissions.peutModifierPrix || false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, peutModifierPrix: e.target.checked }
                      }))}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Modifier les Prix de Vente</span>
                      <span className="text-[10px] text-slate-500">Modification libre des prix au comptoir</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-colors">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                      checked={formData.permissions.peutVoirMarge || false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, peutVoirMarge: e.target.checked }
                      }))}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Voir Marges & Coûts d'Achat</span>
                      <span className="text-[10px] text-slate-500">Affichage des marges bénéficiaires</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-colors">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                      checked={formData.permissions.peutCloturerCaisse || false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, peutCloturerCaisse: e.target.checked }
                      }))}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Clôturer la Caisse Journalière</span>
                      <span className="text-[10px] text-slate-500">Validation des arrêts de caisse</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-colors sm:col-span-2">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-600"
                      checked={formData.permissions.peutSupprimerDocuments || false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, peutSupprimerDocuments: e.target.checked }
                      }))}
                    />
                    <div>
                      <span className="text-xs font-bold text-rose-900 block">Supprimer des Pièces Commerciales (Devis / Bons)</span>
                      <span className="text-[10px] text-slate-500">Réservé habituellement à la direction</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {editingUser ? "Enregistrer les Modifications" : "Créer le Compte Utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Password Reset */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">key</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Réinitialiser le Mot de Passe</h3>
                  <p className="text-[11px] text-slate-400">{passwordResetUser.nom}</p>
                </div>
              </div>
              <button 
                onClick={() => setPasswordResetUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleQuickPasswordReset} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nouveau Mot de Passe Temporaire</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:border-indigo-600"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setResetPasswordInput(generateSecurePassword())}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    Régénérer
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ce mot de passe permettra à l'utilisateur de se connecter immédiatement.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button 
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm cursor-pointer"
                >
                  Valider le Mot de Passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View User Details */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {viewingUser.nom.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base">{viewingUser.nom}</h3>
                  <p className="text-xs text-indigo-300">{viewingUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-bold">Rôle ERP :</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{getRoleLabel(viewingUser.role)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Statut du Compte :</span>
                  <span className={`inline-flex items-center gap-1 font-bold mt-0.5 ${viewingUser.statut === 'Inactif' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${viewingUser.statut === 'Inactif' ? 'bg-rose-600' : 'bg-emerald-600'}`}></span>
                    {viewingUser.statut || 'Actif'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Téléphone :</span>
                  <span className="font-mono text-slate-800 font-bold mt-0.5 block">{viewingUser.telephone || 'Non renseigné'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Dernière Connexion :</span>
                  <span className="font-mono text-slate-800 font-bold mt-0.5 block">{viewingUser.derniereConnexion || 'Jamais'}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1.5">Boutiques et Dépôts Rattachés :</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingUser.role === 'super_admin' ? (
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 font-bold text-xs">
                      Réseau Global • Toutes les boutiques
                    </span>
                  ) : (
                    (viewingUser.projetsAffectes || [viewingUser.projetId || '1']).map(pid => {
                      const prj = projets.find(p => p.id === pid);
                      return (
                        <span key={pid} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-200 font-semibold text-xs">
                          {prj?.nom || `Boutique ${pid}`}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setViewingUser(null);
                    handleOpenEditModal(viewingUser);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 cursor-pointer"
                >
                  Modifier ce Compte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
