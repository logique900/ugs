import React, { useState, useMemo } from 'react';
import {  Client, Vente, Reglement, RelanceClient, CreditEcheance, Projet , Utilisateur } from '../types';
import { 
  generateAgingBalancePdf, 
  generateDunningLetterPdf, 
  generateClientStatementPdf,
  generateInvoicePdf,
  generateReceiptPdf,
  generateCreditAgreementPdf
} from '../utils/pdfExportEngine';

import { Article } from '../types';

interface CreditsProps {
  currentUser: Utilisateur;
  articles?: Article[];
  selectedProjectId: string;
  clients: Client[];
  ventes: Vente[];
  reglements: Reglement[];
  relances: RelanceClient[];
  projets: Projet[];
  onVentesChange: (ventes: Vente[]) => void;
  onReglementsChange: (reglements: Reglement[]) => void;
  onRelancesChange: (relances: RelanceClient[]) => void;
  onClientsChange: (clients: Client[]) => void;
}

export function Credits({
  selectedProjectId,
  clients,
  ventes,
  reglements,
  relances,
  projets,
  onVentesChange,
  onReglementsChange,
  onRelancesChange,
  onClientsChange
}: CreditsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'echeancier' | 'balance_agee' | 'relances' | 'plafonds'>('echeancier');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDelay, setFilterDelay] = useState<'all' | 'echue' | 'retard30' | 'retard60'>('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');

  // Modal States: Bouton de Paiement
  const [paymentModalData, setPaymentModalData] = useState<{ vente: Vente; client: Client } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Virement');
  const [paymentBank, setPaymentBank] = useState('BIAT');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);

  // Modal States: Bouton de Crédit & Échéancier
  const [creditModalData, setCreditModalData] = useState<{ vente: Vente; client: Client } | null>(null);
  const [creditDownPayment, setCreditDownPayment] = useState<number>(0);
  const [creditInstallmentsCount, setCreditInstallmentsCount] = useState<number>(3);
  const [creditInterval, setCreditInterval] = useState<'monthly' | 'biweekly' | 'quarterly'>('monthly');
  const [creditFirstDate, setCreditFirstDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Modal States: Relances
  const [dunningModalData, setDunningModalData] = useState<{ client: Client; factures: Vente[] } | null>(null);
  const [dunningLevel, setDunningLevel] = useState<1 | 2 | 3>(1);
  const [dunningNotes, setDunningNotes] = useState('');

  // Modal States: Plafonds
  const [editLimitModalClient, setEditLimitModalClient] = useState<Client | null>(null);
  const [newCreditLimit, setNewCreditLimit] = useState<number>(0);
  const [newPaymentDelay, setNewPaymentDelay] = useState<number>(30);

  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);

  // Scope filter
  const scopedVentes = useMemo(() => {
    return isGlobal ? ventes : ventes.filter(v => v.projetId === selectedProjectId);
  }, [ventes, isGlobal, selectedProjectId]);

  const scopedClients = useMemo(() => {
    return isGlobal ? clients : clients.filter(c => c.projetId === selectedProjectId);
  }, [clients, isGlobal, selectedProjectId]);

  const scopedReglements = useMemo(() => {
    return isGlobal ? reglements : reglements.filter(r => r.projetId === selectedProjectId);
  }, [reglements, isGlobal, selectedProjectId]);

  const scopedRelances = useMemo(() => {
    return isGlobal ? relances : relances.filter(r => r.projetId === selectedProjectId);
  }, [relances, isGlobal, selectedProjectId]);

  // Compute Credit Schedules from Invoices
  const echeances: CreditEcheance[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return scopedVentes
      .filter(v => v.statut !== 'Devis' && v.statut !== 'Annulée')
      .map(v => {
        const client = scopedClients.find(c => c.id === v.clientId);
        const montantPaye = v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0);
        const soldeRestant = Math.max(0, v.montantTTC - montantPaye);
        
        // Calculate due date fallback
        let echeanceDate = v.dateEcheance ? new Date(v.dateEcheance) : new Date(v.date);
        if (!v.dateEcheance && client?.delaiPaiement) {
          echeanceDate.setDate(echeanceDate.getDate() + client.delaiPaiement);
        }

        const diffTime = today.getTime() - echeanceDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const joursRetard = soldeRestant > 0 ? Math.max(0, diffDays) : 0;

        let statut: CreditEcheance['statut'] = 'Non échue';
        if (soldeRestant > 0) {
          if (diffDays > 60) statut = 'Contentieux';
          else if (diffDays > 30) statut = 'Très en retard';
          else if (diffDays > 0) statut = 'En retard';
          else statut = 'Non échue';
        } else {
          statut = 'Soldée';
        }

        return {
          id: `ech-${v.id}`,
          venteId: v.id,
          numeroFacture: v.numero,
          clientId: v.clientId,
          clientNom: client?.nom || v.clientNom || 'Client Inconnu',
          projetId: v.projetId,
          dateFacture: v.date,
          dateEcheance: echeanceDate.toISOString().split('T')[0],
          montantTTC: v.montantTTC,
          montantPaye,
          soldeRestant,
          statut,
          joursRetard
        };
      });
  }, [scopedVentes, scopedClients]);

  // Aggregate stats
  const totalCreancesDues = useMemo(() => {
    return echeances.reduce((acc, e) => acc + e.soldeRestant, 0);
  }, [echeances]);

  const totalEnRetard = useMemo(() => {
    return echeances.filter(e => e.joursRetard > 0).reduce((acc, e) => acc + e.soldeRestant, 0);
  }, [echeances]);

  const totalContentieux = useMemo(() => {
    return echeances.filter(e => e.statut === 'Contentieux' || e.statut === 'Très en retard').reduce((acc, e) => acc + e.soldeRestant, 0);
  }, [echeances]);

  const totalEncaisse = useMemo(() => {
    return echeances.reduce((acc, e) => acc + e.montantPaye, 0);
  }, [echeances]);

  const totalFactureGlobal = useMemo(() => {
    return echeances.reduce((acc, e) => acc + e.montantTTC, 0);
  }, [echeances]);

  const tauxRecouvrement = totalFactureGlobal > 0 ? ((totalEncaisse / totalFactureGlobal) * 100).toFixed(1) : '100';

  // Aging summary by age buckets
  const { age0j, age1a30, age31a60, agePlus60 } = useMemo(() => {
    let age0j = 0;
    let age1a30 = 0;
    let age31a60 = 0;
    let agePlus60 = 0;

    echeances.forEach(e => {
      if (e.soldeRestant <= 0) return;
      if (e.joursRetard === 0) {
        age0j += e.soldeRestant;
      } else if (e.joursRetard <= 30) {
        age1a30 += e.soldeRestant;
      } else if (e.joursRetard <= 60) {
        age31a60 += e.soldeRestant;
      } else {
        agePlus60 += e.soldeRestant;
      }
    });

    return { age0j, age1a30, age31a60, agePlus60 };
  }, [echeances]);

  // Clients aging summary table calculation
  const clientsAgingSummary = useMemo(() => {
    return scopedClients.map(client => {
      const clientEcheances = echeances.filter(e => e.clientId === client.id && e.soldeRestant > 0);
      const totalDu = clientEcheances.reduce((a, e) => a + e.soldeRestant, 0);
      const nonEchu = clientEcheances.filter(e => e.joursRetard === 0).reduce((a, e) => a + e.soldeRestant, 0);
      const retard1a30 = clientEcheances.filter(e => e.joursRetard > 0 && e.joursRetard <= 30).reduce((a, e) => a + e.soldeRestant, 0);
      const retardPlus30 = clientEcheances.filter(e => e.joursRetard > 30).reduce((a, e) => a + e.soldeRestant, 0);

      const plafond = client.plafondCredit || 25000;
      const utilisationPlafond = plafond > 0 ? Math.min(100, Math.round((totalDu / plafond) * 100)) : 0;
      const isDepassement = totalDu > plafond;

      return {
        client,
        totalDu,
        nonEchu,
        retard1a30,
        retardPlus30,
        plafond,
        utilisationPlafond,
        isDepassement,
        nombreFacturesDues: clientEcheances.length
      };
    }).sort((a, b) => b.totalDu - a.totalDu);
  }, [scopedClients, echeances]);

  // Filtered Echeances List
  const filteredEcheances = useMemo(() => {
    return echeances.filter(ech => {
      const matchesSearch = ech.numeroFacture.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            ech.clientNom.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClient = selectedClientFilter === 'all' || ech.clientId === selectedClientFilter;

      let matchesDelay = true;
      if (filterDelay === 'echue') matchesDelay = ech.soldeRestant > 0;
      else if (filterDelay === 'retard30') matchesDelay = ech.joursRetard > 0;
      else if (filterDelay === 'retard60') matchesDelay = ech.joursRetard > 30;

      return matchesSearch && matchesClient && matchesDelay;
    });
  }, [echeances, searchTerm, selectedClientFilter, filterDelay]);

  // ACTION: Open Payment Modal (Bouton de Paiement)
  const handleOpenPayment = (ech: CreditEcheance) => {
    const vente = scopedVentes.find(v => v.id === ech.venteId);
    const client = scopedClients.find(c => c.id === ech.clientId);
    if (vente && client) {
      setPaymentModalData({ vente, client });
      setPaymentAmount(ech.soldeRestant);
      setPaymentRef(`REG-${Date.now().toString().slice(-4)}`);
      setPaymentNotes(`Règlement pour facture ${vente.numero}`);
    }
  };

  // Submit Payment Action
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalData || paymentAmount <= 0) return;

    const { vente, client } = paymentModalData;
    const currentPaid = vente.montantPaye ?? (vente.statut === 'Payée' ? vente.montantTTC : 0);
    const newMontantPaye = currentPaid + paymentAmount;
    const isTotal = newMontantPaye >= vente.montantTTC;

    // Update Vente
    const updatedVentes = ventes.map(v => {
      if (v.id === vente.id) {
        return {
          ...v,
          montantPaye: newMontantPaye,
          statut: isTotal ? ('Payée' as const) : ('Facture' as const)
        };
      }
      return v;
    });
    onVentesChange(updatedVentes);

    // Create Reglement
    const newReg: Reglement = {
      id: `reg-${Date.now()}`,
      projetId: vente.projetId || selectedProjectId,
      numeroPiece: `ENC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      type: 'Encaissement',
      tierId: client.id,
      tierNom: client.nom,
      tierType: 'Client',
      documentRef: vente.numero,
      date: new Date().toISOString().split('T')[0],
      montant: paymentAmount,
      modePaiement: paymentMode,
      banque: paymentBank,
      referencePaiement: paymentRef,
      notes: paymentNotes,
      statut: 'Validé'
    };
    onReglementsChange([newReg, ...reglements]);

    if (autoPrintReceipt) {
      generateReceiptPdf(newReg, currentProject);
    }

    setPaymentModalData(null);
  };

  // ACTION: Open Credit Modal (Bouton de Crédit)
  const handleOpenCreditModal = (ech: CreditEcheance) => {
    const vente = scopedVentes.find(v => v.id === ech.venteId);
    const client = scopedClients.find(c => c.id === ech.clientId);
    if (vente && client) {
      setCreditModalData({ vente, client });
      setCreditDownPayment(vente.montantPaye || 0);
      setCreditInstallmentsCount(3);
      const due = new Date();
      due.setDate(due.getDate() + 30);
      setCreditFirstDate(due.toISOString().split('T')[0]);
    }
  };

  // Calculated installments for Credit Modal
  const calculatedCreditSchedule = useMemo(() => {
    if (!creditModalData) return [];
    const solde = Math.max(0, creditModalData.vente.montantTTC - creditDownPayment);
    const count = Math.max(1, creditInstallmentsCount);
    const amountPerInstallment = solde / count;
    
    const schedule = [];
    const baseDate = new Date(creditFirstDate || new Date().toISOString().split('T')[0]);

    for (let i = 1; i <= count; i++) {
      const date = new Date(baseDate);
      if (creditInterval === 'monthly') {
        date.setMonth(date.getMonth() + (i - 1));
      } else if (creditInterval === 'biweekly') {
        date.setDate(date.getDate() + (i - 1) * 14);
      } else if (creditInterval === 'quarterly') {
        date.setMonth(date.getMonth() + (i - 1) * 3);
      }

      schedule.push({
        numero: i,
        date: date.toISOString().split('T')[0],
        montant: amountPerInstallment
      });
    }

    return schedule;
  }, [creditModalData, creditDownPayment, creditInstallmentsCount, creditInterval, creditFirstDate]);

  // Download Credit Agreement PDF
  const handleDownloadCreditAgreement = () => {
    if (!creditModalData) return;
    const { client, vente } = creditModalData;

    generateCreditAgreementPdf(
      client,
      vente.montantTTC,
      creditDownPayment,
      calculatedCreditSchedule,
      currentProject,
      vente.numero
    );
  };

  // Confirm Credit Arrangement
  const handleConfirmCreditArrangement = () => {
    if (!creditModalData || calculatedCreditSchedule.length === 0) return;
    const { vente } = creditModalData;
    const lastEcheance = calculatedCreditSchedule[calculatedCreditSchedule.length - 1].date;

    const updated = ventes.map(v => {
      if (v.id === vente.id) {
        return {
          ...v,
          dateEcheance: lastEcheance,
          montantPaye: creditDownPayment,
          statut: creditDownPayment >= v.montantTTC ? ('Payée' as const) : ('Facture' as const)
        };
      }
      return v;
    });

    onVentesChange(updated);
    setCreditModalData(null);
  };

  // Action: Open Dunning Modal
  const handleOpenDunning = (client: Client, factures?: Vente[]) => {
    const overdue = factures || scopedVentes.filter(v => v.clientId === client.id && (v.montantPaye || 0) < v.montantTTC && v.statut !== 'Devis');
    setDunningModalData({ client, factures: overdue });
    setDunningLevel(1);
    setDunningNotes(`Relance pour régularisation du compte client ${client.nom}`);
  };

  // Submit Dunning
  const handleConfirmDunning = () => {
    if (!dunningModalData) return;
    const { client, factures } = dunningModalData;

    // Generate PDF immediately
    generateDunningLetterPdf(client, factures, dunningLevel, currentProject);

    // Save in relances log
    const newRelance: RelanceClient = {
      id: `rel-${Date.now()}`,
      projetId: client.projetId || selectedProjectId,
      clientId: client.id,
      clientNom: client.nom,
      date: new Date().toISOString().split('T')[0],
      niveau: dunningLevel,
      montantTotalDu: factures.reduce((a, f) => a + (f.montantTTC - (f.montantPaye || 0)), 0),
      facturesConcernees: factures.map(f => f.numero),
      statut: 'Envoyée',
      notes: dunningNotes
    };
    onRelancesChange([newRelance, ...relances]);
    setDunningModalData(null);
  };

  // Action: Toggle Client Block Status
  const handleToggleBlock = (client: Client) => {
    const isBlocked = client.statut === 'Bloqué';
    const updated = clients.map(c => {
      if (c.id === client.id) {
        return {
          ...c,
          statut: isBlocked ? ('Actif' as const) : ('Bloqué' as const)
        };
      }
      return c;
    });
    onClientsChange(updated);
  };

  // Action: Update Credit Limit
  const handleSaveCreditLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLimitModalClient) return;

    const updated = clients.map(c => {
      if (c.id === editLimitModalClient.id) {
        return {
          ...c,
          plafondCredit: newCreditLimit,
          delaiPaiement: newPaymentDelay
        };
      }
      return c;
    });
    onClientsChange(updated);
    setEditLimitModalClient(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Trigger Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-950/40">
              <span className="material-symbols-outlined text-[26px]">account_balance</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Gestion des Crédits & Encaissements</h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Pilotage des délais de paiement, balance âgée et relances
              </p>
            </div>
          </div>
        </div>

        {/* Global Action & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => generateAgingBalancePdf(echeances, scopedClients, currentProject)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/30 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            Balance Âgée PDF
          </button>
          
          <button
            onClick={() => {
              if (scopedClients.length > 0) {
                generateClientStatementPdf(scopedClients[0], scopedVentes, scopedReglements, currentProject);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">receipt</span>
            Relevé Débiteur
          </button>
        </div>
      </div>

      {/* Primary KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total En-cours */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Créances Clients Dues</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {totalCreancesDues.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span>Sur {scopedVentes.length} factures émises</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
        </div>

        {/* Retards de Paiement */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Créances en Retard</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">
            {totalEnRetard.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-rose-600 font-semibold">
            <span>{echeances.filter(e => e.joursRetard > 0).length} factures dépassées</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
        </div>

        {/* Taux de Recouvrement */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Taux de Recouvrement</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {tauxRecouvrement}%
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span>{totalEncaisse.toLocaleString('fr-FR')} DT déjà encaissés</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Contentieux & Risque */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Risque & Contentieux</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <span className="material-symbols-outlined text-[20px]">gavel</span>
            </span>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">
            {totalContentieux.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 font-semibold">
            <span>Retard supérieur à 30 jours</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>
      </div>

      {/* Aging Structure Bar (Balance Âgée Visuelle) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Ventilation de l'En-cours par Tranches d'Âge</h2>
          <span className="text-xs text-slate-500">Total En-cours : <strong className="text-slate-900">{totalCreancesDues.toLocaleString('fr-FR')} DT</strong></span>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Non Échues (&lt; 0j)</span>
            <p className="text-base font-black text-emerald-700 mt-0.5">{age0j.toLocaleString('fr-FR')} DT</p>
          </div>
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <span className="text-[10px] font-bold text-amber-800 uppercase">Retard 1 à 30j</span>
            <p className="text-base font-black text-amber-700 mt-0.5">{age1a30.toLocaleString('fr-FR')} DT</p>
          </div>
          <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl">
            <span className="text-[10px] font-bold text-orange-800 uppercase">Retard 31 à 60j</span>
            <p className="text-base font-black text-orange-700 mt-0.5">{age31a60.toLocaleString('fr-FR')} DT</p>
          </div>
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
            <span className="text-[10px] font-bold text-rose-800 uppercase">Retard &gt; 60j / Contentieux</span>
            <p className="text-base font-black text-rose-700 mt-0.5">{agePlus60.toLocaleString('fr-FR')} DT</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('echeancier')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSubTab === 'echeancier'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          Échéancier des Factures
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-200">
            {echeances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('balance_agee')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSubTab === 'balance_agee'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">pie_chart</span>
          Balance Âgée par Client
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-200">
            {scopedClients.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('relances')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSubTab === 'relances'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          Centre de Relances & Recouvrement
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-black">
            {scopedRelances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('plafonds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSubTab === 'plafonds'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">speed</span>
          Plafonds & Solvabilité
        </button>
      </div>

      {/* SUB-VIEW 1: ÉCHÉANCIER DÉTAILLÉ */}
      {activeSubTab === 'echeancier' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher facture, client..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">Tous les Clients</option>
                {scopedClients.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>

              <select
                value={filterDelay}
                onChange={(e) => setFilterDelay(e.target.value as any)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">Toutes les échéances</option>
                <option value="echue">Solde Dû &gt; 0</option>
                <option value="retard30">En retard (&gt; 0 jours)</option>
                <option value="retard60">Retard critique (&gt; 30 jours)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">N° Facture</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 text-center">Émission</th>
                  <th className="py-3 px-4 text-center">Échéance</th>
                  <th className="py-3 px-4 text-right">Montant TTC</th>
                  <th className="py-3 px-4 text-right">Réglé</th>
                  <th className="py-3 px-4 text-right">Reste Dû</th>
                  <th className="py-3 px-4 text-center">Retard</th>
                  <th className="py-3 px-4 text-center">Statut Risque</th>
                  <th className="py-3 px-4 text-right">Boutons d'Actions Rapides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredEcheances.map((ech) => {
                  const client = scopedClients.find(c => c.id === ech.clientId);
                  const vente = scopedVentes.find(v => v.id === ech.venteId);

                  return (
                    <tr key={ech.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">receipt_long</span>
                        {ech.numeroFacture}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {ech.clientNom}
                        {client?.telephone && (
                          <span className="block text-[10px] text-slate-400 font-normal">{client.telephone}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500">
                        {new Date(ech.dateFacture).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {new Date(ech.dateEcheance).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {ech.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 font-bold">
                        {ech.montantPaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        {ech.soldeRestant > 0 ? (
                          <span className="text-rose-600 font-black">
                            {ech.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Soldée</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {ech.joursRetard > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                            +{ech.joursRetard} jours
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Dans les délais</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ech.statut === 'Contentieux'
                            ? 'bg-red-100 text-red-700'
                            : ech.statut === 'Très en retard'
                            ? 'bg-rose-100 text-rose-700'
                            : ech.statut === 'En retard'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {ech.statut}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* BOUTON DE PAIEMENT */}
                          {ech.soldeRestant > 0 && (
                            <button
                              onClick={() => handleOpenPayment(ech)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs hover:scale-105"
                              title="Bouton de Paiement Rapide (Encaisser)"
                            >
                              <span className="material-symbols-outlined text-[14px]">payments</span>
                              Paiement
                            </button>
                          )}

                          {/* BOUTON DE CRÉDIT & ÉCHÉANCES */}
                          {ech.soldeRestant > 0 && (
                            <button
                              onClick={() => handleOpenCreditModal(ech)}
                              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-600 text-purple-800 hover:text-white border border-purple-200 hover:border-purple-600 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer hover:scale-105"
                              title="Bouton de Crédit (Structurer Échéances & Accord PDF)"
                            >
                              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                              Crédit
                            </button>
                          )}

                          {/* Télécharger Facture PDF */}
                          {vente && (
                            <button
                              onClick={() => generateInvoicePdf(vente, client, currentProject)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Télécharger la Facture PDF"
                            >
                              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                            </button>
                          )}

                          {/* Émettre Relance PDF */}
                          {client && ech.soldeRestant > 0 && (
                            <button
                              onClick={() => handleOpenDunning(client, vente ? [vente] : undefined)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Générer une Lettre de Relance PDF"
                            >
                              <span className="material-symbols-outlined text-[18px]">mail</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredEcheances.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400 text-sm">
                      Aucune créance ne correspond aux filtres sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: BALANCE ÂGÉE PAR CLIENT */}
      {activeSubTab === 'balance_agee' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-sm text-slate-800">Situation des Comptes Débiteurs & En-cours Tiers</h3>
            <button
              onClick={() => generateAgingBalancePdf(echeances, scopedClients, currentProject)}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Imprimer Balance Âgée PDF
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Client & Tiers</th>
                  <th className="py-3 px-4 text-right">Plafond Crédit</th>
                  <th className="py-3 px-4 text-center">Jauge Plafond</th>
                  <th className="py-3 px-4 text-right">Non Échues</th>
                  <th className="py-3 px-4 text-right">1 - 30 Jours</th>
                  <th className="py-3 px-4 text-right">&gt; 30 Jours</th>
                  <th className="py-3 px-4 text-right font-black">Total Dû</th>
                  <th className="py-3 px-4 text-center">Statut Compte</th>
                  <th className="py-3 px-4 text-right">Actions Rapides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {clientsAgingSummary.map((item) => (
                  <tr key={item.client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.client.nom}</div>
                      <div className="text-[10px] text-slate-400">{item.client.code || 'CLI-00' + item.client.id} • {item.client.categorie || 'PME'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                      {item.plafond.toLocaleString('fr-FR')} DT
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-28 mx-auto space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className={item.utilisationPlafond > 90 ? 'text-rose-600' : 'text-slate-600'}>
                            {item.utilisationPlafond}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.utilisationPlafond > 90
                                ? 'bg-rose-500'
                                : item.utilisationPlafond > 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, item.utilisationPlafond)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                      {item.nonEchu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </td>
                    <td className="py-3.5 px-4 text-right text-amber-600 font-semibold">
                      {item.retard1a30.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </td>
                    <td className="py-3.5 px-4 text-right text-rose-600 font-black">
                      {item.retardPlus30.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                      {item.totalDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.client.statut === 'Bloqué'
                          ? 'bg-red-100 text-red-700'
                          : item.isDepassement
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.client.statut === 'Bloqué' ? 'Bloqué' : item.isDepassement ? 'Plafond Dépassé' : 'Solvable'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => generateClientStatementPdf(item.client, scopedVentes, scopedReglements, currentProject)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Imprimer Relevé Débiteur PDF"
                        >
                          <span className="material-symbols-outlined text-[18px]">description</span>
                        </button>
                        
                        {item.totalDu > 0 && (
                          <button
                            onClick={() => handleOpenDunning(item.client)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Générer Lettre de Relance"
                          >
                            <span className="material-symbols-outlined text-[18px]">mail</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setEditLimitModalClient(item.client);
                            setNewCreditLimit(item.client.plafondCredit || 25000);
                            setNewPaymentDelay(item.client.delaiPaiement || 30);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Modifier Conditions & Plafond"
                        >
                          <span className="material-symbols-outlined text-[18px]">settings</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: CENTRE DE RELANCES */}
      {activeSubTab === 'relances' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Gestion des Relances et du Recouvrement Amiable</h3>
              <p className="text-xs text-slate-500 mt-0.5">Historique des relances envoyées et génération automatisée de lettres formelles</p>
            </div>
            <button
              onClick={() => {
                const clientWithDebts = scopedClients.find(c => {
                  const du = echeances.filter(e => e.clientId === c.id && e.joursRetard > 0).reduce((a, e) => a + e.soldeRestant, 0);
                  return du > 0;
                });
                if (clientWithDebts) {
                  handleOpenDunning(clientWithDebts);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_alert</span>
              Émettre une Nouvelle Relance
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4 text-center">Niveau Sévérité</th>
                    <th className="py-3 px-4 text-right">Montant Réclamé</th>
                    <th className="py-3 px-4">Factures Liées</th>
                    <th className="py-3 px-4 text-center">Statut Envoi</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {scopedRelances.map((rel) => {
                    const client = scopedClients.find(c => c.id === rel.clientId);
                    return (
                      <tr key={rel.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {new Date(rel.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {rel.clientNom}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            rel.niveau === 3
                              ? 'bg-rose-100 text-rose-800'
                              : rel.niveau === 2
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            Niveau {rel.niveau} {rel.niveau === 3 ? '(Mise en demeure)' : rel.niveau === 2 ? '(Ferme)' : '(Courtois)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-rose-600">
                          {rel.montantTotalDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {rel.facturesConcernees.join(', ')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {rel.statut}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {client && (
                            <button
                              onClick={() => {
                                const relatedInvoices = scopedVentes.filter(v => rel.facturesConcernees.includes(v.numero));
                                generateDunningLetterPdf(client, relatedInvoices, rel.niveau, currentProject);
                              }}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                              Réimprimer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {scopedRelances.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                        Aucun historique de relance enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: PLAFONDS & SOLVABILITÉ */}
      {activeSubTab === 'plafonds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scopedClients.map((client) => {
            const clientEcheances = echeances.filter(e => e.clientId === client.id && e.soldeRestant > 0);
            const totalDu = clientEcheances.reduce((a, e) => a + e.soldeRestant, 0);
            const plafond = client.plafondCredit || 25000;
            const pct = plafond > 0 ? Math.min(100, Math.round((totalDu / plafond) * 100)) : 0;
            const isBlocked = client.statut === 'Bloqué';

            return (
              <div key={client.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{client.nom}</h4>
                    <span className="text-[11px] text-slate-400">{client.email || 'Email non renseigné'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isBlocked ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isBlocked ? 'Compte Bloqué' : 'Compte Actif'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Plafond de Crédit Autorisé :</span>
                    <span className="font-bold text-slate-900">{plafond.toLocaleString('fr-FR')} DT</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>En-cours Actuel Débiteur :</span>
                    <span className={`font-black ${totalDu > plafond ? 'text-rose-600' : 'text-slate-800'}`}>
                      {totalDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Délai de Règlement Accordé :</span>
                    <span className="font-bold text-slate-900">{client.delaiPaiement || 30} jours</span>
                  </div>

                  {/* Progress bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span className="text-slate-500">Utilisation du Plafond</span>
                      <span className={pct > 90 ? 'text-rose-600' : 'text-slate-700'}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleBlock(client)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isBlocked ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    {isBlocked ? 'Débloquer Client' : 'Bloquer Facturation'}
                  </button>

                  <button
                    onClick={() => {
                      setEditLimitModalClient(client);
                      setNewCreditLimit(plafond);
                      setNewPaymentDelay(client.delaiPaiement || 30);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Ajuster Plafond
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK PAYMENT MODAL (BOUTON DE PAIEMENT) */}
      {paymentModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/80">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">payments</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Encaisser le Règlement (Facture {paymentModalData.vente.numero})</h3>
                  <span className="text-[11px] text-slate-500">Client : {paymentModalData.client.nom}</span>
                </div>
              </div>
              <button onClick={() => setPaymentModalData(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Montant Total Facture :</span>
                  <span className="font-bold text-slate-900">{paymentModalData.vente.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Déjà Encaissé :</span>
                  <span className="font-bold text-emerald-600">{(paymentModalData.vente.montantPaye || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-1">
                  <span>Solde Restant Dû :</span>
                  <span className="text-rose-600">
                    {Math.max(0, paymentModalData.vente.montantTTC - (paymentModalData.vente.montantPaye || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Montant Reçu (DT) *</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const rem = Math.max(0, paymentModalData.vente.montantTTC - (paymentModalData.vente.montantPaye || 0));
                        setPaymentAmount(rem);
                      }}
                      className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] hover:bg-emerald-200 cursor-pointer"
                    >
                      100% (Solde)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rem = Math.max(0, paymentModalData.vente.montantTTC - (paymentModalData.vente.montantPaye || 0));
                        setPaymentAmount(parseFloat((rem / 2).toFixed(2)));
                      }}
                      className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[10px] hover:bg-slate-200 cursor-pointer"
                    >
                      50%
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Math.max(0, paymentModalData.vente.montantTTC - (paymentModalData.vente.montantPaye || 0))}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-black text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mode de Paiement</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="Virement">Virement Bancaire</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Espèces">Espèces (Caisse)</option>
                    <option value="Traite">Traite / Effet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Banque Réceptrice</label>
                  <input
                    type="text"
                    value={paymentBank}
                    onChange={(e) => setPaymentBank(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">N° Chèque / Réf. Transaction</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Ex: CHQ-889922"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              {/* Checkbox: Print Receipt PDF */}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoPrintReceipt}
                  onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                Générer et télécharger le Reçu de Caisse PDF officiel
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalData(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Valider l'Encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDIT & INSTALLMENTS MODAL (BOUTON DE CRÉDIT) */}
      {creditModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-purple-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[22px]">calendar_month</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Structuration de Crédit & Échéancier ({creditModalData.vente.numero})</h3>
                  <span className="text-[11px] text-slate-500">Client : {creditModalData.client.nom}</span>
                </div>
              </div>
              <button onClick={() => setCreditModalData(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Montant Total TTC</span>
                  <p className="text-base font-black text-slate-900 mt-0.5">
                    {creditModalData.vente.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Acompte Initial</span>
                  <p className="text-base font-black text-emerald-700 mt-0.5">
                    {creditDownPayment.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-800 uppercase">Solde à Financer</span>
                  <p className="text-base font-black text-purple-700 mt-0.5">
                    {Math.max(0, creditModalData.vente.montantTTC - creditDownPayment).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nombre d'Échéances</label>
                  <select
                    value={creditInstallmentsCount}
                    onChange={(e) => setCreditInstallmentsCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="1">1 tranche (Paiement unique différé)</option>
                    <option value="2">2 tranches égales</option>
                    <option value="3">3 tranches (Trimestriel)</option>
                    <option value="4">4 tranches</option>
                    <option value="6">6 tranches (Semestriel)</option>
                    <option value="12">12 tranches (Annuel)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fréquence de Paiement</label>
                  <select
                    value={creditInterval}
                    onChange={(e) => setCreditInterval(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="monthly">Mensuel (Tous les 30 jours)</option>
                    <option value="biweekly">Bimensuel (Tous les 15 jours)</option>
                    <option value="quarterly">Trimestriel (Tous les 90 jours)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">1ère Échéance</label>
                  <input
                    type="date"
                    value={creditFirstDate}
                    onChange={(e) => setCreditFirstDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Tableau des Tranches d'Échéances Prévues :</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2 px-3">Tranche</th>
                        <th className="py-2 px-3">Date d'Exigibilité</th>
                        <th className="py-2 px-3 text-right">Montant TTC</th>
                        <th className="py-2 px-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {calculatedCreditSchedule.map((ech) => (
                        <tr key={ech.numero} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-800">Échéance N° {ech.numero}</td>
                          <td className="py-2 px-3 text-slate-600">{new Date(ech.date).toLocaleDateString('fr-FR')}</td>
                          <td className="py-2 px-3 text-right font-black text-purple-700">
                            {ech.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold text-[10px]">
                              Prévue
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDownloadCreditAgreement}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                Télécharger Accord & Échéancier PDF
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreditModalData(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCreditArrangement}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  Enregistrer l'Échéancier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RELANCE IMPAYÉ */}
      {dunningModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">mark_email_unread</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Émettre une Lettre de Relance</h3>
                  <p className="text-[11px] text-slate-500">{dunningModalData.client.nom}</p>
                </div>
              </div>
              <button onClick={() => setDunningModalData(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Niveau de Sévérité de la Relance</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDunningLevel(1)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      dunningLevel === 1
                        ? 'border-blue-500 bg-blue-50/70 text-blue-800 font-bold ring-2 ring-blue-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs font-black">Niveau 1</span>
                    <span className="text-[10px]">Rappel Courtois</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDunningLevel(2)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      dunningLevel === 2
                        ? 'border-amber-500 bg-amber-50/70 text-amber-800 font-bold ring-2 ring-amber-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs font-black">Niveau 2</span>
                    <span className="text-[10px]">Relance Ferme</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDunningLevel(3)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      dunningLevel === 3
                        ? 'border-rose-500 bg-rose-50/70 text-rose-800 font-bold ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs font-black">Niveau 3</span>
                    <span className="text-[10px]">Mise en Demeure</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Factures concernées :</span>
                  <span className="font-bold text-slate-800">{dunningModalData.factures.map(f => f.numero).join(', ')}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Principal Dû :</span>
                  <span className="font-black text-rose-600">
                    {dunningModalData.factures.reduce((a, f) => a + (f.montantTTC - (f.montantPaye || 0)), 0).toLocaleString('fr-FR')} DT
                  </span>
                </div>
                {dunningLevel >= 2 && (
                  <div className="flex items-center justify-between text-xs text-amber-800">
                    <span>Frais de recouvrement forfaitaires :</span>
                    <span className="font-bold">40.00 DT</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Notes Internes</label>
                <textarea
                  rows={2}
                  value={dunningNotes}
                  onChange={(e) => setDunningNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDunningModalData(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  onClick={handleConfirmDunning}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Générer la Lettre PDF & Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTER PLAFOND CRÉDIT */}
      {editLimitModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Ajuster les Conditions de Crédit</h3>
              <button onClick={() => setEditLimitModalClient(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCreditLimit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nouveau Plafond de Crédit (DT)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Délai de Paiement Accordé (Jours)</label>
                <select
                  value={newPaymentDelay}
                  onChange={(e) => setNewPaymentDelay(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value={0}>0 jours (Paiement Comptant)</option>
                  <option value={15}>15 jours</option>
                  <option value={30}>30 jours (Standard PME)</option>
                  <option value={45}>45 jours</option>
                  <option value={60}>60 jours (Grand Compte)</option>
                  <option value={90}>90 jours (Marché Public)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditLimitModalClient(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
