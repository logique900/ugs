import React, { useState, useMemo } from 'react';
import { 
  RetourVente, 
  LigneRetourVente, 
  Vente, 
  Article, 
  MouvementStock, 
  Reglement, 
  Client, 
  Projet, 
  Utilisateur, 
  MotifRetour, 
  ModeRemboursement 
} from '../types';
import { generateReturnSlipPdf } from '../utils/pdfExportEngine';
import { getArticleStock, updateArticleStock } from '../utils/stockUtils';
import { createGuaranteedStockMovement } from '../utils/stockIntegrityEngine';

interface RetoursProps {
  retours: RetourVente[];
  onRetoursChange: (retours: RetourVente[]) => void;
  ventes: Vente[];
  articles: Article[];
  onArticlesChange: (articles: Article[]) => void;
  mouvements: MouvementStock[];
  onMouvementsChange: (mouvements: MouvementStock[]) => void;
  reglements: Reglement[];
  onReglementsChange: (reglements: Reglement[]) => void;
  clients: Client[];
  projets: Projet[];
  selectedProjectId: string;
  currentUser: Utilisateur;
}

const MOTIFS_RETOUR: MotifRetour[] = [
  'Défectueux',
  'Erreur de référence',
  'Changement d\'avis',
  'Non conforme',
  'Article endommagé',
  'Garantie',
  'Autre'
];

