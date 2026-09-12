import React, { useState, useRef, useEffect } from 'react';
import { BonDeSortie, StatutBS, MotifSortieBS, LigneBS, Article, StockOperation, Projet, Utilisateur, AuditLog } from '../types';
import { Barcode1D } from './Barcode1D';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';

function SearchableArticleSelect({ 
  articles, 
  value, 
  onChange,
  getAvailableStock,
  projetId
}: { 
  articles: Article[], 
  value: string, 
  onChange: (val: string) => void,
  getAvailableStock: (id: string, projetId: string) => number,
  projetId: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedArticle = articles.find(a => a.id === value);
  const filteredArticles = articles.filter(a => 
    a.designation.toLowerCase().includes(search.toLowerCase()) || 
    (a.code && a.code.toLowerCase().includes(search.toLowerCase())) ||
    (a.referenceInterne && a.referenceInterne.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedArticle ? `[${selectedArticle.code}] ${selectedArticle.designation}` : 'Rechercher un article...'}
        </span>
        <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 flex flex-col">
          <div className="p-2 border-b border-slate-100 shrink-0">
            <input
              type="text"
              autoFocus
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="Filtre (Désignation, code, réf)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto p-1 flex-1">
            {filteredArticles.length === 0 ? (
              <div className="p-2 text-xs text-slate-500 text-center">Aucun article trouvé</div>
            ) : (
              filteredArticles.map(a => (
                <div 
                  key={a.id}
                  className="px-2.5 py-2 hover:bg-purple-50 cursor-pointer rounded text-xs flex justify-between items-center"
                  onClick={() => {
                    onChange(a.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="truncate pr-2">[{a.code}] {a.designation}</span>
                  <span className={`shrink-0 font-bold ${getAvailableStock(a.id, projetId) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    Stock: {getAvailableStock(a.id, projetId)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  forceMotif?: MotifSortieBS;
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
  setAuditLogs,
  forceMotif
}: BonsDeSortieProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [motifFilter, setMotifFilter] = useState<string>('all');
  const [destinationFilter, setDestinationFilter] = useState<string>('all');

  const [selectedBS, setSelectedBS] = useState<BonDeSortie | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // New BS Form State
  const [newDemandeur, setNewDemandeur] = useState('');
  const [newService, setNewService] = useState('Service Technique & Maintenance');
  const [newResponsable, setNewResponsable] = useState('');
  const [newProjetId, setNewProjetId] = useState(selectedProjectId === 'all' ? '1' : selectedProjectId);
  const [newMotif, setNewMotif] = useState<MotifSortieBS>(forceMotif || 'Consommation interne');
  const [newMotifJustification, setNewMotifJustification] = useState('');
  const [newObservations, setNewObservations] = useState('');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [newDestinationBoutiqueId, setNewDestinationBoutiqueId] = useState<string>('2');

  const [newLignes, setNewLignes] = useState<Array<{
    articleId: string;
    qteDemandee: number;
  }>>([
    { articleId: '', qteDemandee: 1 }
  ]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerInput, setScannerInput] = useState('');

  const handleProcessScan = (rawCode: string) => {
    if (!rawCode.trim()) return;
    const codeToSearch = rawCode.trim().toLowerCase();
    
    // Find article by barcode or reference
    const foundArticle = articles.find(a => 
      (a.codeBarres && a.codeBarres.some(cb => cb.toLowerCase() === codeToSearch)) ||
      (a.code && a.code.toLowerCase() === codeToSearch) ||
      (a.referenceInterne && a.referenceInterne.toLowerCase() === codeToSearch)
    );

    if (foundArticle) {
      setNewLignes(prev => {
        const existingLineIndex = prev.findIndex(l => l.articleId === foundArticle.id);
        
        // Remove empty placeholder lines if any
        let newArr = prev.filter(l => l.articleId !== '');
        
        if (existingLineIndex >= 0) {
          // Increment quantity
          newArr[existingLineIndex] = {
            ...newArr[existingLineIndex],
            qteDemandee: newArr[existingLineIndex].qteDemandee + 1
          };
          return newArr;
        } else {
          // Add new line
          return [...newArr, { articleId: foundArticle.id, qteDemandee: 1 }];
        }
      });
      setScannerInput('');
      return true;
    } else {
      alert(`Aucun article trouvé pour le code : ${rawCode}`);
      return false;
    }
  };

  // Filtered List
  const filteredBS = bonsDeSortie.filter(bs => {
    const matchProject = selectedProjectId === 'all' || bs.projetId === selectedProjectId;
    const matchStatut = statutFilter === 'all' || bs.statut === statutFilter;
    const matchMotif = forceMotif ? bs.motif === forceMotif : (motifFilter === 'all' || bs.motif === motifFilter);
    const matchDestination = destinationFilter === 'all' || bs.destinationBoutiqueId === destinationFilter;
    const matchSearch =
      bs.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bs.demandeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bs.serviceDepartement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bs.destinationBoutiqueNom && bs.destinationBoutiqueNom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      bs.lignes.some(l => l.designation.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchProject && matchStatut && matchMotif && matchDestination && matchSearch;
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

  const handleOpenNewModal = () => {
    if (forceMotif === 'Transfert') {
      setNewProjetId('1');
      const firstBoutique = projets.find(p => p.id !== '1')?.id || '';
      setNewDestinationBoutiqueId(firstBoutique);
    } else {
      setNewProjetId(selectedProjectId === 'all' ? '1' : selectedProjectId);
      setNewDestinationBoutiqueId('');
    }
    setNewDemandeur('');
    setNewMotif(forceMotif || 'Consommation interne');
    setNewMotifJustification('');
    setNewObservations('');
    setNewLignes([{ articleId: '', qteDemandee: 1 }]);
    setIsNewModalOpen(true);
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

    // Check Stock Availability (Strict block if stock <= 0)
    const InsufficientStockLine = computedNewLignes.find(l => l.stockDisponible <= 0 || l.stockApres < 0);
    if (InsufficientStockLine && !allowNegativeStock) {
      alert(`ACTION BLOQUÉE - STOCK NULL OU INSUFFISANT :\nPour '${InsufficientStockLine.designation}', le stock disponible est de ${InsufficientStockLine.stockDisponible} unité(s) alors que la quantité demandée est de ${InsufficientStockLine.qteDemandee}.\n\nImpossible de réaliser une opération de décrémentation ou de transfert pour un article en stock nul ou insuffisant.`);
      return;
    }

    const proj = projets.find(p => p.id === newProjetId);
    const numIndex = bonsDeSortie.length + 1;
    const prefix = forceMotif === 'Transfert' ? 'TR' : 'BS';
    const newNumero = `${prefix}-2026-${String(numIndex).padStart(6, '0')}`;

    const newBS: BonDeSortie = {
      id: `bs-${Date.now()}`,
      numero: newNumero,
      projetId: newProjetId,
      boutiqueNom: proj?.nom || 'ERP Management - Stock Central',
      dateCreation: new Date().toISOString().split('T')[0],
      heureCreation: new Date().toLocaleTimeString().slice(0, 5),
      statut: 'EN ATTENTE',
      auteurId: currentUser.id,
      auteurNom: `${currentUser.nom} ${currentUser.prenom || ''}`.trim(),
      demandeur: newDemandeur,
      serviceDepartement: newService,
      responsableValidation: newResponsable || 'Responsable Dépôt ERP Management',
      motif: newMotif,
      motifJustification: newMotifJustification,
      entrepotSource: proj?.nom || 'Société UGS',
      destinationBoutiqueId: newMotif === 'Transfert' ? newDestinationBoutiqueId : undefined,
      destinationBoutiqueNom: newMotif === 'Transfert' ? (projets.find(p => p.id === newDestinationBoutiqueId)?.nom || 'Boutique Réceptrice') : undefined,
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
      alert("Ce Bon de Sortie a déjà été retiré du stock.");
      return;
    }

    // Check stock availability (Strict block if stock <= 0)
    const invalidLines = bs.lignes.filter(l => {
      const avail = getAvailableStock(l.articleId, bs.projetId);
      return avail <= 0 || avail < l.qteDemandee;
    });

    if (invalidLines.length > 0 && !bs.exceptionStockNegatifValidee) {
      const line = invalidLines[0];
      const avail = getAvailableStock(line.articleId, bs.projetId);
      alert(`ACTION BLOQUÉE - STOCK NULL OU INSUFFISANT :\nArticle : ${line.designation}\nStock disponible : ${avail}\nQuantité demandée : ${line.qteDemandee}\n\nImpossible d'effectuer la décrémentation sur un produit ayant un stock nul ou insuffisant.`);
      return;
    }

    const stockOpNumber = `OUT-2026-${String(stockOperations.length + 101).padStart(6, '0')}`;

    // 1. Decrement Stock (-OUT) and Increment Destination (+IN) if Transfert
    setArticles(prevArticles => {
      return prevArticles.map(art => {
        const bsLine = bs.lignes.find(l => l.articleId === art.id);
        if (bsLine && bsLine.qteSortie > 0) {
          const currentStock = art.stocks ? (art.stocks[bs.projetId] || 0) : (art.stock || 0);
          const newStock = currentStock - bsLine.qteSortie;

          let updatedStocks = {
            ...(art.stocks || {}),
            [bs.projetId]: newStock
          };

          if (bs.motif === 'Transfert' && bs.destinationBoutiqueId) {
            const destStock = (art.stocks && art.stocks[bs.destinationBoutiqueId] !== undefined)
              ? art.stocks[bs.destinationBoutiqueId]
              : 0;
            updatedStocks[bs.destinationBoutiqueId] = destStock + bsLine.qteSortie;
          }

          return {
            ...art,
            stock: art.typeArticle === 'Service' 
              ? (art.stock || 0) 
              : (bs.destinationBoutiqueId ? (art.stock || 0) : ((art.stock || 0) - bsLine.qteSortie)),
            stocks: updatedStocks
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
      warehouseId: bs.boutiqueNom || 'Société UGS',
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
      motif: `Bon de Sortie ${bs.numero} • Motif: ${bs.motif}${bs.destinationBoutiqueNom ? ` ➔ Vers ${bs.destinationBoutiqueNom}` : ''} (${bs.demandeur})`
    };

    const opsToRecord = [newStockOp];
    if (bs.motif === 'Transfert' && bs.destinationBoutiqueId) {
      const destOpNumber = `IN-TR-2026-${String(stockOperations.length + 102).padStart(6, '0')}`;
      const destStockOp: StockOperation = {
        id: `so-in-tr-${Date.now()}`,
        operationNumber: destOpNumber,
        type: 'ENTREE',
        projetId: bs.destinationBoutiqueId,
        warehouseId: bs.destinationBoutiqueNom || 'Boutique Réceptrice',
        referenceType: 'BL',
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
        motif: `Réception transfert entrant depuis Société UGS [${bs.numero}]`
      };
      opsToRecord.push(destStockOp);
    }

    setStockOperations([...opsToRecord, ...stockOperations]);

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

    alert(`Sortie de stock effectuée avec succès ! Clé d'opération : ${stockOpNumber}`);
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
      <div className="bg-zinc-950 rounded-xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-purple-800/30">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 backdrop-blur-md rounded-full text-purple-200 text-xs font-bold tracking-wide border border-purple-400/30">
              <span className="material-symbols-outlined text-[16px]">{forceMotif === 'Transfert' ? 'swap_horiz' : 'output'}</span>
              Gestion Interne ERP Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {forceMotif === 'Transfert' ? 'Transferts UGS ➔ Boutiques' : 'Bons de Sortie de Stock (BS)'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
              Différence BL vs BS
            </button>

            {currentUser.role === 'comptable' ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/20 backdrop-blur-md rounded-xl text-purple-200 text-xs font-bold border border-purple-400/30">
                <span className="material-symbols-outlined text-[18px] text-purple-300">verified</span>
                <span>Mode Audit & Contrôle Sorties Internes</span>
              </div>
            ) : (
              <button
                onClick={handleOpenNewModal}
                className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">{forceMotif === 'Transfert' ? 'swap_horiz' : 'add_circle'}</span>
                {forceMotif === 'Transfert' ? 'Nouveau Transfert' : 'Nouveau Bon de Sortie (BS)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{forceMotif === 'Transfert' ? 'Total Transferts' : 'Total BS Émis'}</span>
            <span className="material-symbols-outlined text-[18px] text-purple-400">{forceMotif === 'Transfert' ? 'swap_horiz' : 'outbox'}</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBS.length}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Articles {forceMotif === 'Transfert' ? 'Transférés' : 'Sortis'}</span>
            <span className="material-symbols-outlined text-[18px] text-indigo-400">inventory_2</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBS.reduce((acc, bs) => acc + bs.lignes.reduce((sum, l) => sum + l.qteDemandee, 0), 0)}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Transports Internes</span>
            <span className="material-symbols-outlined text-[18px] text-amber-400">local_shipping</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBS.filter(bs => bs.motif === 'Transfert').length}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sorties Validées</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400">verified</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBS.filter(bs => bs.statut === 'VALIDÉ').length}</p>
        </div>
      </div>

      {/* BL vs BS Comparative Table */}
      {showComparison && (
        <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-xl space-y-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-base text-purple-300 flex items-center gap-2">
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
                <tr className="bg-slate-800/80 text-purple-200 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700">
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
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder={`Rechercher ${forceMotif === 'Transfert' ? 'Transfert' : 'BS'}, Demandeur, Service, Article...`}
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

            {forceMotif === 'Transfert' && (
              <select
                value={destinationFilter}
                onChange={e => setDestinationFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">Toutes les Boutiques Destinataires</option>
                {projets.map(p => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            )}

            {!forceMotif && (
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
            )}
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                    <span className="material-symbols-outlined text-[48px] block mb-2 text-slate-300">{forceMotif === 'Transfert' ? 'swap_horiz' : 'output'}</span>
                    Aucun {forceMotif === 'Transfert' ? 'Transfert' : 'Bon de Sortie'} trouvé.
                  </td>
                </tr>
              ) : (
                filteredBS.map(bs => {
                  const totalSortie = bs.lignes.reduce((sum, l) => sum + l.qteSortie, 0);

                  return (
                    <tr key={bs.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-purple-900">
                        {bs.numero}
                        {bs.stockOperationId && (
                          <span className="block text-[10px] font-bold text-emerald-600 font-mono mt-0.5">
                            {bs.stockOperationId}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{bs.dateCreation} ({bs.heureCreation || '10:00'})</span>
                        <span className="text-[11px] text-slate-500">{bs.entrepotSource || bs.boutiqueNom || 'Société UGS'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{bs.demandeur}</span>
                        <span className="text-[11px] text-purple-700 font-medium">{bs.serviceDepartement}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 font-extrabold text-[11px] rounded-lg inline-block ${
                          bs.motif === 'Transfert'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {bs.motif}
                        </span>
                        {bs.destinationBoutiqueNom && (
                          <span className="block text-[10px] text-indigo-700 font-bold mt-0.5">
                            ➔ Vers: {bs.destinationBoutiqueNom}
                          </span>
                        )}
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

                          {currentUser.role !== 'comptable' && !bs.isStockDecremented && bs.statut !== 'ANNULÉ' && (
                            <button
                              onClick={() => handleValidateBSOutput(bs)}
                              className={`px-2.5 py-1 ${forceMotif === 'Transfert' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer`}
                              title={forceMotif === 'Transfert' ? "Valider le transfert de stock UGS vers la boutique" : "Valider la sortie en stock (-OUT)"}
                            >
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              {forceMotif === 'Transfert' ? 'Valider le Transfert' : 'Valider Sortie (-OUT)'}
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
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 font-extrabold text-xs rounded-full uppercase tracking-wider">
                  {forceMotif === 'Transfert' ? 'Nouveau Transfert' : 'Nouveau Bon de Sortie (BS)'}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {forceMotif === 'Transfert' ? 'Création d\'un Transfert de Stock' : 'Création d\'une Demande de Sortie de Stock'}
                </h2>
              </div>
              <button type="button" onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
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
                    disabled={forceMotif === 'Transfert'}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold ${forceMotif === 'Transfert' ? 'text-slate-500 cursor-not-allowed' : 'text-slate-800'} focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  >
                    {projets.map(p => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Motif Obligatoire */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {!forceMotif && (
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1">Motif Obligatoire de Sortie *</label>
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
                  )}

                  <div className={forceMotif ? "col-span-2" : ""}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Justification / Responsable
                      {newMotif === 'Autre' && <span className="text-rose-600 font-bold"> * Obligatoire</span>}
                    </label>
                    <input
                      type="text"
                      required={newMotif === 'Autre'}
                      value={newMotifJustification}
                      onChange={e => setNewMotifJustification(e.target.value)}
                      placeholder={forceMotif === 'Transfert' ? 'Ex: Réapprovisionnement régulier de la boutique...' : 'Ex: Remplacement pièce défectueuse sur machine 3...'}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Si Motif est Transfert: Sélection Boutique Destinataire */}
                {newMotif === 'Transfert' && (
                  <div className="p-3.5 bg-white rounded-xl border border-indigo-200 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
                      <span className="material-symbols-outlined text-[18px] text-indigo-600">storefront</span>
                      <span>Destination du Transfert (Société UGS ➔ Boutique) :</span>
                    </div>
                    <div>
                      <select
                        value={newDestinationBoutiqueId}
                        onChange={e => setNewDestinationBoutiqueId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-indigo-50/50 border border-indigo-300 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {projets.filter(p => p.id !== newProjetId).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nom} {p.adresse ? `(${p.adresse})` : ''}
                          </option>
                        ))}
                      </select>
                      
                    </div>
                  </div>
                )}
              </div>

              {/* Fast Scanner */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">barcode_scanner</span>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-indigo-900 block mb-1">Scan Rapide Code-barres</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Scannez ou saisissez un code et appuyez sur Entrée..." 
                      className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleProcessScan(scannerInput);
                        }
                      }} 
                    />
                    <button
                      type="button"
                      onClick={() => handleProcessScan(scannerInput)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors"
                    >
                      Ajouter
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      Caméra
                    </button>
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
                      <div key={idx} className={`p-3.5 rounded-xl border transition-all grid grid-cols-1 sm:grid-cols-12 gap-3 items-center ${isOver ? 'bg-rose-50/80 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Article</label>
                          <SearchableArticleSelect
                            articles={articles}
                            value={l.articleId}
                            onChange={(val) => {
                              const updated = [...newLignes];
                              updated[idx].articleId = val;
                              setNewLignes(updated);
                            }}
                            getAvailableStock={getAvailableStock}
                            projetId={newProjetId}
                          />
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
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
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
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
                  <span className="material-symbols-outlined">output</span>
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedBS.numero}</h2>
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
            <div className="p-0 bg-white text-slate-900 rounded-xl border border-slate-200 font-sans overflow-hidden relative">
              
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-900/5 -skew-x-12 -mr-32 -mt-32 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/5 skew-x-12 -ml-24 -mb-24 pointer-events-none"></div>

              {/* Top Header Bar */}
              <div className="relative h-14 bg-indigo-950 flex items-center justify-between px-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-purple-600 -skew-x-12 translate-x-16"></div>
                <div className="relative z-10">
                  <h1 className="text-white font-black text-xl tracking-tighter uppercase">SOCIETE UNIVERS GSM DE SUD</h1>
                  <p className="text-indigo-300 text-[9px] font-bold tracking-[0.2em] uppercase opacity-80">Rapport de Mouvement Interne</p>
                </div>
                <div className="relative z-10 text-right text-white">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Usage Interne Uniquement</p>
                  <p className="text-xs font-black tracking-tight">{selectedBS.numero}</p>
                </div>
              </div>

              <div className="p-8 space-y-8 relative z-10">
                {/* Header Information Section */}
                <div className="flex justify-between items-start gap-12">
                  <div className="space-y-4 flex-1">
                    <img src="/logo.png" alt="Logo UGS" className="h-24 w-auto object-contain mb-4" referrerPolicy="no-referrer" />
                    
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                          <span className="material-symbols-outlined text-indigo-600 text-xs">location_on</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">Siège Social</p>
                          <p className="font-bold text-slate-700 text-[10px]">112, OMAR IBN KHATAB ZRIG, GABES S3</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                          <span className="material-symbols-outlined text-indigo-600 text-xs">badge</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">Identifiant Fiscal</p>
                          <p className="font-bold text-slate-700 text-[10px]">1532846 G/A/M/000</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-72 space-y-4">
                    <div className="bg-slate-900 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg border border-slate-800">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-600 -skew-x-12 translate-x-10 -translate-y-10"></div>
                      <div className="relative z-10 space-y-3">
                        <div>
                          <p className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] mb-1">Demandeur</p>
                          <h2 className="text-base font-black tracking-tight leading-tight uppercase">{selectedBS.demandeur}</h2>
                        </div>
                        <div className="pt-2 border-t border-slate-800">
                          <p className="text-[9px] font-bold text-slate-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[12px]">engineering</span>
                            {selectedBS.serviceDepartement}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">Date de Sortie</p>
                        <p className="text-base font-black text-slate-900">{selectedBS.dateCreation} {selectedBS.heureCreation}</p>
                      </div>
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-indigo-600 text-xl font-bold">event</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Type Label */}
                <div className="flex items-center gap-4">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-indigo-600 rotate-45"></span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                      {selectedBS.motif === 'Transfert' ? 'Bordereau de Transfert Inter-Boutique' : 'Bon de Sortie'} <span className="text-indigo-600">N° {selectedBS.numero}</span>
                    </h2>
                  </div>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                {/* Route Graphic for Transferts */}
                {selectedBS.motif === 'Transfert' && (
                  <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-indigo-950 font-bold text-xs shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                        <span className="material-symbols-outlined text-[20px]">warehouse</span>
                      </span>
                      <div>
                        <span className="block text-[9px] text-indigo-500 uppercase font-black tracking-wider">Source (Expéditeur)</span>
                        <span className="text-sm font-black">{selectedBS.entrepotSource || selectedBS.boutiqueNom || 'Société UGS'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-indigo-600 font-extrabold px-3 py-1.5 bg-white/80 rounded-full border border-indigo-200 shadow-2xs">
                      <span className="text-[10px] uppercase tracking-wider text-indigo-700">En Transit</span>
                      <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <span className="block text-[9px] text-purple-600 uppercase font-black tracking-wider">Destination (Récepteur)</span>
                        <span className="text-sm font-black text-purple-950">{selectedBS.destinationBoutiqueNom || 'Boutique Destinataire'}</span>
                      </div>
                      <span className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                        <span className="material-symbols-outlined text-[20px]">storefront</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Contextual Details */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Motif de Sortie</p>
                    <p className="text-[11px] font-black text-slate-900 uppercase">{selectedBS.motif}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Source</p>
                    <p className="text-[11px] font-black text-slate-900">{selectedBS.entrepotSource || selectedBS.boutiqueNom}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</p>
                    <p className="text-[11px] font-black text-slate-900 uppercase">{selectedBS.destinationBoutiqueNom || 'Consommation Interne'}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-indigo-950 text-white text-[9px] uppercase tracking-widest">
                        <th className="p-3 font-black w-24">Référence</th>
                        <th className="p-3 font-black">Désignation</th>
                        <th className="p-3 font-black text-center w-20">Unité</th>
                        <th className="p-3 font-black text-center w-20">Stock Dispo.</th>
                        <th className="p-3 font-black text-center w-20">Quantité</th>
                        <th className="p-3 font-black text-center w-20">Stock Après</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10px]">
                      {selectedBS.lignes.map((l, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-3 py-3 font-bold text-slate-500 font-mono">{l.code}</td>
                          <td className="px-3 py-3 font-black text-slate-900 uppercase">{l.designation}</td>
                          <td className="px-3 py-3 text-center font-bold text-slate-600">{l.unite || 'PCS'}</td>
                          <td className="px-3 py-3 text-center font-bold text-slate-400">{l.stockDisponible}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg font-black">{l.qteSortie}</span>
                          </td>
                          <td className="px-3 py-3 text-center font-black text-slate-900">{l.stockApres}</td>
                        </tr>
                      ))}
                      {/* Filler rows */}
                      {Array.from({ length: Math.max(0, 6 - selectedBS.lignes.length) }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-10 border-t border-slate-50">
                          <td colSpan={6}></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Observations & Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-4">
                  <div className="col-span-1 space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-xs">notes</span>
                      Observations
                    </p>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl h-28 text-[10px] italic text-slate-500 leading-relaxed">
                      {selectedBS.observations || 'Aucune observation particulière.'}
                      {selectedBS.motifJustification && (
                        <p className="mt-2 not-italic font-bold text-slate-700">Justif: {selectedBS.motifJustification}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-center justify-center">
                      <span className="material-symbols-outlined text-xs">edit</span>
                      {selectedBS.motif === 'Transfert' ? 'Magasinier UGS (Expéditeur)' : 'Visa Demandeur'}
                    </p>
                    <div className="h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl"></div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-center justify-center">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      {selectedBS.motif === 'Transfert' ? 'Responsable Boutique (Récepteur)' : 'Visa Responsable Dépôt'}
                    </p>
                    <div className="h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl relative overflow-hidden flex items-center justify-center">
                      <img src="/logo.png" alt="Watermark" className="absolute w-24 opacity-5 grayscale rotate-12" referrerPolicy="no-referrer" />
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter italic relative z-10 text-center">Validation Logistique<br/>ERP UGS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internal Footer */}
              <div className="mt-8 bg-indigo-950 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-full bg-purple-600 -skew-x-12 translate-x-12"></div>
                <p className="relative z-10 text-indigo-400 text-[8px] font-black uppercase tracking-[0.4em] text-center mb-1">
                  Système de Gestion des Mouvements de Stock - UGS
                </p>
                <div className="relative z-10 text-white/40 text-[7px] font-bold uppercase tracking-widest">
                  Généré le {new Date().toLocaleString()} par {selectedBS.auteurNom}
                </div>
              </div>

            </div>


          </div>
        </div>
      )}

      {/* CAMERA SCANNER MODAL */}
      {isScannerOpen && (
        <CameraBarcodeScannerModal
          articles={articles}
          onScanSuccess={(code) => handleProcessScan(code)}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

    </div>
  );
}
