import React, { useState, useMemo } from 'react';
import {  Fournisseur, Projet, Achat, Reglement, Article , Utilisateur } from '../types';
import { mockAchats, mockReglements, mockArticles } from '../data';
import { generateReceiptPdf, generateCreditAgreementPdf } from '../utils/pdfExportEngine';
import { SupplierDetailModal } from './fournisseurs/SupplierDetailModal';
import { SupplierFormModal } from './fournisseurs/SupplierFormModal';
import { SupplierQuickPurchaseModal } from './fournisseurs/SupplierQuickPurchaseModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FournisseursProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  fournisseurs: Fournisseur[];
  onFournisseursChange: (fournisseurs: Fournisseur[]) => void;
  projets: Projet[];
  achats?: Achat[];
  onAchatsChange?: (achats: Achat[]) => void;
  reglements?: Reglement[];
  onReglementsChange?: (reglements: Reglement[]) => void;
  articles?: Article[];
  onTabChange?: (tab: string) => void;
}

export function Fournisseurs({ currentUser, 
  selectedProjectId, 
  fournisseurs, 
  onFournisseursChange, 
  projets,
  achats = mockAchats,
  onAchatsChange,
  reglements = mockReglements,
  onReglementsChange,
  articles = mockArticles,
}: FournisseursProps) {
  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'fournisseur' | 'soustraitant' | 'dette'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'nom' | 'achats' | 'solde'>('nom');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [selectedFournisseurDetail, setSelectedFournisseurDetail] = useState<Fournisseur | null>(null);
  const [quickPurchaseFournisseur, setQuickPurchaseFournisseur] = useState<Fournisseur | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- BOUTON DE PAIEMENT (DÉCAISSEMENT FOURNISSEUR) STATE ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFournisseurId, setPaymentFournisseurId] = useState<string>('');
  const [paymentAchatId, setPaymentAchatId] = useState<string>('global');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Virement');
  const [paymentBank, setPaymentBank] = useState<string>('BIAT');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(true);

  // --- BOUTON DE CRÉDIT (ÉCHÉANCIER) STATE ---
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditFournisseurId, setCreditFournisseurId] = useState<string>('');
  const [creditAchatId, setCreditAchatId] = useState<string>('global');
  const [newCreditLimit, setNewCreditLimit] = useState<number>(30000);
  const [newPaymentDelay, setNewPaymentDelay] = useState<number>(45);
  const [creditDownPayment, setCreditDownPayment] = useState<number>(0);
  const [creditInstallmentsCount, setCreditInstallmentsCount] = useState<number>(3);
  const [creditInterval, setCreditInterval] = useState<'monthly' | 'biweekly' | 'quarterly'>('monthly');
  const [creditFirstDate, setCreditFirstDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to calculate financial metrics per fournisseur
  const getFournisseurFinancials = (fournisseurId: string) => {
    const listAchats = achats || mockAchats;
    const listReglements = reglements || mockReglements;
    const fournisseurAchats = listAchats.filter(a => a.fournisseurId === fournisseurId);
    const totalAchete = fournisseurAchats.reduce((acc, a) => acc + a.montantTTC, 0);

    const totalRegleDirect = listReglements
      .filter(r => r.tierId === fournisseurId && r.type === 'Décaissement' && r.statut === 'Validé')
      .reduce((acc, r) => acc + r.montant, 0);

    const totalRegleAchats = fournisseurAchats
      .reduce((acc, a: any) => acc + (a.montantPaye ?? a.montantRegle ?? (a.statut === 'Payé' ? a.montantTTC : 0)), 0);

    const totalRegle = Math.max(totalRegleDirect, totalRegleAchats);
    const soldeDu = Math.max(0, totalAchete - totalRegle);
    const achatsCount = fournisseurAchats.length;

    return { totalAchete, totalRegle, soldeDu, achatsCount, fournisseurAchats };
  };

  // Base list filtered by project
  const fournisseursBase = useMemo(() => {
    if (isGlobal) return fournisseurs;
    return fournisseurs.filter(f => f.projetId === selectedProjectId);
  }, [fournisseurs, isGlobal, selectedProjectId]);

  // Filtered and sorted fournisseurs
  const filteredFournisseurs = useMemo(() => {
    return fournisseursBase.filter(fournisseur => {
      const fin = getFournisseurFinancials(fournisseur.id);
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        !searchTerm ||
        fournisseur.nom.toLowerCase().includes(searchLower) ||
        (fournisseur.code && fournisseur.code.toLowerCase().includes(searchLower)) ||
        fournisseur.email.toLowerCase().includes(searchLower) ||
        fournisseur.telephone.toLowerCase().includes(searchLower) ||
        (fournisseur.matriculeFiscal && fournisseur.matriculeFiscal.toLowerCase().includes(searchLower)) ||
        (fournisseur.ville && fournisseur.ville.toLowerCase().includes(searchLower)) ||
        (fournisseur.categorie && fournisseur.categorie.toLowerCase().includes(searchLower));

      let matchTab = true;
      if (activeTabFilter === 'fournisseur') {
        matchTab = fournisseur.typeTier !== 'Sous-traitant' && fournisseur.categorie !== 'Sous-traitant';
      } else if (activeTabFilter === 'soustraitant') {
        matchTab = fournisseur.typeTier === 'Sous-traitant' || fournisseur.categorie === 'Sous-traitant';
      } else if (activeTabFilter === 'dette') {
        matchTab = fin.soldeDu > 0;
      }

      return matchSearch && matchTab;
    }).sort((a, b) => {
      const finA = getFournisseurFinancials(a.id);
      const finB = getFournisseurFinancials(b.id);

      if (sortBy === 'nom') return a.nom.localeCompare(b.nom);
      if (sortBy === 'achats') return finB.totalAchete - finA.totalAchete;
      if (sortBy === 'solde') return finB.soldeDu - finA.soldeDu;
      return 0;
    });
  }, [fournisseursBase, searchTerm, activeTabFilter, sortBy]);

  // Global KPIs for Fournisseurs
  const kpis = useMemo(() => {
    let totalDepenses = 0;
    let totalDettes = 0;
    let totalRegle = 0;
    let countSousTraitants = 0;
    let countAvecDettes = 0;

    fournisseursBase.forEach(f => {
      const fin = getFournisseurFinancials(f.id);
      totalDepenses += fin.totalAchete;
      totalDettes += fin.soldeDu;
      totalRegle += fin.totalRegle;
      if (f.typeTier === 'Sous-traitant' || f.categorie === 'Sous-traitant') countSousTraitants++;
      if (fin.soldeDu > 0) countAvecDettes++;
    });

    const countFournisseurs = fournisseursBase.length - countSousTraitants;

    return {
      totalCount: fournisseursBase.length,
      countFournisseurs,
      countSousTraitants,
      countAvecDettes,
      totalDepenses,
      totalDettes,
      totalRegle,
    };
  }, [fournisseursBase]);

  // Open Form for Create
  const handleOpenCreateModal = () => {
    setEditingFournisseur(null);
    setIsFormModalOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditModal = (fournisseur: Fournisseur) => {
    setEditingFournisseur(fournisseur);
    setIsFormModalOpen(true);
  };

  // Save Fournisseur
  const handleSaveSupplier = (savedSupplier: Fournisseur) => {
    if (editingFournisseur) {
      const updatedList = fournisseurs.map(f => f.id === savedSupplier.id ? savedSupplier : f);
      onFournisseursChange(updatedList);
      showToast(`Fournisseur "${savedSupplier.nom}" mis à jour.`);
    } else {
      onFournisseursChange([savedSupplier, ...fournisseurs]);
      showToast(`Fournisseur "${savedSupplier.nom}" ajouté avec succès.`);
    }
  };

  // Delete Fournisseur
  const handleDeleteFournisseur = (id: string) => {
    const target = fournisseurs.find(f => f.id === id);
    onFournisseursChange(fournisseurs.filter(f => f.id !== id));
    setDeleteConfirmationId(null);
    if (selectedFournisseurDetail?.id === id) {
      setSelectedFournisseurDetail(null);
    }
    showToast(`Fournisseur "${target?.nom || ''}" supprimé.`);
  };

  // Save Quick Purchase
  const handleSaveQuickPurchase = (newAchat: Achat) => {
    if (onAchatsChange) {
      onAchatsChange([newAchat, ...(achats || mockAchats)]);
    }
    showToast(`Bon de commande N° ${newAchat.numero} créé.`);
  };

  // Export PDF List
  const handleExportFournisseursPdf = () => {
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, 'F');
    
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("RÉPERTOIRE FOURNISSEURS & SOUS-TRAITANTS", 14, 18);
    
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    const scopeLabel = isGlobal ? 'Tous les Projets' : currentProject?.nom || 'Projet Actif';
    doc.text(`Périmètre : ${scopeLabel} • Édité le ${new Date().toLocaleDateString('fr-FR')}`, 14, 26);

    autoTable(doc, {
      startY: 40,
      head: [['Code', 'Fournisseur / Raison Sociale', 'Catégorie', 'Téléphone', 'Total Achats TTC', 'Solde Dû']],
      body: filteredFournisseurs.map(f => {
        const fin = getFournisseurFinancials(f.id);
        return [
          f.code || `FRN-${f.id}`,
          f.nom,
          f.categorie || f.typeTier || 'Fournisseur',
          f.telephone,
          `${fin.totalAchete.toLocaleString('fr-FR')} DT`,
          `${fin.soldeDu.toLocaleString('fr-FR')} DT`,
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
      foot: [[
        'TOTAL', '', '', '',
        `${kpis.totalDepenses.toLocaleString('fr-FR')} DT`,
        `${kpis.totalDettes.toLocaleString('fr-FR')} DT`,
      ]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
    });

    doc.save(`Fournisseurs_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Document PDF généré avec succès.');
  };

  // Export Individual Statement PDF
  const handleExportStatementPdf = (fournisseur: Fournisseur) => {
    const doc = new jsPDF();
    const fin = getFournisseurFinancials(fournisseur.id);

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 34, 'F');
    
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("RELEVÉ DE COMPTE FOURNISSEUR", 14, 18);
    
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Document de synthèse • Date : ${new Date().toLocaleDateString('fr-FR')}`, 14, 26);

    // Box Info
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 40, 100, 38, 2, 2, 'FD');
    
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(fournisseur.nom, 18, 48);
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Code : ${fournisseur.code || 'FRN-' + fournisseur.id}`, 18, 54);
    doc.text(`Téléphone : ${fournisseur.telephone || '-'}`, 18, 60);
    doc.text(`Ville : ${fournisseur.ville || 'Tunis'}`, 18, 66);
    doc.text(`Matricule Fiscal : ${fournisseur.matriculeFiscal || 'Non renseigné'}`, 18, 72);

    // Recap Box Right
    doc.roundedRect(120, 40, 76, 38, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Situation Financière", 124, 48);
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Achats :`, 124, 56);
    doc.text(`${fin.totalAchete.toLocaleString('fr-FR')} DT`, 190, 56, { align: 'right' });
    doc.text(`Total Réglé :`, 124, 62);
    doc.text(`${fin.totalRegle.toLocaleString('fr-FR')} DT`, 190, 62, { align: 'right' });
    
    doc.setFontSize(9.5);
    doc.setTextColor(fin.soldeDu > 0 ? 185 : 5, fin.soldeDu > 0 ? 28 : 150, fin.soldeDu > 0 ? 28 : 105);
    doc.text(`SOLDE RESTANT DÛ :`, 124, 72);
    doc.text(`${fin.soldeDu.toLocaleString('fr-FR')} DT`, 190, 72, { align: 'right' });

    // Table
    autoTable(doc, {
      startY: 85,
      head: [['N° Bon / Pièce', 'Date', 'Statut', 'Montant TTC', 'Solde Restant']],
      body: fin.fournisseurAchats.length > 0 ? fin.fournisseurAchats.map(a => [
        a.numero,
        new Date(a.date).toLocaleDateString('fr-FR'),
        a.statut,
        `${a.montantTTC.toLocaleString('fr-FR')} DT`,
        a.statut === 'Payé' ? '0 DT' : `${a.montantTTC.toLocaleString('fr-FR')} DT`
      ]) : [['Aucune commande enregistrée', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 }
    });

    doc.save(`Situation_${fournisseur.nom.replace(/\s+/g, '_')}.pdf`);
    showToast(`Relevé de ${fournisseur.nom} téléchargé.`);
  };

  // --- BOUTON DE PAIEMENT HANDLERS ---
  const handleOpenPaymentModal = (fournisseur?: Fournisseur, achatId?: string) => {
    const targetFournisseur = fournisseur || filteredFournisseurs.find(f => getFournisseurFinancials(f.id).soldeDu > 0) || filteredFournisseurs[0];
    if (!targetFournisseur) return;

    setPaymentFournisseurId(targetFournisseur.id);
    const fin = getFournisseurFinancials(targetFournisseur.id);
    const targetAchat = achatId ? fin.fournisseurAchats.find(a => a.id === achatId) : fin.fournisseurAchats.find((a: any) => {
      const paye = a.montantPaye ?? a.montantRegle ?? (a.statut === 'Payé' ? a.montantTTC : 0);
      return paye < a.montantTTC;
    });

    if (targetAchat) {
      setPaymentAchatId(targetAchat.id);
      const paye = (targetAchat as any).montantPaye ?? (targetAchat as any).montantRegle ?? (targetAchat.statut === 'Payé' ? targetAchat.montantTTC : 0);
      setPaymentAmount(Math.max(0, targetAchat.montantTTC - paye));
      setPaymentRef(`ACH-${targetAchat.numero}`);
      setPaymentNotes(`Règlement achat ${targetAchat.numero}`);
    } else {
      setPaymentAchatId('global');
      setPaymentAmount(fin.soldeDu > 0 ? fin.soldeDu : 1000);
      setPaymentRef(`VIR-${String(Date.now()).slice(-4)}`);
      setPaymentNotes(`Règlement fournisseur ${targetFournisseur.nom}`);
    }

    setPaymentMode(targetFournisseur.modeReglementPrefere || 'Virement');
    setPaymentBank(targetFournisseur.banque || 'BIAT');
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0 || !paymentFournisseurId) return;

    const targetFournisseur = fournisseurs.find(f => f.id === paymentFournisseurId);
    if (!targetFournisseur) return;

    const nextPieceNum = `DEC-${new Date().getFullYear()}-${String((reglements || mockReglements).length + 1).padStart(3, '0')}`;

    const newReglement: Reglement = {
      id: `reg-${Date.now()}`,
      projetId: targetFournisseur.projetId || (isGlobal ? '1' : selectedProjectId),
      numeroPiece: nextPieceNum,
      type: 'Décaissement',
      tierId: targetFournisseur.id,
      tierNom: targetFournisseur.nom,
      tierType: 'Fournisseur',
      documentRef: paymentAchatId !== 'global' ? paymentRef : 'Règlement Fournisseur',
      date: new Date().toISOString().split('T')[0],
      montant: paymentAmount,
      modePaiement: paymentMode,
      banque: paymentBank,
      referencePaiement: paymentRef,
      notes: paymentNotes,
      statut: 'Validé',
    };

    if (onReglementsChange) {
      onReglementsChange([newReglement, ...(reglements || mockReglements)]);
    }

    if (paymentAchatId !== 'global' && onAchatsChange) {
      const currentAchats = achats || mockAchats;
      const updatedAchats = currentAchats.map((a: any) => {
        if (a.id === paymentAchatId) {
          const prevPaye = a.montantPaye ?? a.montantRegle ?? (a.statut === 'Payé' ? a.montantTTC : 0);
          const newPaye = prevPaye + paymentAmount;
          return {
            ...a,
            montantPaye: newPaye,
            montantRegle: newPaye,
            statut: newPaye >= a.montantTTC ? 'Payé' : 'Partiel'
          };
        }
        return a;
      });
      onAchatsChange(updatedAchats);
    }

    if (autoPrintReceipt) {
      const targetProj = projets.find(p => p.id === (targetFournisseur.projetId || selectedProjectId));
      generateReceiptPdf(newReglement, targetProj);
    }

    setIsPaymentModalOpen(false);
    showToast(`Paiement de ${paymentAmount.toLocaleString('fr-FR')} DT validé.`);
  };

  // --- BOUTON DE CRÉDIT (ÉCHÉANCIER) HANDLERS ---
  const handleOpenCreditModal = (fournisseur?: Fournisseur, achatId?: string) => {
    const targetFournisseur = fournisseur || filteredFournisseurs[0];
    if (!targetFournisseur) return;

    setCreditFournisseurId(targetFournisseur.id);
    setCreditAchatId(achatId || 'global');
    setNewCreditLimit(targetFournisseur.plafondCredit || 30000);
    setNewPaymentDelay(targetFournisseur.delaiPaiement || 45);
    setCreditDownPayment(0);
    setCreditInstallmentsCount(3);
    setIsCreditModalOpen(true);
  };

  // Calculate schedule for credit
  const calculatedCreditSchedule = useMemo(() => {
    const targetFournisseur = fournisseurs.find(f => f.id === creditFournisseurId);
    if (!targetFournisseur) return [];

    const fin = getFournisseurFinancials(targetFournisseur.id);
    let totalBase = 0;
    if (creditAchatId !== 'global') {
      const a = fin.fournisseurAchats.find(item => item.id === creditAchatId);
      totalBase = a ? a.montantTTC : 0;
    } else {
      totalBase = fin.soldeDu > 0 ? fin.soldeDu : 12000;
    }

    const resteAFinancer = Math.max(0, totalBase - creditDownPayment);
    if (resteAFinancer <= 0 || creditInstallmentsCount <= 0) return [];

    const montantParEcheance = resteAFinancer / creditInstallmentsCount;
    const intervalDays = creditInterval === 'biweekly' ? 15 : creditInterval === 'quarterly' ? 90 : 30;

    const schedule = [];
    const baseDate = new Date(creditFirstDate);

    for (let i = 0; i < creditInstallmentsCount; i++) {
      const dueDate = new Date(baseDate.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
      schedule.push({
        numero: i + 1,
        date: dueDate.toISOString().split('T')[0],
        montant: montantParEcheance
      });
    }

    return schedule;
  }, [creditFournisseurId, creditAchatId, creditDownPayment, creditInstallmentsCount, creditInterval, creditFirstDate, fournisseurs]);

  const handleSaveCreditAgreement = (e: React.FormEvent) => {
    e.preventDefault();
    const targetFournisseur = fournisseurs.find(f => f.id === creditFournisseurId);
    if (!targetFournisseur) return;

    const updatedList = fournisseurs.map(f => {
      if (f.id === creditFournisseurId) {
        return {
          ...f,
          delaiPaiement: newPaymentDelay,
          plafondCredit: newCreditLimit
        };
      }
      return f;
    });

    onFournisseursChange(updatedList);

    const fin = getFournisseurFinancials(targetFournisseur.id);
    let totalBase = 0;
    if (creditAchatId !== 'global') {
      const a = fin.fournisseurAchats.find(item => item.id === creditAchatId);
      totalBase = a ? a.montantTTC : 0;
    } else {
      totalBase = fin.soldeDu > 0 ? fin.soldeDu : 12000;
    }

    const targetProj = projets.find(p => p.id === (targetFournisseur.projetId || selectedProjectId));
    generateCreditAgreementPdf(targetFournisseur as any, totalBase, creditDownPayment, calculatedCreditSchedule, targetProj);

    setIsCreditModalOpen(false);
    showToast(`Échéancier généré pour ${targetFournisseur.nom}.`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Fournisseurs & Sous-traitants
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            {isGlobal 
              ? 'Répertoire des partenaires, commandes et suivi des paiements.'
              : `Partenaires assignés au projet : ${currentProject?.nom || ''}.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nouveau Fournisseur */}
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nouveau Fournisseur</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportFournisseursPdf}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-xl text-xs font-semibold transition-colors"
            title="Télécharger la liste en PDF"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">picture_as_pdf</span>
            <span className="hidden md:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Clean 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Partenaires */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Partenaires</span>
            <p className="text-2xl font-black text-on-surface mt-1">{kpis.totalCount}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {kpis.countFournisseurs} fournisseurs • {kpis.countSousTraitants} sous-traitants
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">store</span>
          </div>
        </div>

        {/* Achats Totaux */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Achats Commandés</span>
            <p className="text-2xl font-black text-on-surface mt-1">
              {kpis.totalDepenses.toLocaleString('fr-FR')} <span className="text-xs font-medium text-on-surface-variant">DT</span>
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              {kpis.totalRegle.toLocaleString('fr-FR')} DT déjà réglés
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
          </div>
        </div>

        {/* Solde Restant Dû */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Reste à Payer (Dettes)</span>
            <p className={`text-2xl font-black mt-1 ${kpis.totalDettes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {kpis.totalDettes.toLocaleString('fr-FR')} <span className="text-xs font-medium text-on-surface-variant">DT</span>
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {kpis.countAvecDettes > 0 ? `${kpis.countAvecDettes} partenaire(s) en attente` : 'Tous les comptes sont à jour'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${kpis.totalDettes > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
            <span className="material-symbols-outlined text-[24px]">
              {kpis.totalDettes > 0 ? 'pending_actions' : 'check_circle'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-2xl p-2.5 shadow-xs">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTabFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTabFilter === 'all'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Tous ({fournisseursBase.length})
          </button>
          <button
            onClick={() => setActiveTabFilter('fournisseur')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTabFilter === 'fournisseur'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Fournisseurs ({kpis.countFournisseurs})
          </button>
          <button
            onClick={() => setActiveTabFilter('soustraitant')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTabFilter === 'soustraitant'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Sous-traitants ({kpis.countSousTraitants})
          </button>
          <button
            onClick={() => setActiveTabFilter('dette')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTabFilter === 'dette'
                ? 'bg-amber-600 text-white'
                : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            Avec Dettes ({kpis.countAvecDettes})
          </button>
        </div>

        {/* Search, Sort & View Mode */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface outline-none"
          >
            <option value="nom">Nom A-Z</option>
            <option value="achats">Plus d'achats</option>
            <option value="solde">Plus de dettes</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-xl p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' : 'text-on-surface-variant'}`}
              title="Vue Cartes"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' : 'text-on-surface-variant'}`}
              title="Vue Tableau"
            >
              <span className="material-symbols-outlined text-[18px]">table_rows</span>
            </button>
          </div>
        </div>

      </div>

      {/* Empty State */}
      {filteredFournisseurs.length === 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low text-on-surface-variant mx-auto flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[28px]">search_off</span>
          </div>
          <h3 className="text-sm font-bold text-on-surface">Aucun partenaire trouvé</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Essayez de modifier votre recherche ou ajoutez un nouveau fournisseur.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
          >
            + Ajouter un fournisseur
          </button>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && filteredFournisseurs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFournisseurs.map((fournisseur) => {
            const fin = getFournisseurFinancials(fournisseur.id);
            const isSousTraitant = fournisseur.typeTier === 'Sous-traitant' || fournisseur.categorie === 'Sous-traitant';

            return (
              <div 
                key={fournisseur.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4.5 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isSousTraitant ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        <span className="material-symbols-outlined text-[22px]">
                          {isSousTraitant ? 'engineering' : 'store'}
                        </span>
                      </div>
                      <div className="overflow-hidden">
                        <h3 
                          onClick={() => setSelectedFournisseurDetail(fournisseur)}
                          className="font-bold text-sm text-on-surface hover:text-primary transition-colors cursor-pointer truncate"
                          title={fournisseur.nom}
                        >
                          {fournisseur.nom}
                        </h3>
                        <p className="text-[11px] text-on-surface-variant font-mono">
                          {fournisseur.code || `FRN-${fournisseur.id}`} • {fournisseur.ville || 'Tunis'}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      isSousTraitant 
                        ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {fournisseur.categorie || (isSousTraitant ? 'Sous-traitant' : 'Grossiste')}
                    </span>
                  </div>

                  {/* Financials Row */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-surface-container-low/60 rounded-xl text-xs">
                    <div>
                      <span className="text-[11px] text-on-surface-variant block">Achats</span>
                      <span className="font-bold text-on-surface text-sm">{fin.totalAchete.toLocaleString('fr-FR')} DT</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-on-surface-variant block">Reste à payer</span>
                      <span className={`font-black text-sm ${fin.soldeDu > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {fin.soldeDu > 0 ? `${fin.soldeDu.toLocaleString('fr-FR')} DT` : '0 DT (À jour)'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Row */}
                  <div className="flex items-center justify-between text-xs text-on-surface-variant pb-2">
                    <a 
                      href={`tel:${fournisseur.telephone}`} 
                      className="flex items-center gap-1.5 hover:text-primary transition-colors truncate"
                    >
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      <span className="font-medium truncate">{fournisseur.telephone || 'Sans numéro'}</span>
                    </a>
                    {fournisseur.email && (
                      <a 
                        href={`mailto:${fournisseur.email}`} 
                        className="text-on-surface-variant hover:text-primary p-1"
                        title={fournisseur.email}
                      >
                        <span className="material-symbols-outlined text-[15px]">mail</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {/* Bouton Payer */}
                    <button
                      onClick={() => handleOpenPaymentModal(fournisseur)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px]">payments</span>
                      <span>Payer</span>
                    </button>

                    {/* Fiche Détails */}
                    <button
                      onClick={() => setSelectedFournisseurDetail(fournisseur)}
                      className="px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-medium transition-colors"
                    >
                      Fiche
                    </button>
                  </div>

                  {/* Quick actions (Commander, PDF, Modifier, Supprimer) */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setQuickPurchaseFournisseur(fournisseur)}
                      className="p-1.5 text-on-surface-variant hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Nouvelle commande"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                    </button>
                    <button
                      onClick={() => handleExportStatementPdf(fournisseur)}
                      className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-colors"
                      title="Relevé de compte PDF"
                    >
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(fournisseur)}
                      className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmationId(fournisseur.id)}
                      className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && filteredFournisseurs.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low font-bold text-on-surface-variant border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3">Fournisseur</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Total Achats</th>
                  <th className="px-4 py-3 text-right">Reste à Payer</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filteredFournisseurs.map(f => {
                  const fin = getFournisseurFinancials(f.id);
                  const isSousTraitant = f.typeTier === 'Sous-traitant' || f.categorie === 'Sous-traitant';

                  return (
                    <tr key={f.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-3">
                        <div 
                          onClick={() => setSelectedFournisseurDetail(f)}
                          className="font-bold text-on-surface hover:text-primary cursor-pointer"
                        >
                          {f.nom}
                        </div>
                        <div className="text-[11px] text-on-surface-variant font-mono">{f.code || `FRN-${f.id}`}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          isSousTraitant ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {f.categorie || (isSousTraitant ? 'Sous-traitant' : 'Fournisseur')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-on-surface font-medium">{f.telephone || '-'}</div>
                        <div className="text-[11px] text-on-surface-variant">{f.ville || 'Tunis'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-on-surface">
                        {fin.totalAchete.toLocaleString('fr-FR')} DT
                      </td>
                      <td className="px-4 py-3 text-right font-black">
                        <span className={fin.soldeDu > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          {fin.soldeDu > 0 ? `${fin.soldeDu.toLocaleString('fr-FR')} DT` : '0 DT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenPaymentModal(f)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                            title="Régler"
                          >
                            Payer
                          </button>
                          <button
                            onClick={() => setSelectedFournisseurDetail(f)}
                            className="p-1 text-on-surface-variant hover:text-primary rounded-lg"
                            title="Voir fiche"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                          <button
                            onClick={() => setQuickPurchaseFournisseur(f)}
                            className="p-1 text-on-surface-variant hover:text-blue-600 rounded-lg"
                            title="Commander"
                          >
                            <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(f)}
                            className="p-1 text-on-surface-variant hover:text-primary rounded-lg"
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmationId(f.id)}
                            className="p-1 text-on-surface-variant hover:text-error rounded-lg"
                            title="Supprimer"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Supplier Detail Drawer 360° */}
      {selectedFournisseurDetail && (
        <SupplierDetailModal
          fournisseur={selectedFournisseurDetail}
          onClose={() => setSelectedFournisseurDetail(null)}
          onEdit={(f) => {
            setSelectedFournisseurDetail(null);
            handleOpenEditModal(f);
          }}
          onOpenPayment={(f, aid) => {
            setSelectedFournisseurDetail(null);
            handleOpenPaymentModal(f, aid);
          }}
          onOpenCredit={(f, aid) => {
            setSelectedFournisseurDetail(null);
            handleOpenCreditModal(f, aid);
          }}
          onExportStatement={(f) => handleExportStatementPdf(f)}
          onUpdateRating={(fid, r) => {
            const updated = fournisseurs.map(f => f.id === fid ? { ...f, evaluationQualite: r } : f);
            onFournisseursChange(updated);
            showToast('Note enregistrée.');
          }}
          achats={achats}
          reglements={reglements}
          articles={articles}
          projets={projets}
          selectedProjectId={selectedProjectId}
          onNewPurchase={(f) => {
            setSelectedFournisseurDetail(null);
            setQuickPurchaseFournisseur(f);
          }}
        />
      )}

      {/* MODAL 2: Create / Edit Supplier Form */}
      <SupplierFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveSupplier}
        initialData={editingFournisseur}
        projets={projets}
        selectedProjectId={selectedProjectId}
        fournisseursCount={fournisseurs.length}
      />

      {/* MODAL 3: Quick Purchase Modal */}
      {quickPurchaseFournisseur && (
        <SupplierQuickPurchaseModal
          isOpen={true}
          onClose={() => setQuickPurchaseFournisseur(null)}
          fournisseur={quickPurchaseFournisseur}
          articles={articles}
          projets={projets}
          selectedProjectId={selectedProjectId}
          onSavePurchase={handleSaveQuickPurchase}
        />
      )}

      {/* MODAL 4: Payment Modal (Simple & Clean) */}
      {isPaymentModalOpen && (() => {
        const targetFournisseur = fournisseurs.find(f => f.id === paymentFournisseurId);
        const fin = targetFournisseur ? getFournisseurFinancials(targetFournisseur.id) : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
              
              <div className="p-4 sm:p-5 border-b border-outline-variant flex justify-between items-center bg-emerald-700 text-white">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[22px]">payments</span>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">Régler un Fournisseur</h3>
                    <p className="text-[11px] text-emerald-100">Enregistrer un décaissement et éditer le reçu</p>
                  </div>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-emerald-200 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleProcessPayment}>
                <div className="p-5 space-y-3.5 text-xs">
                  
                  {/* Select Fournisseur */}
                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Fournisseur Bénéficiaire</label>
                    <select
                      value={paymentFournisseurId}
                      onChange={(e) => {
                        const newFId = e.target.value;
                        setPaymentFournisseurId(newFId);
                        const newFin = getFournisseurFinancials(newFId);
                        setPaymentAmount(newFin.soldeDu > 0 ? newFin.soldeDu : 1000);
                        setPaymentAchatId('global');
                      }}
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
                    >
                      {fournisseursBase.map(f => {
                        const fFin = getFournisseurFinancials(f.id);
                        return (
                          <option key={f.id} value={f.id}>
                            {f.nom} {fFin.soldeDu > 0 ? `(Dette : ${fFin.soldeDu.toLocaleString('fr-FR')} DT)` : '(À jour)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Payment Amount & Shortcuts */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-emerald-950 text-xs">Montant à Payer (DT) *</label>
                      {fin && fin.soldeDu > 0 && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(fin.soldeDu)}
                          className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                        >
                          Tout régler ({fin.soldeDu} DT)
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full p-2.5 border-2 border-emerald-500 rounded-xl text-base font-black text-emerald-950 bg-white outline-none"
                    />
                  </div>

                  {/* Mode & Bank */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold text-on-surface mb-1 block">Mode de Paiement</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as any)}
                        className="w-full p-2 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                      >
                        <option value="Virement">Virement</option>
                        <option value="Chèque">Chèque</option>
                        <option value="Traite">Traite</option>
                        <option value="Espèces">Espèces</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-on-surface mb-1 block">Banque</label>
                      <input
                        type="text"
                        value={paymentBank}
                        onChange={(e) => setPaymentBank(e.target.value)}
                        placeholder="BIAT, STB..."
                        className="w-full p-2 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                      />
                    </div>
                  </div>

                  {/* Ref / Notes */}
                  <div>
                    <label className="font-bold text-on-surface mb-1 block">N° Chèque / Réf. Transaction</label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="VIR-1234, CHQ-5678..."
                      className="w-full p-2 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-mono"
                    />
                  </div>

                  {/* Receipt Checkbox */}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPrintReceipt}
                      onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-on-surface text-xs font-medium">
                      Télécharger automatiquement le reçu de paiement (PDF)
                    </span>
                  </label>
                </div>

                <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    Valider le Paiement
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 5: Credit & Échéancier Modal */}
      {isCreditModalOpen && (() => {
        const targetFournisseur = fournisseurs.find(f => f.id === creditFournisseurId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
              
              <div className="p-4 sm:p-5 border-b border-outline-variant flex justify-between items-center bg-purple-700 text-white">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">Échéancier & Plan de Crédit</h3>
                    <p className="text-[11px] text-purple-100">Simuler des facilités de paiement</p>
                  </div>
                </div>
                <button onClick={() => setIsCreditModalOpen(false)} className="text-purple-200 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveCreditAgreement}>
                <div className="p-5 space-y-3.5 text-xs">
                  
                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Fournisseur</label>
                    <div className="p-2.5 bg-surface-container-low rounded-xl font-bold text-on-surface">
                      {targetFournisseur?.nom}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold text-on-surface mb-1 block">Délai Négocié (Jours)</label>
                      <input
                        type="number"
                        value={newPaymentDelay}
                        onChange={(e) => setNewPaymentDelay(Number(e.target.value))}
                        className="w-full p-2 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-on-surface mb-1 block">Nombre d'Échéances</label>
                      <select
                        value={creditInstallmentsCount}
                        onChange={(e) => setCreditInstallmentsCount(Number(e.target.value))}
                        className="w-full p-2 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-bold"
                      >
                        {[1, 2, 3, 4, 6, 12].map(n => (
                          <option key={n} value={n}>{n} versements</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Schedule Preview */}
                  <div className="border border-outline-variant rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-low font-bold text-on-surface">
                        <tr>
                          <th className="px-3 py-1.5">Versement</th>
                          <th className="px-3 py-1.5">Date</th>
                          <th className="px-3 py-1.5 text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60">
                        {calculatedCreditSchedule.map((ech) => (
                          <tr key={ech.numero}>
                            <td className="px-3 py-1.5 text-purple-700 font-bold">N° {ech.numero}</td>
                            <td className="px-3 py-1.5 text-on-surface">{new Date(ech.date).toLocaleDateString('fr-FR')}</td>
                            <td className="px-3 py-1.5 text-right font-black text-on-surface">
                              {ech.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreditModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    Télécharger Accord PDF
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 6: Delete Confirmation */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-error/10 text-error mx-auto flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h3 className="font-bold text-base text-on-surface">Supprimer ce fournisseur ?</h3>
            <p className="text-xs text-on-surface-variant mt-1.5 mb-5">
              Cette action retirera le fournisseur de votre liste.
            </p>
            <div className="flex justify-center gap-2">
              <button 
                onClick={() => setDeleteConfirmationId(null)} 
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl"
              >
                Annuler
              </button>
              <button 
                onClick={() => handleDeleteFournisseur(deleteConfirmationId)} 
                className="px-5 py-2 text-xs font-bold text-white bg-error hover:bg-error/90 rounded-xl shadow-xs"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