export default function Retours({
  retours,
  onRetoursChange,
  ventes,
  articles,
  onArticlesChange,
  mouvements,
  onMouvementsChange,
  reglements,
  onReglementsChange,
  clients,
  projets,
  selectedProjectId,
  currentUser
}: RetoursProps) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  // Modals
  const [isNewReturnModalOpen, setIsNewReturnModalOpen] = useState(false);
  const [viewingReturn, setViewingReturn] = useState<RetourVente | null>(null);

  // New Return Form State
  const [returnType, setReturnType] = useState<'ticket' | 'libre'>('ticket');
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [refundMode, setRefundMode] = useState<ModeRemboursement>('Espèces');
  const [generalMotif, setGeneralMotif] = useState<string>('Retour article au comptoir');
  const [returnLines, setReturnLines] = useState<Array<{
    articleId: string;
    articleCode?: string;
    designation: string;
    quantiteVendue: number;
    quantiteRetournee: number;
    prixUnitaire: number;
    motif: string;
    remettreEnStock: boolean;
  }>>([]);

  // Toast / feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter scoped data
  const scopedRetours = useMemo(() => {
    return retours.filter(r => {
      if (selectedProjectId !== 'all' && r.projetId !== selectedProjectId) return false;
      const matchesSearch = 
        r.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clientNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.venteNumero && r.venteNumero.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.codeAvoir && r.codeAvoir.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesMode = filterMode === 'all' || r.modeRemboursement === filterMode;
      const matchesStatus = filterStatus === 'all' || r.statut === filterStatus;
      const matchesDate = !filterDate || r.date.startsWith(filterDate);

      return matchesSearch && matchesMode && matchesStatus && matchesDate;
    });
  }, [retours, selectedProjectId, searchTerm, filterMode, filterStatus, filterDate]);

  // Available sales for return selection
  const availableSales = useMemo(() => {
    return ventes.filter(v => {
      if (selectedProjectId !== 'all' && v.projetId && v.projetId !== selectedProjectId) return false;
      if (ticketSearch) {
        const q = ticketSearch.toLowerCase();
        return (
          v.numero.toLowerCase().includes(q) ||
          (v.clientNom && v.clientNom.toLowerCase().includes(q))
        );
      }
      return true;
    }).slice(0, 30);
  }, [ventes, selectedProjectId, ticketSearch]);

  // Current project
  const currentProject = useMemo(() => {
    if (selectedProjectId === 'all') return projets[0] || null;
    return projets.find(p => p.id === selectedProjectId) || null;
  }, [projets, selectedProjectId]);

  // Handle selecting a sale for return
  const handleSelectSale = (sale: Vente) => {
    setSelectedSaleId(sale.id);
    setSelectedClientId(sale.clientId);

    if (sale.lignes && sale.lignes.length > 0) {
      const initialLines = sale.lignes.map(l => ({
        articleId: l.articleId,
        articleCode: l.code || '',
        designation: l.designation,
        quantiteVendue: l.quantite,
        quantiteRetournee: 0,
        prixUnitaire: l.prixUnitaireHT || (l.totalTTC / (l.quantite || 1)),
        motif: 'Changement d\'avis',
        remettreEnStock: true
      }));
      setReturnLines(initialLines);
    } else {
      setReturnLines([]);
    }
  };

  // Add line for free return (sans ticket)
  const handleAddFreeReturnLine = () => {
    const defaultArticle = articles[0];
    if (!defaultArticle) return;
    setReturnLines(prev => [
      ...prev,
      {
        articleId: defaultArticle.id,
        articleCode: defaultArticle.code,
        designation: defaultArticle.designation,
        quantiteVendue: 1,
        quantiteRetournee: 1,
        prixUnitaire: defaultArticle.prixVenteHT,
        motif: 'Changement d\'avis',
        remettreEnStock: true
      }
    ]);
  };

  // Calculate return total
  const calculatedTotal = useMemo(() => {
    return returnLines.reduce((acc, l) => acc + (l.quantiteRetournee * l.prixUnitaire), 0);
  }, [returnLines]);

  // Submit New Return
  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();

    const activeLines = returnLines.filter(l => l.quantiteRetournee > 0);
    if (activeLines.length === 0) {
      alert('Veuillez sélectionner au moins un article avec une quantité supérieure à 0.');
      return;
    }

    const targetClient = clients.find(c => c.id === selectedClientId) || { id: 'unknown', nom: 'Client Comptoir' };
    const targetProject = currentProject || projets[0];
    const storeId = targetProject?.id || 'p1';
    const storeNom = targetProject?.nom || 'Boutique Principale';
    const now = new Date();
    const dateFormatted = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    const returnNumber = `RET-${now.getFullYear()}-${(retours.length + 1).toString().padStart(4, '0')}`;
    const codeAvoir = refundMode === 'Avoir' ? `AVR-${now.getFullYear()}-${(retours.filter(r => r.codeAvoir).length + 1).toString().padStart(4, '0')}` : undefined;

    const sourceSale = ventes.find(v => v.id === selectedSaleId);

    // Stock updates and stock movements
    const newStockMovements: MouvementStock[] = [];
    let updatedArticlesList = [...articles];

    activeLines.forEach(line => {
      if (line.remettreEnStock) {
        const art = updatedArticlesList.find(a => a.id === line.articleId);
        if (art && art.typeArticle !== 'Service') {
          const stockAvant = getArticleStock(art, storeId);
          const updatedArt = updateArticleStock(art, storeId, line.quantiteRetournee);
          const stockApres = getArticleStock(updatedArt, storeId);

          updatedArticlesList = updatedArticlesList.map(a => a.id === art.id ? updatedArt : a);

          const mvt = createGuaranteedStockMovement({
            article: art,
            projetId: storeId,
            projetNom: storeNom,
            type: 'ENTRÉE',
            quantite: line.quantiteRetournee,
            quantiteAvant: stockAvant,
            quantiteApres: stockApres,
            motif: `Retour marchandise (${returnNumber}) - ${line.motif}`,
            currentUser,
            referencePiece: returnNumber
          });
          newStockMovements.push(mvt);
        }
      }
    });

    if (newStockMovements.length > 0) {
      onArticlesChange(updatedArticlesList);
      onMouvementsChange([...newStockMovements, ...mouvements]);
    }

    // Cash refund creates a Reglement Décaissement in Caisse journal
    let newRegId: string | undefined = undefined;
    if (refundMode === 'Espèces' && calculatedTotal > 0) {
      const regId = `reg-ret-${Date.now()}`;
      newRegId = regId;
      const decaissementReg: Reglement = {
        id: regId,
        projetId: storeId,
        numeroPiece: `DEC-${Date.now().toString().slice(-6)}`,
        type: 'Décaissement',
        tierId: targetClient.id,
        tierNom: targetClient.nom,
        tierType: 'Client',
        documentRef: returnNumber,
        date: now.toISOString().split('T')[0],
        montant: calculatedTotal,
        modePaiement: 'Espèces',
        banque: 'Caisse Centrale',
        referencePaiement: `Remboursement Retour ${returnNumber}`,
        notes: `Remboursement comptoir suite au retour de vente ${sourceSale ? sourceSale.numero : 'direct'}`,
        statut: 'Validé'
      };
      onReglementsChange([decaissementReg, ...reglements]);
    }

    const linesPayload: LigneRetourVente[] = activeLines.map(l => ({
      articleId: l.articleId,
      articleCode: l.articleCode,
      designation: l.designation,
      quantiteVendue: l.quantiteVendue,
      quantiteRetournee: l.quantiteRetournee,
      prixUnitaire: l.prixUnitaire,
      totalLigne: l.quantiteRetournee * l.prixUnitaire,
      motif: l.motif,
      remettreEnStock: l.remettreEnStock
    }));

    const newReturn: RetourVente = {
      id: `ret-${Date.now()}`,
      numero: returnNumber,
      type: returnType === 'ticket' ? 'Vente Caisse' : 'Retour Libre',
      venteId: sourceSale?.id,
      venteNumero: sourceSale?.numero,
      clientId: targetClient.id,
      clientNom: targetClient.nom,
      projetId: storeId,
      projetNom: storeNom,
      date: dateFormatted,
      lignes: linesPayload,
      montantTotal: calculatedTotal,
      modeRemboursement: refundMode,
      codeAvoir,
      statut: 'Validé',
      motifGeneral: generalMotif,
      auteurId: currentUser.id,
      auteurNom: currentUser.nom,
      reglementId: newRegId,
      mouvementStockIds: newStockMovements.map(m => m.id)
    };

    onRetoursChange([newReturn, ...retours]);
    setIsNewReturnModalOpen(false);
    showToast(`Retour ${returnNumber} enregistré avec succès (${calculatedTotal.toFixed(3)} DT) !`);
  };

  // KPIs
  const totalRetoursMontant = scopedRetours.reduce((sum, r) => sum + r.montantTotal, 0);
  const totalRembourseEspeces = scopedRetours.filter(r => r.modeRemboursement === 'Espèces').reduce((sum, r) => sum + r.montantTotal, 0);
  const totalAvoirsEmis = scopedRetours.filter(r => r.modeRemboursement === 'Avoir').reduce((sum, r) => sum + r.montantTotal, 0);
  const totalArticlesRestitues = scopedRetours.reduce((sum, r) => sum + r.lignes.reduce((lsum, l) => lsum + l.quantiteRetournee, 0), 0);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-medium text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-emerald-500 animate-fade-in">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Gestion des Retours & Avoirs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Traitement des retours clients, réintégration du stock et émission des avoirs
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedSaleId('');
              setReturnLines([]);
              setTicketSearch('');
              setIsNewReturnModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">assignment_return</span>
            <span>Nouveau Retour / Avoir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Nombre de Retours</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {scopedRetours.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Total {totalArticlesRestitues} articles retournés
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Montant Total Retours</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-indigo-600 mt-1 tabular-nums">
            {totalRetoursMontant.toFixed(3)} DT
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Sur la sélection active</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Remboursements Espèces</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-rose-600 mt-1 tabular-nums">
            {totalRembourseEspeces.toFixed(3)} DT
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Décaissé du tiroir-caisse</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Avoirs Clients Émis</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-amber-600 mt-1 tabular-nums">
            {totalAvoirsEmis.toFixed(3)} DT
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Bons d'achat en cours</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Rechercher par N° retour, ticket, client, code avoir..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Refund Mode Filter */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Tous les modes</option>
            <option value="Espèces">Espèces (Remboursé)</option>
            <option value="Avoir">Avoir Client</option>
            <option value="Échange">Échange</option>
            <option value="Virement">Virement</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="Validé">Validé</option>
            <option value="En attente">En attente</option>
            <option value="Traité">Traité</option>
          </select>

          {/* Date Picker */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          {(searchTerm || filterMode !== 'all' || filterStatus !== 'all' || filterDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterMode('all');
                setFilterStatus('all');
                setFilterDate('');
              }}
              className="text-xs text-slate-500 hover:text-slate-900 underline cursor-pointer"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Returns Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-4">N° Retour</th>
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Réf. Vente / Ticket</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-center">Nb Articles</th>
                <th className="py-3 px-4 text-right">Montant (DT)</th>
                <th className="py-3 px-4 text-center">Mode Restitution</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scopedRetours.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                    {r.numero}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {r.date}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {r.venteNumero || <span className="text-slate-400 italic">Retour direct</span>}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {r.clientNom}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700 tabular-nums">
                    {r.lignes.reduce((sum, l) => sum + l.quantiteRetournee, 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {r.montantTotal.toFixed(3)} DT
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                      r.modeRemboursement === 'Espèces' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                      r.modeRemboursement === 'Avoir' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {r.modeRemboursement}
                      {r.codeAvoir && ` (${r.codeAvoir})`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-emerald-700 font-medium">
                      {r.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingReturn(r)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Détails du retour"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => generateReturnSlipPdf(r, currentProject)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Télécharger Bon de Retour / Avoir (PDF)"
                      >
                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {scopedRetours.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <span className="material-symbols-outlined text-3xl mb-2 text-slate-300">
                      assignment_return
                    </span>
                    <p className="text-sm font-medium">Aucun retour enregistré</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Les retours d'articles et émissions d'avoirs apparaîtront ici.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Return */}
      {isNewReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">assignment_return</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Nouveau Retour de Marchandise & Avoir
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sélectionnez la vente d'origine ou effectuez un retour direct
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSubmitReturn} className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Type de retour toggle */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-max">
                <button
                  type="button"
                  onClick={() => {
                    setReturnType('ticket');
                    setReturnLines([]);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    returnType === 'ticket' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  À partir d'un Ticket / Facture de vente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReturnType('libre');
                    setSelectedSaleId('');
                    handleAddFreeReturnLine();
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    returnType === 'libre' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Retour libre (Sans ticket)
                </button>
              </div>

              {/* Ticket Search / Selector */}
              {returnType === 'ticket' && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Sélectionner la Vente d'origine
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Filtrer par n° de ticket ou client..."
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
                    {availableSales.map(v => (
                      <div
                        key={v.id}
                        onClick={() => handleSelectSale(v)}
                        className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          selectedSaleId === v.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900">{v.numero}</span>
                          <span className="text-slate-400 mx-1.5">•</span>
                          <span className="text-slate-600">{v.clientNom}</span>
                          <span className="text-slate-400 mx-1.5">•</span>
                          <span className="text-slate-500">{v.date}</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-600">
                          {v.montantTTC.toFixed(3)} DT
                        </span>
                      </div>
                    ))}
                    {availableSales.length === 0 && (
                      <p className="p-3 text-center text-xs text-slate-400">Aucune vente trouvée.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Free return client selector */}
              {returnType === 'libre' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom} ({c.telephone || c.email || 'Client'})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Returned Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Articles à retourner</span>
                  {returnType === 'libre' && (
                    <button
                      type="button"
                      onClick={handleAddFreeReturnLine}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Ajouter un article
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/60 text-slate-500 font-semibold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Article</th>
                        {returnType === 'ticket' && <th className="py-2 px-2 text-center">Qté Achetée</th>}
                        <th className="py-2 px-2 text-center w-28">Qté à Retourner</th>
                        <th className="py-2 px-2 text-right">P.U (DT)</th>
                        <th className="py-2 px-3">Motif du retour</th>
                        <th className="py-2 px-2 text-center">Remettre en stock</th>
                        <th className="py-2 px-3 text-right">Total (DT)</th>
                        {returnType === 'libre' && <th className="py-2 px-2 text-center w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returnLines.map((l, index) => (
                        <tr key={index} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3">
                            {returnType === 'libre' ? (
                              <select
                                value={l.articleId}
                                onChange={(e) => {
                                  const art = articles.find(a => a.id === e.target.value);
                                  if (art) {
                                    setReturnLines(prev => prev.map((item, idx) => idx === index ? {
                                      ...item,
                                      articleId: art.id,
                                      articleCode: art.code,
                                      designation: art.designation,
                                      prixUnitaire: art.prixVenteHT
                                    } : item));
                                  }
                                }}
                                className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                              >
                                {articles.map(a => (
                                  <option key={a.id} value={a.id}>{a.designation} ({a.prixVenteHT.toFixed(3)} DT)</option>
                                ))}
                              </select>
                            ) : (
                              <div>
                                <p className="font-semibold text-slate-900">{l.designation}</p>
                                {l.articleCode && <p className="text-[10px] text-slate-400 font-mono">{l.articleCode}</p>}
                              </div>
                            )}
                          </td>

                          {returnType === 'ticket' && (
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                              {l.quantiteVendue}
                            </td>
                          )}

                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={returnType === 'ticket' ? l.quantiteVendue : 999}
                              value={l.quantiteRetournee}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setReturnLines(prev => prev.map((item, idx) => idx === index ? {
                                  ...item,
                                  quantiteRetournee: returnType === 'ticket' ? Math.min(val, item.quantiteVendue) : val
                                } : item));
                              }}
                              className="w-18 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                            {l.prixUnitaire.toFixed(3)}
                          </td>

                          <td className="py-2.5 px-3">
                            <select
                              value={l.motif}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReturnLines(prev => prev.map((item, idx) => idx === index ? {
                                  ...item,
                                  motif: val
                                } : item));
                              }}
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded text-slate-700 cursor-pointer"
                            >
                              {MOTIFS_RETOUR.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={l.remettreEnStock}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setReturnLines(prev => prev.map((item, idx) => idx === index ? {
                                  ...item,
                                  remettreEnStock: checked
                                } : item));
                              }}
                              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {(l.quantiteRetournee * l.prixUnitaire).toFixed(3)} DT
                          </td>

                          {returnType === 'libre' && (
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => setReturnLines(prev => prev.filter((_, idx) => idx !== index))}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}

                      {returnLines.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-400">
                            Veuillez sélectionner une vente d'origine ci-dessus pour charger ses articles.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refund mode & summary options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mode de restitution du montant
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="refundMode"
                        value="Espèces"
                        checked={refundMode === 'Espèces'}
                        onChange={() => setRefundMode('Espèces')}
                        className="text-indigo-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Remboursement Espèces (Tiroir Caisse)</p>
                        <p className="text-[10px] text-slate-500">Déduit directement de la caisse active (décaissement immédiat)</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="refundMode"
                        value="Avoir"
                        checked={refundMode === 'Avoir'}
                        onChange={() => setRefundMode('Avoir')}
                        className="text-indigo-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Avoir Client (Bon d'achat)</p>
                        <p className="text-[10px] text-slate-500">Génère un code d'avoir unique utilisable pour un prochain achat</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="refundMode"
                        value="Échange"
                        checked={refundMode === 'Échange'}
                        onChange={() => setRefundMode('Échange')}
                        className="text-indigo-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Échange direct d'article</p>
                        <p className="text-[10px] text-slate-500">Échange immédiat sans décaissement</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Motif général ou observations
                    </label>
                    <textarea
                      rows={2}
                      value={generalMotif}
                      onChange={(e) => setGeneralMotif(e.target.value)}
                      placeholder="Commentaire sur l'état ou la raison du retour..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                        Montant Total à Restituer
                      </p>
                      <p className="text-[11px] text-indigo-600">
                        {refundMode === 'Espèces' ? 'Espèces à sortir du tiroir' : 'Valeur du bon d\'avoir'}
                      </p>
                    </div>
                    <span className="text-xl font-black font-mono text-indigo-700 tabular-nums">
                      {calculatedTotal.toFixed(3)} DT
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewReturnModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={calculatedTotal <= 0}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                  <span>Valider le Retour ({calculatedTotal.toFixed(3)} DT)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Return Details */}
      {viewingReturn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bon de Retour {viewingReturn.numero}
                </h3>
                <p className="text-xs text-slate-500">
                  Enregistré le {viewingReturn.date} par {viewingReturn.auteurNom}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReturn(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Client</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingReturn.clientNom}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Réf. Vente</p>
                  <p className="font-mono text-slate-700 mt-0.5">{viewingReturn.venteNumero || 'Retour direct'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Mode Restitution</p>
                  <p className="font-bold text-indigo-700 mt-0.5">
                    {viewingReturn.modeRemboursement}
                    {viewingReturn.codeAvoir && ` (${viewingReturn.codeAvoir})`}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-800 mb-2">Articles retournés :</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Article</th>
                        <th className="py-2 px-2 text-center">Qté</th>
                        <th className="py-2 px-2 text-right">P.U</th>
                        <th className="py-2 px-3">Motif</th>
                        <th className="py-2 px-2 text-center">Stock</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingReturn.lignes.map((l, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-medium text-slate-900">{l.designation}</td>
                          <td className="py-2 px-2 text-center font-mono font-bold">{l.quantiteRetournee}</td>
                          <td className="py-2 px-2 text-right font-mono">{l.prixUnitaire.toFixed(3)}</td>
                          <td className="py-2 px-3 text-slate-600">{l.motif}</td>
                          <td className="py-2 px-2 text-center">
                            {l.remettreEnStock ? (
                              <span className="text-emerald-700 font-semibold text-[11px]">Réintégré</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Non réintégré</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {l.totalLigne.toFixed(3)} DT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Total Restitué :</span>
                <span className="font-mono font-black text-base text-rose-600">
                  {viewingReturn.montantTotal.toFixed(3)} DT
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => generateReturnSlipPdf(viewingReturn, currentProject)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                <span>Imprimer Bon de Retour (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
