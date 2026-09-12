import React, { useState, useMemo } from 'react';
import {  Achat, Fournisseur, Article, Projet, LigneAchat, Reglement , Utilisateur, MouvementStock } from '../types';
import { generatePurchaseOrderPdf } from '../utils/pdfExportEngine';
import { getArticleStock, updateArticleStock } from '../utils/stockUtils';

interface AchatsProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  achats: Achat[];
  fournisseurs: Fournisseur[];
  articles: Article[];
  projets: Projet[];
  reglements: Reglement[];
  onAchatsChange: (achats: Achat[]) => void;
  onReglementsChange: (reglements: Reglement[]) => void;
  onArticlesChange?: (articles: Article[]) => void;
  mouvements?: MouvementStock[];
  onMouvementsChange?: (mouvements: MouvementStock[]) => void;
}

export function Achats({
  currentUser,
  selectedProjectId,
  achats,
  fournisseurs,
  articles,
  projets,
  reglements,
  onAchatsChange,
  onReglementsChange,
  onArticlesChange,
  mouvements,
  onMouvementsChange
}: AchatsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  // Modal State: Create Purchase
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjetId, setNewProjetId] = useState('');
  const [newSupplierId, setNewSupplierId] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueDate, setNewDueDate] = useState('');
  const [newLines, setNewLines] = useState<LigneAchat[]>([
    {
      id: 'l1',
      articleId: '',
      designation: '',
      quantite: 1,
      prixUnitaireHT: 0,
      tauxTVA: 19,
      totalHT: 0,
      totalTTC: 0
    }
  ]);
  const [newNotes, setNewNotes] = useState('');

  // Modal State: Quick Payment Supplier (Bouton Paiement)
  const [paymentModalAchat, setPaymentModalAchat] = useState<Achat | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Virement');
  const [payBank, setPayBank] = useState('BIAT');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Modal State: Supplier Credit & Due Date (Bouton Crédit)
  const [creditModalAchat, setCreditModalAchat] = useState<Achat | null>(null);
  const [newCreditDueDate, setNewCreditDueDate] = useState('');

  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);
  const isProjectActive = currentProject ? (currentProject.statut === 'Active' || currentProject.statut === 'Actif') : true;

  // Scoped Data
  const scopedAchats = useMemo(() => {
    return isGlobal ? achats : achats.filter(a => a.projetId === selectedProjectId);
  }, [achats, isGlobal, selectedProjectId]);

  const scopedFournisseurs = useMemo(() => {
    return isGlobal ? fournisseurs : fournisseurs.filter(f => f.projetId === selectedProjectId);
  }, [fournisseurs, isGlobal, selectedProjectId]);

  const scopedArticles = useMemo(() => {
    return isGlobal ? articles : articles.filter(a => a.projetId === selectedProjectId);
  }, [articles, isGlobal, selectedProjectId]);

  const scopedActiveArticles = useMemo(() => {
    return scopedArticles.filter(a => a.statut !== 'Inactif');
  }, [scopedArticles]);

  // Filtering
  const filteredAchats = useMemo(() => {
    return scopedAchats.filter(a => {
      const matchesSearch = a.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (a.fournisseurNom && a.fournisseurNom.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || a.statut === statusFilter;
      const matchesSupplier = supplierFilter === 'all' || a.fournisseurId === supplierFilter;
      return matchesSearch && matchesStatus && matchesSupplier;
    });
  }, [scopedAchats, searchTerm, statusFilter, supplierFilter]);

  // KPIs
  const totalAchatsTTC = scopedAchats.reduce((a, item) => a + item.montantTTC, 0);
  const totalPaye = scopedAchats.reduce((a, item) => a + (item.montantPaye ?? (item.statut === 'Payé' ? item.montantTTC : 0)), 0);
  const totalRestantDu = Math.max(0, totalAchatsTTC - totalPaye);

  // Line handling
  const handleLineArticleChange = (index: number, articleId: string) => {
    const art = scopedArticles.find(a => a.id === articleId);
    if (!art) return;

    const updated = [...newLines];
    const pu = art.prixAchatHT || 0;
    const tva = art.tva || 19;
    const qte = updated[index].quantite || 1;
    const totalHT = qte * pu;
    const totalTTC = totalHT * (1 + tva / 100);

    updated[index] = {
      ...updated[index],
      articleId: art.id,
      designation: art.designation,
      prixUnitaireHT: pu,
      tauxTVA: tva,
      totalHT,
      totalTTC
    };
    setNewLines(updated);
  };

  const handleLineQtyChange = (index: number, qte: number) => {
    const updated = [...newLines];
    const line = updated[index];
    const totalHT = qte * line.prixUnitaireHT;
    const totalTTC = totalHT * (1 + line.tauxTVA / 100);
    updated[index] = { ...line, quantite: qte, totalHT, totalTTC };
    setNewLines(updated);
  };

  const handleLinePriceChange = (index: number, pu: number) => {
    const updated = [...newLines];
    const line = updated[index];
    const totalHT = (line.quantite || 1) * pu;
    const totalTTC = totalHT * (1 + line.tauxTVA / 100);
    updated[index] = { ...line, prixUnitaireHT: pu, totalHT, totalTTC };
    setNewLines(updated);
  };

  const handleAddLine = () => {
    setNewLines([
      ...newLines,
      {
        id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        articleId: '',
        designation: '',
        quantite: 1,
        prixUnitaireHT: 0,
        tauxTVA: 19,
        totalHT: 0,
        totalTTC: 0
      }
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (newLines.length <= 1) return;
    setNewLines(newLines.filter((_, i) => i !== index));
  };

  const calculatedTotalHT = newLines.reduce((a, l) => a + (l.totalHT || 0), 0);
  const calculatedTotalTTC = newLines.reduce((a, l) => a + (l.totalTTC || 0), 0);

  // Open Create
  const handleOpenCreate = () => {
    setNewSupplierId(scopedFournisseurs[0]?.id || '');
    setNewDate(new Date().toISOString().split('T')[0]);
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setNewDueDate(due.toISOString().split('T')[0]);
    setNewNotes('');
    if (scopedArticles.length > 0) {
      const first = scopedArticles[0];
      const pu = first.prixAchatHT || 0;
      const tva = first.tva || 19;
      setNewLines([
        {
          id: 'l1',
          articleId: first.id,
          designation: first.designation,
          quantite: 1,
          prixUnitaireHT: pu,
          tauxTVA: tva,
          totalHT: pu,
          totalTTC: pu * (1 + tva / 100)
        }
      ]);
    }
    setIsCreateModalOpen(true);
  };

  // Save Purchase
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const handleOCRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsOCRProcessing(true);
    try {
      const formData = new FormData();
      formData.append("invoice", file);
      const res = await fetch("/api/ocr-invoice", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.fournisseurNom) {
        const existingSupplier = scopedFournisseurs.find(f => f.nom.toLowerCase() === data.fournisseurNom.toLowerCase());
        if (existingSupplier) setNewSupplierId(existingSupplier.id);
      }
      if (data.date) setNewDate(data.date);
      if (data.lignes && data.lignes.length > 0) {
        setNewLines(data.lignes.map((l: any, i: number) => ({
          id: `l${Date.now()}-${i}`,
          articleId: "",
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaireHT: l.prixUnitaireHT,
          tauxTVA: 19,
          totalHT: l.totalHT,
          totalTTC: l.totalTTC
        })));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur OCR");
    } finally {
      setIsOCRProcessing(false);
    }
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierId || newLines.length === 0) return;

    const supplier = scopedFournisseurs.find(f => f.id === newSupplierId);
    const year = new Date().getFullYear();
    const count = achats.length + 1;
    const numero = `BC-${year}-${count.toString().padStart(4, '0')}`;

    const newAchat: Achat = {
      id: `a-${Date.now()}`,
      numero,
      projetId: supplier?.projetId || (isGlobal ? (projets[0]?.id || 'p1') : selectedProjectId),
      fournisseurId: newSupplierId,
      fournisseurNom: supplier?.nom || 'Fournisseur',
      date: newDate,
      dateEcheance: newDueDate,
      montantHT: calculatedTotalHT,
      montantTTC: calculatedTotalTTC,
      montantPaye: 0,
      statut: 'Commandé',
      lignes: newLines,
      notes: newNotes
    };

    onAchatsChange([newAchat, ...achats]);
    setIsCreateModalOpen(false);
  };

  // Change Status Action
  const handleToggleStatus = (achat: Achat) => {
    const nextStatut: Achat['statut'] = 
      achat.statut === 'Commandé' ? 'Reçu' :
      achat.statut === 'Reçu' ? 'Payé' : 'Commandé';

    const updated = achats.map(a => {
      if (a.id === achat.id) {
        return {
          ...a,
          statut: nextStatut,
          montantPaye: nextStatut === 'Payé' ? a.montantTTC : a.montantPaye
        };
      }
      return a;
    });
    onAchatsChange(updated);

    // BF-STOCK-021: Stock Movement Logic when receiving an order
    if (achat.statut === 'Commandé' && nextStatut === 'Reçu' && onArticlesChange && onMouvementsChange && articles && mouvements) {
      const newMvts: MouvementStock[] = [];
      let updatedArticles = [...articles];

      achat.lignes?.forEach(line => {
        if (!line.articleId) return;
        const art = updatedArticles.find(a => a.id === line.articleId);
        if (art && art.typeArticle !== 'Service') {
          updatedArticles = updatedArticles.map(a => 
            a.id === art.id ? updateArticleStock(a, achat.projetId || 'p1', line.quantite) : a
          );

          newMvts.push({
            id: `mvt-ach-${Date.now()}-${art.id}`,
            projetId: achat.projetId || 'p1',
            articleId: art.id,
            designation: art.designation,
            type: 'Entrée',
            quantite: line.quantite,
            date: new Date().toISOString().split('T')[0],
            motif: `Réception achat ${achat.numero}`,
            reference: achat.numero,
            referencePiece: achat.numero,
            stockAvant: getArticleStock(art, achat.projetId || 'p1'),
            stockApres: getArticleStock(art, achat.projetId || 'p1') + line.quantite
          });
        }
      });
      onArticlesChange(updatedArticles);
      onMouvementsChange([...newMvts, ...mouvements]);
    }

    // Handle reversal (Reçu -> Commandé/Payé -> Commandé)
    if (nextStatut === 'Commandé' && (achat.statut === 'Reçu' || achat.statut === 'Payé') && onArticlesChange && onMouvementsChange && articles && mouvements) {
      const newMvts: MouvementStock[] = [];
      let updatedArticles = [...articles];

      achat.lignes?.forEach(line => {
        if (!line.articleId) return;
        const art = updatedArticles.find(a => a.id === line.articleId);
        if (art && art.typeArticle !== 'Service') {
          updatedArticles = updatedArticles.map(a => 
            a.id === art.id ? updateArticleStock(a, achat.projetId || 'p1', -line.quantite) : a
          );

          newMvts.push({
            id: `mvt-ach-rev-${Date.now()}-${art.id}`,
            projetId: achat.projetId || 'p1',
            articleId: art.id,
            designation: art.designation,
            type: 'Sortie', // Reversing the Entrée
            quantite: line.quantite,
            date: new Date().toISOString().split('T')[0],
            motif: `Annulation réception achat ${achat.numero}`,
            reference: achat.numero,
            referencePiece: achat.numero,
            stockAvant: getArticleStock(art, achat.projetId || 'p1'),
            stockApres: Math.max(0, getArticleStock(art, achat.projetId || 'p1') - line.quantite)
          });
        }
      });
      onArticlesChange(updatedArticles);
      onMouvementsChange([...newMvts, ...mouvements]);
    }
  };

  // Open Quick Payment (Bouton de Paiement Fournisseur)
  const handleOpenPayment = (achat?: Achat) => {
    const target = achat || scopedAchats.find(a => a.statut !== 'Payé') || scopedAchats[0];
    if (!target) return;
    const soldeRestant = Math.max(0, target.montantTTC - (target.montantPaye || 0));
    setPaymentModalAchat(target);
    setPayAmount(soldeRestant > 0 ? soldeRestant : target.montantTTC);
    setPayMode('Virement');
    setPayBank('BIAT');
    setPayRef(`VIR-${Date.now().toString().slice(-4)}`);
    setPayNotes(`Règlement fournisseur facture/BC ${target.numero}`);
  };

  // Save Quick Payment (Décaissement)
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalAchat || payAmount <= 0) return;

    const currentPaye = paymentModalAchat.montantPaye || 0;
    const newTotalPaye = Math.min(paymentModalAchat.montantTTC, currentPaye + payAmount);
    const isTotal = newTotalPaye >= paymentModalAchat.montantTTC;

    // Update Achat
    const updatedAchats = achats.map(a => {
      if (a.id === paymentModalAchat.id) {
        return {
          ...a,
          montantPaye: newTotalPaye,
          statut: (isTotal ? 'Payé' : 'Reçu') as Achat['statut']
        };
      }
      return a;
    });
    onAchatsChange(updatedAchats);

    // Create Reglement Décaissement
    const year = new Date().getFullYear();
    const count = reglements.length + 1;
    const newReg: Reglement = {
      id: `reg-dec-${Date.now()}`,
      numeroPiece: `DEC-${year}-${count.toString().padStart(4, '0')}`,
      projetId: paymentModalAchat.projetId,
      type: 'Décaissement',
      tierType: 'Fournisseur',
      tierId: paymentModalAchat.fournisseurId,
      tierNom: paymentModalAchat.fournisseurNom || 'Fournisseur',
      documentRef: paymentModalAchat.numero,
      date: new Date().toISOString().split('T')[0],
      montant: payAmount,
      modePaiement: payMode,
      banque: payBank,
      referencePaiement: payRef,
      notes: payNotes,
      statut: 'Validé'
    };
    onReglementsChange([newReg, ...reglements]);
    setPaymentModalAchat(null);
  };

  // Open Credit/Due Date Modal (Bouton de Crédit Fournisseur)
  const handleOpenCredit = (achat?: Achat) => {
    const target = achat || scopedAchats.find(a => a.statut !== 'Payé') || scopedAchats[0];
    if (!target) return;
    setCreditModalAchat(target);
    setNewCreditDueDate(target.dateEcheance || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  };

  // Save Credit/Due Date
  const handleSaveCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditModalAchat) return;

    const updated = achats.map(a => {
      if (a.id === creditModalAchat.id) {
        return {
          ...a,
          dateEcheance: newCreditDueDate
        };
      }
      return a;
    });
    onAchatsChange(updated);
    setCreditModalAchat(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Achats & Fournisseurs</h1>
              
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'comptable' ? (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold">
              <span className="material-symbols-outlined text-[18px] text-amber-600">verified</span>
              <span>Mode Audit & Contrôle des Dépenses</span>
            </div>
          ) : (
            <button
              onClick={handleOpenCreate}
              disabled={!isProjectActive}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl transition-all ${!isProjectActive ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md cursor-pointer'}`}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nouveau Bon d'Achat
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Volume Total Achats</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {totalAchatsTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">{scopedAchats.length} commandes enregistrées</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dépenses Réglées</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {totalPaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 block">Factures fournisseurs payées</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dettes Fournisseurs Restantes</span>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {totalRestantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-rose-600 font-semibold mt-1 block">À décaisser</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
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
              placeholder="Rechercher par N° Bon, fournisseur..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les Fournisseurs</option>
              {scopedFournisseurs.map(f => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="Commandé">Commandé</option>
              <option value="Reçu">Reçu</option>
              <option value="Payé">Payé</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">N° Bon d'Achat</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Fournisseur</th>
                <th className="py-3.5 px-4 text-right">Montant HT</th>
                <th className="py-3.5 px-4 text-right">Montant TTC</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions Rapides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAchats.map((achat) => {
                const supplier = scopedFournisseurs.find(f => f.id === achat.fournisseurId);

                return (
                  <tr key={achat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-amber-600">shopping_bag</span>
                      {achat.numero}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(achat.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900">{supplier?.nom || achat.fournisseurNom || 'Fournisseur'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                      {achat.montantHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {achat.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {currentUser.role === 'comptable' ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                            achat.statut === 'Payé'
                              ? 'bg-emerald-100 text-emerald-800'
                              : achat.statut === 'Reçu'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {achat.statut}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(achat)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            achat.statut === 'Payé'
                              ? 'bg-emerald-100 text-emerald-800'
                              : achat.statut === 'Reçu'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                          title="Cliquer pour faire évoluer le statut (Commandé -> Reçu -> Payé)"
                        >
                          {achat.statut}
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {currentUser.role !== 'comptable' && (
                          <>
                            {/* Bouton Paiement Fournisseur */}
                            <button
                              onClick={() => handleOpenPayment(achat)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                              title="Régler cet achat (Bouton Paiement)"
                            >
                              <span className="material-symbols-outlined text-[14px]">payments</span>
                              Payer
                            </button>

                            {/* Bouton Crédit Fournisseur */}
                            <button
                              onClick={() => handleOpenCredit(achat)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 hover:border-purple-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                              title="Modifier l'échéance crédit fournisseur"
                            >
                              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                              Crédit
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => generatePurchaseOrderPdf(achat, supplier, currentProject)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          title="Télécharger le Bon de Commande PDF"
                        >
                          <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAchats.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    Aucune commande d'achat trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[96vw] max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[26px]">shopping_cart</span>
                <label className="cursor-pointer ml-4 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                  {isOCRProcessing ? "Scan en cours..." : "Scanner Facture avec IA"}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleOCRUpload} disabled={isOCRProcessing} />
                </label>

                <h3 className="font-extrabold text-base text-slate-900">Créer un Bon de Commande Fournisseur</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Fournisseur *</label>
                  <select
                    value={newSupplierId}
                    onChange={(e) => setNewSupplierId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  >
                    {scopedFournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom} ({f.matriculeFiscal || 'Fournisseur'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Date de Commande</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Date d'Échéance Paiement</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">Articles Commandés</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-sm font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2.5">
                  {newLines.map((line, idx) => (
                    <div key={line.id || idx} className="grid grid-cols-12 gap-2.5 items-center bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-sm">
                      <div className="col-span-5">
                        <select
                          value={line.articleId}
                          onChange={(e) => handleLineArticleChange(idx, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-white"
                        >
                          <option value="">Sélectionner un article actif...</option>
                          {scopedActiveArticles.map(a => (
                            <option key={a.id} value={a.id}>{a.designation} (Achat: {a.prixAchatHT} DT)</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={line.quantite}
                          onChange={(e) => handleLineQtyChange(idx, parseFloat(e.target.value) || 1)}
                          placeholder="Qté"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-center bg-white"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={line.prixUnitaireHT}
                          onChange={(e) => handleLinePriceChange(idx, parseFloat(e.target.value) || 0)}
                          placeholder="P.U Achat HT"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-right bg-white"
                        />
                      </div>

                      <div className="col-span-2 text-right font-bold text-slate-900 text-base">
                        {(line.totalTTC || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Total Brut Achat HT :</span>
                  <span>{calculatedTotalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
                <div className="flex justify-between font-medium text-slate-600">
                  <span>TVA Récupérable :</span>
                  <span>{(calculatedTotalTTC - calculatedTotalHT).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-amber-200">
                  <span>Total TTC Commande :</span>
                  <span className="text-amber-800 text-lg">{calculatedTotalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Générer le Bon de Commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* QUICK PAYMENT MODAL (BOUTON DE PAIEMENT FOURNISSEUR) */}
      {paymentModalAchat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Bouton Paiement Fournisseur (Décaissement)</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Bon d'achat : {paymentModalAchat.numero}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalAchat(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              {/* Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Fournisseur :</span>
                  <span className="font-bold text-slate-900">{paymentModalAchat.fournisseurNom}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total TTC Achat :</span>
                  <span className="font-bold text-slate-900">
                    {paymentModalAchat.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Déjà Décaissé :</span>
                  <span className="font-bold text-emerald-600">
                    {(paymentModalAchat.montantPaye || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                  <span>Solde Restant Dû :</span>
                  <span className="text-rose-600">
                    {Math.max(0, paymentModalAchat.montantTTC - (paymentModalAchat.montantPaye || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </span>
                </div>
              </div>

              {/* Amount to Pay */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Montant à Décaisser (DT) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Math.max(0, paymentModalAchat.montantTTC - (paymentModalAchat.montantPaye || 0)) || paymentModalAchat.montantTTC}
                    value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">DT</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mode de Règlement</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement">Virement Bancaire</option>
                    <option value="Traite">Traite / Effet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Banque / Caisse</label>
                  <select
                    value={payBank}
                    onChange={(e) => setPayBank(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="BIAT">BIAT</option>
                    <option value="Attijari Bank">Attijari Bank</option>
                    <option value="BNA">BNA</option>
                    <option value="STB">STB</option>
                    <option value="Amen Bank">Amen Bank</option>
                    <option value="Caisse Centrale">Caisse Centrale Espèces</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">N° Pièce / Réf. Chèque / Virement</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="ex: VIR-9821, CHQ-4458"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalAchat(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Valider le Décaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREDIT MODAL (BOUTON DE CRÉDIT FOURNISSEUR) */}
      {creditModalAchat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Bouton Crédit / Échéance Fournisseur</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Commande : {creditModalAchat.numero}</p>
                </div>
              </div>
              <button
                onClick={() => setCreditModalAchat(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCredit} className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Fournisseur :</span>
                  <span className="font-bold text-slate-900">{creditModalAchat.fournisseurNom}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Montant Total TTC :</span>
                  <span className="font-bold text-slate-900">
                    {creditModalAchat.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Date d'émission :</span>
                  <span className="font-bold text-slate-700">
                    {new Date(creditModalAchat.date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nouvelle Date d'Échéance Accordée *
                </label>
                <input
                  type="date"
                  value={newCreditDueDate}
                  onChange={(e) => setNewCreditDueDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreditModalAchat(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Enregistrer l'Échéance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
