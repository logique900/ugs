import React from 'react';
import { mockUsers, mockVentes, mockArticles, mockAchats, mockClients } from '../data';
import { Projet } from '../types';

interface AdminOverviewProps {
  onSelectProject?: (id: string) => void;
  projets: Projet[];
}

export function AdminOverview({ onSelectProject, projets }: AdminOverviewProps) {
  const totalProjects = projets.length;
  const activeProjects = projets.filter(p => p.statut === 'Actif').length;
  const totalUsers = mockUsers.length;
  const totalCA = mockVentes.filter(v => v.statut === 'Payée').reduce((acc, v) => acc + v.montantHT, 0);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="font-display-sm text-display-sm text-on-surface mb-1">Vue d'ensemble</h2>
          <p className="font-body-md text-on-surface-variant">Vision globale de l'activité sur toutes les boutiques.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-2">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">folder_managed</span>
          </div>
          <span className="text-on-surface-variant font-label-md mt-2">Total Projets</span>
          <span className="text-on-surface font-display-md text-3xl font-bold">{totalProjects}</span>
          <span className="text-primary text-xs font-medium">{activeProjects} boutiques actives</span>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-2">
          <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">group</span>
          </div>
          <span className="text-on-surface-variant font-label-md mt-2">Total Utilisateurs</span>
          <span className="text-on-surface font-display-md text-3xl font-bold">{totalUsers}</span>
          <span className="text-secondary text-xs font-medium">Comptes actifs</span>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-2">
          <div className="w-12 h-12 bg-tertiary/10 text-tertiary rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">payments</span>
          </div>
          <span className="text-on-surface-variant font-label-md mt-2">Chiffre d'Affaires Global</span>
          <span className="text-on-surface font-display-md text-3xl font-bold">{totalCA.toLocaleString('fr-FR')} DT</span>
          <span className="text-tertiary text-xs font-medium">Factures payées</span>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-2">
          <div className="w-12 h-12 bg-error/10 text-error rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">inventory_2</span>
          </div>
          <span className="text-on-surface-variant font-label-md mt-2">Articles au Catalogue</span>
          <span className="text-on-surface font-display-md text-3xl font-bold">{mockArticles.length}</span>
          <span className="text-error text-xs font-medium">Toutes bases confondues</span>
        </div>
      </div>

      {/* Projets & Accès Rapide avec Détails */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm mt-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Projets Actifs & Espaces Métiers</h3>
            <p className="font-body-sm text-on-surface-variant">Cliquez sur une boutique pour ouvrir directement son espace complet et consulter tous ses détails.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projets.map(projet => {
            const ca = mockVentes.filter(v => v.projetId === projet.id && v.statut === 'Payée').reduce((a, v) => a + v.montantHT, 0);
            const clients = mockClients.filter(c => c.projetId === projet.id).length;
            const articles = mockArticles.filter(art => art.projetId === projet.id).length;

            return (
              <div 
                key={projet.id}
                onClick={() => onSelectProject && onSelectProject(projet.id)}
                className="bg-surface-container-low border border-outline-variant hover:border-red-600/60 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg border border-red-200">
                      {projet.statut}
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      {projet.dateCreation}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-on-surface group-hover:text-red-700 transition-colors mb-1 line-clamp-1">
                    {projet.nom}
                  </h4>
                  <p className="text-xs text-on-surface-variant mb-4 line-clamp-2">
                    {projet.description}
                  </p>

                  <div className="space-y-2 text-xs border-t border-outline-variant/60 pt-3">
                    <div className="flex items-center justify-between text-on-surface">
                      <span className="text-on-surface-variant">Responsable:</span>
                      <span className="font-semibold">{projet.responsable}</span>
                    </div>
                    <div className="flex items-center justify-between text-on-surface">
                      <span className="text-on-surface-variant">CA Réalisé:</span>
                      <span className="font-bold text-emerald-600">{ca.toLocaleString('fr-FR')} DT</span>
                    </div>
                    <div className="flex items-center justify-between text-on-surface">
                      <span className="text-on-surface-variant">Volume Tiers & Stock:</span>
                      <span className="font-medium">{clients} clients • {articles} articles</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectProject) onSelectProject(projet.id);
                  }}
                  className="mt-5 w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Ouvrir Espace & Détails du Projet
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

