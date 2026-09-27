import { getArticleStock, hasLowStock, isOutOfStock } from '../utils/stockUtils';
import React, { useState, useMemo } from 'react';
import { Utilisateur, Vente, Client, Article, Projet, LigneVente, Reglement, MouvementStock } from '../types';
import { generateInvoicePdf, generateReceiptPdf, generateCreditAgreementPdf, generatePosTicketPdf } from '../utils/pdfExportEngine';
import { generateNextDocNumber } from '../utils/numbering';
import { FacturePrintModal } from './FacturePrintModal';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { TicketPanierModal } from './TicketPanierModal';

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
  onNavigateToCaisse?: () => void;
  activeDocType?: 'Facture' | 'Devis' | 'All';
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
  onMouvementsChange,
  onNavigateToCaisse,
  activeDocType = 'All'
}: VentesProps) {
  const [docTypeTab, setDocTypeTab] = useState<'Facture' | 'Devis' | 'All'>(activeDocType);

  React.useEffect(() => {
    if (activeDocType) {
      setDocTypeTab(activeDocType);
    }
  }, [activeDocType]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  // Modal State for Viewing POS Basket Details
  const [viewingCartSale, setViewingCartSale] = useState<Vente | null>(null);

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
  const [showFacturePrintModal, setShowFacturePrintModal] = useState<Vente | null>(null);

  // Modal State: Credit & Installment Schedule (Bouton de Crédit)
  const [creditModalSale, setCreditModalSale] = useState<Vente | null>(null);
  const [creditDownPayment, setCreditDownPayment] = useState<number>(0);
  const [creditInstallmentsCount, setCreditInstallmentsCount] = useState<number>(3);
  const [creditInterval, setCreditInterval] = useState<'monthly' | 'biweekly' | 'quarterly'>('monthly');
  const [creditFirstDate, setCreditFirstDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Modal State: Relance Devis Client & Scanner Caméra
  const [relanceModalSale, setRelanceModalSale] = useState<Vente | null>(null);
  const [relanceMessage, setRelanceMessage] = useState<string>('');
  const [toastAlert, setToastAlert] = useState<string | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);
  const isProjectActive = currentProject ? (currentProject.statut === 'Active' || currentProject.statut === 'Actif') : true;

  // Scoped Data
  const scopedVentes = useMemo(() => {
    let list = isGlobal ? ventes : ventes.filter(v => v.projetId === selectedProjectId);
    if (currentUser.role === 'caissier') {
      // Pour le caissier : UNIQUEMENT l'historique des ventes / tickets de caisse réalisés (pas de factures B2B à crédit, pas de devis)
      list = list.filter(v => 
        v.numero.startsWith('TC-') || 
        v.numero.startsWith('TCK-') || 
        v.modePaiement === 'Espèces' || 
        v.modePaiement === 'Carte Bancaire' || 
        (v.statut === 'Payée' && v.modePaiement !== 'Crédit')
      );
    }
    return list;
  }, [ventes, isGlobal, selectedProjectId, currentUser.role]);

  const docTypeScopedVentes = useMemo(() => {
    if (currentUser.role === 'caissier') {
      return scopedVentes;
    }
    if (docTypeTab === 'Facture') {
      return scopedVentes.filter(v => v.statut !== 'Devis' && v.statut !== 'En Négociation');
    }
    if (docTypeTab === 'Devis') {
      return scopedVentes.filter(v => v.statut === 'Devis' || v.statut === 'En Négociation' || v.statut === 'Commande');
    }
    return scopedVentes;
  }, [scopedVentes, docTypeTab, currentUser.role]);

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
    return docTypeScopedVentes.filter(v => {
      const matchesSearch = v.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (v.clientNom && v.clientNom.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || 
                            v.statut === statusFilter || 
                            v.modePaiement === statusFilter || 
                            (statusFilter === 'Carte Bancaire' && (v.modePaiement === 'Carte' || v.modePaiement === 'Carte Bancaire'));
      const matchesClient = clientFilter === 'all' || v.clientId === clientFilter;
      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [docTypeScopedVentes, searchTerm, statusFilter, clientFilter]);

  // Financial Metrics
  const totalFactureTTC = scopedVentes.filter(v => v.statut !== 'Devis' && v.statut !== 'Annulée').reduce((a, v) => a + v.montantTTC, 0);
  const totalEncaisse = scopedVentes.filter(v => v.statut !== 'Devis').reduce((a, v) => a + (v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0)), 0);
  const totalRestantDu = Math.max(0, totalFactureTTC - totalEncaisse);
  const totalDevis = scopedVentes.filter(v => v.statut === 'Devis' || v.statut === 'En Négociation').reduce((a, v) => a + v.montantTTC, 0);

  const handleCameraScanSuccess = (barcodeText: string) => {
    const code = barcodeText.trim();
    const art = scopedArticles.find(a => a.code === code || (a.codeBarres && a.codeBarres.includes(code)) || a.id === code);
    if (art) {
      const currentValid = newLines.filter(l => l.articleId && l.articleId !== '');
      const pu = art.prixVenteHT || 0;
      const tva = art.tva || 19;
      
      setNewLines([
        ...currentValid,
        {
          id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          articleId: art.id,
          designation: art.designation,
          quantite: 1,
          prixUnitaireHT: pu,
          tauxTVA: tva,
          remisePourcentage: 0,
          totalHT: pu,
          totalTTC: pu * (1 + tva / 100)
        },
        {
          id: `l-${Date.now() + 1}-${Math.random().toString(36).substr(2, 4)}`,
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
    } else {
      alert(`Article introuvable dans le catalogue pour le code-barres : ${code}`);
    }
  };

  // Line calculations for creation modal
  const handleLineArticleChange = (index: number, articleId: string) => {
    const updated = [...newLines];
    if (!articleId) {
      updated[index] = {
        ...updated[index],
        articleId: '',
        designation: '',
        prixUnitaireHT: 0,
        totalHT: 0,
        totalTTC: 0
      };
      setNewLines(updated);
      return;
    }

    const art = scopedArticles.find(a => a.id === articleId);
    if (!art) return;

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

    // Dynamic row addition: Automatically add a new empty line when selecting a product on the last line
    if (index === updated.length - 1 || updated[updated.length - 1].articleId !== '') {
      updated.push({
        id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
    
    // Filter out empty lines, add service line, and ensure an empty row is appended for next product selection
    const currentValidLines = newLines.filter(l => l.articleId && l.articleId !== '');

    setNewLines([
      ...currentValidLines,
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
      },
      {
        id: `l-${Date.now() + 1}-${Math.random().toString(36).substr(2, 4)}`,
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

  const handleRemoveLine = (index: number) => {
    if (newLines.length <= 1) {
      setNewLines([{
        id: `l-${Date.now()}`,
        articleId: '',
        designation: '',
        quantite: 1,
        prixUnitaireHT: 0,
        tauxTVA: 19,
        remisePourcentage: 0,
        totalHT: 0,
        totalTTC: 0
      }]);
      return;
    }
    const updated = newLines.filter((_, i) => i !== index);
    if (updated.length > 0 && updated[updated.length - 1].articleId !== '') {
      updated.push({
        id: `l-${Date.now()}`,
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
    setNewLines(updated);
  };

  const timbreFiscalValue = 1.000;
  const calculatedTotalHT = newLines.reduce((a, l) => a + (l.totalHT || 0), 0);
  const calculatedTotalTVA = newLines.reduce((a, l) => a + (l.totalHT || 0) * ((l.tauxTVA || 19) / 100), 0);
  const calculatedTotalTTC = newLines.reduce((a, l) => a + (l.totalTTC || 0), 0) + (modalMode === 'Facture' ? timbreFiscalValue : 0);

  const handleOpenEditModal = (vente: Vente) => {
    setEditingSaleId(vente.id);
    const isDev = vente.statut === 'Devis' || vente.statut === 'En Négociation';
    setModalMode(isDev ? 'Devis' : 'Facture');
    setEditStatut(vente.statut as any);
    setNewClientId(vente.clientId);
    setNewDate(vente.date);
    const defaultDueDate = (() => {
      if (vente.dateEcheance) return vente.dateEcheance;
      const d = new Date(vente.date || Date.now());
      d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
    })();
    setNewDueDate(defaultDueDate);
    setPaymentOption(vente.statut === 'Payée' ? 'Comptant' : 'Credit');
    setImmediatePaidAmount(vente.montantPaye || 0);
    setNewNotes(vente.notes || (isDev ? "• Conditions de règlement : Date d'échéance à 1 mois (30 jours) après la date d'émission.\n• Validité de l'offre : 1 mois." : ''));
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
    setNewNotes(mode === 'Devis' ? "• Conditions de règlement : Date d'échéance à 1 mois (30 jours) après la date d'émission.\n• Validité de l'offre : 1 mois." : '');
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
    const validLines = newLines.filter(l => l.articleId && l.articleId.trim() !== '');
    if ((!newClientId || (newClientId === 'NEW' && !newClientName.trim())) || validLines.length === 0) {
      alert("Veuillez sélectionner au moins un article valide dans la commande / facture.");
      return;
    }

    const targetProjetId = selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId;

    // BF-STOCK-007: Out of stock check & negative stock prevention for invoices
    if (modalMode === 'Facture') {
      for (const line of validLines) {
        if (!line.articleId) continue;
        const art = articles.find(a => a.id === line.articleId);
        if (art && art.typeArticle !== 'Service') {
          const availStock = getArticleStock(art, targetProjetId);
          if (availStock <= 0) {
            alert(`🔴 RUPTURE DE STOCK : Impossible d'effectuer la vente. Le produit "${art.designation}" est en rupture (stock = 0).`);
            return;
          }
          if (line.quantite > availStock) {
            alert(`STOCK INSUFFISANT : La quantité demandée (${line.quantite}) dépasse le stock disponible (${availStock}) pour "${art.designation}".`);
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
    
    // Use existing number if editing, else generate new FAC-2026-00001 or DEV-2026-00001
    const existingSale = editingSaleId ? ventes.find(v => v.id === editingSaleId) : null;
    const numero = existingSale 
      ? existingSale.numero 
      : generateNextDocNumber(prefix, ventes.map(v => v.numero), newDate);

    const isComptant = modalMode === 'Facture' && paymentOption === 'Comptant';
    const initialPaid = isComptant ? calculatedTotalTTC : immediatePaidAmount;

    let finalStatut: any = isComptant ? 'Payée' : modalMode;
    if (editingSaleId && modalMode === 'Devis') {
      finalStatut = editStatut;
    }

    const saveHT = validLines.reduce((a, l) => a + (l.totalHT || 0), 0);
    const saveTTC = validLines.reduce((a, l) => a + (l.totalTTC || 0), 0) + (modalMode === 'Facture' ? timbreFiscalValue : 0);

    const calculatedDueDate = isComptant 
      ? newDate 
      : (newDueDate || (() => {
          const d = new Date(newDate || Date.now());
          d.setDate(d.getDate() + 30);
          return d.toISOString().split('T')[0];
        })());

    const finalNotes = newNotes.trim()
      ? newNotes
      : (modalMode === 'Devis' 
          ? "• Conditions de règlement : Date d'échéance à 1 mois (30 jours) après la date d'émission.\n• Validité de l'offre : 1 mois." 
          : '');

    const newSale: Vente = {
      id: existingSale ? existingSale.id : `v-${Date.now()}`,
      numero,
      projetId: existingSale ? existingSale.projetId : (selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId),
      clientId: clientIdToUse,
      clientNom: clientNomToUse,
      date: newDate,
      dateEcheance: calculatedDueDate,
      montantHT: saveHT,
      montantTTC: saveTTC,
      montantPaye: initialPaid,
      statut: finalStatut,
      timbreFiscal: modalMode === 'Facture' ? timbreFiscalValue : 0,
      lignes: validLines,
      notes: finalNotes
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
          const lineMatch = validLines.find(l => l.articleId === art.id);
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

  // Convert Quote to Commande, Invoice, or Negotiation Status
  const handleConvertQuote = (quote: Vente, target: 'Commande' | 'Facture' | 'En Négociation' | 'Devis') => {
    const today = new Date().toISOString().split('T')[0];

    if (target === 'En Négociation' || target === 'Devis') {
      const updated = ventes.map(v => {
        if (v.id === quote.id) {
          return {
            ...v,
            statut: target as any
          };
        }
        return v;
      });
      onVentesChange(updated);
      setToastAlert(`Status du devis ${quote.numero} mis à jour : "${target}"`);
      setTimeout(() => setToastAlert(null), 3000);
      return;
    }

    const year = new Date().getFullYear();
    const prefix = target === 'Facture' ? 'FAC' : 'CMD';
    const count = ventes.filter(v => v.statut === target || (target === 'Facture' && v.statut === 'Payée')).length + 1;
    const newNumero = `${prefix}-${year}-${count.toString().padStart(4, '0')}`;

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
    setToastAlert(`Devis ${quote.numero} converti avec succès en ${target === 'Facture' ? 'Facture' : 'Commande'} N° ${newNumero}`);
    setTimeout(() => setToastAlert(null), 4000);

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

  // Dupliquer un Devis en 1 clic
  const handleDuplicateQuote = (quote: Vente) => {
    setEditingSaleId(null);
    setModalMode('Devis');
    setEditStatut('Devis');
    setNewClientId(quote.clientId);
    setNewDate(new Date().toISOString().split('T')[0]);
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setNewDueDate(due.toISOString().split('T')[0]);
    setPaymentOption('Credit');
    setImmediatePaidAmount(0);
    setNewNotes(`Devis dupliqué depuis ${quote.numero}. ${quote.notes || ''}`);
    setNewLines((quote.lignes || []).map(l => ({ ...l, id: `l-dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })));
    setIsCreateModalOpen(true);
    setToastAlert(`Devis ${quote.numero} dupliqué ! Modifiez-le puis enregistrez.`);
    setTimeout(() => setToastAlert(null), 4000);
  };

  // Modal de Relance Client Devis
  const handleOpenRelance = (quote: Vente) => {
    setRelanceModalSale(quote);
    const client = scopedClients.find(c => c.id === quote.clientId);
    const msg = `Bonjour ${client?.nom || quote.clientNom || 'Cher client'},\n\nNous revenons vers vous concernant notre devis N° ${quote.numero} émis le ${new Date(quote.date).toLocaleDateString('fr-FR')} pour un montant de ${quote.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT TTC.\n\nCe devis reste valable jusqu'au ${quote.dateEcheance ? new Date(quote.dateEcheance).toLocaleDateString('fr-FR') : 'prochainement'}.\n\nRestant à votre entière disposition pour tout complément d'information ou ajustement commercial.\n\nCordialement,\n${currentUser?.nom || 'L\'Équipe Commerciale ERP Management'}`;
    setRelanceMessage(msg);
  };

  // Action de Relance Client
  const handleSendRelance = (channel: 'email' | 'whatsapp') => {
    if (!relanceModalSale) return;
    const client = scopedClients.find(c => c.id === relanceModalSale.clientId);
    if (channel === 'email' && client?.email) {
      window.open(`mailto:${client.email}?subject=${encodeURIComponent(`Relance Devis N° ${relanceModalSale.numero}`)}&body=${encodeURIComponent(relanceMessage)}`);
    } else if (channel === 'whatsapp' && client?.telephone) {
      const cleanPhone = client.telephone.replace(/\s+/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(relanceMessage)}`);
    }
    setToastAlert(`Relance pour le devis ${relanceModalSale.numero} transmise avec succès !`);
    setTimeout(() => setToastAlert(null), 4000);
    setRelanceModalSale(null);
  };

  // Appliquer une remise globale sur toutes les lignes du Devis
  const applyGlobalDiscount = (discountPercent: number) => {
    const updated = newLines.map(line => {
      const pu = line.prixUnitaireHT || 0;
      const qte = line.quantite || 1;
      const tva = line.tauxTVA || 19;
      const totalHT = qte * pu * (1 - discountPercent / 100);
      const totalTTC = totalHT * (1 + tva / 100);
      return {
        ...line,
        remisePourcentage: discountPercent,
        totalHT,
        totalTTC
      };
    });
    setNewLines(updated);
  };

  // Calcul de la marge commerciale théorique sur Devis
  const estimatedCostHT = useMemo(() => {
    return newLines.reduce((acc, line) => {
      const art = articles.find(a => a.id === line.articleId);
      const unitCost = art?.prixAchatHT || (line.prixUnitaireHT * 0.7);
      return acc + (unitCost * (line.quantite || 1));
    }, 0);
  }, [newLines, articles]);

  const marginDT = calculatedTotalHT - estimatedCostHT;
  const marginPercent = calculatedTotalHT > 0 ? (marginDT / calculatedTotalHT) * 100 : 0;

  const getStatusBadge = (statut: string) => {
    if (currentUser.role === 'caissier') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          Encaissée
        </span>
      );
    }
    switch (statut) {
      case 'Payée':
      case 'Validée':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold"><span className="material-symbols-outlined text-[14px]">check_circle</span>Payée</span>;
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
      {/* Toast Alert Notification Banner */}
      {toastAlert && (
        <div className="p-4 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{toastAlert}</span>
          </div>
          <button onClick={() => setToastAlert(null)} className="hover:opacity-80 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Top Header & Fast Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${
              docTypeTab === 'Devis' ? 'bg-amber-50 text-amber-600' :
              docTypeTab === 'Facture' ? 'bg-blue-50 text-blue-600' :
              selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-700'
            } flex items-center justify-center font-bold`}>
              <span className="material-symbols-outlined text-[22px]">
                {docTypeTab === 'Devis' ? 'request_quote' :
                 docTypeTab === 'Facture' ? 'description' :
                 selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'shopping_basket' : 'assignment'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {docTypeTab === 'Facture' ? 'Factures de Vente' :
                   docTypeTab === 'Devis' ? 'Devis & Offres Commerciales' :
                   selectedProjectId !== '1' || currentUser.role === 'caissier' 
                    ? 'Historique des Ventes (Tickets de Caisse)' 
                    : 'Factures & Devis'}
                </h1>
                {docTypeTab === 'Facture' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Section Facturation
                  </span>
                ) : docTypeTab === 'Devis' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Section Devis
                  </span>
                ) : selectedProjectId !== '1' || currentUser.role === 'caissier' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Boutique • Ventes Panier
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    Dépôt Central • B2B
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {docTypeTab === 'Facture' ? 'Gestion des factures client, paiements à crédit et encaissements.' :
                 docTypeTab === 'Devis' ? 'Gestion des devis, propositions commerciales, relances et négociations.' :
                 selectedProjectId !== '1' || currentUser.role === 'caissier'
                  ? 'Toutes les ventes de la boutique sont enregistrées au comptoir via le panier du terminal de caisse.'
                  : 'Gestion des devis, bons de commande et factures de vente du siège.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'comptable' ? (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold">
              <span className="material-symbols-outlined text-[18px] text-indigo-600">verified</span>
              <span>Mode Audit & Contrôle Financier (Lecture seule)</span>
            </div>
          ) : currentUser.role === 'caissier' ? null : selectedProjectId !== '1' ? null : (
            <>
              {(docTypeTab === 'Devis' || docTypeTab === 'All') && (
                <button
                  onClick={() => handleOpenCreateModal('Devis')}
                  disabled={!isProjectActive}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-xl transition-all ${
                    !isProjectActive 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' 
                      : docTypeTab === 'Devis'
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md cursor-pointer'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  Nouveau Devis
                </button>
              )}

              {(docTypeTab === 'Facture' || docTypeTab === 'All') && (
                <button
                  onClick={() => handleOpenCreateModal('Facture')}
                  disabled={!isProjectActive}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-xl transition-all ${!isProjectActive ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Nouvelle Facture
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'Chiffre d\'Affaires TTC' : 'Total Facturé TTC'}
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {totalFactureTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {scopedVentes.filter(v => v.statut !== 'Devis').length} tickets & ventes
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'Total Encaissé' : 'Total Encaissé (Paiements)'}
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {totalEncaisse.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 block">Règlements perçus</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'Panier Moyen' : 'Total à Recouvrer (Crédits)'}
          </span>
          <p className={`text-2xl font-bold ${selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'text-purple-600' : 'text-rose-600'} mt-2`}>
            {selectedProjectId !== '1' || currentUser.role === 'caissier' ? (
              <>
                {(scopedVentes.filter(v => v.statut !== 'Devis').length > 0 
                  ? totalFactureTTC / scopedVentes.filter(v => v.statut !== 'Devis').length 
                  : 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT / Vente</span>
              </>
            ) : (
              <>
                {totalRestantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
              </>
            )}
          </p>
          <span className={`text-xs ${selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'text-purple-600' : 'text-rose-600'} font-semibold mt-1 block`}>
            {selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'Moyenne par passage caisse' : 'En-cours & facilités accordées'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'Ventes en Espèces' : 'Devis en Cours'}
          </span>
          <p className={`text-2xl font-bold ${selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'text-teal-600' : 'text-amber-700'} mt-2`}>
            {selectedProjectId !== '1' || currentUser.role === 'caissier' ? (
              <>
                {scopedVentes
                  .filter(v => v.modePaiement === 'Espèces' || (!v.modePaiement && v.statut === 'Payée'))
                  .reduce((acc, v) => acc + (v.montantPaye || v.montantTTC), 0)
                  .toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
              </>
            ) : (
              <>
                {totalDevis.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
              </>
            )}
          </p>
          <span className={`text-xs ${selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'text-teal-600' : 'text-amber-700'} font-semibold mt-1 block`}>
            {selectedProjectId !== '1' || currentUser.role === 'caissier' ? 'Paiements directs en caisse' : `${scopedVentes.filter(v => v.statut === 'Devis').length} devis actifs`}
          </span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Quick Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-100/70 border-b border-slate-200 overflow-x-auto">
          {currentUser.role === 'caissier' ? (
            <>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                Tous les tickets ({scopedVentes.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Espèces')}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === 'Espèces'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">payments</span>
                Espèces ({scopedVentes.filter(v => v.modePaiement === 'Espèces').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Carte Bancaire')}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === 'Carte Bancaire'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">credit_card</span>
                Carte Bancaire ({scopedVentes.filter(v => v.modePaiement === 'Carte Bancaire' || v.modePaiement === 'Carte').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Chèque')}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === 'Chèque'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">account_balance</span>
                Chèque ({scopedVentes.filter(v => v.modePaiement === 'Chèque').length})
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {selectedProjectId === '1' || currentUser?.role === 'admin' ? `Toutes les factures (${scopedVentes.length})` : `Tous les tickets / ventes (${scopedVentes.length})`}
              </button>

              {selectedProjectId === '1' && (
                <>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Devis')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === 'Devis'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-800 hover:bg-amber-100/80'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    Devis Actifs ({scopedVentes.filter(v => v.statut === 'Devis').length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('En Négociation')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === 'En Négociation'
                        ? 'bg-fuchsia-600 text-white shadow-xs'
                        : 'text-fuchsia-800 hover:bg-fuchsia-100/80'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">forum</span>
                    En Négociation ({scopedVentes.filter(v => v.statut === 'En Négociation').length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('Commande')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === 'Commande'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-800 hover:bg-indigo-100/80'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                    Commandes ({scopedVentes.filter(v => v.statut === 'Commande').length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('Facture')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === 'Facture'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-blue-800 hover:bg-blue-100/80'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    Factures Crédit ({scopedVentes.filter(v => v.statut === 'Facture').length})
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setStatusFilter('Payée')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === 'Payée'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 hover:bg-emerald-100/80'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Ventes Encaissées ({scopedVentes.filter(v => v.statut === 'Payée').length})
              </button>
            </>
          )}
        </div>

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
              placeholder="Rechercher par N° ticket, client, article..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500"
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

            {currentUser.role === 'caissier' ? (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Tous les modes de règlement</option>
                <option value="Espèces">💵 Espèces</option>
                <option value="Carte Bancaire">💳 Carte Bancaire</option>
                <option value="Chèque">🏦 Chèque</option>
              </select>
            ) : (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="Payée">✅ Tickets & Ventes payées</option>
                <option value="Facture">💳 Ventes à crédit</option>
                {selectedProjectId === '1' && (
                  <>
                    <option value="Devis">📑 Devis standards</option>
                    <option value="En Négociation">💬 En Négociation</option>
                    <option value="Commande">🛒 Commandes enregistrées</option>
                  </>
                )}
              </select>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">N° Ticket / Réf</th>
                <th className="py-3.5 px-4">Date & Caissier</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Panier d'Articles</th>
                <th className="py-3.5 px-4 text-center">Règlement</th>
                <th className="py-3.5 px-4 text-right">Total TTC</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredVentes.map((vente) => {
                const client = scopedClients.find(c => c.id === vente.clientId);
                const paid = vente.montantPaye ?? (vente.statut === 'Payée' ? vente.montantTTC : 0);
                const remaining = Math.max(0, vente.montantTTC - paid);
                const totalArticlesCount = (vente.lignes || []).reduce((sum, l) => sum + (l.quantite || 1), 0);

                return (
                  <tr key={vente.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">receipt</span>
                          {vente.numero}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-semibold text-slate-900">{new Date(vente.date).toLocaleDateString('fr-FR')}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[13px] text-slate-400">person</span>
                        {vente.auteurNom || 'Caissier'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900">{client?.nom || vente.clientNom || 'Client Comptoir'}</span>
                      {client?.telephone && (
                        <span className="block text-[10px] text-slate-400 font-mono">Tél: {client.telephone}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                            🛒 {totalArticlesCount} article{totalArticlesCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 line-clamp-1">
                          {(vente.lignes || []).map(l => `${l.quantite}x ${l.designation}`).join(', ')}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        <span className="material-symbols-outlined text-[14px]">
                          {vente.modePaiement === 'Espèces' ? 'payments' : vente.modePaiement === 'Chèque' ? 'account_balance' : 'credit_card'}
                        </span>
                        {vente.modePaiement || 'Espèces'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      {vente.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(vente.statut)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Bouton Universel: Ticket de Panier pour chaque mouvement */}
                        <button
                          type="button"
                          onClick={() => setViewingCartSale(vente)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                          title="Consulter le ticket de panier complet avec détail des articles"
                        >
                          <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                          <span>Ticket Panier</span>
                        </button>

                        {/* Imprimer Facture / Devis A4 pour les non-caissiers */}
                        {currentUser.role !== 'caissier' && (
                          <button
                            onClick={() => setShowFacturePrintModal(vente)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            title="Aperçu avant impression / Imprimer Document A4"
                          >
                            <span className="material-symbols-outlined text-[14px]">print</span>
                            A4
                          </button>
                        )}

                        {/* Bouton Modifier avec icône */}
                        {currentUser.role !== 'comptable' && currentUser.role !== 'caissier' && (
                          <button
                            onClick={() => handleOpenEditModal(vente)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            title="Modifier le document"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            Modifier
                          </button>
                        )}

                        {/* Convertir Devis en Facture */}
                        {currentUser.role !== 'comptable' && currentUser.role !== 'caissier' && (vente.statut === 'Devis' || vente.statut === 'En Négociation') && (
                          <button
                            onClick={() => handleConvertQuote(vente, 'Facture')}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Convertir ce devis en Facture de Vente"
                          >
                            <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                            Facturer
                          </button>
                        )}

                        {/* Relancer Client */}
                        {currentUser.role !== 'comptable' && currentUser.role !== 'caissier' && (vente.statut === 'Devis' || vente.statut === 'En Négociation') && (
                          <button
                            onClick={() => handleOpenRelance(vente)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200 hover:border-amber-600 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Relancer le Client (Email / WhatsApp)"
                          >
                            <span className="material-symbols-outlined text-[14px]">send</span>
                          </button>
                        )}

                        {/* BOUTON DE PAIEMENT SI CRÉDIT - NON CAISSIER */}
                        {currentUser.role !== 'comptable' && currentUser.role !== 'caissier' && vente.statut === 'Facture' && remaining > 0 && (
                          <button
                            onClick={() => handleOpenPayment(vente)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer hover:scale-105"
                            title="Encaisser un paiement partiel ou total"
                          >
                            <span className="material-symbols-outlined text-[14px]">payments</span>
                            Paiement
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

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-[96vw] max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-7 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">
                    {modalMode === 'Facture' ? 'receipt_long' : 'description'}
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                    {editingSaleId ? (modalMode === 'Facture' ? 'Modifier la Facture' : 'Négocier / Modifier le Devis') : `Créer un(e) ${modalMode === 'Facture' ? 'Nouvelle Facture de Vente' : 'Nouveau Devis Client'}`}
                  </h3>
                  <p className="text-[11px] font-semibold text-indigo-200/70 tracking-wide uppercase">
                    {modalMode === 'Facture' ? 'Document de vente commercial officiel' : 'Proposition commerciale officielle'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Fermer la fenêtre"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveSale} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 text-sm bg-slate-50/40">
              {isGlobal && (
                <div className="grid grid-cols-1 mb-2">
                  <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80">
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">Boutique d'affectation (Vue Globale Multi-Boutiques)</label>
                    <select
                      required
                      value={newProjetId}
                      onChange={(e) => setNewProjetId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-amber-300/80 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amber-500/15"
                    >
                      {projets.map(p => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Scan Barcode Section */}
              <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-slate-50 p-4 rounded-2xl border border-indigo-100 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">barcode_scanner</span>
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-black text-indigo-950 uppercase tracking-wider block mb-1">Scan Rapide Code-barres</label>
                    <input 
                      type="text" 
                      placeholder="Scannez ou saisissez un code article et appuyez sur Entrée..." 
                      className="w-full px-4 py-2.5 bg-white border border-indigo-200/90 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-600 shadow-2xs transition-all" 
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const code = e.currentTarget.value;
                          handleCameraScanSuccess(code);
                          e.currentTarget.value = "";
                        }
                      }} 
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-md shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
                  title="Ouvrir la caméra de votre smartphone pour scanner en continu sans fatigue"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                  <span>Scanner Caméra Smartphone</span>
                </button>
              </div>

              {/* Form Grid: Client & Dates */}
              <div className={`grid grid-cols-1 ${editingSaleId && modalMode === 'Devis' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">Client *</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (newClientId === 'NEW') {
                          setNewClientId(scopedClients[0]?.id || '');
                        } else {
                          setNewClientId('NEW');
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
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
                        className="w-full px-3.5 py-2.5 border border-indigo-200 rounded-xl text-sm font-semibold text-slate-900 bg-indigo-50/30 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newClientPhone}
                          onChange={(e) => setNewClientPhone(e.target.value)}
                          placeholder="Téléphone"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={newClientMf}
                          onChange={(e) => setNewClientMf(e.target.value)}
                          placeholder="Matricule Fiscal"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <select
                      value={newClientId}
                      onChange={(e) => setNewClientId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 border border-slate-200/90 rounded-xl text-sm font-bold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                    >
                      <option value="">Sélectionner un client...</option>
                      {scopedClients.map(c => (
                        <option key={c.id} value={c.id}>{c.nom} {c.matriculeFiscal ? `(${c.matriculeFiscal})` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Date d'Émission *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewDate(val);
                      if (modalMode === 'Devis' && val) {
                        const d = new Date(val);
                        d.setDate(d.getDate() + 30);
                        setNewDueDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200/90 rounded-xl text-sm font-bold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                  />
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      {modalMode === 'Devis' ? "Date d'Échéance / Validité" : "Date d'Échéance"}
                    </label>
                    {modalMode === 'Devis' && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(newDate || Date.now());
                            d.setDate(d.getDate() + 15);
                            setNewDueDate(d.toISOString().split('T')[0]);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 rounded-md cursor-pointer transition-colors"
                        >
                          +15j
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(newDate || Date.now());
                            d.setDate(d.getDate() + 30);
                            setNewDueDate(d.toISOString().split('T')[0]);
                          }}
                          className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-[10px] font-black text-amber-900 rounded-md cursor-pointer transition-colors border border-amber-300"
                        >
                          +1 mois (30j)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(newDate || Date.now());
                            d.setDate(d.getDate() + 60);
                            setNewDueDate(d.toISOString().split('T')[0]);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 rounded-md cursor-pointer transition-colors"
                        >
                          +60j
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200/90 rounded-xl text-sm font-bold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                  />
                  {modalMode === 'Devis' && (
                    <p className="mt-1 text-[10px] font-bold text-amber-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                      Condition : Échéance à 1 mois (+30 jours)
                    </p>
                  )}
                </div>

                {editingSaleId && modalMode === 'Devis' && (
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Statut Devis</label>
                    <select
                      value={editStatut}
                      onChange={(e) => setEditStatut(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-slate-200/90 rounded-xl text-sm font-bold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                    >
                      <option value="Devis">Devis (Standard)</option>
                      <option value="En Négociation">En Négociation</option>
                      <option value="Commande">Converti en Commande</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Conditions de Devis Banner */}
              {modalMode === 'Devis' && (
                <div className="bg-gradient-to-r from-amber-50 via-indigo-50/40 to-blue-50 border border-amber-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">verified_user</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                        Conditions Générales de Validité & Échéance
                        <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md text-[10px] font-black uppercase">1 Mois</span>
                      </h4>
                      <p className="text-[11.5px] text-slate-700 font-medium pt-0.5">
                        Ce devis comporte une condition d'échéance et de validité de l'offre fixée à <strong>1 mois (30 jours)</strong> à compter de la date d'émission (Date d'échéance : <span className="font-bold text-indigo-950">{newDueDate ? newDueDate.split('-').reverse().join('/') : '1 mois'}</span>).
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 font-extrabold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 w-fit sm:ml-auto">
                      <span className="material-symbols-outlined text-amber-600 text-[16px]">event_available</span>
                      Échéance : 1 Mois (30j)
                    </span>
                  </div>
                </div>
              )}

              {/* Client Credit Solvency Status Widget */}
              {selectedClientObject && modalMode === 'Facture' && (
                <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white shadow-md border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    </div>
                    <span>
                      Plafond Crédit Autorisé : <strong className="text-white text-sm tabular-nums ml-1">{clientPlafond.toLocaleString('fr-FR')} DT</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-300">
                      En-cours actuel : <strong className="text-rose-400 font-bold tabular-nums ml-1">{clientOutstandingDebt.toLocaleString('fr-FR')} DT</strong>
                    </span>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold rounded-xl text-xs backdrop-blur-xs tabular-nums">
                      Disponible : {clientAvailableCredit.toLocaleString('fr-FR')} DT
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Mode Selector: Comptant vs Crédit */}
              {modalMode === 'Facture' && (
                <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Modalité de Paiement & Crédit :</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentOption('Credit')}
                        className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-2xs ${
                          paymentOption === 'Credit'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                            : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
                        }`}
                      >
                        Vente à Crédit (Échéances)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentOption('Comptant')}
                        className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-2xs ${
                          paymentOption === 'Comptant'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
                        }`}
                      >
                        💳 Paiement Comptant (Immédiat)
                      </button>
                    </div>
                  </div>

                  {paymentOption === 'Credit' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-sm">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Acompte Initial Versé (DT)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={immediatePaidAmount}
                          onChange={(e) => setImmediatePaidAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00 DT"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Mode de l'Acompte</label>
                        <select
                          value={immediatePayMode}
                          onChange={(e) => setImmediatePayMode(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
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
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">Articles / Prestations du Panier</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleAddServiceLine('Main d\'œuvre')}
                      className="text-xs font-extrabold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 cursor-pointer bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200/80 shadow-2xs transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">build</span>
                      + Main d'œuvre
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5 cursor-pointer px-3.5 py-1.5 rounded-xl shadow-md shadow-blue-500/20 transition-all"
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
                    // Caissier et agents autorisés à modifier le montant de chaque produit ou service
                    const isPriceLocked = false;
                    return (
                      <div key={line.id || idx} className="grid grid-cols-12 gap-3 items-center bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-200 transition-all text-sm">
                        <div className="col-span-5">
                          <select
                            value={line.articleId}
                            onChange={(e) => handleLineArticleChange(idx, e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
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
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-black text-center bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:outline-none tabular-nums transition-all"
                          />
                        </div>

                        <div className="col-span-2 relative">
                          <input
                            type="number"
                            step="0.001"
                            value={line.prixUnitaireHT}
                            onChange={(e) => handleLinePriceChange(idx, parseFloat(e.target.value) || 0)}
                            placeholder="P.U HT"
                            title="Prix unitaire modifiable"
                            className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-black text-right tabular-nums transition-all bg-slate-50/50 focus:bg-white border-slate-200 focus:border-indigo-600 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-2 text-right font-black text-slate-900 text-base tabular-nums">
                          {(line.totalTTC || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                            title="Supprimer la ligne"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Devis Quick Discount Actions & Commercial Margin Indicator */}
              {modalMode === 'Devis' && (
                <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[16px]">percent</span>
                      Appliquer Remise Globale au Devis :
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyGlobalDiscount(5)}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs"
                      >
                        -5%
                      </button>
                      <button
                        type="button"
                        onClick={() => applyGlobalDiscount(10)}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs"
                      >
                        -10%
                      </button>
                      <button
                        type="button"
                        onClick={() => applyGlobalDiscount(15)}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs"
                      >
                        -15%
                      </button>
                      <button
                        type="button"
                        onClick={() => applyGlobalDiscount(0)}
                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>

                  {/* Commercial Margin Calculation Display for Devis */}
                  <div className="pt-2 border-t border-amber-200/70 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Coût d'Achat Estimé HT : <span className="font-bold text-slate-900 tabular-nums">{estimatedCostHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span></span>
                    <span className={`font-black flex items-center gap-1 px-2.5 py-1 rounded-lg ${marginDT >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      Marge Théorique : {marginDT >= 0 ? '+' : ''}{marginDT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT ({marginPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Notes & Commercial Terms */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    {modalMode === 'Devis' ? "Conditions Commerciales & Notes du Devis" : "Notes & Observations"}
                  </label>
                  {modalMode === 'Devis' && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNewNotes((prev) => `${prev ? prev + '\n' : ''}• Conditions de paiement : Échéance de règlement à 1 mois (30 jours) après la date d'émission.`)}
                        className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-[10.5px] font-bold text-indigo-900 rounded-lg cursor-pointer transition-colors shadow-2xs"
                      >
                        + Échéance 1 mois
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewNotes((prev) => `${prev ? prev + '\n' : ''}• Validité de l'offre : 30 jours (1 mois) à compter de la date d'émission.`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 rounded-lg cursor-pointer transition-colors"
                      >
                        + Validité 1 mois
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewNotes((prev) => `${prev ? prev + '\n' : ''}• Modalités : 30% d'acompte à la commande, solde à l'échéance.`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 rounded-lg cursor-pointer transition-colors"
                      >
                        + Acompte 30%
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewNotes((prev) => `${prev ? prev + '\n' : ''}• Garantie : 12 mois pièces et main d'œuvre.`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 rounded-lg cursor-pointer transition-colors"
                      >
                        + Garantie 1 an
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder={modalMode === 'Devis' ? "Conditions particulières, délais de livraison, modalités de paiement..." : "Observations éventuelles..."}
                  className="w-full p-3.5 border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-800 bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none shadow-2xs"
                />
              </div>

              {/* Totals Summary */}
              <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-2xl shadow-xl border border-slate-800 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between font-medium text-slate-300">
                  <span>Total Brut HT :</span>
                  <span className="tabular-nums font-semibold">{calculatedTotalHT.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                </div>
                <div className="flex justify-between font-medium text-slate-300">
                  <span>Total TVA Estimée :</span>
                  <span className="tabular-nums font-semibold">{calculatedTotalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                </div>
                {modalMode === 'Facture' && (
                  <div className="flex justify-between font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">verified</span>
                      Timbre Fiscal Obligatoire :
                    </span>
                    <span className="font-bold tabular-nums">{timbreFiscalValue.toFixed(3)} DT</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-black text-white text-base sm:text-lg pt-3 border-t border-slate-800">
                  <span>Montant Net TTC à Payer :</span>
                  <span className="text-emerald-400 text-xl sm:text-2xl font-black tabular-nums tracking-tight">{calculatedTotalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-extrabold rounded-xl shadow-lg shadow-indigo-500/25 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {editingSaleId ? 'Enregistrer les Modifications' : 'Valider et Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMERA BARCODE SCANNER MODAL */}
      {isCameraScannerOpen && (
        <CameraBarcodeScannerModal
          articles={scopedArticles}
          onScanSuccess={handleCameraScanSuccess}
          onClose={() => setIsCameraScannerOpen(false)}
          title="Scanner Caméra Smartphone (Ventes & Factures)"
        />
      )}

      {/* QUICK PAYMENT MODAL (BOUTON DE PAIEMENT) */}
      {paymentModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-bold text-slate-900"
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
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {creditModalSale.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Acompte Initial</span>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">
                    {creditDownPayment.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-800 uppercase">Solde à Financer</span>
                  <p className="text-base font-bold text-purple-700 mt-0.5">
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
                          <td className="py-2 px-3 text-right font-bold text-purple-700">
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

      {/* RELANCE CLIENT DEVIS MODAL (COMMUNICATION WHATSAPP / EMAIL) */}
      {relanceModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-teal-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">contact_phone</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Relance Commerciale Client</h3>
                  <span className="text-[11px] text-teal-800 font-semibold">
                    Devis N° {relanceModalSale.numero} • {relanceModalSale.clientNom}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRelanceModalSale(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Quote Overview Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Montant TTC</span>
                  <span className="text-sm font-bold text-slate-900">
                    {relanceModalSale.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Émis le</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {new Date(relanceModalSale.date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Validité</span>
                  <span className="text-xs font-bold text-amber-700">
                    {relanceModalSale.dateEcheance ? new Date(relanceModalSale.dateEcheance).toLocaleDateString('fr-FR') : '30 jours'}
                  </span>
                </div>
              </div>

              {/* Message Templates Quick Selector */}
              <div>
                <span className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">
                  Modèles de Messages Pré-enregistrés :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const client = scopedClients.find(c => c.id === relanceModalSale.clientId);
                      setRelanceMessage(`Bonjour ${client?.nom || relanceModalSale.clientNom || 'Cher client'},\n\nNous nous permettons de vous relancer concernant notre devis N° ${relanceModalSale.numero} d'un montant de ${relanceModalSale.montantTTC.toLocaleString('fr-FR')} DT TTC.\n\nCe devis reste valable et nous nous tenons à votre entière disposition pour toute question ou validation.\n\nCordialement,\n${currentUser?.nom || 'L\'Équipe ERP Management'}`);
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-[11px] text-left cursor-pointer transition-colors"
                  >
                    👋 Relance Courtoise
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const client = scopedClients.find(c => c.id === relanceModalSale.clientId);
                      setRelanceMessage(`Bonjour ${client?.nom || relanceModalSale.clientNom || 'Cher client'},\n\nAttention : l'offre commerciale liée au devis N° ${relanceModalSale.numero} (${relanceModalSale.montantTTC.toLocaleString('fr-FR')} DT TTC) arrive bientôt à expiration.\n\nAfin de vous garantir la disponibilité des stocks et les tarifs préférentiels, merci de nous confirmer votre accord dès que possible.\n\nBien cordialement,\n${currentUser?.nom || 'L\'Équipe ERP Management'}`);
                    }}
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded-lg text-[11px] text-left cursor-pointer transition-colors"
                  >
                    ⏳ Expiration Proche
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const client = scopedClients.find(c => c.id === relanceModalSale.clientId);
                      setRelanceMessage(`Bonjour ${client?.nom || relanceModalSale.clientNom || 'Cher client'},\n\nSuite à notre devis N° ${relanceModalSale.numero}, nous souhaitons vous proposer une opportunité spéciale : bénéficiez d'une remise supplémentaire ou de facilités de paiement si validation cette semaine.\n\nDiscutons-en au plus vite !\n\nCordialement,\n${currentUser?.nom || 'L\'Équipe ERP Management'}`);
                    }}
                    className="p-2 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-900 font-semibold rounded-lg text-[11px] text-left cursor-pointer transition-colors"
                  >
                    🎁 Geste Commercial
                  </button>
                </div>
              </div>

              {/* Message Textarea */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Message Personnalisé :
                </label>
                <textarea
                  rows={5}
                  value={relanceMessage}
                  onChange={(e) => setRelanceMessage(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-teal-600 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(relanceMessage);
                  setToastAlert(`📋 Message de relance copié dans le presse-papiers !`);
                  setTimeout(() => setToastAlert(null), 3500);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                Copier Texte
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendRelance('whatsapp')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => handleSendRelance('email')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  Email Client
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleConvertQuote(relanceModalSale, 'En Négociation');
                    setRelanceModalSale(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">forum</span>
                  Passer en Négociation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Facture Print Modal */}
      {showFacturePrintModal && (
        <FacturePrintModal
          vente={showFacturePrintModal}
          client={clients.find(c => c.id === showFacturePrintModal.clientId || c.nom === showFacturePrintModal.clientNom)}
          projet={projets.find(p => p.id === showFacturePrintModal.projetId) || (selectedProjectId ? projets.find(p => p.id === selectedProjectId) : null) || projets[0]}
          onClose={() => setShowFacturePrintModal(null)}
        />
      )}

      {/* TICKET DE PANIER MODAL */}
      {viewingCartSale && (
        <TicketPanierModal
          vente={viewingCartSale}
          client={clients.find(c => c.id === viewingCartSale.clientId || c.nom === viewingCartSale.clientNom)}
          projet={projets.find(p => p.id === viewingCartSale.projetId) || currentProject || projets[0]}
          currentUser={currentUser}
          onClose={() => setViewingCartSale(null)}
        />
      )}
    </div>
  );
}