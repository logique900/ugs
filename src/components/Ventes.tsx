import { getArticleStock, hasLowStock, isOutOfStock } from '../utils/stockUtils';
import React, { useState, useMemo } from 'react';
import { Utilisateur, Vente, Client, Article, Projet, LigneVente, Reglement, MouvementStock } from '../types';
import { generateInvoicePdf, generateReceiptPdf, generateCreditAgreementPdf } from '../utils/pdfExportEngine';

interface VentesProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  ventes: Vente[];
  clients: Client[];
  articles: Article[];
  projets: Projet[];
  reglements: Reglement[];
  mouvements?: MouvementStock[];
  onVentesChange: (ventes: Vente[]) => void;
  onReglementsChange: (reglements: Reglement[]) => void;
  onClientsChange?: (clients: Client[]) => void;
  onArticlesChange?: (articles: Article[]) => void;
  onMouvementsChange?: (mouvements: MouvementStock[]) => void;
}

export function Ventes({
  currentUser,
  selectedProjectId,
  ventes,
  clients,
  articles,
  projets,
  reglements,
  mouvements = [],
  onVentesChange,
  onReglementsChange,
  onClientsChange,
  onArticlesChange,
  onMouvementsChange
}: VentesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  // Modal State: Create/Edit Invoice or Quote
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Facture' | 'Devis'>('Facture');
  const [newProjetId, setNewProjetId] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientMf, setNewClientMf] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueDate, setNewDueDate] = useState('');
  const [paymentOption, setPaymentOption] = useState<'Comptant' | 'Credit'>('Credit');
  const [immediatePaidAmount, setImmediatePaidAmount] = useState<number>(0);
  const [immediatePayMode, setImmediatePayMode] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Espèces');
  const [newLines, setNewLines] = useState<LigneVente[]>([
    {
      id: 'l1',
      articleId: '',
      designation: '',
      quantite: 1,
      prixUnitaireHT: 0,
      tauxTVA: 19,
      remisePourcentage: 0,
      totalHT: 0,
      totalTTC: 0
    }
  ]);
  const [newNotes, setNewNotes] = useState('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editStatut, setEditStatut] = useState<'Devis' | 'En Négociation' | 'Commande'>('Devis');

  // Modal State: Quick Payment (Bouton de Paiement)
  const [paymentModalSale, setPaymentModalSale] = useState<Vente | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Virement');
  const [payBank, setPayBank] = useState('BIAT');
  const [payRef, setPayRef] = useState('');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);

  // Modal State: Credit & Installment Schedule (Bouton de Crédit)
  const [creditModalSale, setCreditModalSale] = useState<Vente | null>(null);
  const [creditDownPayment, setCreditDownPayment] = useState<number>(0);
  const [creditInstallmentsCount, setCreditInstallmentsCount] = useState<number>(3);
  const [creditInterval, setCreditInterval] = useState<'monthly' | 'biweekly' | 'quarterly'>('monthly');
  const [creditFirstDate, setCreditFirstDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);
  const isProjectActive = currentProject ? (currentProject.statut === 'Active' || currentProject.statut === 'Actif') : true;

  // Scoped Data
  const scopedVentes = useMemo(() => {
    return isGlobal ? ventes : ventes.filter(v => v.projetId === selectedProjectId);
  }, [ventes, isGlobal, selectedProjectId]);

  const scopedClients = useMemo(() => {
    return isGlobal ? clients : clients.filter(c => c.projetId === selectedProjectId);
  }, [clients, isGlobal, selectedProjectId]);

  const scopedArticles = useMemo(() => {
    return isGlobal ? articles : articles.filter(a => a.projetId === selectedProjectId);
  }, [articles, isGlobal, selectedProjectId]);

  const scopedActiveArticles = useMemo(() => {
    return scopedArticles.filter(a => a.statut !== 'Inactif');
  }, [scopedArticles]);

  // Filtering
  const filteredVentes = useMemo(() => {
    return scopedVentes.filter(v => {
      const matchesSearch = v.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (v.clientNom && v.clientNom.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || v.statut === statusFilter;
      const matchesClient = clientFilter === 'all' || v.clientId === clientFilter;
      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [scopedVentes, searchTerm, statusFilter, clientFilter]);

  // Financial Metrics
  const totalFactureTTC = scopedVentes.filter(v => v.statut !== 'Devis' && v.statut !== 'Annulée').reduce((a, v) => a + v.montantTTC, 0);
  const totalEncaisse = scopedVentes.reduce((a, v) => a + (v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0)), 0);
  const totalRestantDu = Math.max(0, totalFactureTTC - totalEncaisse);
  const totalDevis = scopedVentes.filter(v => v.statut === 'Devis').reduce((a, v) => a + v.montantTTC, 0);

  // Line calculations for creation modal
  const handleLineArticleChange = (index: number, articleId: string) => {
    const art = scopedArticles.find(a => a.id === articleId);
    if (!art) return;

    const updated = [...newLines];
    const pu = art.prixVenteHT || 0;
    const tva = art.tva || 19;
    const qte = updated[index].quantite || 1;
    const remise = updated[index].remisePourcentage || 0;

    const totalHT = qte * pu * (1 - remise / 100);
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
    const totalHT = qte * line.prixUnitaireHT * (1 - (line.remisePourcentage || 0) / 100);
    const totalTTC = totalHT * (1 + line.tauxTVA / 100);
    updated[index] = { ...line, quantite: qte, totalHT, totalTTC };
    setNewLines(updated);
  };

  const handleLinePriceChange = (index: number, pu: number) => {
    const updated = [...newLines];
    const line = updated[index];
    const totalHT = (line.quantite || 1) * pu * (1 - (line.remisePourcentage || 0) / 100);
    const totalTTC = totalHT * (1 + line.tauxTVA / 100);
    updated[index] = { ...line, prixUnitaireHT: pu, totalHT, totalTTC };
    setNewLines(updated);
  };

  const handleLineDiscountChange = (index: number, discount: number) => {
    const updated = [...newLines];
    const line = updated[index];
    const totalHT = (line.quantite || 1) * line.prixUnitaireHT * (1 - (discount || 0) / 100);
    const totalTTC = totalHT * (1 + line.tauxTVA / 100);
    updated[index] = { ...line, remisePourcentage: discount, totalHT, totalTTC };
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
        remisePourcentage: 0,
        totalHT: 0,
        totalTTC: 0
      }
    ]);
  };

  const handleAddServiceLine = (type: 'Main d\'œuvre' | 'Livraison') => {
    const serviceArticle = articles.find(a => a.designation === type && a.typeArticle === 'Service');
    const pu = serviceArticle?.prixVenteHT || 0;
    const tva = serviceArticle?.tva || 19;
    
    setNewLines([
      ...newLines,
      {
        id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        articleId: serviceArticle?.id || '',
        designation: type,
        quantite: 1,
        prixUnitaireHT: pu,
        tauxTVA: tva,
        remisePourcentage: 0,
        totalHT: pu,
        totalTTC: pu * (1 + tva / 100)
      }
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (newLines.length <= 1) return;
    setNewLines(newLines.filter((_, i) => i !== index));
  };

  const calculatedTotalHT = newLines.reduce((a, l) => a + (l.totalHT || 0), 0);
  const calculatedTotalTTC = newLines.reduce((a, l) => a + (l.totalTTC || 0), 0);

  const handleOpenEditModal = (vente: Vente) => {
    setEditingSaleId(vente.id);
    setModalMode(vente.statut === 'Facture' || vente.statut === 'Payée' ? 'Facture' : 'Devis');
    setEditStatut(vente.statut as any);
    setNewClientId(vente.clientId);
    setNewDate(vente.date);
    setNewDueDate(vente.dateEcheance || vente.date);
    setPaymentOption(vente.statut === 'Payée' ? 'Comptant' : 'Credit');
    setImmediatePaidAmount(vente.montantPaye || 0);
    setNewNotes(vente.notes || '');
    setNewLines(vente.lignes || []);
    setIsCreateModalOpen(true);
  };

  // Open Create Modal
  const handleOpenCreateModal = (mode: 'Facture' | 'Devis', forceCredit = false) => {
    setEditingSaleId(null);
    setEditStatut(mode === 'Devis' ? 'Devis' : 'Facture' as any);
    setModalMode(mode);
    setNewClientId(scopedClients[0]?.id || '');
    setNewClientName('');
    setNewClientPhone('');
    setNewClientMf('');
    setNewDate(new Date().toISOString().split('T')[0]);
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setNewDueDate(due.toISOString().split('T')[0]);
    setPaymentOption(forceCredit ? 'Credit' : 'Credit');
    setImmediatePaidAmount(0);
    setNewNotes('');
    const defaultLines: LigneVente[] = [];
    const moArticle = scopedActiveArticles.find(a => a.id === 'mo-install');
    
    if (moArticle) {
      const moPu = moArticle.prixVenteHT || 0;
      const moTva = moArticle.tva || 19;
      defaultLines.push({
        id: `l-mo-${Date.now()}`,
        articleId: moArticle.id,
        designation: moArticle.designation,
        quantite: 1,
        prixUnitaireHT: moPu,
        tauxTVA: moTva,
        remisePourcentage: 0,
        totalHT: moPu,
        totalTTC: moPu * (1 + moTva / 100)
      });
    }

    const firstStandardArt = scopedActiveArticles.find(a => a.id !== 'mo-install');
    if (firstStandardArt) {
      const pu = firstStandardArt.prixVenteHT || 0;
      const tva = firstStandardArt.tva || 19;
      defaultLines.push({
        id: `l-std-${Date.now()}`,
        articleId: firstStandardArt.id,
        designation: firstStandardArt.designation,
        quantite: 1,
        prixUnitaireHT: pu,
        tauxTVA: tva,
        remisePourcentage: 0,
        totalHT: pu,
        totalTTC: pu * (1 + tva / 100)
      });
    }

    if (defaultLines.length === 0) {
      defaultLines.push({
        id: 'l1',
        articleId: '',
        designation: '',
        quantite: 1,
        prixUnitaireHT: 0,
        tauxTVA: 19,
        remisePourcentage: 0,
        totalHT: 0,
        totalTTC: 0
      });
    }
    
    setNewLines(defaultLines);
    setIsCreateModalOpen(true);
  };

  // Submit Create Sale
  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newClientId || (newClientId === 'NEW' && !newClientName.trim())) || newLines.length === 0) return;

    const targetProjetId = selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId;

    // BF-STOCK-007: Out of stock check & negative stock prevention for invoices
    if (modalMode === 'Facture') {
      for (const line of newLines) {
        if (!line.articleId) continue;
        const art = articles.find(a => a.id === line.articleId);
        if (art && art.typeArticle !== 'Service') {
          const availStock = getArticleStock(art, targetProjetId);
          if (availStock <= 0) {
            alert(`🔴 RUPTURE DE STOCK : Impossible d'effectuer la vente. Le produit "${art.designation}" est en rupture (stock = 0).`);
            return;
          }
          if (line.quantite > availStock) {
            alert(`⚠️ STOCK INSUFFISANT : La quantité demandée (${line.quantite}) dépasse le stock disponible (${availStock}) pour "${art.designation}".`);
            return;
          }
        }
      }
    }

    let clientIdToUse = newClientId;
    let clientNomToUse = '';

    if (newClientId === 'NEW') {
      const newClientObj: Client = {
        id: `c-${Date.now()}`,
        projetId: selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId,
        code: `CLI-${Date.now().toString().slice(-4)}`,
        nom: newClientName.trim(),
        email: '',
        telephone: newClientPhone.trim() || '',
        matriculeFiscal: newClientMf.trim() || undefined,
        adresse: 'Adresse non spécifiée',
        ville: 'Tunis',
        plafondCredit: 5000,
        soldeInitial: 0
      };
      if (onClientsChange) {
        onClientsChange([newClientObj, ...clients]);
      }
      clientIdToUse = newClientObj.id;
      clientNomToUse = newClientObj.nom;
    } else {
      const client = scopedClients.find(c => c.id === newClientId);
      clientNomToUse = client?.nom || 'Client';
    }

    const prefix = modalMode === 'Facture' ? 'FAC' : 'DEV';
    const year = new Date().getFullYear();
    const count = ventes.filter(v => v.statut === modalMode).length + 1;
    
    // Use existing number if editing, else generate new
    const existingSale = editingSaleId ? ventes.find(v => v.id === editingSaleId) : null;
    const numero = existingSale ? existingSale.numero : `${prefix}-${year}-${count.toString().padStart(4, '0')}`;

    const isComptant = modalMode === 'Facture' && paymentOption === 'Comptant';
    const initialPaid = isComptant ? calculatedTotalTTC : immediatePaidAmount;

    let finalStatut: any = isComptant ? 'Payée' : modalMode;
    if (editingSaleId && modalMode === 'Devis') {
      finalStatut = editStatut;
    }

    const newSale: Vente = {
      id: existingSale ? existingSale.id : `v-${Date.now()}`,
      numero,
      projetId: existingSale ? existingSale.projetId : (selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId),
      clientId: clientIdToUse,
      clientNom: clientNomToUse,
      date: newDate,
      dateEcheance: isComptant ? newDate : newDueDate,
      montantHT: calculatedTotalHT,
      montantTTC: calculatedTotalTTC,
      montantPaye: initialPaid,
      statut: finalStatut,
      lignes: newLines,
      notes: newNotes
    };

    if (existingSale) {
      onVentesChange(ventes.map(v => v.id === existingSale.id ? newSale : v));
    } else {
      onVentesChange([newSale, ...ventes]);
    }

    // Update stock and register stock movement if it's a NEW Invoice (BF-PROD-021)
    if (modalMode === 'Facture' && !existingSale) {
      const currentBoutiqueNom = projets.find(p => p.id === newSale.projetId)?.nom || 'Sfax Centre';
      const newStockMvs: MouvementStock[] = [];

      if (onArticlesChange && articles) {
        const updatedArticles = articles.map(art => {
          const lineMatch = newLines.find(l => l.articleId === art.id);
          if (lineMatch && art.typeArticle !== 'Service') {
            const stockAvant = getArticleStock(art, newSale.projetId);
            const stockApres = Math.max(0, stockAvant - lineMatch.quantite);

            newStockMvs.push({
              id: `mvt-vte-${Date.now()}-${art.id}`,
              projetId: newSale.projetId,
              articleId: art.id,
              designation: art.designation,
              type: 'Sortie',
              quantite: lineMatch.quantite,
              date: newDate,
              motif: `Vente ${numero}`,
              reference: numero,
              referencePiece: numero,
              auteur: currentUser?.nom || 'Commercial',
              boutique: currentBoutiqueNom,
              stockAvant,
              stockApres
            });

            return {
              ...art,
              stock: stockApres,
              stocks: {
                ...(art.stocks || {}),
                [newSale.projetId]: stockApres
              }
            };
          }
          return art;
        });
        onArticlesChange(updatedArticles);
      }

      if (onMouvementsChange && newStockMvs.length > 0) {
        onMouvementsChange([...newStockMvs, ...mouvements]);
      }
    }

    // If initial payment was made, generate reglement
    if (initialPaid > 0) {
      const newReg: Reglement = {
        id: `reg-${Date.now()}`,
        projetId: newSale.projetId,
        numeroPiece: `ENC-${Date.now().toString().slice(-5)}`,
        type: 'Encaissement',
        tierId: newSale.clientId,
        tierNom: clientNomToUse,
        tierType: 'Client',
        documentRef: newSale.numero,
        date: newDate,
        montant: initialPaid,
        modePaiement: immediatePayMode,
        banque: 'Caisse Principale',
        referencePaiement: `Paiement Initial ${newSale.numero}`,
        notes: isComptant ? 'Règlement comptant intégral' : 'Acompte initial sur vente à crédit',
        statut: 'Validé'
      };
      onReglementsChange([newReg, ...reglements]);
    }

    setIsCreateModalOpen(false);
  };

  // Convert Quote to Commande or Invoice
  const handleConvertQuote = (quote: Vente, target: 'Commande' | 'Facture') => {
    const year = new Date().getFullYear();
    const prefix = target === 'Facture' ? 'FAC' : 'CMD';
    const count = ventes.filter(v => v.statut === target || (target === 'Facture' && v.statut === 'Payée')).length + 1;
    const newNumero = `${prefix}-${year}-${count.toString().padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const updated = ventes.map(v => {
      if (v.id === quote.id) {
        return {
          ...v,
          numero: newNumero,
          statut: target as any,
          date: today
        };
      }
      return v;
    });
    onVentesChange(updated);

    // Update article stock & register stock movements ONLY if going to Facture
    if (target === 'Facture' && quote.lignes && quote.lignes.length > 0) {
      const boutiqueNom = projets.find(p => p.id === quote.projetId)?.nom || 'Sfax Centre';
      const newMvts: MouvementStock[] = [];

      if (onArticlesChange && articles) {
        const updatedArticles = articles.map(art => {
          const lineMatch = quote.lignes?.find(l => l.articleId === art.id);
          if (lineMatch && art.typeArticle !== 'Service') {
            const stockAvant = getArticleStock(art, quote.projetId);
            const stockApres = Math.max(0, stockAvant - lineMatch.quantite);

            newMvts.push({
              id: `mvt-quote-${Date.now()}-${art.id}`,
              projetId: quote.projetId,
              articleId: art.id,
              designation: art.designation,
              type: 'Sortie',
              quantite: lineMatch.quantite,
              date: today,
              motif: `Vente (Conversion Devis) ${newNumero}`,
              reference: newNumero,
              referencePiece: newNumero,
              auteur: currentUser?.nom || 'Commercial',
              boutique: boutiqueNom,
              stockAvant,
              stockApres
            });

            return {
              ...art,
              stock: stockApres,
              stocks: {
                ...(art.stocks || {}),
                [quote.projetId]: stockApres
              }
            };
          }
          return art;
        });
        onArticlesChange(updatedArticles);
      }

      if (onMouvementsChange && newMvts.length > 0) {
        onMouvementsChange([...newMvts, ...mouvements]);
      }
    }
  };

  // Open Payment Modal (Bouton de Paiement)
  const handleOpenPayment = (v: Vente) => {
    setPaymentModalSale(v);
    const paid = v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0);
    const remaining = Math.max(0, v.montantTTC - paid);
    setPayAmount(remaining);
    setPayRef(`REG-${Date.now().toString().slice(-4)}`);
  };

  // Confirm Payment Action
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalSale || payAmount <= 0) return;

    const curPaid = paymentModalSale.montantPaye ?? (paymentModalSale.statut === 'Payée' ? paymentModalSale.montantTTC : 0);
    const newPaid = curPaid + payAmount;
    const isFull = newPaid >= paymentModalSale.montantTTC;

    const updated = ventes.map(v => {
      if (v.id === paymentModalSale.id) {
        return {
          ...v,
          montantPaye: newPaid,
          statut: isFull ? ('Payée' as const) : ('Facture' as const)
        };
      }
      return v;
    });
    onVentesChange(updated);

    const client = scopedClients.find(c => c.id === paymentModalSale.clientId);
    const newReg: Reglement = {
      id: `reg-${Date.now()}`,
      projetId: paymentModalSale.projetId,
      numeroPiece: `REC-${Date.now().toString().slice(-5)}`,
      type: 'Encaissement',
      tierId: paymentModalSale.clientId,
      tierNom: client?.nom || 'Client',
      tierType: 'Client',
      documentRef: paymentModalSale.numero,
      date: new Date().toISOString().split('T')[0],
      montant: payAmount,
      modePaiement: payMode,
      banque: payBank,
      referencePaiement: payRef,
      notes: `Règlement pour facture ${paymentModalSale.numero}`,
      statut: 'Validé'
    };

    onReglementsChange([newReg, ...reglements]);

    if (autoPrintReceipt) {
      generateReceiptPdf(newReg, currentProject);
    }

    setPaymentModalSale(null);
  };

  // Open Credit Modal (Bouton de Crédit)
  const handleOpenCreditModal = (v: Vente) => {
    setCreditModalSale(v);
    const paid = v.montantPaye ?? 0;
    setCreditDownPayment(paid);
    setCreditInstallmentsCount(3);
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setCreditFirstDate(due.toISOString().split('T')[0]);
  };

  // Calculated installments for Credit Modal
  const calculatedCreditSchedule = useMemo(() => {
    if (!creditModalSale) return [];
    const solde = Math.max(0, creditModalSale.montantTTC - creditDownPayment);
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
  }, [creditModalSale, creditDownPayment, creditInstallmentsCount, creditInterval, creditFirstDate]);

  // Download Credit Agreement PDF
  const handleDownloadCreditAgreement = () => {
    if (!creditModalSale) return;
    const client = scopedClients.find(c => c.id === creditModalSale.clientId) || {
      id: creditModalSale.clientId,
      nom: creditModalSale.clientNom || 'Client',
      email: '',
      telephone: '+216 71 000 000',
      adresse: 'Tunis, Tunisie'
    };

    generateCreditAgreementPdf(
      client,
      creditModalSale.montantTTC,
      creditDownPayment,
      calculatedCreditSchedule,
      currentProject,
      creditModalSale.numero
    );
  };

  // Confirm Credit Arrangement
  const handleConfirmCreditArrangement = () => {
    if (!creditModalSale || calculatedCreditSchedule.length === 0) return;

    const lastEcheance = calculatedCreditSchedule[calculatedCreditSchedule.length - 1].date;
    const updated = ventes.map(v => {
      if (v.id === creditModalSale.id) {
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
    setCreditModalSale(null);
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'Payée':
        return <span className="inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">Payée</span>;
      case 'Facture':
        return <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">Facture (À crédit)</span>;
      case 'Devis':
        return <span className="inline-flex items-center px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">Devis</span>;
      case 'En Négociation':
        return <span className="inline-flex items-center px-2.5 py-1 bg-fuchsia-100 text-fuchsia-800 rounded-lg text-xs font-bold shadow-[0_0_8px_rgba(217,70,239,0.2)]">En Négociation</span>;
      case 'Commande':
        return <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold">Commande</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold">{statut}</span>;
    }
  };

  // Selected client details for credit ceiling check in creation modal
  const selectedClientObject = scopedClients.find(c => c.id === newClientId);
  const clientOutstandingDebt = useMemo(() => {
    if (!selectedClientObject) return 0;
    return scopedVentes
      .filter(v => v.clientId === selectedClientObject.id && v.statut !== 'Devis' && v.statut !== 'Annulée')
      .reduce((a, v) => a + (v.montantTTC - (v.montantPaye || 0)), 0);
  }, [scopedVentes, selectedClientObject]);

  const clientPlafond = selectedClientObject?.plafondCredit || 25000;
  const clientAvailableCredit = Math.max(0, clientPlafond - clientOutstandingDebt);

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">
                {selectedProjectId === '2' ? 'receipt_long' : 'assignment'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {selectedProjectId === '2' ? 'Journal de Caisse' : selectedProjectId === '1' ? 'Bons & Devis' : 'Gestion des Ventes'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedProjectId === '2' ? 'Historique des tickets et encaissements' : 'Facturation, suivi des devis et encaissements'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenCreateModal('Devis')}
            disabled={!isProjectActive}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-xl transition-all ${!isProjectActive ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer'}`}
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            Nouveau Devis
          </button>

          <button
            onClick={() => handleOpenCreateModal('Facture')}
            disabled={!isProjectActive}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-xl transition-all ${!isProjectActive ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer'}`}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouvelle Facture
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Facturé TTC</span>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {totalFactureTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">{scopedVentes.filter(v => v.statut !== 'Devis').length} factures émises</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Encaissé (Paiements)</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {totalEncaisse.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 block">Règlements perçus</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total à Recouvrer (Crédits)</span>
          <p className="text-2xl font-black text-rose-600 mt-2">
            {totalRestantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-rose-600 font-semibold mt-1 block">En-cours & facilités accordées</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Devis en Cours</span>
          <p className="text-2xl font-black text-amber-700 mt-2">
            {totalDevis.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-amber-700 font-semibold mt-1 block">{scopedVentes.filter(v => v.statut === 'Devis').length} devis actifs</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par N° facture, client..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les Clients</option>
              {scopedClients.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="Devis">Devis</option>
              <option value="Facture">Factures en attente (Crédit)</option>
              <option value="Payée">Factures payées</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">N° Document</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4 text-right">Montant HT</th>
                <th className="py-3.5 px-4 text-right">Montant TTC</th>
                <th className="py-3.5 px-4 text-right">Réglé / Restant</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-right">Boutons d'Actions Rapides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredVentes.map((vente) => {
                const client = scopedClients.find(c => c.id === vente.clientId);
                const paid = vente.montantPaye ?? (vente.statut === 'Payée' ? vente.montantTTC : 0);
                const remaining = Math.max(0, vente.montantTTC - paid);
                const isOverdue = vente.statut === 'Facture' && vente.dateEcheance && new Date(vente.dateEcheance) < new Date();

                return (
                  <tr key={vente.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-blue-500">
                        {vente.statut === 'Devis' ? 'description' : 'receipt_long'}
                      </span>
                      {vente.numero}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(vente.date).toLocaleDateString('fr-FR')}
                      {vente.dateEcheance && vente.statut === 'Facture' && (
                        <span className={`block text-[10px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          Éch. {new Date(vente.dateEcheance).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900">{client?.nom || vente.clientNom || 'Client'}</span>
                      {client?.matriculeFiscal && (
                        <span className="block text-[10px] text-slate-400">{client.matriculeFiscal}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {vente.montantHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {vente.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {vente.statut === 'Devis' ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <div>
                          <span className={`font-bold ${paid >= vente.montantTTC ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {paid.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                          </span>
                          {remaining > 0 && (
                            <span className="block text-[10px] text-rose-600 font-semibold">
                              Reste: {remaining.toLocaleString('fr-FR')} DT
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(vente.statut)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Download PDF Button */}
                        <button
                          onClick={() => generateInvoicePdf(vente, client, currentProject)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          title="Télécharger Facture PDF"
                        >
                          <span className="material-symbols-outlined text-[13px]">picture_as_pdf</span>
                          PDF
                        </button>

                        {/* Edit / Négocier Devis */}
                        {(vente.statut === 'Devis' || vente.statut === 'En Négociation') && (
                          <button
                            onClick={() => handleOpenEditModal(vente)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-600 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Négocier ou Modifier ce Devis"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit_note</span>
                            Négocier
                          </button>
                        )}

                        {/* Convert to Commande */}
                        {(vente.statut === 'Devis' || vente.statut === 'En Négociation') && (
                          <button
                            onClick={() => handleConvertQuote(vente, 'Commande')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Convertir en Commande"
                          >
                            <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
                            Commande
                          </button>
                        )}

                        {/* Convert Quote / Commande to Invoice */}
                        {(vente.statut === 'Devis' || vente.statut === 'En Négociation' || vente.statut === 'Commande') && (
                          <button
                            onClick={() => handleConvertQuote(vente, 'Facture')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Convertir en Facture"
                          >
                            <span className="material-symbols-outlined text-[14px]">transform</span>
                            Facturer
                          </button>
                        )}

                        {/* BOUTON DE PAIEMENT */}
                        {vente.statut === 'Facture' && remaining > 0 && (
                          <button
                            onClick={() => handleOpenPayment(vente)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer hover:scale-105"
                            title="Encaisser un paiement partiel ou total"
                          >
                            <span className="material-symbols-outlined text-[14px]">payments</span>
                            Paiement
                          </button>
                        )}

                        {/* BOUTON DE CRÉDIT */}
                        {vente.statut === 'Facture' && remaining > 0 && (
                          <button
                            onClick={() => handleOpenCreditModal(vente)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 hover:bg-purple-600 text-purple-800 hover:text-white border border-purple-200 hover:border-purple-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer hover:scale-105"
                            title="Planifier ou restructurer un calendrier d'échéances de crédit"
                          >
                            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                            Crédit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredVentes.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                    Aucun document de vente trouvé.
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[96vw] max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[26px]">
                  {modalMode === 'Facture' ? 'receipt_long' : 'description'}
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingSaleId ? (modalMode === 'Facture' ? 'Modifier Facture' : 'Négocier / Modifier Devis') : `Créer un(e) ${modalMode === 'Facture' ? 'Nouvelle Facture de Vente' : 'Nouveau Devis Client'}`}
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveSale} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
              {isGlobal && (
                <div className="grid grid-cols-1 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Boutique d'affectation (Obligatoire en vue globale)</label>
                    <select
                      required
                      value={newProjetId}
                      onChange={(e) => setNewProjetId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {projets.map(p => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">barcode_scanner</span>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-indigo-900 block mb-1">Scan Rapide Code-barres</label>
                  <input type="text" placeholder="Scannez ou saisissez un code article et appuyez sur Entrée..." className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const code = e.currentTarget.value;
                      const art = scopedArticles.find(a => a.code === code || (a.codeBarres && a.codeBarres.includes(code)));
                      if (art) {
                        setNewLines([...newLines, { id: `l${Date.now()}`, articleId: art.id, designation: art.designation, quantite: 1, prixUnitaireHT: art.prixVenteHT, remise: 0, tauxTVA: art.tva || 19, totalHT: art.prixVenteHT, totalTTC: art.prixVenteHT * (1 + (art.tva || 19)/100) }]);
                        e.currentTarget.value = "";
                      } else {
                        alert("Article introuvable pour ce code-barres.");
                      }
                    }
                  }} />
                </div>
              </div>

              <div className={`grid grid-cols-1 ${editingSaleId && modalMode === 'Devis' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Client *</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (newClientId === 'NEW') {
                          setNewClientId(scopedClients[0]?.id || '');
                        } else {
                          setNewClientId('NEW');
                        }
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                    >
                      {newClientId === 'NEW' ? 'Choisir existant' : '+ Nouveau client'}
                    </button>
                  </div>
                  {newClientId === 'NEW' ? (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Nom du nouveau client *"
                        required
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 bg-blue-50/50"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newClientPhone}
                          onChange={(e) => setNewClientPhone(e.target.value)}
                          placeholder="Téléphone"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        />
                        <input
                          type="text"
                          value={newClientMf}
                          onChange={(e) => setNewClientMf(e.target.value)}
                          placeholder="Matricule Fiscal"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <select
                      value={newClientId}
                      onChange={(e) => setNewClientId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                    >
                      <option value="">Sélectionner un client...</option>
                      {scopedClients.map(c => (
                        <option key={c.id} value={c.id}>{c.nom} {c.matriculeFiscal ? `(${c.matriculeFiscal})` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Date d'Émission *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Date d'Échéance</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
                  />
                </div>

                {editingSaleId && modalMode === 'Devis' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Statut Devis</label>
                    <select
                      value={editStatut}
                      onChange={(e) => setEditStatut(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-indigo-500"
                    >
                      <option value="Devis">Devis (Standard)</option>
                      <option value="En Négociation">En Négociation</option>
                      <option value="Commande">Converti en Commande</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Client Credit Solvency Status Widget */}
              {selectedClientObject && modalMode === 'Facture' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-600 text-[20px]">verified_user</span>
                    <span>
                      Plafond Crédit Autorisé : <strong className="text-slate-900">{clientPlafond.toLocaleString('fr-FR')} DT</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">
                      En-cours actuel : <strong className="text-rose-600">{clientOutstandingDebt.toLocaleString('fr-FR')} DT</strong>
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs">
                      Disponible : {clientAvailableCredit.toLocaleString('fr-FR')} DT
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Mode Selector: Comptant vs Crédit */}
              {modalMode === 'Facture' && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-950 uppercase">Modalité de Paiement & Crédit :</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentOption('Credit')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          paymentOption === 'Credit'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        📈 Vente à Crédit (Échéances)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentOption('Comptant')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          paymentOption === 'Comptant'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        💳 Paiement Comptant (Immédiat)
                      </button>
                    </div>
                  </div>

                  {paymentOption === 'Credit' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-sm">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Acompte Initial Versé (DT)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={immediatePaidAmount}
                          onChange={(e) => setImmediatePaidAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00 DT"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mode de l'Acompte</label>
                        <select
                          value={immediatePayMode}
                          onChange={(e) => setImmediatePayMode(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                        >
                          <option value="Espèces">Espèces</option>
                          <option value="Chèque">Chèque</option>
                          <option value="Virement">Virement</option>
                          <option value="Traite">Traite</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Invoice Lines Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Articles / Prestations du Panier</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleAddServiceLine('Main d\'œuvre')}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 cursor-pointer bg-amber-50 px-2 py-1 rounded-lg border border-amber-200"
                    >
                      <span className="material-symbols-outlined text-[16px]">build</span>
                      + Main d'œuvre
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      Ajouter un article
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {newLines.map((line, idx) => {
                    const lineArticle = articles.find(a => a.id === line.articleId);
                    const isService = lineArticle?.typeArticle === 'Service';
                    const isPriceLocked = !isService && (currentUser.role === 'caissier' || currentUser.role === 'agent');
                    return (
                      <div key={line.id || idx} className="grid grid-cols-12 gap-2.5 items-center bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-sm">
                        <div className="col-span-5">
                          <select
                            value={line.articleId}
                            onChange={(e) => handleLineArticleChange(idx, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:border-blue-600 focus:outline-none"
                          >
                            <option value="">Sélectionner un produit actif...</option>
                            {scopedActiveArticles.map(a => (
                              <option key={a.id} value={a.id}>{a.designation} — {a.prixVenteHT} DT HT</option>
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
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-center bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-2 relative">
                          <input
                            type="number"
                            step="0.01"
                            value={line.prixUnitaireHT}
                            onChange={(e) => handleLinePriceChange(idx, parseFloat(e.target.value) || 0)}
                            placeholder="P.U HT"
                            disabled={isPriceLocked}
                            readOnly={isPriceLocked}
                            title={isPriceLocked ? "Prix catalogue verrouillé en mode caissier" : "Prix modifiable (Autorisation Admin)"}
                            className={`w-full px-3 py-2 border rounded-xl text-sm font-bold text-right transition-all ${
                              isPriceLocked 
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                                : 'bg-white border-slate-200 focus:border-blue-600 focus:outline-none'
                            }`}
                          />
                          {isPriceLocked && (
                            <span className="absolute left-2 top-2.5 text-slate-400 text-xs" title="Prix verrouillé">
                              🔒
                            </span>
                          )}
                        </div>

                        <div className="col-span-2 text-right font-black text-slate-900 text-base">
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
                    );
                  })}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Total Brut HT :</span>
                  <span>{calculatedTotalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Total TVA Estimée :</span>
                  <span>{(calculatedTotalTTC - calculatedTotalHT).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 text-base pt-2 border-t border-blue-200">
                  <span>Montant Net TTC :</span>
                  <span className="text-blue-700 text-lg">{calculatedTotalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
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
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {editingSaleId ? 'Enregistrer les Modifications' : 'Valider et Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PAYMENT MODAL (BOUTON DE PAIEMENT) */}
      {paymentModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/80">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">payments</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Encaisser le Règlement (Facture {paymentModalSale.numero})</h3>
                  <span className="text-[11px] text-slate-500">Client : {paymentModalSale.clientNom}</span>
                </div>
              </div>
              <button onClick={() => setPaymentModalSale(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-5 space-y-4">
              {/* Financial Recap Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Montant Total Facture TTC :</span>
                  <span className="font-bold text-slate-900">{paymentModalSale.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Déjà Réglé :</span>
                  <span className="font-bold text-emerald-600">{(paymentModalSale.montantPaye || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-1">
                  <span>Solde Restant Dû :</span>
                  <span className="text-rose-600">
                    {Math.max(0, paymentModalSale.montantTTC - (paymentModalSale.montantPaye || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </span>
                </div>
              </div>

              {/* Amount input & Quick percentage buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Montant Encaissé (DT) *</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const rem = Math.max(0, paymentModalSale.montantTTC - (paymentModalSale.montantPaye || 0));
                        setPayAmount(rem);
                      }}
                      className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] hover:bg-emerald-200 cursor-pointer"
                    >
                      100% (Solde)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rem = Math.max(0, paymentModalSale.montantTTC - (paymentModalSale.montantPaye || 0));
                        setPayAmount(parseFloat((rem / 2).toFixed(2)));
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
                  max={Math.max(0, paymentModalSale.montantTTC - (paymentModalSale.montantPaye || 0))}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-black text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mode de Paiement</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement">Virement Bancaire</option>
                    <option value="Traite">Traite / Effet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Banque</label>
                  <select
                    value={payBank}
                    onChange={(e) => setPayBank(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="BIAT">BIAT</option>
                    <option value="Attijari">Attijari Bank</option>
                    <option value="BNA">BNA</option>
                    <option value="STB">STB</option>
                    <option value="BH">BH Bank</option>
                    <option value="UIB">UIB</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Référence / Numéro Pièce</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="N° Chèque / N° Virement"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
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
                  onClick={() => setPaymentModalSale(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Valider le Paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDIT & INSTALLMENTS MODAL (BOUTON DE CRÉDIT) */}
      {creditModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-purple-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[22px]">calendar_month</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Structuration de Crédit & Échéancier ({creditModalSale.numero})</h3>
                  <span className="text-[11px] text-slate-500">Client : {creditModalSale.clientNom}</span>
                </div>
              </div>
              <button onClick={() => setCreditModalSale(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Financial Status */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Montant Total TTC</span>
                  <p className="text-base font-black text-slate-900 mt-0.5">
                    {creditModalSale.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
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
                    {Math.max(0, creditModalSale.montantTTC - creditDownPayment).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </p>
                </div>
              </div>

              {/* Installments Parameter Inputs */}
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

              {/* Installments Breakdown Table */}
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

            {/* Footer Buttons */}
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
                  onClick={() => setCreditModalSale(null)}
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
    </div>
  );
}
