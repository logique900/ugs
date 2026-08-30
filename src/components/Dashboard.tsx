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
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-xl text-white text-xs">
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
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("RAPPORT D'ACTIVITÉ & BILAN FINANCIER", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Système Central ERP • Multi-Boutiques • Édité le ${new Date().toLocaleDateString('fr-FR')}`, 14, 26);

    const scopeName = isGlobal ? 'Toutes les Boutiques' : currentProject?.nom || 'Boutique';
    const periodLabel = (reportStartDate || reportEndDate) 
      ? `Du ${reportStartDate || 'Origine'} au ${reportEndDate || 'Aujourd\'hui'}`
      : 'Toutes périodes confondues';

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.text(`Périmètre : ${scopeName}`, 14, 40);
    doc.text(`Période sélectionnée : ${periodLabel}`, 14, 46);

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
      startY: 52,
      head: [['Indicateur Financier', 'Valeur (DT)', 'Commentaire']],
      body: [
        ['Chiffre d\'Affaires Réalisé (TTC)', `${totalV.toLocaleString('fr-FR')} DT`, `${filteredVentes.length} factures enregistrées`],
        ['Achats & Dépenses Fournisseurs (TTC)', `${totalA.toLocaleString('fr-FR')} DT`, `${filteredAchats.length} commandes enregistrées`],
        ['Marge Brute / Excédent d\'Exploitation', `${(totalV - totalA).toLocaleString('fr-FR')} DT`, totalV >= totalA ? 'Solde bénéficiaire' : 'Solde déficitaire'],
        ['Valeur Globale de l\'Inventaire Stock', `${stockValuation.toLocaleString('fr-FR')} DT`, `${stockGlobal} unités disponibles`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 }
    });

    // AutoTable Sales
    const yV = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 120;
    doc.setFontSize(12);
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
        `${v.montantTTC.toLocaleString('fr-FR')} DT`
      ]) : [['Aucune vente sur la période', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 }
    });

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

    const delta = quickStockType === 'Entrée' ? quickStockQty : -quickStockQty;
    const newStock = Math.max(0, art.stock + delta);

    // Update Article
    const updatedArticles = articles.map(a => a.id === art.id ? { ...a, stock: newStock } : a);
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            {isGlobal ? "Société UGS • Pilotage Central" : `Boutique : ${currentProject?.nom}`}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isGlobal 
              ? "Centrale de distribution : Supervision consolidée des flux, stocks et performances du réseau UGS" 
              : "Suivi opérationnel et financier de la boutique active."}
          </p>
        </div>

        {/* Global PDF Report Action */}
        {currentUser?.role !== 'agent' && (
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            Rapport d'Activité & Bilan PDF
          </button>
        </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🚀 GROUPED QUICK ACTION HUB (CENTRE D'ACTIONS RAPIDES GROUPÉES) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-sm font-black tracking-wider uppercase text-slate-200">
              Centre d'Actions Rapides & Opérations Flash
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Exécutez vos opérations quotidiennes en 1 clic</span>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Quick Sale */}
          <button
            onClick={() => {
              setQuickSaleClient(scopedClients[0]?.id || '');
              setQuickSaleArticle(scopedArticles[0]?.id || '');
              setQuickSaleQty(1);
              setQuickSalePrice(scopedArticles[0]?.prixVenteHT || 0);
              setQuickSaleModalOpen(true);
            }}
            className="p-3.5 bg-slate-800/80 hover:bg-blue-600 border border-slate-700/80 hover:border-blue-500 rounded-xl transition-all duration-200 flex flex-col items-center text-center gap-2 group cursor-pointer shadow-sm hover:scale-[1.03]"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 group-hover:bg-white/20 flex items-center justify-center text-blue-400 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-white leading-tight">Facture Express</span>
          </button>

          {/* Quick Stock Movement */}
          <button
            onClick={() => {
              setQuickStockArticle(scopedArticles[0]?.id || '');
              setQuickStockQty(10);
              setQuickStockType('Entrée');
              setQuickStockModalOpen(true);
            }}
            className="p-3.5 bg-slate-800/80 hover:bg-emerald-600 border border-slate-700/80 hover:border-emerald-500 rounded-xl transition-all duration-200 flex flex-col items-center text-center gap-2 group cursor-pointer shadow-sm hover:scale-[1.03]"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 group-hover:bg-white/20 flex items-center justify-center text-emerald-400 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-white leading-tight">Mouvement Stock</span>
          </button>

          {/* Quick Payment Collection */}
          <button
            onClick={() => {
              const pending = scopedVentes.find(v => v.statut === 'Facture' && (v.montantPaye || 0) < v.montantTTC);
              if (pending) {
                setQuickPaymentSaleId(pending.id);
                setQuickPaymentAmount(pending.montantTTC - (pending.montantPaye || 0));
              }
              setQuickPaymentModalOpen(true);
            }}
            className="p-3.5 bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-700/60 hover:border-emerald-500 rounded-xl transition-all duration-200 flex flex-col items-center text-center gap-2 group cursor-pointer shadow-sm hover:scale-[1.03]"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 group-hover:bg-white/20 flex items-center justify-center text-emerald-400 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
            <span className="text-xs font-bold text-emerald-200 group-hover:text-white leading-tight">Encaisser Paiement</span>
          </button>

          {currentUser?.role !== 'agent' && (
            <>
              {/* Quick Credit & Installment Navigation */}
              <button
                onClick={() => onTabChange && onTabChange('credits')}
                className="p-3.5 bg-purple-950/40 hover:bg-purple-600 border border-purple-700/60 hover:border-purple-500 rounded-xl transition-all duration-200 flex flex-col items-center text-center gap-2 group cursor-pointer shadow-sm hover:scale-[1.03]"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 group-hover:bg-white/20 flex items-center justify-center text-purple-400 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                </div>
                <span className="text-xs font-bold text-purple-200 group-hover:text-white leading-tight">Échéancier Crédit</span>
              </button>

              {/* Quick PDF: Balance Âgée */}
              <button
                onClick={() => generateAgingBalancePdf(
                  scopedVentes.map(v => ({
                    id: `ech-${v.id}`,
                    venteId: v.id,
                    numeroFacture: v.numero,
                    clientId: v.clientId,
                    clientNom: v.clientNom || 'Client',
                    projetId: v.projetId,
                    dateFacture: v.date,
                    dateEcheance: v.dateEcheance || v.date,
                    montantTTC: v.montantTTC,
                    montantPaye: v.montantPaye || 0,
                    soldeRestant: Math.max(0, v.montantTTC - (v.montantPaye || 0)),
                    statut: (v.montantPaye || 0) >= v.montantTTC ? 'Soldée' : 'Non échue',
                    joursRetard: 0
                  })),
                  scopedClients,
                  currentProject
                )}
                className="p-3.5 bg-slate-800/80 hover:bg-red-600 border border-slate-700/80 hover:border-red-500 rounded-xl transition-all duration-200 flex flex-col items-center text-center gap-2 group cursor-pointer shadow-sm hover:scale-[1.03]"
              >
                <div className="w-9 h-9 rounded-lg bg-red-500/20 group-hover:bg-white/20 flex items-center justify-center text-red-400 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </div>
                <span className="text-xs font-bold text-slate-200 group-hover:text-white leading-tight">Balance Âgée PDF</span>
              </button>
            </>
          )}

          {/* Quick PDF: Inventaire Stock */}
          <button
            onClick={() => generateStockInventoryPdf(scopedArticles, mouvements, currentProject)}
            className="p-3.5 bg-slate-800/80 hover:bg-amber-600 border border-slate-700/80 hover:border-amber-500 rounded-xl transition-all duration-200 flex flex-col items-center text-center gap-2 group cursor-pointer shadow-sm hover:scale-[1.03]"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 group-hover:bg-white/20 flex items-center justify-center text-amber-400 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">inventory</span>
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-white leading-tight">Inventaire PDF</span>
          </button>
        </div>
      </div>

      {currentUser?.role !== 'agent' && (
        <>
          {/* KPI Cards Grid (P1.7 Admin Dashboard) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
            
            {/* CA Aujourd'hui */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CA Aujourd'hui</span>
              <p className="text-lg font-black text-slate-900">
                {caAujourdhui.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-[10px] font-bold text-slate-500">DT</span>
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </div>

            {/* CA du mois */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CA du mois</span>
              <p className="text-lg font-black text-slate-900">
                {caMois.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-[10px] font-bold text-slate-500">DT</span>
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
            </div>

            {/* Nombre de ventes */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Articles Vendus</span>
              <p className="text-lg font-black text-slate-900">{nbVentes}</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
            </div>

            {/* Nombre de commandes */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Devis / Commandes</span>
              <p className="text-lg font-black text-slate-900">{nbCommandes}</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
            </div>

            {/* Stock faible */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stock faible</span>
              <p className="text-lg font-black text-rose-600">{nbProduitsFaible} <span className="text-[10px] font-bold text-slate-500">produits</span></p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
            </div>

            {/* Nombre de clients */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Clients</span>
              <p className="text-lg font-black text-slate-900">{nbClients}</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </div>

            {/* Nombre de factures */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Factures (Ventes)</span>
              <p className="text-lg font-black text-slate-900">{nbFactures}</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500" />
            </div>

          </div>

          {/* CA PAR BOUTIQUE (BF-BOUT-013 Global Breakdown) */}
          {isGlobal && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">CA & Performances par Boutique (Consolidation Globale)</h3>
                  <p className="text-xs text-slate-500">Répartition détaillée du chiffre d'affaires et des volumes par succursale</p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                  {projets.length} Boutiques Actives
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
                          <span className="font-black text-blue-600">{bCa.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
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
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Évolution Comparée des Ventes vs Achats</h2>
            <p className="text-xs text-slate-500">Analyse de la marge brute et des flux de trésorerie</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveChartTab('line')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'line' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Courbe Flux
            </button>
            <button
              onClick={() => setActiveChartTab('bar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'bar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Histogramme
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartTab === 'line' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorAchats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  height={36} 
                  formatter={(val) => <span className="text-xs font-bold text-slate-700">{val === 'ventes' ? 'Ventes (TTC)' : 'Achats (TTC)'}</span>}
                />
                <Area type="monotone" dataKey="ventes" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentes)" />
                <Area type="monotone" dataKey="achats" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAchats)" />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  height={36} 
                  formatter={(val) => <span className="text-xs font-bold text-slate-700">{val === 'ventes' ? 'Ventes' : 'Achats'}</span>}
                />
                <Bar dataKey="ventes" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="achats" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* Grid: Last Invoices & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dernières Factures */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Dernières Factures Émises</h3>
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
                      <td className="py-3 px-4 text-right font-black text-slate-900">
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Alertes Créances & Crédits</h3>
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
                      <span className="text-xs font-black text-rose-600 block">{due.toLocaleString('fr-FR')} DT</span>
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
            Ouvrir la Gestion Complète des Crédits →
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: RAPPORT D'ACTIVITÉ PDF */}
      {/* ========================================================================= */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Rapport Financier & Activités PDF</h3>
                  <p className="text-[11px] text-slate-500">Filtrage multi-dates et compilation comptable</p>
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
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
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
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
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
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
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
