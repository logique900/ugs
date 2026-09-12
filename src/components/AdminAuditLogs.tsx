import React, { useState } from 'react';
import { AuditLog, Projet } from '../types';
import { mockAuditLogs } from '../data';

interface AdminAuditLogsProps {
  projets: Projet[];
}

export function AdminAuditLogs({ projets }: AdminAuditLogsProps) {
  const [logs] = useState<AuditLog[]>(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.utilisateurNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.utilisateurEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || log.categorie === categoryFilter;
    const matchesProject = projectFilter === 'all' || log.projetId === projectFilter;

    return matchesSearch && matchesCategory && matchesProject;
  });

  const getCategoryBadge = (cat: AuditLog['categorie']) => {
    switch (cat) {
      case 'Sécurité':
        return <span className="px-2.5 py-1 bg-red-500/10 text-red-700 border border-red-500/20 rounded-md font-label-sm text-xs font-bold">Sécurité</span>;
      case 'Financier':
        return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-md font-label-sm text-xs font-bold">Financier</span>;
      case 'Métier':
        return <span className="px-2.5 py-1 bg-blue-500/10 text-blue-700 border border-blue-500/20 rounded-md font-label-sm text-xs font-bold">Métier</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-500/10 text-slate-700 border border-slate-500/20 rounded-md font-label-sm text-xs font-bold">Système</span>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="font-display-sm text-display-sm text-on-surface mb-1">Audit & Traçabilité (MOD-05)</h2>
          <p className="font-body-md text-on-surface-variant">Journalisation complète des actions utilisateurs et événements sensibles</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Journalisation Active
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-lowest shrink-0">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Rechercher par utilisateur, email ou action..." 
              className="w-full pl-11 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              className="border border-outline-variant rounded-xl text-xs font-bold text-on-surface px-3 py-2 bg-surface-container-lowest focus:outline-none focus:border-primary"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Toutes les catégories</option>
              <option value="Sécurité">Sécurité</option>
              <option value="Financier">Financier</option>
              <option value="Métier">Métier</option>
              <option value="Système">Système</option>
            </select>

            <select
              className="border border-outline-variant rounded-xl text-xs font-bold text-on-surface px-3 py-2 bg-surface-container-lowest focus:outline-none focus:border-primary"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">Toutes les boutiques</option>
              {projets.map(p => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-container-lowest shadow-sm">
              <tr className="border-b border-outline-variant bg-surface-container-low/50">
                <th className="p-4 font-label-sm text-on-surface-variant">Date & Heure</th>
                <th className="p-4 font-label-sm text-on-surface-variant">Utilisateur</th>
                <th className="p-4 font-label-sm text-on-surface-variant">Catégorie</th>
                <th className="p-4 font-label-sm text-on-surface-variant">Espace Projet</th>
                <th className="p-4 font-label-sm text-on-surface-variant">Action Effectuée</th>
                <th className="p-4 font-label-sm text-on-surface-variant">Détails / Valeurs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="p-4 font-mono text-xs font-bold text-on-surface-variant whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="p-4">
                    <p className="font-label-md text-on-surface font-bold">{log.utilisateurNom}</p>
                    <p className="font-body-sm text-on-surface-variant text-xs">{log.utilisateurEmail}</p>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {getCategoryBadge(log.categorie)}
                  </td>
                  <td className="p-4 text-xs font-medium text-on-surface whitespace-nowrap">
                    {log.boutiqueNom ? (
                      <span className="flex items-center gap-1.5 text-primary font-bold">
                        <span className="material-symbols-outlined text-[16px]">folder</span>
                        {log.boutiqueNom}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant italic">Système Central</span>
                    )}
                  </td>
                  <td className="p-4 font-body-md text-on-surface font-semibold">
                    {log.action}
                  </td>
                  <td className="p-4 text-xs text-on-surface-variant font-mono">
                    {log.nouvelleValeur && (
                      <span className="bg-emerald-500/10 text-emerald-800 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                        {log.nouvelleValeur}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant font-body-md">
                    Aucun événement d'audit ne correspond à vos filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
