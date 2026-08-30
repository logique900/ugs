import React, { useState } from 'react';
import { BonDeSortie, StatutBS, MotifSortieBS, LigneBS, Article, StockOperation, Projet, Utilisateur, AuditLog } from '../types';
import { Barcode1D } from './Barcode1D';

interface BonsDeSortieProps {
  bonsDeSortie: BonDeSortie[];
  setBonsDeSortie: React.Dispatch<React.SetStateAction<BonDeSortie[]>>;
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  stockOperations: StockOperation[];
  setStockOperations: React.Dispatch<React.SetStateAction<StockOperation[]>>;
  projets: Projet[];
  selectedProjectId: string;
  currentUser: Utilisateur;
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
}

const MOTIFS_LIST: MotifSortieBS[] = [
  'Consommation interne',
  'Échantillon',
  'Cadeau',
  'Don',
  'Casse',
  'Produit périmé',
  'Produit endommagé',
  'Production',
  'Maintenance',
  'Démonstration',
  'Ajustement de stock',
  'Transfert',
  'Autre'
];

export default function BonsDeSortie({
  bonsDeSortie,
  setBonsDeSortie,
  articles,
  setArticles,
  stockOperations,
  setStockOperations,
  projets,
  selectedProjectId,
  currentUser,
  auditLogs,
  setAuditLogs
}: BonsDeSortieProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [motifFilter, setMotifFilter] = useState<string>('all');

  const [selectedBS, setSelectedBS] = useState<BonDeSortie | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // New BS Form State
  const [newDemandeur, setNewDemandeur] = useState('');
  const [newService, setNewService] = useState('Service Technique & Maintenance');
  const [newResponsable, setNewResponsable] = useState('');
  const [newProjetId, setNewProjetId] = useState(selectedProjectId === 'all' ? '1' : selectedProjectId);
  const [newMotif, setNewMotif] = useState<MotifSortieBS>('Consommation interne');
  const [newMotifJustification, setNewMotifJustification] = useState('');
  const [newObservations, setNewObservations] = useState('');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);

  const [newLignes, setNewLignes] = useState<Array<{
    articleId: string;
    qteDemandee: number;
  }>>([
    { articleId: '', qteDemandee: 1 }
  ]);

  // Filtered List
  const filteredBS = bonsDeSortie.filter(bs => {
    const matchProject = selectedProjectId === 'all' || bs.projetId === selectedProjectId;
    const matchStatut = statutFilter === 'all' || bs.statut === statutFilter;
    const matchMotif = motifFilter === 'all' || bs.motif === motifFilter;
    const matchSearch =
      bs.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bs.demandeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bs.serviceDepartement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bs.lignes.some(l => l.designation.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchProject && matchStatut && matchMotif && matchSearch;
  });

  // Calculate Available Stock for given article and project
  const getAvailableStock = (articleId: string, projetId: string) => {
    const art = articles.find(a => a.id === articleId);
    if (!art) return 0;
    if (art.stocks && art.stocks[projetId] !== undefined) {
      return art.stocks[projetId];
    }
    return art.stock || 0;
  };

  // Compute Lines with live stock check
  const computedNewLignes: LigneBS[] = newLignes.map(l => {
    const art = articles.find(a => a.id === l.articleId);
    const code = art?.code || '';
    const designation = art?.designation || 'Article non sélectionné';
    const unite = art?.uniteMesure || 'Pièce';
    const stockAvailable = art ? getAvailableStock(art.id, newProjetId) : 0;
    const qteDemandee = l.qteDemandee || 0;
    const stockApres = stockAvailable - qteDemandee;

    return {
      articleId: l.articleId,
      code,
      designation,
      unite,
      stockDisponible: stockAvailable,
      qteDemandee,
      qteSortie: qteDemandee,
      stockApres,
      prixUnitaireHT: art ? art.prixVenteHT : 0,
      totalHT: (art ? art.prixVenteHT : 0) * qteDemandee
    };
  });

  const handleAddLine = () => {
    setNewLignes([...newLignes, { articleId: '', qteDemandee: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (newLignes.length === 1) return;
    setNewLignes(newLignes.filter((_, i) => i !== index));
  };

  // Create BS Submit
  const handleCreateBS = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDemandeur) {
      alert("Veuillez saisir le nom du demandeur interne.");
      return;
    }
    if (newMotif === 'Autre' && !newMotifJustification.trim()) {
      alert("La justification est obligatoire lorsque le motif est 'Autre'.");
      return;
    }
    if (computedNewLignes.some(l => !l.articleId || l.qteDemandee <= 0)) {
      alert("Veuillez choisir des articles valides avec des quantités supérieures à 0.");
      return;
    }

    // Check Stock Availability
    const InsufficientStockLine = computedNewLignes.find(l => l.stockApres < 0);
    if (InsufficientStockLine && !allowNegativeStock) {
      alert(`⚠️ STOCK INSUFFISANT : Pour '${InsufficientStockLine.designation}', le stock disponible est de ${InsufficientStockLine.stockDisponible} alors que la quantité demandée est de ${InsufficientStockLine.qteDemandee}.\n\nCochez l'autorisation d'exception pour forcer la sortie.`);
      return;
    }

    const proj = projets.find(p => p.id === newProjetId);
    const numIndex = bonsDeSortie.length + 1;
    const newNumero = `BS-2026-${String(numIndex).padStart(6, '0')}`;

    const newBS: BonDeSortie = {
      id: `bs-${Date.now()}`,
      numero: newNumero,
      projetId: newProjetId,
      boutiqueNom: proj?.nom || 'Société UGS - Stock Central',
      dateCreation: new Date().toISOString().split('T')[0],
      heureCreation: new Date().toLocaleTimeString().slice(0, 5),
      statut: 'EN ATTENTE',
      auteurId: currentUser.id,
      auteurNom: `${currentUser.nom} ${currentUser.prenom || ''}`.trim(),
      demandeur: newDemandeur,
      serviceDepartement: newService,
      responsableValidation: newResponsable || 'Responsable Dépôt UGS',
      motif: newMotif,
      motifJustification: newMotifJustification,
      entrepotSource: proj?.nom || 'Dépôt Central UGS',
      lignes: computedNewLignes,
      observations: newObservations,
      isStockDecremented: false,
      historiqueStatuts: [
        { statut: 'BROUILLON', date: new Date().toLocaleString(), utilisateur: currentUser.nom },
        { statut: 'EN ATTENTE', date: new Date().toLocaleString(), utilisateur: currentUser.nom }
      ]
    };

    setBonsDeSortie([newBS, ...bonsDeSortie]);
    setIsNewModalOpen(false);

    // Audit log
    setAuditLogs([
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        utilisateur: currentUser.nom,
        action: 'Création Bon de Sortie (BS)',
        details: `Demande ${newNumero} créée pour ${newDemandeur} (${newMotif}). Stock en attente de validation.`,
        niveau: 'Info'
      },
      ...auditLogs
    ]);

    // Reset Form
    setNewDemandeur('');
    setNewMotifJustification('');
    setNewObservations('');
    setNewLignes([{ articleId: '', qteDemandee: 1 }]);
  };

  // Validate BS & Perform Stock Output (-OUT) with IDEMPOTENCY (RB-14)
  const handleValidateBSOutput = (bs: BonDeSortie) => {
    if (bs.isStockDecremented) {
      alert("⚠️ SÉCURITÉ IDEMPOTENCE : Ce Bon de Sortie a déjà été validé et décrémenté en stock.");
      return;
    }

    // Check stock availability
    const invalidLines = bs.lignes.filter(l => {
      const avail = getAvailableStock(l.articleId, bs.projetId);
      return avail < l.qteDemandee;
    });

    if (invalidLines.length > 0 && !bs.exceptionStockNegatifValidee) {
      const line = invalidLines[0];
      const avail = getAvailableStock(line.articleId, bs.projetId);
      alert(`⚠️ Validation refusée pour stock insuffisant :\nArticle : ${line.designation}\nStock disponible : ${avail}\nQuantité demandée : ${line.qteDemandee}`);
      return;
    }

    const stockOpNumber = `OUT-2026-${String(stockOperations.length + 101).padStart(6, '0')}`;

    // 1. Decrement Stock (-OUT)
    setArticles(prevArticles => {
      return prevArticles.map(art => {
        const bsLine = bs.lignes.find(l => l.articleId === art.id);
        if (bsLine && bsLine.qteSortie > 0) {
          const currentStock = art.stocks ? (art.stocks[bs.projetId] || 0) : (art.stock || 0);
          const newStock = currentStock - bsLine.qteSortie;

          return {
            ...art,
            stock: (art.stock || 0) - bsLine.qteSortie,
            stocks: {
              ...(art.stocks || {}),
              [bs.projetId]: newStock
            }
          };
        }
        return art;
      });
    });

    // 2. Record Stock Operation
    const newStockOp: StockOperation = {
      id: `so-out-${Date.now()}`,
      operationNumber: stockOpNumber,
      type: 'SORTIE',
      projetId: bs.projetId,
      warehouseId: bs.boutiqueNom || 'Dépôt Central UGS',
      referenceType: 'BL', // Reuse or Sortie
      referenceId: bs.id,
      referenceNumero: bs.numero,
      status: 'EFFECTUE',
      createdAt: new Date().toLocaleString(),
      createdBy: currentUser.id,
      createdByName: `${currentUser.nom} ${currentUser.prenom || ''}`.trim(),
      lignes: bs.lignes.map(l => ({
        articleId: l.articleId,
        articleNom: l.designation,
        quantite: l.qteSortie
      })),
      motif: `Bon de Sortie ${bs.numero} • Motif: ${bs.motif} (${bs.demandeur})`
    };

    setStockOperations([newStockOp, ...stockOperations]);

    // 3. Update BS
    const updatedBS: BonDeSortie = {
      ...bs,
      statut: 'SORTIE EFFECTUÉE',
      isStockDecremented: true,
      stockOperationId: stockOpNumber,
      historiqueStatuts: [
        ...(bs.historiqueStatuts || []),
        { statut: 'SORTIE EFFECTUÉE', date: new Date().toLocaleString(), utilisateur: currentUser.nom, commentaire: `Mouvement de stock ${stockOpNumber}` }
      ]
    };

    setBonsDeSortie(bonsDeSortie.map(b => b.id === bs.id ? updatedBS : b));

    // Audit log
    setAuditLogs([
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        utilisateur: currentUser.nom,
        action: 'Sortie de Stock (BS)',
        details: `Validation du Bon de Sortie ${bs.numero} pour ${bs.demandeur} (${bs.motif}). Sortie enregistrée sous ${stockOpNumber}.`,
        niveau: 'Succes'
      },
      ...auditLogs
    ]);

    alert(`✅ Sortie de stock effectuée avec succès ! Clé d'opération : ${stockOpNumber}`);
  };

  const getStatutBadge = (statut: StatutBS) => {
    switch (statut) {
      case 'BROUILLON':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full border border-slate-300">Brouillon</span>;
      case 'EN ATTENTE':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full border border-amber-300">En attente</span>;
      case 'VALIDÉ':
      case 'EN PRÉPARATION':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-full border border-blue-300">Validé</span>;
      case 'SORTIE EFFECTUÉE':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-300">Sortie effectuée</span>;
      case 'ANNULÉ':
      case 'REFUSÉ':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full border border-rose-300">{statut}</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">{statut}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-purple-800/30">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 backdrop-blur-md rounded-full text-purple-200 text-xs font-black tracking-wide border border-purple-400/30">
              <span className="material-symbols-outlined text-[16px]">output</span>
              Gestion Interne UGS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Bons de Sortie de Stock (BS)</h1>
            <p className="text-purple-100/80 text-xs sm:text-sm leading-relaxed">
              Formalisez toutes les sorties de stock non liées à une facture client : <strong>Consommation interne, casse, échantillons, dons, démonstration, maintenance ou réformes</strong>. Motif obligatoire & protection anti-double décrémentation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
              Différence BL vs BS
            </button>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Nouveau Bon de Sortie (BS)
            </button>
          </div>
        </div>
      </div>

      {/* BL vs BS Comparative Table */}
      {showComparison && (
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-black text-base text-purple-300 flex items-center gap-2">
              <span className="material-symbols-outlined">analytics</span>
              Tableau Comparatif : Bon de Livraison (BL) vs Bon de Sortie (BS)
            </h3>
            <button onClick={() => setShowComparison(false)} className="text-slate-400 hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-purple-200 font-black uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <th className="p-3">Élément</th>
                  <th className="p-3 text-blue-400">Bon de Livraison (BL)</th>
                  <th className="p-3 text-purple-400">Bon de Sortie (BS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                <tr>
                  <td className="p-3 font-bold text-white">Destination</td>
                  <td className="p-3">Client Externe</td>
                  <td className="p-3 text-purple-300 font-bold">Interne / Demandeur / Tiers non-client</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">Contexte</td>
                  <td className="p-3">Vente commerciale</td>
                  <td className="p-3 text-purple-300 font-bold">Consommation, casse, don, échantillon, maintenance</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">Commande / Facturation</td>
                  <td className="p-3">Facturable (Client)</td>
                  <td className="p-3">Non facturé (Régularisation charges / stock)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">Motif de Sortie</td>
                  <td className="p-3">Livraison commande</td>
                  <td className="p-3 text-purple-300 font-bold">Obligatoire (Consommation, Casse, Don...)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">Signatures requises</td>
                  <td className="p-3">Transporteur & Client (POD)</td>
                  <td className="p-3 text-purple-300 font-bold">Demandeur Interne & Responsable Dépôt</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Rechercher BS, Demandeur, Service, Article..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={statutFilter}
              onChange={e => setStatutFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="all">Tous les Statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="EN ATTENTE">En attente</option>
              <option value="SORTIE EFFECTUÉE">Sortie effectuée</option>
              <option value="ANNULÉ">Annulé</option>
            </select>

            <select
              value={motifFilter}
              onChange={e => setMotifFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="all">Tous les Motifs</option>
              {MOTIFS_LIST.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">N° Document</th>
                <th className="py-3.5 px-4">Date & Entrepôt</th>
                <th className="py-3.5 px-4">Demandeur & Service</th>
                <th className="py-3.5 px-4">Motif Obligatoire</th>
                <th className="py-3.5 px-4">Articles & Quantités</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-center">Actions & Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {filteredBS.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-[48px] block mb-2 text-slate-300">output</span>
                    Aucun Bon de Sortie trouvé.
                  </td>
                </tr>
              ) : (
                filteredBS.map(bs => {
                  const totalSortie = bs.lignes.reduce((sum, l) => sum + l.qteSortie, 0);

                  return (
                    <tr key={bs.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-purple-900">
                        {bs.numero}
                        {bs.stockOperationId && (
                          <span className="block text-[10px] font-bold text-emerald-600 font-mono mt-0.5">
                            {bs.stockOperationId}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{bs.dateCreation} ({bs.heureCreation || '10:00'})</span>
                        <span className="text-[11px] text-slate-500">{bs.boutiqueNom || 'Dépôt Central'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{bs.demandeur}</span>
                        <span className="text-[11px] text-purple-700 font-medium">{bs.serviceDepartement}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-extrabold text-[11px] rounded-lg inline-block">
                          {bs.motif}
                        </span>
                        {bs.motifJustification && (
                          <span className="block text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">
                            {bs.motifJustification}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{bs.lignes.length} article(s)</span>
                        <span className="text-[11px] text-slate-500">Total: <strong>{totalSortie} pièces</strong></span>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatutBadge(bs.statut)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setSelectedBS(bs); setIsDetailModalOpen(true); }}
                            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Voir / Imprimer Bon de Sortie"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {!bs.isStockDecremented && bs.statut !== 'ANNULÉ' && (
                            <button
                              onClick={() => handleValidateBSOutput(bs)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Valider la sortie en stock (-OUT)"
                            >
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Valider Sortie (-OUT)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Nouveau Bon de Sortie (BS) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 font-extrabold text-xs rounded-full uppercase tracking-wider">
                  Nouveau Bon de Sortie (BS)
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">Création d'une Demande de Sortie de Stock</h2>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateBS} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Demandeur Interne *</label>
                  <input
                    type="text"
                    required
                    value={newDemandeur}
                    onChange={e => setNewDemandeur(e.target.value)}
                    placeholder="Ex: Sami Ben Amor (Technicien)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service / Département *</label>
                  <input
                    type="text"
                    required
                    value={newService}
                    onChange={e => setNewService(e.target.value)}
                    placeholder="Ex: Maintenance / Service Après-Vente"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Entrepôt Source *</label>
                  <select
                    value={newProjetId}
                    onChange={e => setNewProjetId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    {projets.map(p => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Motif Obligatoire */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-purple-900 mb-1">Motif Obligatoire de Sortie *</label>
                    <select
                      value={newMotif}
                      onChange={e => setNewMotif(e.target.value as MotifSortieBS)}
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      {MOTIFS_LIST.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Justification / Responsable
                      {newMotif === 'Autre' && <span className="text-rose-600 font-black"> * Obligatoire</span>}
                    </label>
                    <input
                      type="text"
                      required={newMotif === 'Autre'}
                      value={newMotifJustification}
                      onChange={e => setNewMotifJustification(e.target.value)}
                      placeholder="Ex: Remplacement pièce défectueuse sur machine 3..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items with Stock Checks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">Articles à faire sortir</h3>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2">
                  {newLignes.map((l, idx) => {
                    const art = articles.find(a => a.id === l.articleId);
                    const stockAvail = art ? getAvailableStock(art.id, newProjetId) : 0;
                    const qte = l.qteDemandee || 0;
                    const isOver = qte > stockAvail;

                    return (
                      <div key={idx} className={`p-3.5 rounded-2xl border transition-all grid grid-cols-1 sm:grid-cols-12 gap-3 items-center ${isOver ? 'bg-rose-50/80 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Article</label>
                          <select
                            value={l.articleId}
                            onChange={e => {
                              const updated = [...newLignes];
                              updated[idx].articleId = e.target.value;
                              setNewLignes(updated);
                            }}
                            required
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                          >
                            <option value="">Sélectionner un article...</option>
                            {articles.map(a => (
                              <option key={a.id} value={a.id}>[{a.code}] {a.designation} (Stock: {getAvailableStock(a.id, newProjetId)})</option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2 text-center">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Stock Dispo</label>
                          <span className={`text-xs font-extrabold px-2 py-1 rounded-lg block ${stockAvail > 0 ? 'bg-slate-200 text-slate-800' : 'bg-rose-200 text-rose-900'}`}>
                            {stockAvail}
                          </span>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Qté Sortie</label>
                          <input
                            type="number"
                            min="1"
                            value={l.qteDemandee}
                            onChange={e => {
                              const updated = [...newLignes];
                              updated[idx].qteDemandee = Number(e.target.value);
                              setNewLignes(updated);
                            }}
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2 text-center">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Stock Après</label>
                          <span className={`text-xs font-extrabold px-2 py-1 rounded-lg block ${isOver ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-100 text-emerald-800'}`}>
                            {stockAvail - qte}
                          </span>
                        </div>

                        <div className="sm:col-span-1 text-right">
                          {newLignes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors mt-3"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Negative stock override */}
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="negativeOverride"
                  checked={allowNegativeStock}
                  onChange={e => setAllowNegativeStock(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="negativeOverride" className="text-xs text-amber-900 font-semibold cursor-pointer">
                  Autoriser exceptionnellement un ajustement en stock négatif (Trace inscrite au journal d'audit)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Enregistrer Demande de Sortie (BS)
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Detail & Printable BS */}
      {isDetailModalOpen && selectedBS && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-purple-50 text-purple-700 rounded-2xl">
                  <span className="material-symbols-outlined">output</span>
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">{selectedBS.numero}</h2>
                  <p className="text-xs text-slate-500">Bon de Sortie Interne • Société UGS</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Imprimer BS
                </button>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="space-y-6 p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 text-slate-900 font-sans">
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-purple-900 text-white font-black flex items-center justify-center text-sm">UGS</span>
                    <h1 className="text-xl font-black text-slate-900">SOCIÉTÉ UGS</h1>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">Stock Central & Dépôt de Distribution</p>
                  <p className="text-[11px] text-slate-500">Zone Industrielle Habib Bourguiba • Sfax, Tunisie</p>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <span className="px-3 py-1 bg-purple-900 text-white font-black text-xs rounded-lg uppercase tracking-wider inline-block">
                    BON DE SORTIE INTERNE
                  </span>
                  <p className="text-lg font-black text-purple-900 font-mono">{selectedBS.numero}</p>
                  <p className="text-xs text-slate-500">Date & Heure: <strong>{selectedBS.dateCreation} {selectedBS.heureCreation}</strong></p>
                  
                  <div className="pt-1 flex justify-start sm:justify-end">
                    <Barcode1D value={selectedBS.numero} height={28} />
                  </div>
                </div>
              </div>

              {/* Requester & Motif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-purple-700 block tracking-wider">Demandeur & Service</span>
                  <p className="font-extrabold text-slate-900 text-sm">{selectedBS.demandeur}</p>
                  <p className="text-slate-600 font-medium">{selectedBS.serviceDepartement}</p>
                  <p className="text-slate-500">Responsable Validation: {selectedBS.responsableValidation || 'Chef de Dépôt'}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 block tracking-wider">Motif Obligatoire de Sortie</span>
                  <p className="font-black text-purple-900 text-sm">{selectedBS.motif}</p>
                  <p className="text-slate-600 italic">{selectedBS.motifJustification || 'Aucun détail supplémentaire'}</p>
                  <p className="text-slate-500 text-[11px] mt-1 font-mono">Opération Stock: {selectedBS.stockOperationId || 'En attente'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Réf / Article</th>
                      <th className="py-2.5 px-3 text-center">Unité</th>
                      <th className="py-2.5 px-3 text-right">Qté Demandée</th>
                      <th className="py-2.5 px-3 text-right">Qté Sortie</th>
                      <th className="py-2.5 px-3 text-right">Stock Avant</th>
                      <th className="py-2.5 px-3 text-right">Stock Après</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedBS.lignes.map((l, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{l.designation}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{l.code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{l.unite || 'Pièce'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{l.qteDemandee}</td>
                        <td className="py-2.5 px-3 text-right font-black text-purple-900">{l.qteSortie}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{l.stockDisponible}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{l.stockApres}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center text-xs">
                <div className="space-y-8">
                  <span className="font-bold text-slate-600 block">Signature Demandeur Interne</span>
                  <div className="h-12 border-b border-dashed border-slate-300"></div>
                </div>
                <div className="space-y-8">
                  <span className="font-bold text-slate-600 block">Visa Responsable Dépôt / Stock</span>
                  <div className="h-12 border-b border-dashed border-slate-300"></div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
