import React, { useState } from 'react';
import { BonDAchat, StatutBA, LigneBA, Fournisseur, Article, StockOperation, Projet, Utilisateur, AuditLog } from '../types';
import { Barcode1D } from './Barcode1D';

interface BonsDAchatProps {
  bonsDAchat: BonDAchat[];
  setBonsDAchat: React.Dispatch<React.SetStateAction<BonDAchat[]>>;
  fournisseurs: Fournisseur[];
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  stockOperations: StockOperation[];
  setStockOperations: React.Dispatch<React.SetStateAction<StockOperation[]>>;
  projets: Projet[];
  selectedProjectId: string;
  currentUser: Utilisateur;
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  onNavigateToAchats?: () => void;
}

export default function BonsDAchat({
  bonsDAchat,
  setBonsDAchat,
  fournisseurs,
  articles,
  setArticles,
  stockOperations,
  setStockOperations,
  projets,
  selectedProjectId,
  currentUser,
  auditLogs,
  setAuditLogs,
  onNavigateToAchats
}: BonsDAchatProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [fournisseurFilter, setFournisseurFilter] = useState<string>('all');
  
  const [selectedBA, setSelectedBA] = useState<BonDAchat | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // New BA Form state
  const [newFournisseurId, setNewFournisseurId] = useState('');
  const [newProjetId, setNewProjetId] = useState(selectedProjectId === 'all' ? '1' : selectedProjectId);
  const [newDatePrevue, setNewDatePrevue] = useState('');
  const [newConditions, setNewConditions] = useState('Paiement à 30 jours après livraison conforme');
  const [newRemiseHT, setNewRemiseHT] = useState<number>(0);
  const [newFraisAnnexes, setNewFraisAnnexes] = useState<number>(0);
  const [newObservations, setNewObservations] = useState('');
  const [newLignes, setNewLignes] = useState<Array<{
    articleId: string;
    qteCommandee: number;
    prixUnitaireHT: number;
    tauxTVA: number;
  }>>([
    { articleId: '', qteCommandee: 1, prixUnitaireHT: 0, tauxTVA: 19 }
  ]);

  // Reception Form state
  const [receptionNotes, setReceptionNotes] = useState('');
  const [receptionQtes, setReceptionQtes] = useState<{ [articleId: string]: number }>({});
  const [allowOverReceipt, setAllowOverReceipt] = useState(false);

  // Filtered list
  const filteredBAs = bonsDAchat.filter(ba => {
    const matchProject = selectedProjectId === 'all' || ba.projetId === selectedProjectId;
    const matchStatut = statutFilter === 'all' || ba.statut === statutFilter;
    const matchFournisseur = fournisseurFilter === 'all' || ba.fournisseurId === fournisseurFilter;
    const matchSearch = 
      ba.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ba.fournisseurNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ba.lignes.some(l => l.designation.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchProject && matchStatut && matchFournisseur && matchSearch;
  });

  // Calculate Totals for new BA form
  const computedNewLignes = newLignes.map(l => {
    const art = articles.find(a => a.id === l.articleId);
    const code = art?.code || '';
    const designation = art?.designation || 'Article non sélectionné';
    const unite = art?.uniteMesure || 'Pièce';
    const pu = l.prixUnitaireHT || art?.prixAchatHT || 0;
    const totalHT = (l.qteCommandee || 0) * pu;
    const totalTTC = totalHT * (1 + (l.tauxTVA || 19) / 100);

    return {
      articleId: l.articleId,
      code,
      designation,
      unite,
      qteCommandee: l.qteCommandee || 0,
      qteDejaRecue: 0,
      qteARecevoir: l.qteCommandee || 0,
      qteRecue: 0,
      prixUnitaireHT: pu,
      tauxTVA: l.tauxTVA || 19,
      totalHT,
      totalTTC
    };
  });

  const totalHTForm = computedNewLignes.reduce((sum, l) => sum + l.totalHT, 0) - newRemiseHT + newFraisAnnexes;
  const totalTVAForm = computedNewLignes.reduce((sum, l) => sum + (l.totalHT * (l.tauxTVA / 100)), 0);
  const totalTTCForm = totalHTForm + totalTVAForm;

  // Handler for Article change in new BA line
  const handleArticleSelect = (index: number, articleId: string) => {
    const art = articles.find(a => a.id === articleId);
    const updated = [...newLignes];
    updated[index] = {
      ...updated[index],
      articleId,
      prixUnitaireHT: art ? art.prixAchatHT : 0,
    };
    setNewLignes(updated);
  };

  const handleAddLine = () => {
    setNewLignes([...newLignes, { articleId: '', qteCommandee: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (newLignes.length === 1) return;
    setNewLignes(newLignes.filter((_, i) => i !== index));
  };

  // Submit New BA
  const handleCreateBA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFournisseurId) {
      alert("Veuillez choisir un fournisseur.");
      return;
    }
    if (computedNewLignes.some(l => !l.articleId || l.qteCommandee <= 0)) {
      alert("Veuillez sélectionner des articles valides avec des quantités supérieures à 0.");
      return;
    }

    const fourn = fournisseurs.find(f => f.id === newFournisseurId);
    const proj = projets.find(p => p.id === newProjetId);

    const numIndex = bonsDAchat.length + 1;
    const numPadded = String(numIndex).padStart(6, '0');
    const newNumero = `BA-2026-${numPadded}`;

    const newBA: BonDAchat = {
      id: `ba-${Date.now()}`,
      numero: newNumero,
      projetId: newProjetId,
      boutiqueNom: proj?.nom || 'Société UGS - Stock Central',
      fournisseurId: newFournisseurId,
      fournisseurNom: fourn?.nom || 'Fournisseur',
      matriculeFiscalFournisseur: fourn?.matriculeFiscal || '',
      telephoneFournisseur: fourn?.telephone || '',
      emailFournisseur: fourn?.email || '',
      adresseFournisseur: fourn?.adresse || '',
      contactFournisseur: fourn?.contactNom || '',
      dateCreation: new Date().toISOString().split('T')[0],
      datePrevueReception: newDatePrevue || new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      statut: 'COMMANDÉ',
      auteurId: currentUser.id,
      auteurNom: `${currentUser.nom} ${currentUser.prenom || ''}`.trim(),
      conditionsAchat: newConditions,
      remiseGlobalHT: newRemiseHT,
      fraisAnnexes: newFraisAnnexes,
      observations: newObservations,
      lignes: computedNewLignes,
      receptions: [],
      montantHT: totalHTForm,
      montantTVA: totalTVAForm,
      montantTTC: totalTTCForm,
      isStockIncremented: false,
      historiqueStatuts: [
        { statut: 'BROUILLON', date: new Date().toLocaleString(), utilisateur: currentUser.nom },
        { statut: 'COMMANDÉ', date: new Date().toLocaleString(), utilisateur: currentUser.nom }
      ]
    };

    setBonsDAchat([newBA, ...bonsDAchat]);
    setIsNewModalOpen(false);

    // Audit log
    setAuditLogs([
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        utilisateur: currentUser.nom,
        action: 'Création Bon d\'Achat',
        details: `Création du ${newNumero} auprès de ${fourn?.nom} (Montant: ${totalTTCForm.toFixed(3)} TND) - Stock intact`,
        niveau: 'Info'
      },
      ...auditLogs
    ]);

    // Reset Form
    setNewFournisseurId('');
    setNewObservations('');
    setNewLignes([{ articleId: '', qteCommandee: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  };

  // Open Reception Modal
  const handleOpenReception = (ba: BonDAchat) => {
    setSelectedBA(ba);
    const initialQtes: { [artId: string]: number } = {};
    ba.lignes.forEach(l => {
      const remaining = l.qteCommandee - l.qteDejaRecue;
      initialQtes[l.articleId] = remaining > 0 ? remaining : 0;
    });
    setReceptionQtes(initialQtes);
    setReceptionNotes('');
    setIsReceptionModalOpen(true);
  };

  // Validate Stock Receiving (+IN) with IDEMPOTENCY
  const handleValidateReception = () => {
    if (!selectedBA) return;

    // Check if any quantity is entered
    const hasQuantities = Object.values(receptionQtes).some(q => Number(q) > 0);
    if (!hasQuantities) {
      alert("Veuillez saisir au moins une quantité reçue supérieure à 0.");
      return;
    }

    // Anti-double entry check
    const stockOpNumber = `IN-2026-${String(stockOperations.length + 101).padStart(6, '0')}`;
    const alreadyExists = stockOperations.some(op => op.operationNumber === stockOpNumber);
    if (alreadyExists) {
      alert("Sécurité Anti-Doublon : Une opération avec cet identifiant de stock existe déjà.");
      return;
    }

    // Process updated lines
    let allFullyReceived = true;
    let anyPartiallyReceived = false;

    const receptionLinesRecord: Array<{ articleId: string; designation: string; qteRecue: number }> = [];

    const updatedLignes: LigneBA[] = selectedBA.lignes.map(line => {
      const qteInput = Number(receptionQtes[line.articleId] || 0);
      const remainingPrev = line.qteCommandee - line.qteDejaRecue;

      if (!allowOverReceipt && qteInput > remainingPrev) {
        alert(`Attention: La quantité reçue pour ${line.designation} (${qteInput}) dépasse le reste à recevoir (${remainingPrev}). Cochez l'autorisation pour déroger.`);
        throw new Error("Dépassement de quantité");
      }

      const newTotalReceived = line.qteDejaRecue + qteInput;
      const newRemaining = line.qteCommandee - newTotalReceived;

      if (newRemaining > 0) allFullyReceived = false;
      if (newTotalReceived > 0) anyPartiallyReceived = true;

      if (qteInput > 0) {
        receptionLinesRecord.push({
          articleId: line.articleId,
          designation: line.designation,
          qteRecue: qteInput
        });
      }

      return {
        ...line,
        qteDejaRecue: newTotalReceived,
        qteARecevoir: newRemaining > 0 ? newRemaining : 0,
        qteRecue: qteInput
      };
    });

    // 1. Update Articles Stock (+IN)
    setArticles(prevArticles => {
      return prevArticles.map(art => {
        const lineRec = receptionLinesRecord.find(r => r.articleId === art.id);
        if (lineRec && lineRec.qteRecue > 0) {
          const currentStock = art.stocks ? (art.stocks[selectedBA.projetId] || 0) : (art.stock || 0);
          const newStock = currentStock + lineRec.qteRecue;

          return {
            ...art,
            stock: (art.stock || 0) + lineRec.qteRecue,
            stocks: {
              ...(art.stocks || {}),
              [selectedBA.projetId]: newStock
            }
          };
        }
        return art;
      });
    });

    // 2. Record Stock Operation
    const newStockOp: StockOperation = {
      id: `so-in-${Date.now()}`,
      operationNumber: stockOpNumber,
      type: 'ENTREE',
      projetId: selectedBA.projetId,
      warehouseId: selectedBA.boutiqueNom || 'Dépôt Central UGS',
      referenceType: 'ENTREE_STOCK',
      referenceId: selectedBA.id,
      referenceNumero: selectedBA.numero,
      status: 'EFFECTUE',
      createdAt: new Date().toLocaleString(),
      createdBy: currentUser.id,
      createdByName: `${currentUser.nom} ${currentUser.prenom || ''}`.trim(),
      lignes: receptionLinesRecord.map(r => ({
        articleId: r.articleId,
        articleNom: r.designation,
        quantite: r.qteRecue
      })),
      motif: `Réception conforme pour Bon d'Achat ${selectedBA.numero} (${selectedBA.fournisseurNom})`
    };

    setStockOperations([newStockOp, ...stockOperations]);

    // 3. Update BA
    const newStatut: StatutBA = allFullyReceived ? 'RÉCEPTIONNÉ' : 'RÉCEPTION PARTIELLE';
    const newReceptionRecord = {
      id: `rec-${Date.now()}`,
      date: new Date().toLocaleString(),
      stockOperationId: stockOpNumber,
      auteurNom: currentUser.nom,
      lignes: receptionLinesRecord,
      notes: receptionNotes
    };

    const updatedBA: BonDAchat = {
      ...selectedBA,
      statut: newStatut,
      lignes: updatedLignes,
      receptions: [...(selectedBA.receptions || []), newReceptionRecord],
      isStockIncremented: true,
      stockOperationId: stockOpNumber,
      historiqueStatuts: [
        ...(selectedBA.historiqueStatuts || []),
        { statut: newStatut, date: new Date().toLocaleString(), utilisateur: currentUser.nom, commentaire: `Entrée stock ${stockOpNumber}` }
      ]
    };

    setBonsDAchat(bonsDAchat.map(b => b.id === selectedBA.id ? updatedBA : b));
    setIsReceptionModalOpen(false);

    // Audit log
    setAuditLogs([
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        utilisateur: currentUser.nom,
        action: 'Réception Stock (BA)',
        details: `Entrée de stock ${stockOpNumber} pour le ${selectedBA.numero} (${receptionLinesRecord.reduce((s, r) => s + r.qteRecue, 0)} articles intégrés)`,
        niveau: 'Succes'
      },
      ...auditLogs
    ]);

    alert(`✅ Réception enregistrée avec succès ! Mouvement de stock : ${stockOpNumber}`);
  };

  // Helper Statut Badge
  const getStatutBadge = (statut: StatutBA) => {
    switch (statut) {
      case 'BROUILLON':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full border border-slate-300">Brouillon</span>;
      case 'EN ATTENTE':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full border border-amber-300">En attente</span>;
      case 'APPROUVÉ':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-full border border-blue-300">Approuvé</span>;
      case 'COMMANDÉ':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-bold text-xs rounded-full border border-purple-300">Commandé</span>;
      case 'RÉCEPTION PARTIELLE':
        return <span className="px-2.5 py-1 bg-orange-100 text-orange-800 font-bold text-xs rounded-full border border-orange-300">Réception partielle</span>;
      case 'RÉCEPTIONNÉ':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-300">Réceptionné</span>;
      case 'ANNULÉ':
      case 'REFUSÉ':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full border border-rose-300">{statut}</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">{statut}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header Banner & Explanatory Architecture */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-800/40">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 backdrop-blur-md rounded-full text-blue-200 text-xs font-black tracking-wide border border-blue-400/30">
              <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
              Gestion des Approvisionnements UGS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Bons d'Achat (BA) & Réceptions Stock</h1>
            <p className="text-blue-100/80 text-xs sm:text-sm leading-relaxed">
              Formalisez vos commandes auprès des fournisseurs. <strong>Principe de centralisation :</strong> La création d'un Bon d'Achat n'impacte pas le stock. L'entrée en stock (<span className="text-emerald-400 font-bold">+IN</span>) intervient uniquement lors de la Réception effective contrôlée.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Nouveau Bon d'Achat (BA)
            </button>
          </div>
        </div>

        {/* Workflow steps diagram */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-xs">
            <span className="text-blue-300 font-black block">1. Fournisseur</span>
            <span className="text-slate-300 text-[11px]">Choix du tiers</span>
          </div>
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-xs">
            <span className="text-blue-300 font-black block">2. Bon d'Achat</span>
            <span className="text-amber-300 font-bold text-[11px]">Stock neutre = 0</span>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl border border-emerald-400/30 text-xs">
            <span className="text-emerald-400 font-black block">3. Réception (+IN)</span>
            <span className="text-emerald-300 text-[11px]">Entrée réelle stock</span>
          </div>
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-xs">
            <span className="text-blue-300 font-black block">4. Anti-Doublon</span>
            <span className="text-slate-300 text-[11px]">Clé IN-2026-XXXX</span>
          </div>
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-xs col-span-2 sm:col-span-1">
            <span className="text-blue-300 font-black block">5. Facture Achat</span>
            <span className="text-slate-300 text-[11px]">Sans double entrée</span>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Rechercher BA, N°, Fournisseur, Article..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={statutFilter}
              onChange={e => setStatutFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tous les Statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="COMMANDÉ">Commandé</option>
              <option value="RÉCEPTION PARTIELLE">Réception partielle</option>
              <option value="RÉCEPTIONNÉ">Réceptionné</option>
              <option value="ANNULÉ">Annulé</option>
            </select>

            <select
              value={fournisseurFilter}
              onChange={e => setFournisseurFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tous les Fournisseurs</option>
              {fournisseurs.map(f => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Bons d'Achat Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">N° Document</th>
                <th className="py-3.5 px-4">Date & Entrepôt</th>
                <th className="py-3.5 px-4">Fournisseur</th>
                <th className="py-3.5 px-4">Articles & Progression</th>
                <th className="py-3.5 px-4 text-right">Montant TTC</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-center">Stock & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {filteredBAs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-[48px] block mb-2 text-slate-300">inventory</span>
                    Aucun Bon d'Achat trouvé pour les critères sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredBAs.map(ba => {
                  const totalCmd = ba.lignes.reduce((sum, l) => sum + l.qteCommandee, 0);
                  const totalRec = ba.lignes.reduce((sum, l) => sum + (l.qteDejaRecue || 0), 0);
                  const pctRec = totalCmd > 0 ? Math.min(100, Math.round((totalRec / totalCmd) * 100)) : 0;

                  return (
                    <tr key={ba.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-blue-900">
                        {ba.numero}
                        {ba.stockOperationId && (
                          <span className="block text-[10px] font-bold text-emerald-600 font-mono mt-0.5">
                            {ba.stockOperationId}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{ba.dateCreation}</span>
                        <span className="text-[11px] text-slate-500">{ba.boutiqueNom || 'Dépôt Central'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{ba.fournisseurNom}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{ba.matriculeFiscalFournisseur || ba.telephoneFournisseur || 'Tiers qualifié'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700">{ba.lignes.length} article(s)</span>
                            <span className="font-bold text-blue-700">{totalRec} / {totalCmd} reçus ({pctRec}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all rounded-full ${pctRec === 100 ? 'bg-emerald-500' : pctRec > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                              style={{ width: `${pctRec}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        {ba.montantTTC.toFixed(3)} TND
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatutBadge(ba.statut)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setSelectedBA(ba); setIsDetailModalOpen(true); }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Voir & Imprimer BA"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {ba.statut !== 'RÉCEPTIONNÉ' && ba.statut !== 'ANNULÉ' && (
                            <button
                              onClick={() => handleOpenReception(ba)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Effectuer Réception (+IN Stock)"
                            >
                              <span className="material-symbols-outlined text-[14px]">call_received</span>
                              Réceptionner
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

      {/* MODAL 1: Nouveau Bon d'Achat */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 font-extrabold text-xs rounded-full uppercase tracking-wider">
                  Nouveau Bon d'Achat (BA)
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">Préparation Commande Fournisseur</h2>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateBA} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fournisseur *</label>
                  <select
                    value={newFournisseurId}
                    onChange={e => setNewFournisseurId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Sélectionnez un fournisseur...</option>
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom} ({f.matriculeFiscal || f.ville || 'Tiers'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Entrepôt de Réception *</label>
                  <select
                    value={newProjetId}
                    onChange={e => setNewProjetId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {projets.map(p => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date Prévue de Réception</label>
                  <input
                    type="date"
                    value={newDatePrevue}
                    onChange={e => setNewDatePrevue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">Produits commandés</h3>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2">
                  {newLignes.map((l, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Article</label>
                        <select
                          value={l.articleId}
                          onChange={e => handleArticleSelect(idx, e.target.value)}
                          required
                          className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        >
                          <option value="">Sélectionner un article...</option>
                          {articles.map(a => {
                            const totStock = a.stocks ? Object.values(a.stocks).reduce((x, y) => x + y, 0) : (a.stock || 0);
                            return (
                              <option key={a.id} value={a.id}>[{a.code}] {a.designation} (Stock: {totStock})</option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Qté Commandée</label>
                        <input
                          type="number"
                          min="1"
                          value={l.qteCommandee}
                          onChange={e => {
                            const updated = [...newLignes];
                            updated[idx].qteCommandee = Number(e.target.value);
                            setNewLignes(updated);
                          }}
                          className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Prix Unit. HT (TND)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={l.prixUnitaireHT}
                          onChange={e => {
                            const updated = [...newLignes];
                            updated[idx].prixUnitaireHT = Number(e.target.value);
                            setNewLignes(updated);
                          }}
                          className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">TVA (%)</label>
                        <select
                          value={l.tauxTVA}
                          onChange={e => {
                            const updated = [...newLignes];
                            updated[idx].tauxTVA = Number(e.target.value);
                            setNewLignes(updated);
                          }}
                          className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        >
                          <option value="19">19 %</option>
                          <option value="13">13 %</option>
                          <option value="7">7 %</option>
                          <option value="0">0 % (Exonéré)</option>
                        </select>
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
                  ))}
                </div>
              </div>

              {/* Conditions & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Conditions d'achat & Règlement</label>
                  <input
                    type="text"
                    value={newConditions}
                    onChange={e => setNewConditions(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Observations / Remarques</label>
                  <input
                    type="text"
                    value={newObservations}
                    onChange={e => setNewObservations(e.target.value)}
                    placeholder="Instructions de livraison, quai d'arrivée..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Totaux summary */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs space-y-0.5">
                  <span className="text-slate-400 block">Total HT: {totalHTForm.toFixed(3)} TND</span>
                  <span className="text-slate-400 block">Total TVA: {totalTVAForm.toFixed(3)} TND</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-blue-300 font-bold block">Montant Total TTC</span>
                  <span className="text-xl font-black text-white">{totalTTCForm.toFixed(3)} TND</span>
                </div>
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
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Enregistrer Bon d'Achat (BA)
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Réception de Marchandise (+IN Stock) */}
      {isReceptionModalOpen && selectedBA && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full uppercase tracking-wider">
                  Réception de Stock • {selectedBA.numero}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">Saisie de Réception {selectedBA.fournisseurNom}</h2>
              </div>
              <button onClick={() => setIsReceptionModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-amber-700">security</span>
                Sécurité Entrée Stock Centralisée (IN-2026-XXXXXX)
              </div>
              <p>
                La validation de cette fiche génère un <strong>mouvement unique d'entrée en stock</strong> pour l'entrepôt <strong>{selectedBA.boutiqueNom}</strong>. La clé d'idempotence empêche toute double décrémentation ou entrée accidentelle.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900">Contrôle des Quantités Reçues</h3>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {selectedBA.lignes.map((line, idx) => {
                  const qteCommandee = line.qteCommandee;
                  const qteDejaRecue = line.qteDejaRecue || 0;
                  const qteRestante = Math.max(0, qteCommandee - qteDejaRecue);
                  const qteSaisie = receptionQtes[line.articleId] || 0;

                  return (
                    <div key={idx} className="p-4 bg-slate-50 hover:bg-white transition-colors grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-5">
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-bold rounded font-mono mr-2">
                          {line.code || 'ART'}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">{line.designation}</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">Unité: {line.unite || 'Pièce'}</span>
                      </div>

                      <div className="sm:col-span-3 text-center text-xs space-y-0.5">
                        <span className="text-slate-600 block">Commandée: <strong>{qteCommandee}</strong></span>
                        <span className="text-emerald-700 block font-semibold">Déjà reçue: <strong>{qteDejaRecue}</strong></span>
                        <span className="text-amber-700 block font-bold">Reste: <strong>{qteRestante}</strong></span>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Quantité Réceptionnée</label>
                        <input
                          type="number"
                          min="0"
                          value={qteSaisie}
                          onChange={e => setReceptionQtes({ ...receptionQtes, [line.articleId]: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white border-2 border-emerald-300 focus:border-emerald-500 rounded-xl font-black text-emerald-900 text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Notes & Réserves à la réception</label>
              <textarea
                rows={2}
                value={receptionNotes}
                onChange={e => setReceptionNotes(e.target.value)}
                placeholder="Ex: Palette 2 légèrement éraflée, marchandise conforme au BL fournisseur N°..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowOver"
                checked={allowOverReceipt}
                onChange={e => setAllowOverReceipt(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="allowOver" className="text-xs text-slate-600 cursor-pointer">
                Autoriser la réception en surplus (si le fournisseur a livré davantage)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReceptionModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleValidateReception}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Valider l'Entrée en Stock (+IN)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Détail & Impression Bon d'Achat (BA) */}
      {isDetailModalOpen && selectedBA && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl">
                  <span className="material-symbols-outlined">receipt_long</span>
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">{selectedBA.numero}</h2>
                  <p className="text-xs text-slate-500">Document d'Achat Fournisseur • Société UGS</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Imprimer BA
                </button>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="space-y-6 p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 text-slate-900 font-sans">
              
              {/* Header Company */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-blue-900 text-white font-black flex items-center justify-center text-sm">UGS</span>
                    <h1 className="text-xl font-black text-slate-900">SOCIÉTÉ UGS</h1>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">Stock Central & Siège Social Logistique</p>
                  <p className="text-[11px] text-slate-500">Zone Industrielle Habib Bourguiba • Sfax, Tunisie</p>
                  <p className="text-[11px] text-slate-500 font-mono">Tél: +216 74 000 001 | Email: centrale@ugs.tn</p>
                  <p className="text-[11px] text-slate-500 font-mono">MF: 1458920/A/M/000</p>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <span className="px-3 py-1 bg-slate-900 text-white font-black text-xs rounded-lg uppercase tracking-wider inline-block">
                    BON D'ACHAT
                  </span>
                  <p className="text-lg font-black text-blue-900 font-mono">{selectedBA.numero}</p>
                  <p className="text-xs text-slate-500">Date émission: <strong>{selectedBA.dateCreation}</strong></p>
                  <p className="text-xs text-slate-500">Livraison prévue: <strong>{selectedBA.datePrevueReception || 'ASAP'}</strong></p>
                  
                  <div className="pt-1 flex justify-start sm:justify-end">
                    <Barcode1D value={selectedBA.numero} height={28} />
                  </div>
                </div>
              </div>

              {/* Tiers & Target Warehouse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Fournisseur</span>
                  <p className="font-extrabold text-slate-900 text-sm">{selectedBA.fournisseurNom}</p>
                  <p className="text-slate-600">{selectedBA.adresseFournisseur || 'Tunisie'}</p>
                  <p className="text-slate-600 font-mono">Tél: {selectedBA.telephoneFournisseur || 'N/A'}</p>
                  <p className="text-slate-600 font-mono">MF: {selectedBA.matriculeFiscalFournisseur || 'N/A'}</p>
                </div>

                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase text-blue-600 block tracking-wider">Entrepôt de Réception</span>
                  <p className="font-extrabold text-blue-900 text-sm">{selectedBA.boutiqueNom}</p>
                  <p className="text-blue-800">Responsable Réception: {selectedBA.auteurNom}</p>
                  <p className="text-blue-800 text-[11px] mt-2 italic">Conditions: {selectedBA.conditionsAchat}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Réf / Article</th>
                      <th className="py-2.5 px-3 text-center">Unité</th>
                      <th className="py-2.5 px-3 text-right">Qté Cmd</th>
                      <th className="py-2.5 px-3 text-right">Qté Reçue</th>
                      <th className="py-2.5 px-3 text-right">Prix Unit. HT</th>
                      <th className="py-2.5 px-3 text-right">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedBA.lignes.map((l, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{l.designation}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{l.code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{l.unite || 'Pièce'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{l.qteCommandee}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{l.qteDejaRecue || 0}</td>
                        <td className="py-2.5 px-3 text-right">{l.prixUnitaireHT.toFixed(3)} TND</td>
                        <td className="py-2.5 px-3 text-right font-bold">{l.totalHT.toFixed(3)} TND</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totaux & Receptions History */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                
                <div className="space-y-2 text-xs max-w-md w-full">
                  <span className="font-extrabold text-slate-900 block">Historique des Réceptions (+IN)</span>
                  {selectedBA.receptions && selectedBA.receptions.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedBA.receptions.map((r, i) => (
                        <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-emerald-700">{r.stockOperationId}</span>
                            <span className="text-slate-500 block">{r.date} par {r.auteurNom}</span>
                          </div>
                          <span className="font-extrabold text-slate-800">{r.lignes.reduce((s, l) => s + l.qteRecue, 0)} pièces</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px] italic">Aucune réception enregistrée pour le moment. Le stock est intact.</p>
                  )}
                </div>

                <div className="w-full sm:w-64 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Montant HT:</span>
                    <span className="font-bold">{selectedBA.montantHT.toFixed(3)} TND</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>TVA:</span>
                    <span className="font-bold">{selectedBA.montantTVA?.toFixed(3)} TND</span>
                  </div>
                  <div className="flex justify-between text-slate-900 text-sm font-black pt-2 border-t border-slate-200">
                    <span>Total TTC:</span>
                    <span className="text-blue-900">{selectedBA.montantTTC.toFixed(3)} TND</span>
                  </div>
                </div>

              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center text-xs">
                <div className="space-y-8">
                  <span className="font-bold text-slate-600 block">Visa Service Achats UGS</span>
                  <div className="h-12 border-b border-dashed border-slate-300"></div>
                </div>
                <div className="space-y-8">
                  <span className="font-bold text-slate-600 block">Accusé de Réception Magasinier</span>
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
