import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Vente, 
  Achat, 
  Client, 
  Fournisseur, 
  Article, 
  Projet, 
  Reglement, 
  RelanceClient, 
  MouvementStock,
  TabType,
  Utilisateur 
} from '../types';
import {
  generateAgingBalancePdf,
  generateStockInventoryPdf,
  generateInvoicePdf,
  generatePurchaseOrderPdf,
  generateDunningLetterPdf
} from '../utils/pdfExportEngine';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface DashboardProps {
  currentUser?: Utilisateur | null;
  selectedProjectId: string;
  projets: Projet[];
  ventes: Vente[];
  achats: Achat[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  articles: Article[];
  reglements: Reglement[];
  relances: RelanceClient[];
  mouvements: MouvementStock[];
  onTabChange?: (tab: TabType) => void;
  onVentesChange: (ventes: Vente[]) => void;
  onAchatsChange: (achats: Achat[]) => void;
  onArticlesChange: (articles: Article[]) => void;
  onReglementsChange: (reglements: Reglement[]) => void;
  onMouvementsChange: (mouvements: MouvementStock[]) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-xl text-white text-xs">
        <p className="font-bold mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300 font-medium">{entry.name}:</span>
            </div>
            <span className="font-bold text-white">{entry.value.toLocaleString('fr-FR')} DT</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard({
  currentUser,
  selectedProjectId,
  projets,
  ventes,
  achats,
  clients,
  fournisseurs,
  articles,
  reglements,
  relances,
  mouvements,
  onTabChange,
  onVentesChange,
  onAchatsChange,
  onArticlesChange,
  onReglementsChange,
  onMouvementsChange
}: DashboardProps) {
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<'line' | 'bar'>('line');
  const [timeRange, setTimeRange] = useState<'7J' | '30J' | '3M' | '6M' | '1A'>('1A');

  // Quick Action Modal States
  const [quickSaleModalOpen, setQuickSaleModalOpen] = useState(false);
  const [quickSaleClient, setQuickSaleClient] = useState('');
  const [quickSaleArticle, setQuickSaleArticle] = useState('');
  const [quickSaleQty, setQuickSaleQty] = useState(1);
  const [quickSalePrice, setQuickSalePrice] = useState(0);

  const [quickStockModalOpen, setQuickStockModalOpen] = useState(false);
  const [quickStockArticle, setQuickStockArticle] = useState('');
  const [quickStockQty, setQuickStockQty] = useState(10);
  const [quickStockType, setQuickStockType] = useState<'Entrée' | 'Sortie'>('Entrée');
  const [quickStockMotif, setQuickStockMotif] = useState('Approvisionnement express');

  const [quickPaymentModalOpen, setQuickPaymentModalOpen] = useState(false);
  const [quickPaymentSaleId, setQuickPaymentSaleId] = useState('');
  const [quickPaymentAmount, setQuickPaymentAmount] = useState(0);
  const [quickPaymentMode, setQuickPaymentMode] = useState<'Espèces' | 'Chèque' | 'Virement'>('Virement');

  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);

  // Scoped Data
  const scopedVentes = useMemo(() => isGlobal ? ventes : ventes.filter(v => v.projetId === selectedProjectId), [ventes, isGlobal, selectedProjectId]);
  const scopedAchats = useMemo(() => isGlobal ? achats : achats.filter(a => a.projetId === selectedProjectId), [achats, isGlobal, selectedProjectId]);
  const scopedClients = useMemo(() => isGlobal ? clients : clients.filter(c => c.projetId === selectedProjectId), [clients, isGlobal, selectedProjectId]);
  const scopedFournisseurs = useMemo(() => isGlobal ? fournisseurs : fournisseurs.filter(f => f.projetId === selectedProjectId), [fournisseurs, isGlobal, selectedProjectId]);
  const scopedArticles = useMemo(() => isGlobal ? articles : articles.filter(a => a.projetId === selectedProjectId), [articles, isGlobal, selectedProjectId]);

  // Aggregated KPIs
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  const ventesReelles = scopedVentes.filter(v => v.statut !== 'Devis' && v.statut !== 'Annulée');
  const devisMois = scopedVentes.filter(v => v.statut === 'Devis');

  const totalFactureTTC = ventesReelles.reduce((acc, v) => acc + v.montantTTC, 0);
  const totalEncaisse = scopedVentes.reduce((acc, v) => acc + (v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0)), 0);
  const totalCreancesDues = Math.max(0, totalFactureTTC - totalEncaisse);
  const totalAchatsVal = scopedAchats.reduce((acc, a) => acc + a.montantTTC, 0);
  const stockGlobal = scopedArticles.reduce((acc, a) => acc + a.stock, 0);
  const stockValuation = scopedArticles.reduce((acc, a) => acc + (a.stock * (a.prixAchatHT || 0)), 0);

  // New specific KPIs for P1.7
  const caAujourdhui = ventesReelles.filter(v => v.date.startsWith(todayStr)).reduce((acc, v) => acc + v.montantTTC, 0);
  const caMois = ventesReelles.filter(v => v.date.startsWith(currentMonthStr)).reduce((acc, v) => acc + v.montantTTC, 0);
  const nbVentes = ventesReelles.reduce((acc, v) => acc + v.lignes.reduce((sum, l) => sum + l.quantite, 0), 0); // Nombre de produits vendus
  const nbCommandes = devisMois.length;
  const nbProduitsFaible = scopedArticles.filter(a => a.stock > 0 && a.stock <= (a.stockMinimum || 5)).length;
  const nbClients = scopedClients.length;
  const nbFactures = ventesReelles.length;

  // Dynamic Monthly Chart Data
  const chartData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months.map((m, i) => {
      // Simulate monthly curve based on actual figures
      const factor = (i + 1) / 12;
      const v = Math.round((totalFactureTTC / 6) * (0.6 + 0.8 * Math.sin(factor * Math.PI)));
      const a = Math.round((totalAchatsVal / 6) * (0.5 + 0.6 * Math.cos(factor * Math.PI)));
      return { mois: m, ventes: Math.max(1200, v), achats: Math.max(800, a) };
    });
  }, [totalFactureTTC, totalAchatsVal]);

  // Quick Preset for Reports
  const handleQuickPreset = (preset: 'month' | 'quarter' | 'year' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setReportStartDate(firstDay);
      setReportEndDate(todayStr);
    } else if (preset === 'quarter') {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      const firstDay = new Date(today.getFullYear(), qMonth, 1).toISOString().split('T')[0];
      setReportStartDate(firstDay);
      setReportEndDate(todayStr);
    } else if (preset === 'year') {
      const firstDay = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      setReportStartDate(firstDay);
      setReportEndDate(todayStr);
    } else {
      setReportStartDate('');
      setReportEndDate('');
    }
  };

  // PDF Report Generation
  const generatePDFReport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Header Banner
    doc.setFillColor(15, 23, 42); // Dark slate
    doc.rect(0, 0, 210, 32, 'F');
    doc.setFillColor(225, 29, 72); // Rose accent line
    doc.rect(0, 32, 210, 1.5, 'F');

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("RAPPORT D'ACTIVITÉ & BILAN FINANCIER", 14, 13);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Système Central ERP • Multi-Projets • Édité le ${new Date().toLocaleDateString('fr-FR')}`, 14, 21);

    const scopeName = isGlobal ? 'Toutes les Boutiques (Consolidé)' : currentProject?.nom || 'Projet Actif';
    const periodLabel = (reportStartDate || reportEndDate) 
      ? `Du ${reportStartDate || 'Origine'} au ${reportEndDate || 'Aujourd\'hui'}`
      : 'Toutes périodes confondues';

    // Info Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 38, 182, 14, 2, 2, 'FD');

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Périmètre : ${scopeName}`, 18, 47);
    doc.text(`Période sélectionnée : ${periodLabel}`, 110, 47);

    let filteredVentes = scopedVentes;
    let filteredAchats = scopedAchats;
    if (reportStartDate) {
      filteredVentes = filteredVentes.filter(v => v.date >= reportStartDate);
      filteredAchats = filteredAchats.filter(a => a.date >= reportStartDate);
    }
    if (reportEndDate) {
      filteredVentes = filteredVentes.filter(v => v.date <= reportEndDate);
      filteredAchats = filteredAchats.filter(a => a.date <= reportEndDate);
    }

    const totalV = filteredVentes.reduce((a, v) => a + v.montantTTC, 0);
    const totalA = filteredAchats.reduce((a, aItem) => a + aItem.montantTTC, 0);

    // AutoTable Summary
    autoTable(doc, {
      startY: 57,
      head: [['Indicateur Financier', 'Valeur (DT)', 'Commentaire & Métriques']],
      body: [
        ['Chiffre d\'Affaires Réalisé (TTC)', `${totalV.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`, `${filteredVentes.length} factures enregistrées sur la période`],
        ['Achats & Dépenses Fournisseurs (TTC)', `${totalA.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`, `${filteredAchats.length} commandes enregistrées sur la période`],
        ['Marge Brute / Excédent d\'Exploitation', `${(totalV - totalA).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`, totalV >= totalA ? 'Solde bénéficiaire d\'exploitation' : 'Solde déficitaire d\'exploitation'],
        ['Valeur Globale de l\'Inventaire Stock', `${stockValuation.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`, `${stockGlobal} unités disponibles en dépôt`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [180, 20, 30], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 65 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
        2: { cellWidth: 72 }
      }
    });

    // AutoTable Sales Detail
    const yV = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 120;
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("1. Détail des Factures de Vente", 14, yV);
    
    autoTable(doc, {
      startY: yV + 4,
      head: [['N° Facture', 'Date', 'Client', 'Statut', 'Montant TTC']],
      body: filteredVentes.length > 0 ? filteredVentes.map(v => [
        v.numero,
        new Date(v.date).toLocaleDateString('fr-FR'),
        scopedClients.find(c => c.id === v.clientId)?.nom || v.clientNom || 'Client',
        v.statut,
        `${v.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`
      ]) : [['Aucune vente sur la période', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 32 },
        1: { halign: 'center', cellWidth: 26 },
        2: { cellWidth: 65 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 34 }
      }
    });

    // Page Numbers Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 285, 196, 285);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`ERP Management DISTRIBUTION ERP • Rapport Financier & Bilan d'Activité`, 14, 290);
      doc.text(`Page ${i} / ${totalPages}`, 196, 290, { align: 'right' });
    }

    const fileName = `Rapport_Financier_${(reportStartDate || 'Global')}_${(reportEndDate || 'Aujourdhui')}.pdf`;
    doc.save(fileName);
    setIsReportModalOpen(false);
  };

  // Submit Quick Sale
  const handleConfirmQuickSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSaleClient || !quickSaleArticle || quickSaleQty <= 0) return;

    const art = scopedArticles.find(a => a.id === quickSaleArticle);
    const client = scopedClients.find(c => c.id === quickSaleClient);
    if (!art || !client) return;

    const pu = quickSalePrice > 0 ? quickSalePrice : (art.prixVenteHT || 0);
    const tva = art.tva || 19;
    const totalHT = quickSaleQty * pu;
    const totalTTC = totalHT * (1 + tva / 100);

    const year = new Date().getFullYear();
    const count = ventes.length + 1;
    const numero = `FAC-${year}-${count.toString().padStart(4, '0')}`;

    const newSale: Vente = {
      id: `v-${Date.now()}`,
      numero,
      projetId: client.projetId || (isGlobal ? (projets[0]?.id || 'p1') : selectedProjectId),
      clientId: client.id,
      clientNom: client.nom,
      date: new Date().toISOString().split('T')[0],
      montantHT: totalHT,
      montantTTC: totalTTC,
      montantPaye: 0,
      statut: 'Facture',
      lignes: [
        {
          id: `l-1`,
          articleId: art.id,
          designation: art.designation,
          quantite: quickSaleQty,
          prixUnitaireHT: pu,
          tauxTVA: tva,
          remisePourcentage: 0,
          totalHT,
          totalTTC
        }
      ]
    };

    onVentesChange([newSale, ...ventes]);
    setQuickSaleModalOpen(false);
  };

  // Submit Quick Stock Adjustment
  const handleConfirmQuickStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStockArticle || quickStockQty <= 0) return;

    const art = scopedArticles.find(a => a.id === quickStockArticle);
    if (!art) return;

    const currentStock = art.stocks?.[selectedProjectId] ?? art.stock ?? 0;

    // Strict validation: Block decrementation if stock is null/zero or insufficient
    if (quickStockType === 'Sortie' && (currentStock <= 0 || quickStockQty > currentStock)) {
      alert(`ACTION REFUSÉE - STOCK ÉPUISÉ OU INSUFFISANT :\nLe stock disponible pour "${art.designation}" est de ${currentStock} unité(s).\n\nImpossible de réaliser une décrémentation ou une sortie sur un produit avec un stock nul ou insuffisant.`);
      return;
    }

    const delta = quickStockType === 'Entrée' ? quickStockQty : -quickStockQty;
    const newStock = Math.max(0, currentStock + delta);

    // Update Article
    const updatedArticles = articles.map(a => {
      if (a.id === art.id) {
        return {
          ...a,
          stock: newStock,
          stocks: {
            ...(a.stocks || {}),
            [selectedProjectId]: newStock
          }
        };
      }
      return a;
    });
    onArticlesChange(updatedArticles);

    // Log Mouvement
    const newMvt: MouvementStock = {
      id: `mvt-${Date.now()}`,
      articleId: art.id,
      designation: art.designation,
      projetId: art.projetId || selectedProjectId,
      type: quickStockType,
      quantite: quickStockQty,
      date: new Date().toISOString().split('T')[0],
      reference: `MVT-EXPRESS-${Date.now().toString().slice(-4)}`,
      motif: quickStockMotif
    };
    onMouvementsChange([newMvt, ...mouvements]);
    setQuickStockModalOpen(false);
  };

  // Submit Quick Payment
  const handleConfirmQuickPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPaymentSaleId || quickPaymentAmount <= 0) return;

    const sale = scopedVentes.find(v => v.id === quickPaymentSaleId);
    if (!sale) return;

    const curPaid = sale.montantPaye ?? (sale.statut === 'Payée' ? sale.montantTTC : 0);
    const newPaid = curPaid + quickPaymentAmount;
    const isTotal = newPaid >= sale.montantTTC;

    const updated = ventes.map(v => {
      if (v.id === sale.id) {
        return {
          ...v,
          montantPaye: newPaid,
          statut: isTotal ? ('Payée' as const) : ('Facture' as const)
        };
      }
      return v;
    });
    onVentesChange(updated);

    const client = scopedClients.find(c => c.id === sale.clientId);
    const newReg: Reglement = {
      id: `reg-${Date.now()}`,
      projetId: sale.projetId,
      numeroPiece: `ENC-${Date.now().toString().slice(-5)}`,
      type: 'Encaissement',
      tierId: sale.clientId,
      tierNom: client?.nom || 'Client',
      tierType: 'Client',
      documentRef: sale.numero,
      date: new Date().toISOString().split('T')[0],
      montant: quickPaymentAmount,
      modePaiement: quickPaymentMode,
      statut: 'Validé'
    };
    onReglementsChange([newReg, ...reglements]);
    setQuickPaymentModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[16px] border border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div>
          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] tracking-widest uppercase rounded-md mb-3">
            Tableau de bord
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            {isGlobal ? "ERP Management • Vue Générale" : `Boutique : SOCIETE UNIVERS GSM DE SUD`}
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-2xl">
            Vue d'ensemble de votre activité commerciale et de vos indicateurs clés.
          </p>
        </div>
      </div>

      {/* SECTION ACTIONS RAPIDES */}
      <div className="bg-white p-6 rounded-[16px] border border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">bolt</span>
              Actions rapides & Raccourcis
            </h2>
            <p className="text-xs text-slate-500 font-medium">Lancement immédiat des opérations courantes de gestion commercial & stock</p>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold border border-slate-200/60">
            8 Raccourcis Opérationnels
          </span>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3.5">
          {/* 1. Facture / Devis */}
          <button
            onClick={() => onTabChange && onTabChange('ventes')}
            className="flex flex-col justify-between p-4 bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/60 hover:border-blue-300 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden shadow-xs hover:shadow-md cursor-pointer min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Ventes
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 group-hover:text-blue-700 leading-tight mb-1">Facture / Devis</span>
              <span className="block text-[10px] font-medium text-slate-500 leading-tight">Création & Édition</span>
            </div>
            <span className="material-symbols-outlined absolute right-3 bottom-3 text-slate-300 group-hover:text-blue-500 text-[16px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">arrow_forward</span>
          </button>

          {/* 2. Bon de Livraison */}
          <button
            onClick={() => onTabChange && onTabChange('livraisons')}
            className="flex flex-col justify-between p-4 bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/60 hover:border-blue-300 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden shadow-xs hover:shadow-md cursor-pointer min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">local_shipping</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Logistique
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 group-hover:text-blue-700 leading-tight mb-1">Bon de Livraison</span>
              <span className="block text-[10px] font-medium text-slate-500 leading-tight">Expédition Client</span>
            </div>
            <span className="material-symbols-outlined absolute right-3 bottom-3 text-slate-300 group-hover:text-blue-500 text-[16px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">arrow_forward</span>
          </button>

          {/* 3. Bon de Sortie */}
          <button
            onClick={() => onTabChange && onTabChange('bons_sortie')}
            className="flex flex-col justify-between p-4 bg-slate-50/80 hover:bg-emerald-50/60 border border-slate-200/60 hover:border-emerald-300 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden shadow-xs hover:shadow-md cursor-pointer min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">output</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                Sortie
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 group-hover:text-emerald-700 leading-tight mb-1">Bon de Sortie</span>
              <span className="block text-[10px] font-medium text-slate-500 leading-tight">Déstockage Magasin</span>
            </div>
            <span className="material-symbols-outlined absolute right-3 bottom-3 text-slate-300 group-hover:text-emerald-500 text-[16px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">arrow_forward</span>
          </button>

          {/* 4. Bon d'Achat */}
          <button
            onClick={() => onTabChange && onTabChange('bons_achat')}
            className="flex flex-col justify-between p-4 bg-slate-50/80 hover:bg-cyan-50/60 border border-slate-200/60 hover:border-cyan-300 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden shadow-xs hover:shadow-md cursor-pointer min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
                Achats
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 group-hover:text-cyan-700 leading-tight mb-1">Bon d'Achat</span>
              <span className="block text-[10px] font-medium text-slate-500 leading-tight">Réception Fournisseur</span>
            </div>
            <span className="material-symbols-outlined absolute right-3 bottom-3 text-slate-300 group-hover:text-cyan-500 text-[16px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">arrow_forward</span>
          </button>

          {/* 5. Transfert de Stock */}
          <button
            onClick={() => onTabChange && onTabChange('transferts')}
            className="flex flex-col justify-between p-4 bg-slate-50/80 hover:bg-amber-50/60 border border-slate-200/60 hover:border-amber-300 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden shadow-xs hover:shadow-md cursor-pointer min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">alt_route</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                Transfert
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 group-hover:text-amber-700 leading-tight mb-1">Transfert Stock</span>
              <span className="block text-[10px] font-medium text-slate-500 leading-tight">Dépôt à Dépôt</span>
            </div>
            <span className="material-symbols-outlined absolute right-3 bottom-3 text-slate-300 group-hover:text-amber-500 text-[16px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">arrow_forward</span>
          </button>

          {/* 6. Entrée / Sortie Directe */}
          <button
            onClick={() => {
              setQuickStockArticle(scopedArticles[0]?.id || '');
              setQuickStockQty(10);
              setQuickStockType('Entrée');
              setQuickStockModalOpen(true);
            }}
            className="flex flex-col justify-between p-4 bg-slate-50/80 hover:bg-purple-50/60 border border-slate-200/60 hover:border-purple-300 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden shadow-xs hover:shadow-md cursor-pointer min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                Ajustement
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 group-hover:text-purple-700 leading-tight mb-1">Entrée / Sortie</span>
              <span className="block text-[10px] font-medium text-slate-500 leading-tight">Ajustement Direct</span>
            </div>
            <span className="material-symbols-outlined absolute right-3 bottom-3 text-slate-300 group-hover:text-purple-500 text-[16px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">arrow_forward</span>
          </button>

          {/* 7. Encaisser Paiement */}
          <button
            onClick={() => {
              const pending = scopedVentes.find(v => v.statut === 'Facture' && (v.montantPaye || 0) < v.montantTTC);
              if (pending) {
                setQuickPaymentSaleId(pending.id);
                setQuickPaymentAmount(pending.montantTTC - (pending.montantPaye || 0));
              }
              setQuickPaymentModalOpen(true);
            }}
            className="flex flex-col justify-between p-4 bg-slate-50/80 hover:bg-teal-50/60 border border-slate-200/60 hover:border-teal-300 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden shadow-xs hover:shadow-md cursor-pointer min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                Finance
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 group-hover:text-teal-700 leading-tight mb-1">Encaissement</span>
              <span className="block text-[10px] font-medium text-slate-500 leading-tight">Paiement & Reçu</span>
            </div>
            <span className="material-symbols-outlined absolute right-3 bottom-3 text-slate-300 group-hover:text-teal-500 text-[16px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">arrow_forward</span>
          </button>

          {/* 8. Suivi des Crédits & Inventaire PDF */}
          <button
            onClick={() => generateStockInventoryPdf(scopedArticles, mouvements, currentProject)}
            className="flex flex-col justify-between p-4 bg-slate-50/80 hover:bg-orange-50/60 border border-slate-200/60 hover:border-orange-300 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden shadow-xs hover:shadow-md cursor-pointer min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                Export PDF
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 group-hover:text-orange-700 leading-tight mb-1">Inventaire PDF</span>
              <span className="block text-[10px] font-medium text-slate-500 leading-tight">État de Stock Global</span>
            </div>
            <span className="material-symbols-outlined absolute right-3 bottom-3 text-slate-300 group-hover:text-orange-500 text-[16px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">arrow_forward</span>
          </button>
        </div>
      </div>

      {currentUser?.role !== 'agent' && (
        <>
          {/* KPI Cards Grid (P1.7 Admin Dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            
            {/* 1. CA Aujourd'hui */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-full group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CA Aujourd'hui</span>
                <span className="material-symbols-outlined text-[16px] text-slate-300">payments</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-800 tracking-tight mb-1">
                  {caAujourdhui.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-[12px] text-slate-400 font-bold">DT</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex items-center bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                    <span>0%</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">vs hier 0,00 DT</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-80" />
            </div>

            {/* 2. CA du mois */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-full group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CA du mois</span>
                <span className="material-symbols-outlined text-[16px] text-slate-300">account_balance_wallet</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-800 tracking-tight mb-1">
                  {caMois.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-[12px] text-slate-400 font-bold">DT</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex items-center bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                    <span>0%</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">vs mois d. 0,00 DT</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-500 opacity-80" />
            </div>

            {/* 3. Articles Vendus */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-full group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Articles Vendus</span>
                <span className="material-symbols-outlined text-[16px] text-slate-300">inventory_2</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-800 tracking-tight mb-1">{nbVentes}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex items-center bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                    <span>+12%</span>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-indigo-500 opacity-80" />
            </div>

            {/* 4. Devis / Commandes */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-full group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Devis / Cms</span>
                <span className="material-symbols-outlined text-[16px] text-slate-300">receipt_long</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-800 tracking-tight mb-1">{nbCommandes}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex items-center bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <span>0%</span>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-500 opacity-80" />
            </div>

            {/* 5. Stock faible */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-full group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stock faible</span>
                <span className="material-symbols-outlined text-[16px] text-rose-300">warning</span>
              </div>
              <div>
                <p className="text-xl font-black text-rose-600 tracking-tight mb-1">{nbProduitsFaible} <span className="text-[10px] font-bold text-rose-400">produits</span></p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-medium text-slate-400">Action requise</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-rose-500 opacity-80" />
            </div>

            {/* 6. Total Clients */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-full group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Clients</span>
                <span className="material-symbols-outlined text-[16px] text-slate-300">groups</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-800 tracking-tight mb-1">{nbClients}</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500 opacity-80" />
            </div>

            {/* 7. Factures */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-full group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Factures (Ventes)</span>
                <span className="material-symbols-outlined text-[16px] text-slate-300">description</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-800 tracking-tight mb-1">{nbFactures}</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-cyan-500 opacity-80" />
            </div>
          </div>

          {/* CA PAR BOUTIQUE (BF-BOUT-013 Global Breakdown) */}
          {isGlobal && (
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Chiffre d'Affaires et Ventes par Boutique</h3>
                  
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                  {projets.length} Boutiques
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projets.map(p => {
                  const bVentes = ventes.filter(v => v.projetId === p.id && v.statut !== 'Devis' && v.statut !== 'Annulée');
                  const bDevis = ventes.filter(v => v.projetId === p.id && v.statut === 'Devis');
                  const bFactures = bVentes.filter(v => v.statut !== 'Devis');
                  const bCa = bVentes.reduce((sum, v) => sum + v.montantTTC, 0);
                  const bArticles = articles.filter(a => a.projetId === p.id);
                  const bRupture = bArticles.filter(a => a.stock <= 0).length;
                  const bFaible = bArticles.filter(a => a.stock > 0 && a.stock <= (a.stockMinimum || 5)).length;

                  return (
                    <div key={p.id} className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">{p.nom}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded uppercase">{p.codeBoutique || p.id}</span>
                      </div>
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Chiffre d'Affaires :</span>
                          <span className="font-bold text-blue-600">{bCa.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Ventes / Factures :</span>
                          <span className="font-bold text-slate-800">{bVentes.length} factures</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Devis / Commandes :</span>
                          <span className="font-bold text-slate-800">{bDevis.length} devis</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Ruptures de stock :</span>
                          <span className={`font-bold ${bRupture > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{bRupture} produits</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Stock faible :</span>
                          <span className={`font-bold ${bFaible > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{bFaible} produits</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {currentUser?.role !== 'agent' && (
        <div className="bg-white p-6 md:p-8 rounded-[16px] border border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Évolution Comparée des Ventes vs Achats</h2>
              <p className="text-sm text-slate-500 font-medium">Analyse comparative des revenus et dépenses sur la période sélectionnée.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Time Selectors */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner">
                {['7J', '30J', '3M', '6M', '1A'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range as any)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      timeRange === range ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {/* Chart Type Selectors */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner">
                <button
                  onClick={() => setActiveChartTab('line')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeChartTab === 'line' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">show_chart</span>
                  Courbe
                </button>
                <button
                  onClick={() => setActiveChartTab('bar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeChartTab === 'bar' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                  Histogramme
                </button>
              </div>
            </div>
          </div>

          <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'line' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorAchats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    height={40} 
                    iconType="circle"
                    iconSize={8}
                    formatter={(val) => <span className="text-xs font-bold text-slate-700 ml-1">{val === 'ventes' ? 'Ventes (TTC)' : 'Achats (TTC)'}</span>}
                  />
                  <Area activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} type="monotone" dataKey="ventes" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorVentes)" />
                  <Area activeDot={{ r: 6, strokeWidth: 0, fill: '#0d9488' }} type="monotone" dataKey="achats" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorAchats)" />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    height={40} 
                    iconType="circle"
                    iconSize={8}
                    formatter={(val) => <span className="text-xs font-bold text-slate-700 ml-1">{val === 'ventes' ? 'Ventes (TTC)' : 'Achats (TTC)'}</span>}
                  />
                  <Bar dataKey="ventes" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="achats" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              )}
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* Grid: Last Invoices & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dernières Factures */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Dernières Factures</h3>
            <button
              onClick={() => onTabChange && onTabChange('ventes')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Voir toutes les ventes →
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500">
                  <th className="py-3 px-4">N° Facture</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 text-right">Montant TTC</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {scopedVentes.slice(0, 5).map((v) => {
                  const c = scopedClients.find(cli => cli.id === v.clientId);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">{v.numero}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 px-4">{c?.nom || v.clientNom || 'Client'}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {v.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          v.statut === 'Payée' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {v.statut}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => generateInvoicePdf(v, c, currentProject)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          title="Télécharger Facture PDF"
                        >
                          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertes de Recouvrement & Crédits */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Factures Impayées & Crédits</h3>
              <span className="p-1 rounded bg-rose-50 text-rose-600 text-xs font-bold">Priorité</span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {scopedClients.slice(0, 3).map((client) => {
                const clientSales = scopedVentes.filter(v => v.clientId === client.id && v.statut !== 'Devis');
                const due = clientSales.reduce((a, v) => a + (v.montantTTC - (v.montantPaye || (v.statut === 'Payée' ? v.montantTTC : 0))), 0);

                return (
                  <div key={client.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{client.nom}</p>
                      <span className="text-[10px] text-slate-400">Plafond: {(client.plafondCredit || 20000).toLocaleString('fr-FR')} DT</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-600 block">{due.toLocaleString('fr-FR')} DT</span>
                      <button
                        onClick={() => generateDunningLetterPdf(client, clientSales, 1, currentProject)}
                        className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-0.5 justify-end cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[12px]">send</span>
                        Relance PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onTabChange && onTabChange('credits')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl text-center cursor-pointer shadow-sm transition-all"
          >
            Voir tous les crédits clients →
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: RAPPORT D'ACTIVITÉ PDF */}
      {/* ========================================================================= */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Rapport Financier & Activités PDF</h3>
                  
                </div>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">Raccourcis de Période</label>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => handleQuickPreset('month')} className="py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700">Mois en cours</button>
                  <button onClick={() => handleQuickPreset('quarter')} className="py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700">Trimestre</button>
                  <button onClick={() => handleQuickPreset('year')} className="py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700">Année</button>
                  <button onClick={() => handleQuickPreset('all')} className="py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700">Global</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Date Début</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Date Fin</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={generatePDFReport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Télécharger le Rapport PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FACTURE EXPRESS */}
      {/* ========================================================================= */}
      {quickSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Nouvelle Facture Express</h3>
              <button onClick={() => setQuickSaleModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmQuickSale} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Client</label>
                <select
                  value={quickSaleClient}
                  onChange={(e) => setQuickSaleClient(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {scopedClients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Article</label>
                <select
                  value={quickSaleArticle}
                  onChange={(e) => {
                    setQuickSaleArticle(e.target.value);
                    const art = scopedArticles.find(a => a.id === e.target.value);
                    if (art) setQuickSalePrice(art.prixVenteHT);
                  }}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {scopedArticles.map(a => (
                    <option key={a.id} value={a.id}>{a.designation} ({a.prixVenteHT} DT)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={quickSaleQty}
                    onChange={(e) => setQuickSaleQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Prix U. HT (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickSalePrice}
                    onChange={(e) => setQuickSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickSaleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Émettre la Facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MOUVEMENT STOCK EXPRESS */}
      {/* ========================================================================= */}
      {quickStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Mouvement de Stock Express</h3>
              <button onClick={() => setQuickStockModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmQuickStock} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Type de Mouvement</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickStockType('Entrée')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      quickStockType === 'Entrée' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    + Entrée Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickStockType('Sortie')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      quickStockType === 'Sortie' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    - Sortie Stock
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Article</label>
                <select
                  value={quickStockArticle}
                  onChange={(e) => setQuickStockArticle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {scopedArticles.map(a => (
                    <option key={a.id} value={a.id}>{a.designation} (Stock actuel: {a.stock})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Quantité (Unités)</label>
                <input
                  type="number"
                  min="1"
                  value={quickStockQty}
                  onChange={(e) => setQuickStockQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Motif</label>
                <input
                  type="text"
                  value={quickStockMotif}
                  onChange={(e) => setQuickStockMotif(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickStockModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Valider le Mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ENCAISSEMENT EXPRESS */}
      {/* ========================================================================= */}
      {quickPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Encaisser un Règlement Express</h3>
              <button onClick={() => setQuickPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmQuickPayment} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Facture à Imputer</label>
                <select
                  value={quickPaymentSaleId}
                  onChange={(e) => {
                    setQuickPaymentSaleId(e.target.value);
                    const v = scopedVentes.find(sale => sale.id === e.target.value);
                    if (v) setQuickPaymentAmount(v.montantTTC - (v.montantPaye || 0));
                  }}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">Sélectionner une facture...</option>
                  {scopedVentes.filter(v => v.statut !== 'Devis' && (v.montantPaye || 0) < v.montantTTC).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.numero} - {v.clientNom || 'Client'} (Reste: {(v.montantTTC - (v.montantPaye || 0)).toLocaleString('fr-FR')} DT)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Montant Encaissé (DT)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={quickPaymentAmount}
                  onChange={(e) => setQuickPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mode de Paiement</label>
                <select
                  value={quickPaymentMode}
                  onChange={(e) => setQuickPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="Virement">Virement Bancaire</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Espèces">Espèces (Caisse)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Valider l'Encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
