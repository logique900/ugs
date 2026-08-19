import React, { useState, useMemo } from 'react';
import {  Reglement, Projet, Vente, Achat, Client, Fournisseur , Utilisateur } from '../types';
import { generateReceiptPdf } from '../utils/pdfExportEngine';

interface CaisseProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  reglements: Reglement[];
  projets: Projet[];
  ventes: Vente[];
  achats: Achat[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  onReglementsChange: (reglements: Reglement[]) => void;
}

export function Caisse({
  selectedProjectId,
  reglements,
  projets,
  ventes,
  achats,
  clients,
  fournisseurs,
  onReglementsChange
}: CaisseProps) {
  const [filterType, setFilterType] = useState<'all' | 'Encaissement' | 'Décaissement'>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal: New Cash Movement
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newType, setNewType] = useState<'Encaissement' | 'Décaissement'>('Encaissement');
  const [newTierType, setNewTierType] = useState<'Client' | 'Fournisseur' | 'Autre'>('Client');
  const [newTierId, setNewTierId] = useState('');
  const [newMontant, setNewMontant] = useState<number>(0);
  const [newMode, setNewMode] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Espèces');
  const [newBanque, setNewBanque] = useState('Caisse Centrale');
  const [newRef, setNewRef] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);
  const isProjectActive = currentProject ? (currentProject.statut === 'Active' || currentProject.statut === 'Actif') : true;

  // Scoped Reglements
  const scopedReglements = useMemo(() => {
    return isGlobal ? reglements : reglements.filter(r => r.projetId === selectedProjectId);
  }, [reglements, isGlobal, selectedProjectId]);

  // Scoped Clients / Suppliers
  const scopedClients = useMemo(() => isGlobal ? clients : clients.filter(c => c.projetId === selectedProjectId), [clients, isGlobal, selectedProjectId]);
  const scopedFournisseurs = useMemo(() => isGlobal ? fournisseurs : fournisseurs.filter(f => f.projetId === selectedProjectId), [fournisseurs, isGlobal, selectedProjectId]);

  // Filtered List
  const filteredReglements = useMemo(() => {
    return scopedReglements.filter(r => {
      const matchesSearch = r.numeroPiece.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.tierNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (r.documentRef && r.documentRef.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || r.type === filterType;
      const matchesMode = filterMode === 'all' || r.modePaiement === filterMode;
      return matchesSearch && matchesType && matchesMode;
    });
  }, [scopedReglements, searchTerm, filterType, filterMode]);

  // Financial Totals
  const totalEncaissements = scopedReglements.filter(r => r.type === 'Encaissement').reduce((a, r) => a + r.montant, 0);
  const totalDecaissements = scopedReglements.filter(r => r.type === 'Décaissement').reduce((a, r) => a + r.montant, 0);
  const soldeNetCaisse = totalEncaissements - totalDecaissements;

  // Open Create
  const handleOpenCreate = () => {
    setNewType('Encaissement');
    setNewTierType('Client');
    setNewTierId(scopedClients[0]?.id || '');
    setNewMontant(0);
    setNewMode('Espèces');
    setNewBanque('Caisse Centrale');
    setNewRef(`PC-${Date.now().toString().slice(-4)}`);
    setNewNotes('Opération de trésorerie courante');
    setIsModalOpen(true);
  };

  // Submit Create
  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMontant <= 0) return;

    let tierNom = 'Divers';
    if (newTierType === 'Client') {
      const c = scopedClients.find(cli => cli.id === newTierId);
      if (c) tierNom = c.nom;
    } else if (newTierType === 'Fournisseur') {
      const f = scopedFournisseurs.find(fou => fou.id === newTierId);
      if (f) tierNom = f.nom;
    }

    const year = new Date().getFullYear();
    const count = reglements.length + 1;
    const prefix = newType === 'Encaissement' ? 'ENC' : 'DEC';
    const numeroPiece = `${prefix}-${year}-${count.toString().padStart(4, '0')}`;

    const newReg: Reglement = {
      id: `reg-${Date.now()}`,
      projetId: isGlobal ? (projets[0]?.id || 'p1') : selectedProjectId,
      numeroPiece,
      type: newType,
      tierId: newTierId,
      tierNom,
      tierType: newTierType,
      date: new Date().toISOString().split('T')[0],
      montant: newMontant,
      modePaiement: newMode,
      banque: newBanque,
      referencePaiement: newRef,
      notes: newNotes,
      statut: 'Validé'
    };

    onReglementsChange([newReg, ...reglements]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Caisse & Trésorerie</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Journal des encaissements et décaissements, reçus de paiement PDF et suivi du solde
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Payment (Encaissement) */}
          <button
            onClick={() => {
              setNewType('Encaissement');
              setNewTierType('Client');
              setNewTierId(scopedClients[0]?.id || '');
              setNewMontant(0);
              setNewMode('Espèces');
              setNewBanque('Caisse Centrale');
              setNewRef(`ENC-${Date.now().toString().slice(-4)}`);
              setNewNotes('Encaissement client au comptant');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            title="Encaisser un règlement client (Bouton Paiement)"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            Bouton Paiement
          </button>

          {/* Quick Décaissement */}
          <button
            onClick={() => {
              setNewType('Décaissement');
              setNewTierType('Fournisseur');
              setNewTierId(scopedFournisseurs[0]?.id || '');
              setNewMontant(0);
              setNewMode('Virement');
              setNewBanque('BIAT');
              setNewRef(`DEC-${Date.now().toString().slice(-4)}`);
              setNewNotes('Décaissement fournisseur / charge');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            title="Effectuer un décaissement (Paiement Fournisseur/Charge)"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            Décaissement
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouveau Mouvement
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Encaissements</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            +{totalEncaissements.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Flux entrants</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Décaissements</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">
            -{totalDecaissements.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Dépenses et paiements</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm bg-purple-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">Solde Net Disponible</span>
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </span>
          </div>
          <p className="text-2xl font-black text-purple-900 mt-2">
            {soldeNetCaisse.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-purple-700">DT</span>
          </p>
          <span className="text-xs text-purple-700 font-semibold mt-1 block">Disponibilités réelles</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher N° Pièce, Tiers..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les types</option>
              <option value="Encaissement">Encaissements (+)</option>
              <option value="Décaissement">Décaissements (-)</option>
            </select>

            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les modes</option>
              <option value="Espèces">Espèces</option>
              <option value="Chèque">Chèque</option>
              <option value="Virement">Virement</option>
              <option value="Traite">Traite</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">N° Pièce</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Tiers Concerne</th>
                <th className="py-3.5 px-4">Réf. Document</th>
                <th className="py-3.5 px-4">Mode & Banque</th>
                <th className="py-3.5 px-4 text-right">Montant</th>
                <th className="py-3.5 px-4 text-center">Type</th>
                <th className="py-3.5 px-4 text-right">Action PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredReglements.map((reg) => (
                <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-purple-600">receipt</span>
                    {reg.numeroPiece}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(reg.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900">{reg.tierNom}</span>
                    <span className="block text-[10px] text-slate-400">{reg.tierType}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {reg.documentRef || 'Règlement direct'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-800">{reg.modePaiement}</span>
                    {reg.banque && <span className="block text-[10px] text-slate-400">{reg.banque}</span>}
                  </td>
                  <td className={`py-3.5 px-4 text-right font-black text-sm ${
                    reg.type === 'Encaissement' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {reg.type === 'Encaissement' ? '+' : '-'}{reg.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      reg.type === 'Encaissement' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {reg.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => generateReceiptPdf(reg, currentProject)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                      title="Télécharger le Reçu PDF"
                    >
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredReglements.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                    Aucun mouvement de caisse enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Enregistrer un Mouvement de Caisse</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Type d'Opération</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('Encaissement')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      newType === 'Encaissement' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    + Encaissement
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('Décaissement')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      newType === 'Décaissement' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    - Décaissement
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tiers Associé</label>
                <select
                  value={newTierType}
                  onChange={(e) => setNewTierType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 mb-2"
                >
                  <option value="Client">Client</option>
                  <option value="Fournisseur">Fournisseur</option>
                  <option value="Autre">Autre / Divers</option>
                </select>

                {newTierType === 'Client' && (
                  <select
                    value={newTierId}
                    onChange={(e) => setNewTierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {scopedClients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                )}

                {newTierType === 'Fournisseur' && (
                  <select
                    value={newTierId}
                    onChange={(e) => setNewTierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {scopedFournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Montant (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={newMontant}
                    onChange={(e) => setNewMontant(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mode de Paiement</label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement">Virement</option>
                    <option value="Traite">Traite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Banque / Compte</label>
                <input
                  type="text"
                  value={newBanque}
                  onChange={(e) => setNewBanque(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Valider l'Opération
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
