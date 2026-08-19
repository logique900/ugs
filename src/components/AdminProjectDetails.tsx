import React from 'react';
import { Projet, Vente, Achat, Article, Client, Fournisseur, Utilisateur } from '../types';

interface AdminProjectDetailsProps {
  projet: Projet;
  onClose: () => void;
  onAccessWorkspace: () => void;
  ventes: Vente[];
  achats: Achat[];
  articles: Article[];
  clients: Client[];
  utilisateurs: Utilisateur[];
}

export function AdminProjectDetails({
  projet,
  onClose,
  onAccessWorkspace,
  ventes,
  achats,
  articles,
  clients,
  utilisateurs
}: AdminProjectDetailsProps) {
  // Filtres
  const projectVentes = ventes.filter(v => v.projetId === projet.id);
  const projectAchats = achats.filter(a => a.projetId === projet.id);
  const projectArticles = articles.filter(a => a.projetId === projet.id);
  const projectUsers = utilisateurs.filter(u => u.projetId === projet.id || u.projetsAffectes?.includes(projet.id));

  // Activité
  const caRealise = projectVentes.filter(v => v.statut === 'Payée').reduce((acc, v) => acc + v.montantHT, 0);
  const totalVentes = projectVentes.filter(v => v.statut === 'Payée' || v.statut === 'Facture').length;
  const totalCommandes = projectVentes.filter(v => v.statut === 'Facture').length; // Approximation
  const totalDevis = projectVentes.filter(v => v.statut === 'Devis').length;
  const totalFactures = projectVentes.filter(v => v.statut === 'Payée' || v.statut === 'Facture').length;

  // Produits
  const totalProduits = projectArticles.length;
  const produitsActifs = projectArticles.filter(a => a.statut !== 'Inactif').length;
  const produitsInactifs = projectArticles.filter(a => a.statut === 'Inactif').length;

  // Stock
  const stockTotal = projectArticles.reduce((acc, a) => acc + a.stock, 0);
  const produitsRupture = projectArticles.filter(a => a.stock <= 0).length;
  const produitsFaible = projectArticles.filter(a => a.stock > 0 && a.stock <= (a.stockMinimum || 5)).length;

  // Utilisateurs
  const nbAdmins = projectUsers.filter(u => u.role === 'admin' || u.role === 'chef_projet' || u.role === 'directeur').length;
  const nbComptables = projectUsers.filter(u => u.role === 'comptable').length;
  const nbCaissiers = projectUsers.filter(u => u.role === 'caissier' || u.role === 'agent').length;

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'Active':
      case 'Actif':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold border border-emerald-200">Active</span>;
      case 'Inactive':
      case 'En pause':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold border border-amber-200">Inactive</span>;
      case 'Archivée':
      case 'Archivé':
        return <span className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-bold border border-gray-300">Archivée</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-bold border border-slate-200">{statut}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-display-md text-2xl text-slate-900 font-bold">{projet.nom}</h2>
              {getStatusBadge(projet.statut)}
            </div>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{projet.codeBoutique || 'SANS-CODE'}</span>
              <span>•</span>
              Créée le {projet.dateCreation}
            </p>
          </div>
        </div>
        <button 
          onClick={onAccessWorkspace}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all shrink-0"
        >
          <span className="material-symbols-outlined">launch</span>
          Accéder à l'espace
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Colonne Gauche - Informations & Utilisateurs */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Informations */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-indigo-600">info</span>
                Informations
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Adresse</span>
                  <span className="text-slate-900 font-medium">{projet.adresse || '---'} {projet.ville ? `- ${projet.ville}` : ''}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Téléphone</span>
                  <span className="text-slate-900 font-medium">{projet.telephone || '---'}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Email</span>
                  <span className="text-slate-900 font-medium">{projet.email || '---'}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Responsable</span>
                  <span className="text-slate-900 font-bold">{projet.responsable || '---'}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Statut</span>
                  <div>{getStatusBadge(projet.statut)}</div>
                </div>
              </div>
            </div>

            {/* Utilisateurs */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-indigo-600">group</span>
                Utilisateurs
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600 font-medium text-sm">Administrateurs</span>
                  <span className="font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">{nbAdmins}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600 font-medium text-sm">Comptables</span>
                  <span className="font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">{nbComptables}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600 font-medium text-sm">Caissiers</span>
                  <span className="font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">{nbCaissiers}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Colonne Droite - Activité, Produits, Stock */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Activité */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-emerald-600">trending_up</span>
                Activité
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="col-span-2 md:col-span-1 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="block text-emerald-600 text-[11px] font-bold uppercase tracking-wider mb-1">CA (HT)</span>
                  <span className="text-emerald-700 font-black text-lg">{caRealise.toLocaleString('fr-FR')} DT</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Ventes</span>
                  <span className="text-slate-900 font-black text-xl">{totalVentes}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Commandes</span>
                  <span className="text-slate-900 font-black text-xl">{totalCommandes}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Devis</span>
                  <span className="text-slate-900 font-black text-xl">{totalDevis}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Factures</span>
                  <span className="text-slate-900 font-black text-xl">{totalFactures}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Produits */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                  <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                  Produits
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <span className="text-blue-800 font-bold text-sm">Nombre de produits</span>
                    <span className="font-black text-blue-700 text-lg">{totalProduits}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium text-sm">Produits actifs</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">{produitsActifs}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium text-sm">Produits inactifs</span>
                    <span className="font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{produitsInactifs}</span>
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                  <span className="material-symbols-outlined text-amber-600">shelves</span>
                  Stock
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                    <span className="text-amber-800 font-bold text-sm">Stock total (unités)</span>
                    <span className="font-black text-amber-700 text-lg">{stockTotal.toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium text-sm">Produits en rupture</span>
                    <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100">{produitsRupture}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium text-sm">Produits en stock faible</span>
                    <span className="font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">{produitsFaible}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
