import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Reglement, Projet, Vente, Achat, Client, Fournisseur, Utilisateur, Article, LigneVente, MouvementStock, SessionCaisse, SessionActionLog, RetourVente, LigneRetourVente, ModeRemboursement } from '../types';
import { generateReceiptPdf, generateReturnSlipPdf } from '../utils/pdfExportEngine';
import { generateNextDocNumber } from '../utils/numbering';
import { generateZReportPdf } from '../utils/caisseZReport';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { TicketPanierModal } from './TicketPanierModal';
import { getArticleStock, updateArticleStock } from '../utils/stockUtils';
import { createGuaranteedStockMovement } from '../utils/stockIntegrityEngine';

interface CartItem {
  article: Article;
  quantite: number;
  prixVenteHT: number;
}

interface CaisseProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  onSelectProject?: (projectId: string) => void;
  reglements: Reglement[];
  projets: Projet[];
  ventes: Vente[];
  achats: Achat[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  articles?: Article[];
  mouvements?: MouvementStock[];
  sessions: SessionCaisse[];
  actionLogs: SessionActionLog[];
  retours?: RetourVente[];
  onRetoursChange?: (retours: RetourVente[]) => void;
  onReglementsChange: (reglements: Reglement[]) => void;
  onVentesChange?: (ventes: Vente[]) => void;
  onArticlesChange?: (articles: Article[]) => void;
  onClientsChange?: (clients: Client[]) => void;
  onMouvementsChange?: (mouvements: MouvementStock[]) => void;
  onSessionsChange: (sessions: SessionCaisse[]) => void;
  onActionLogsChange: (logs: SessionActionLog[]) => void;
}

export function Caisse({
  currentUser,
  selectedProjectId,
  onSelectProject,
  reglements,
  projets,
  ventes,
  achats,
  clients,
  fournisseurs,
  articles = [],
  mouvements = [],
  sessions = [],
  actionLogs = [],
  retours = [],
  onRetoursChange,
  onReglementsChange,
  onVentesChange,
  onArticlesChange,
  onClientsChange,
  onMouvementsChange,
  onSessionsChange,
  onActionLogsChange
}: CaisseProps) {
  // Session State
  const activeSession = useMemo(() => {
    return sessions.find(s => 
      s.utilisateurId === currentUser.id && 
      s.projetId === selectedProjectId && 
      s.statut === 'Ouverte'
    ) || sessions.find(s => 
      s.projetId === selectedProjectId && 
      s.statut === 'Ouverte'
    );
  }, [sessions, currentUser.id, selectedProjectId]);

  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  // Ventes rattachées à la session active (filtrées par date et boutique)
  const sessionSales = useMemo(() => {
    if (!activeSession) return [];
    const openDateStr = activeSession.dateOuverture.split('T')[0];

    return ventes.filter(v => {
      const isStore = v.projetId === selectedProjectId;
      const isCashier = !v.auteurId || v.auteurId === currentUser.id || v.auteurId === activeSession.utilisateurId;
      const isAfterOpen = v.date >= openDateStr;
      return isStore && isCashier && v.statut !== 'Devis' && v.statut !== 'Annulée' && isAfterOpen;
    });
  }, [activeSession, ventes, selectedProjectId, currentUser.id]);

  // Totaux par mode de règlement des ventes de la session
  const totalVentesEspeces = useMemo(() => {
    return sessionSales
      .filter(v => v.modePaiement === 'Espèces' || !v.modePaiement)
      .reduce((sum, v) => sum + (v.montantPaye ?? v.montantTTC ?? 0), 0);
  }, [sessionSales]);

  const totalVentesCheque = useMemo(() => {
    return sessionSales
      .filter(v => v.modePaiement === 'Chèque')
      .reduce((sum, v) => sum + (v.montantPaye ?? v.montantTTC ?? 0), 0);
  }, [sessionSales]);

  const totalVentesAutres = useMemo(() => {
    return sessionSales
      .filter(v => v.modePaiement !== 'Espèces' && v.modePaiement !== 'Chèque' && v.modePaiement)
      .reduce((sum, v) => sum + (v.montantPaye ?? v.montantTTC ?? 0), 0);
  }, [sessionSales]);

  const totalVentesGlobal = useMemo(() => {
    return sessionSales.reduce((sum, v) => sum + (v.montantPaye ?? v.montantTTC ?? 0), 0);
  }, [sessionSales]);

  // Mouvements d'espèces manuels de la session (hors tickets de ventes directes)
  const sessionReglementsManuels = useMemo(() => {
    if (!activeSession) return { encaissementsEspeces: 0, decaissementsEspeces: 0, count: 0, items: [] as Reglement[] };
    const openDate = activeSession.dateOuverture.split('T')[0];
    const list = reglements.filter(r => 
      r.projetId === selectedProjectId && 
      r.date >= openDate &&
      !r.documentRef?.startsWith('FAC-') && !r.documentRef?.startsWith('DEV-')
    );
    const enc = list.filter(r => r.type === 'Encaissement' && r.modePaiement === 'Espèces').reduce((s, r) => s + r.montant, 0);
    const dec = list.filter(r => r.type === 'Décaissement' && r.modePaiement === 'Espèces').reduce((s, r) => s + r.montant, 0);
    return { encaissementsEspeces: enc, decaissementsEspeces: dec, count: list.length, items: list };
  }, [activeSession, reglements, selectedProjectId]);

  // MONTANT FINAL TOTAL DANS LE TIROIR-CAISSE (Calculé Automatiquement en temps réel)
  const soldeFinalCalcule = useMemo(() => {
    if (!activeSession) return 0;
    return activeSession.soldeInitial + totalVentesEspeces + sessionReglementsManuels.encaissementsEspeces - sessionReglementsManuels.decaissementsEspeces;
  }, [activeSession, totalVentesEspeces, sessionReglementsManuels]);

  const logAction = (action: string, type: SessionActionLog['type'], montant?: number, details?: string) => {
    if (!activeSession) return;
    const newLog: SessionActionLog = {
      id: `log-${Date.now()}`,
      sessionId: activeSession.id,
      utilisateurId: currentUser.id,
      timestamp: new Date().toISOString(),
      action,
      type,
      montant,
      details
    };
    onActionLogsChange([newLog, ...actionLogs]);
  };

  const handleOpenSession = () => {
    if (selectedProjectId === 'all') return;
    const newSession: SessionCaisse = {
      id: `session-${Date.now()}`,
      projetId: selectedProjectId,
      utilisateurId: currentUser.id,
      utilisateurNom: currentUser.nom,
      dateOuverture: new Date().toISOString(),
      soldeInitial: openingBalance,
      statut: 'Ouverte'
    };
    onSessionsChange([newSession, ...sessions]);
    
    // Log the opening
    const newLog: SessionActionLog = {
      id: `log-${Date.now()}`,
      sessionId: newSession.id,
      utilisateurId: currentUser.id,
      timestamp: new Date().toISOString(),
      action: 'Ouverture de session',
      type: 'Ouverture',
      montant: openingBalance,
      details: `Session de caisse ouverte avec un fond initial de ${openingBalance.toFixed(3)} DT`
    };
    onActionLogsChange([newLog, ...actionLogs]);
  };

  const handleCloseSession = () => {
    if (!activeSession) return;
    
    // Le montant final est calculé automatiquement et verrouillé (sans possibilité de falsification manuelle)
    const finalAmount = soldeFinalCalcule;
    const closureDate = new Date().toISOString();

    const closedSession: SessionCaisse = {
      ...activeSession,
      dateFermeture: closureDate,
      soldeFinalTheorique: finalAmount,
      soldeFinalReel: finalAmount,
      ecart: 0, // Caisse certifiée conforme
      statut: 'Fermee' as const,
      notes: sessionNotes.trim() ? sessionNotes : 'Clôture de caisse certifiée sans anomalie.'
    };

    const updatedSessions = sessions.map(s => s.id === activeSession.id ? closedSession : s);
    onSessionsChange(updatedSessions);
    
    // Log the closing
    const newLog: SessionActionLog = {
      id: `log-${Date.now()}`,
      sessionId: activeSession.id,
      utilisateurId: currentUser.id,
      timestamp: closureDate,
      action: 'Clôture de Session Automatique',
      type: 'Fermeture',
      montant: finalAmount,
      details: `Caisse clôturée. Solde final certifié automatiquement: ${finalAmount.toFixed(3)} DT (Fond initial: ${activeSession.soldeInitial.toFixed(3)} DT + Espèces: ${totalVentesEspeces.toFixed(3)} DT).`
    };
    onActionLogsChange([newLog, ...actionLogs]);

    // Génération et impression du Procès-Verbal Z de Clôture
    generateZReportPdf({
      session: closedSession,
      projet: currentProject,
      caissier: currentUser,
      ventesSession: sessionSales,
      reglementsSession: reglements.filter(r => r.projetId === selectedProjectId && r.date >= activeSession.dateOuverture.split('T')[0]),
      soldeFinalCalcule: finalAmount
    });

    setIsClosingModalOpen(false);
    setSessionNotes('');
    setPosSuccessMsg(`Caisse clôturée avec succès ! Montant final certifié : ${finalAmount.toFixed(3)} DT. Ticket Z officiel généré en PDF.`);
  };

  // Main view tab: POS Terminal vs Journal (comptable defaults to audit journal)
  const isComptable = currentUser.role === 'comptable';
  const isSuperAdmin = currentUser.role === 'super_admin';
  const [activeTab, setActiveTab] = useState<'pos' | 'journal'>(currentUser.role === 'comptable' ? 'journal' : 'pos');

  // POS State (BF-PROD-019 & BF-PROD-020)
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('all');
  const [posTypeFilter, setPosTypeFilter] = useState<'all' | 'Produit' | 'Service'>('all');
  const [posSortBy, setPosSortBy] = useState<'most_sold' | 'name_asc' | 'price_asc' | 'price_desc'>('most_sold');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posClientId, setPosClientId] = useState<string>('');
  const [posPaymentMode, setPosPaymentMode] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Espèces');
  const [posSuccessMsg, setPosSuccessMsg] = useState<string | null>(null);
  // Mobile active sub-tab for POS ('catalog' vs 'cart')
  const [posMobileTab, setPosMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Returns Management (Gestion des Retours)
  const [isPosReturnModalOpen, setIsPosReturnModalOpen] = useState(false);
  const [posReturnActiveTab, setPosReturnActiveTab] = useState<'nouveau' | 'historique'>('nouveau');
  const [posReturnType, setPosReturnType] = useState<'ticket' | 'libre'>('ticket');
  const [posReturnSelectedSaleId, setPosReturnSelectedSaleId] = useState<string>('');
  const [posReturnTicketSearch, setPosReturnTicketSearch] = useState<string>('');
  const [posReturnClientId, setPosReturnClientId] = useState<string>('');
  const [posReturnRefundMode, setPosReturnRefundMode] = useState<ModeRemboursement>('Espèces');
  const [posReturnMotif, setPosReturnMotif] = useState<string>('Retour article au comptoir');
  const [posReturnLines, setPosReturnLines] = useState<Array<{
    articleId: string;
    articleCode?: string;
    designation: string;
    quantiteVendue: number;
    quantiteRetournee: number;
    prixUnitaire: number;
    motif: string;
    remettreEnStock: boolean;
  }>>([]);
  const [posViewingReturn, setPosViewingReturn] = useState<RetourVente | null>(null);
  const [selectedTicketVente, setSelectedTicketVente] = useState<Vente | null>(null);

  // Scanner Engine State (BF-PROD-020)
  const [scannerInput, setScannerInput] = useState('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannerFeedback, setScannerFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    article?: Article;
  } | null>(null);

  // REAL-TIME POS CART SYNC (Smartphone <-> PC)
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');
  const [syncNotification, setSyncNotification] = useState<{
    message: string;
    sourceDevice: 'smartphone' | 'desktop' | 'tablet';
    itemName?: string;
    timestamp: number;
  } | null>(null);

  const deviceId = useMemo(() => {
    let id = sessionStorage.getItem('pos_device_id');
    if (!id) {
      id = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('pos_device_id', id);
    }
    return id;
  }, []);

  const isMobileDevice = useMemo(() => {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || window.innerWidth < 1024;
  }, []);

  const syncKey = useMemo(() => {
    if (activeSession) return `session_${activeSession.id}`;
    return `project_${selectedProjectId}`;
  }, [activeSession, selectedProjectId]);

  const isRemoteUpdateRef = useRef(false);

  // Helper pour diffuser les mises à jour aux autres appareils
  const broadcastCartUpdate = useCallback((
    newCart: CartItem[], 
    newClientId?: string, 
    newPaymentMode?: string, 
    actionName?: string, 
    itemName?: string
  ) => {
    if (isRemoteUpdateRef.current) return;
    setSyncStatus('syncing');

    const payload = {
      syncKey,
      cart: newCart,
      posClientId: newClientId !== undefined ? newClientId : posClientId,
      posPaymentMode: newPaymentMode !== undefined ? newPaymentMode : posPaymentMode,
      lastAction: actionName || 'update',
      lastItemName: itemName || '',
      senderDeviceId: deviceId,
      deviceType: isMobileDevice ? 'smartphone' : 'desktop',
      updatedAt: Date.now()
    };

    // 1. Envoyer au serveur Express
    fetch('/api/caisse/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(() => setSyncStatus('connected'))
    .catch(() => setSyncStatus('connected'));

    // 2. Diffuser par BroadcastChannel pour les onglets/fenêtres locales
    try {
      const channel = new BroadcastChannel('pos_cart_sync_channel');
      channel.postMessage(payload);
      channel.close();
    } catch {}
  }, [syncKey, posClientId, posPaymentMode, deviceId, isMobileDevice]);


  // Web Audio Synth Beep feedback (BF-PROD-020)
  const playBeep = (type: 'success' | 'error' = 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'success' ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(type === 'success' ? 1046.5 : 220, ctx.currentTime); // C6 or A3
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (type === 'success' ? 0.15 : 0.3));
    } catch {
      // Audio context may be restricted by browser policy
    }
  };

  // Real-Time SSE and BroadcastChannel Synchronizer
  useEffect(() => {
    if (!syncKey) return;

    // 1. Initial fetch from server
    fetch(`/api/caisse/sync/${syncKey}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.cart) && data.cart.length > 0) {
          isRemoteUpdateRef.current = true;
          setCart(prev => prev.length === 0 ? data.cart : prev);
          if (data.posClientId) setPosClientId(data.posClientId);
          if (data.posPaymentMode) setPosPaymentMode(data.posPaymentMode);
          setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
        }
      })
      .catch(() => {});

    // 2. Server-Sent Events (SSE) Stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/caisse/stream/${syncKey}`);
      
      eventSource.onopen = () => {
        setSyncStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'sync' && parsed.payload) {
            const p = parsed.payload;
            if (p.senderDeviceId !== deviceId) {
              isRemoteUpdateRef.current = true;
              setCart(p.cart || []);
              if (p.posClientId !== undefined) setPosClientId(p.posClientId);
              if (p.posPaymentMode !== undefined) setPosPaymentMode(p.posPaymentMode);

              if (p.lastItemName) {
                setSyncNotification({
                  message: `Article scanné / ajouté depuis ${p.deviceType === 'smartphone' ? 'le smartphone 📱' : 'un autre poste 💻'} : "${p.lastItemName}"`,
                  sourceDevice: p.deviceType || 'smartphone',
                  itemName: p.lastItemName,
                  timestamp: Date.now()
                });
                playBeep('success');
              } else if (p.lastAction === 'checkout') {
                setSyncNotification({
                  message: `Encaissement validé sur un autre appareil. Le panier a été réinitialisé.`,
                  sourceDevice: p.deviceType || 'smartphone',
                  timestamp: Date.now()
                });
              }

              setTimeout(() => {
                isRemoteUpdateRef.current = false;
              }, 100);
            }
          }
        } catch (e) {
          console.error("Erreur de parsing SSE", e);
        }
      };

      eventSource.onerror = () => {
        setSyncStatus('syncing');
      };
    } catch (e) {
      console.error("SSE stream unavailable", e);
    }

    // 3. BroadcastChannel listener (inter-onglets instantané)
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('pos_cart_sync_channel');
      channel.onmessage = (event) => {
        const p = event.data;
        if (p && p.syncKey === syncKey && p.senderDeviceId !== deviceId) {
          isRemoteUpdateRef.current = true;
          setCart(p.cart || []);
          if (p.posClientId !== undefined) setPosClientId(p.posClientId);
          if (p.posPaymentMode !== undefined) setPosPaymentMode(p.posPaymentMode);
          if (p.lastItemName) {
            setSyncNotification({
              message: `Article scanné / ajouté depuis ${p.deviceType === 'smartphone' ? 'le smartphone 📱' : 'un autre écran 💻'} : "${p.lastItemName}"`,
              sourceDevice: p.deviceType || 'smartphone',
              itemName: p.lastItemName,
              timestamp: Date.now()
            });
            playBeep('success');
          }
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 100);
        }
      };
    } catch {}

    // 4. Polling de secours toutes les 2.5 secondes
    const pollTimer = setInterval(() => {
      fetch(`/api/caisse/sync/${syncKey}`)
        .then(res => res.json())
        .then(p => {
          if (p && p.senderDeviceId && p.senderDeviceId !== deviceId && p.updatedAt && (Date.now() - p.updatedAt < 4000)) {
            isRemoteUpdateRef.current = true;
            setCart(p.cart || []);
            if (p.posClientId !== undefined) setPosClientId(p.posClientId);
            if (p.posPaymentMode !== undefined) setPosPaymentMode(p.posPaymentMode);
            setTimeout(() => {
              isRemoteUpdateRef.current = false;
            }, 100);
          }
        })
        .catch(() => {});
    }, 2500);

    return () => {
      if (eventSource) eventSource.close();
      if (channel) channel.close();
      clearInterval(pollTimer);
    };
  }, [syncKey, deviceId]);

  // Auto-dismiss sync notification after 5s
  useEffect(() => {
    if (syncNotification) {
      const t = setTimeout(() => setSyncNotification(null), 5000);
      return () => clearTimeout(t);
    }
  }, [syncNotification]);

  // Journal Filters State

  const [filterType, setFilterType] = useState<'all' | 'Encaissement' | 'Décaissement'>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal: New Cash Movement
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newType, setNewType] = useState<'Encaissement' | 'Décaissement'>('Encaissement');
  const [newTierType, setNewTierType] = useState<'Client' | 'Fournisseur' | 'Autre'>('Client');
  const [newTierId, setNewTierId] = useState('');
  const [newMontant, setNewMontant] = useState<number>(0);
  const [newMode, setNewMode] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Espèces');
  const [newBanque, setNewBanque] = useState('Caisse Centrale');
  const [newRef, setNewRef] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const isGlobal = selectedProjectId === '1' || selectedProjectId === 'all';
  const currentProject = selectedProjectId === 'all' ? null : projets.find(p => p.id === selectedProjectId);
  const isCentralUgs = selectedProjectId === '1' || currentProject?.codeBoutique === 'ERP Management-CENTRALE' || (currentProject?.nom ? currentProject.nom.toLowerCase().includes('stock central') : false);

  const retailBoutiques = useMemo(() => {
    return projets.filter(p => p.id !== '1' && p.codeBoutique !== 'ERP Management-CENTRALE' && !p.nom.toLowerCase().includes('stock central'));
  }, [projets]);

  // Scoped Data
  const scopedReglements = useMemo(() => {
    return isGlobal ? reglements : reglements.filter(r => r.projetId === selectedProjectId);
  }, [reglements, isGlobal, selectedProjectId]);

  const scopedClients = useMemo(() => isGlobal ? clients : clients.filter(c => c.projetId === selectedProjectId), [clients, isGlobal, selectedProjectId]);
  const scopedFournisseurs = useMemo(() => isGlobal ? fournisseurs : fournisseurs.filter(f => f.projetId === selectedProjectId), [fournisseurs, isGlobal, selectedProjectId]);

  const scopedArticles = useMemo(() => {
    const list = isGlobal ? articles : articles.filter(a => a.projetId === selectedProjectId);
    return list.filter(a => a.statut !== 'Inactif');
  }, [articles, isGlobal, selectedProjectId]);

  const getDefaultCart = (): CartItem[] => {
    return [];
  };

  useEffect(() => {
    setCart([]);
  }, [selectedProjectId]); // Reset cart to empty when project changes

  const handleCancelPosSale = () => {
    setCart([]);
    setPosClientId('');
    setPosPaymentMode('Espèces');
    setPosSuccessMsg(null);
    broadcastCartUpdate([], '', 'Espèces', 'clear');
  };

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    scopedArticles.forEach(a => {
      if (a.famille) set.add(a.famille);
      if (a.categorie) set.add(a.categorie);
    });
    return Array.from(set);
  }, [scopedArticles]);

  // POS Filtered Articles
  const articleSalesCount = useMemo(() => {
    const counts: Record<string, number> = {};
    ventes.forEach(vente => {
      // Consider all sales for the frequency
      vente.lignes?.forEach(ligne => {
        if (ligne.articleId) {
          counts[ligne.articleId] = (counts[ligne.articleId] || 0) + ligne.quantite;
        }
      });
    });
    return counts;
  }, [ventes]);

  const filteredPosArticles = useMemo(() => {
    const result = scopedArticles.filter(a => {
      const q = posSearchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        a.designation.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        (a.codeBarres && a.codeBarres.some(cb => cb.toLowerCase().includes(q))) ||
        (a.famille && a.famille.toLowerCase().includes(q));

      const matchesCat = posCategoryFilter === 'all' || a.famille === posCategoryFilter || a.categorie === posCategoryFilter;
      const matchesType = posTypeFilter === 'all' || (a.typeArticle || 'Produit') === posTypeFilter;
      return matchesSearch && matchesCat && matchesType;
    });

    result.sort((a, b) => {
      if (posSortBy === 'most_sold') {
        const countA = articleSalesCount[a.id] || 0;
        const countB = articleSalesCount[b.id] || 0;
        if (countA !== countB) return countB - countA;
        return a.designation.localeCompare(b.designation);
      }
      if (posSortBy === 'name_asc') return a.designation.localeCompare(b.designation);
      if (posSortBy === 'price_asc') return (a.prixVenteHT || 0) - (b.prixVenteHT || 0);
      if (posSortBy === 'price_desc') return (b.prixVenteHT || 0) - (a.prixVenteHT || 0);
      return 0;
    });

    return result;
  }, [scopedArticles, posSearchTerm, posCategoryFilter, posTypeFilter, posSortBy, articleSalesCount]);

  // POS Cart Calculations (TVA et timbre fiscal retirés du panier conformément aux consignes)
  const cartTotalNet = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantite * (item.prixVenteHT || 0)), 0);
  }, [cart]);

  const cartTotalHT = cartTotalNet;
  const posTimbreFiscal = 0;
  const cartTotalTTC = cartTotalNet;

  // Add Article to POS Cart (BF-PROD-019)
  const handleAddToCart = (article: Article, initialQty: number = 1) => {
    setCart(prev => {
      let updated: CartItem[];
      const existingIndex = prev.findIndex(item => item.article.id === article.id);
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantite: updated[existingIndex].quantite + initialQty
        };
      } else {
        updated = [...prev, { article, quantite: initialQty, prixVenteHT: article.prixVenteHT || 0 }];
      }
      broadcastCartUpdate(updated, undefined, undefined, 'add_item', article.designation);
      return updated;
    });
  };

  const handleUpdateCartQty = (articleId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(item => {
        if (item.article.id === articleId) {
          const newQ = item.quantite + delta;
          return newQ > 0 ? { ...item, quantite: newQ } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
      broadcastCartUpdate(updated, undefined, undefined, 'update_qty');
      return updated;
    });
  };

  const handleSetCartQty = (articleId: string, exactQty: number) => {
    setCart(prev => {
      let updated: CartItem[];
      if (exactQty <= 0) {
        updated = prev.filter(item => item.article.id !== articleId);
      } else {
        updated = prev.map(item => item.article.id === articleId ? { ...item, quantite: exactQty } : item);
      }
      broadcastCartUpdate(updated, undefined, undefined, 'set_qty');
      return updated;
    });
  };

  const handleUpdateCartPrice = (articleId: string, newPrice: number) => {
    setCart(prev => {
      const updated = prev.map(item => item.article.id === articleId ? { ...item, prixVenteHT: newPrice } : item);
      broadcastCartUpdate(updated, undefined, undefined, 'update_price');
      return updated;
    });
  };

  const handleRemoveFromCart = (articleId: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.article.id !== articleId);
      broadcastCartUpdate(updated, undefined, undefined, 'remove_item');
      return updated;
    });
  };


  // Process Scanner Barcode / QR Code Pipeline
  // Flow: SCAN -> Code-barres -> Recherche produit -> Produit identifié -> Vérification disponibilité -> Ajout panier
  const handleProcessScan = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    // 1. SCAN & 2. Code-barres
    // 3. Recherche produit in scopedArticles or global articles
    let found = scopedArticles.find(a => 
      (a.codeBarres && a.codeBarres.some(cb => cb.trim() === code)) ||
      a.code.trim().toLowerCase() === code.toLowerCase() ||
      a.id.trim().toLowerCase() === code.toLowerCase() ||
      (a.referenceInterne && a.referenceInterne.trim().toLowerCase() === code.toLowerCase())
    );

    // Fallback search in all articles
    if (!found) {
      found = articles.find(a => 
        (a.codeBarres && a.codeBarres.some(cb => cb.trim() === code)) ||
        a.code.trim().toLowerCase() === code.toLowerCase()
      );
    }

    // 4. Produit identifié
    if (!found) {
      playBeep('error');
      setScannerFeedback({
        type: 'error',
        message: `❌ Produit non identifié pour le code [${code}]. Aucun produit correspondant trouvé dans le catalogue.`
      });
      setScannerInput('');
      return;
    }

    // 5. Vérification disponibilité
    const currentBoutiqueNom = currentProject?.nom || 'Global';
    const storeId = selectedProjectId === 'all' ? 'p1' : selectedProjectId;
    const availableStock = getArticleStock(found, storeId);

    if (found.statut === 'Inactif') {
      playBeep('error');
      setScannerFeedback({
        type: 'warning',
        message: `Produit inactif ! Le produit "${found.designation}" (${found.code}) est actuellement désactivé.`,
        article: found
      });
      setScannerInput('');
      return;
    }

    if (found.typeArticle !== 'Service') {
      if (availableStock <= 0) {
        playBeep('error');
        setScannerFeedback({
          type: 'warning',
          message: `Stock épuisé ! Le produit "${found.designation}" (Prix: ${found.prixVenteHT} DT) est actuellement indisponible dans ${currentBoutiqueNom} (Stock : 0).`,
          article: found
        });
        setScannerInput('');
        return;
      }

      // Check availability against items already in cart
      const cartMatch = cart.find(ci => ci.article.id === found.id);
      const qtyInCart = cartMatch ? cartMatch.quantite : 0;
      if (qtyInCart + 1 > availableStock) {
        playBeep('error');
        setScannerFeedback({
          type: 'warning',
          message: `Stock insuffisant ! Seules ${availableStock} unités de "${found.designation}" sont disponibles en stock dans ${currentBoutiqueNom} (${qtyInCart} déjà dans le panier).`,
          article: found
        });
        setScannerInput('');
        return;
      }
    }

    // 6. Ajout automatique panier
    handleAddToCart(found, 1);
    playBeep('success');
    setScannerFeedback({
      type: 'success',
      message: `⚡ SCAN RÉUSSI [${code}] ➔ "${found.designation}" (Prix: ${found.prixVenteHT.toFixed(3)} DT | Stock: ${found.stock}) AJOUTÉ AUTOMATIQUEMENT AU PANIER !`,
      article: found
    });
    setScannerInput('');
  };

  // Submit POS Sale & Generate Payment
  const handleCheckoutPosSale = () => {
    if (cart.length === 0) return;

    let targetClient = scopedClients.find(c => c.id === posClientId);
    if (!targetClient) {
      targetClient = scopedClients[0] || {
        id: `c-passage-${Date.now()}`,
        projetId: selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId,
        code: 'CLI-PASSAGE',
        nom: 'Client de Passage (Caisse)',
        email: '',
        telephone: '',
        adresse: 'Au comptoir',
        ville: 'Tunis',
        plafondCredit: 0,
        soldeInitial: 0
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const saleNum = generateNextDocNumber('FAC', ventes.map(v => v.numero), today);

    const lignes: LigneVente[] = cart.map((item, idx) => {
      const pu = item.prixVenteHT || 0;
      const totalLigne = item.quantite * pu;
      return {
        id: `l-${Date.now()}-${idx}`,
        articleId: item.article.id,
        designation: item.article.designation,
        quantite: item.quantite,
        prixUnitaireHT: pu,
        tauxTVA: 0,
        remisePourcentage: 0,
        totalHT: totalLigne,
        totalTTC: totalLigne
      };
    });

    const newSale: Vente = {
      id: `v-${Date.now()}`,
      numero: saleNum,
      projetId: selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId,
      clientId: targetClient.id,
      clientNom: targetClient.nom,
      auteurId: currentUser.id,
      auteurNom: currentUser.nom,
      date: today,
      dateEcheance: today,
      montantHT: cartTotalNet,
      montantTTC: cartTotalNet,
      montantPaye: cartTotalNet,
      statut: 'Payée',
      modePaiement: posPaymentMode,
      timbreFiscal: 0,
      lignes,
      notes: 'Vente directe au comptoir (Panier Caisse)'
    };

    if (onVentesChange) {
      onVentesChange([newSale, ...ventes]);
    }

    // Generate Reglement Encaissement
    const numeroPiece = generateNextDocNumber('ENC', reglements.map(r => r.numeroPiece), today);
    const newReg: Reglement = {
      id: `reg-${Date.now()}`,
      projetId: newSale.projetId,
      numeroPiece,
      type: 'Encaissement',
      tierId: targetClient.id,
      tierNom: targetClient.nom,
      tierType: 'Client',
      documentRef: saleNum,
      date: today,
      montant: cartTotalTTC,
      modePaiement: posPaymentMode,
      banque: 'Caisse Centrale',
      referencePaiement: `Caisse Directe (${posPaymentMode})`,
      notes: `Encaissement ticket caisse ${saleNum}`,
      statut: 'Validé'
    };

    onReglementsChange([newReg, ...reglements]);

    // Update Article Stocks & Automatically Register Stock Movements
    const currentBoutiqueNom = currentProject?.nom || 'Global';
    const storeId = selectedProjectId === 'all' ? 'p1' : selectedProjectId;
    const newStockMouvements: MouvementStock[] = [];

    if (onArticlesChange) {
      const updatedArticles = articles.map(art => {
        const cartMatch = cart.find(ci => ci.article.id === art.id);
        if (cartMatch && art.typeArticle !== 'Service') {
          const stockAvant = getArticleStock(art, storeId);
          const updatedArt = updateArticleStock(art, storeId, -cartMatch.quantite);
          const stockApres = getArticleStock(updatedArt, storeId);

          const mvt = createGuaranteedStockMovement({
            article: art,
            projetId: storeId,
            projetNom: currentBoutiqueNom,
            type: 'VENTE',
            quantite: cartMatch.quantite,
            quantiteAvant: stockAvant,
            quantiteApres: stockApres,
            motif: `Vente caisse (Ticket ${saleNum})`,
            currentUser,
            referencePiece: saleNum
          });
          newStockMouvements.push(mvt);

          return updatedArt;
        }
        return art;
      });
      onArticlesChange(updatedArticles);
    }

    if (onMouvementsChange && newStockMouvements.length > 0) {
      onMouvementsChange([...newStockMouvements, ...mouvements]);
    }

    // Log the sale
    logAction(`Vente ${saleNum}`, 'Vente', cartTotalTTC, `Vente à ${targetClient.nom}`);
    
    setPosSuccessMsg(
      `Vente ${saleNum} validée (${cartTotalTTC.toFixed(3)} DT) ! Mouvements de stock enregistrés.`
    );
    setCart([]);
    setTimeout(() => setPosSuccessMsg(null), 5000);
  };

  // Retours Scoped List & Sales
  const scopedRetours = useMemo(() => {
    return retours.filter(r => selectedProjectId === 'all' || r.projetId === selectedProjectId);
  }, [retours, selectedProjectId]);

  const posAvailableSales = useMemo(() => {
    return ventes.filter(v => {
      if (selectedProjectId !== 'all' && v.projetId && v.projetId !== selectedProjectId) return false;
      if (posReturnTicketSearch) {
        const q = posReturnTicketSearch.toLowerCase();
        return (
          v.numero.toLowerCase().includes(q) ||
          (v.clientNom && v.clientNom.toLowerCase().includes(q))
        );
      }
      return true;
    }).slice(0, 30);
  }, [ventes, selectedProjectId, posReturnTicketSearch]);

  const handlePosSelectSale = (sale: Vente) => {
    setPosReturnSelectedSaleId(sale.id);
    setPosReturnClientId(sale.clientId);
    if (sale.lignes && sale.lignes.length > 0) {
      setPosReturnLines(sale.lignes.map(l => ({
        articleId: l.articleId,
        articleCode: l.code || '',
        designation: l.designation,
        quantiteVendue: l.quantite,
        quantiteRetournee: 0,
        prixUnitaire: l.prixUnitaireHT || (l.totalTTC / (l.quantite || 1)),
        motif: 'Changement d\'avis',
        remettreEnStock: true
      })));
    } else {
      setPosReturnLines([]);
    }
  };

  const handlePosSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const activeLines = posReturnLines.filter(l => l.quantiteRetournee > 0);
    if (activeLines.length === 0) {
      alert('Veuillez sélectionner au moins un article avec une quantité supérieure à 0.');
      return;
    }

    const calculatedTotal = activeLines.reduce((acc, l) => acc + (l.quantiteRetournee * l.prixUnitaire), 0);
    const targetClient = clients.find(c => c.id === posReturnClientId) || { id: 'c-walkin', nom: 'Client Comptoir' };
    const storeId = selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId;
    const storeNom = currentProject?.nom || 'Boutique';
    const now = new Date();
    const dateFormatted = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const returnNumber = `RET-${now.getFullYear()}-${(retours.length + 1).toString().padStart(4, '0')}`;
    const codeAvoir = posReturnRefundMode === 'Avoir' ? `AVR-${now.getFullYear()}-${(retours.filter(r => r.codeAvoir).length + 1).toString().padStart(4, '0')}` : undefined;

    const sourceSale = ventes.find(v => v.id === posReturnSelectedSaleId);

    // Stock updates & movements
    const newStockMovements: MouvementStock[] = [];
    if (onArticlesChange) {
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
              motif: `Retour caisse (${returnNumber}) - ${line.motif}`,
              currentUser,
              referencePiece: returnNumber
            });
            newStockMovements.push(mvt);
          }
        }
      });
      onArticlesChange(updatedArticlesList);
      if (onMouvementsChange && newStockMovements.length > 0) {
        onMouvementsChange([...newStockMovements, ...mouvements]);
      }
    }

    // Décaissement for cash refund
    let newRegId: string | undefined = undefined;
    if (posReturnRefundMode === 'Espèces' && calculatedTotal > 0) {
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
        notes: `Remboursement immédiat comptoir suite au retour de vente ${sourceSale ? sourceSale.numero : 'direct'}`,
        statut: 'Validé'
      };
      onReglementsChange([decaissementReg, ...reglements]);
    }

    // Log in register action logs
    logAction(`Retour ${returnNumber}`, 'Ajustement', calculatedTotal, `Remboursement (${posReturnRefundMode})`);

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
      type: posReturnType === 'ticket' ? 'Vente Caisse' : 'Retour Libre',
      venteId: sourceSale?.id,
      venteNumero: sourceSale?.numero,
      clientId: targetClient.id,
      clientNom: targetClient.nom,
      projetId: storeId,
      projetNom: storeNom,
      date: dateFormatted,
      lignes: linesPayload,
      montantTotal: calculatedTotal,
      modeRemboursement: posReturnRefundMode,
      codeAvoir,
      statut: 'Validé',
      motifGeneral: posReturnMotif,
      auteurId: currentUser.id,
      auteurNom: currentUser.nom,
      reglementId: newRegId,
      mouvementStockIds: newStockMovements.map(m => m.id)
    };

    if (onRetoursChange) {
      onRetoursChange([newReturn, ...retours]);
    }

    setIsPosReturnModalOpen(false);
    setPosSuccessMsg(`Retour ${returnNumber} validé avec succès (${calculatedTotal.toFixed(3)} DT) ! Stock réintégré.`);
  };

  // Journal Filtered List
  const filteredReglements = useMemo(() => {
    return scopedReglements.filter(r => {
      const matchesSearch = r.numeroPiece.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.tierNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (r.documentRef && r.documentRef.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || r.type === filterType;
      const matchesMode = filterMode === 'all' || r.modePaiement === filterMode;
      return matchesSearch && matchesType && matchesMode;
    });
  }, [scopedReglements, searchTerm, filterType, filterMode]);

  // Financial Totals
  const totalEncaissements = scopedReglements.filter(r => r.type === 'Encaissement').reduce((a, r) => a + r.montant, 0);
  const totalDecaissements = scopedReglements.filter(r => r.type === 'Décaissement').reduce((a, r) => a + r.montant, 0);
  const soldeNetCaisse = totalEncaissements - totalDecaissements;

  // Open Create Movement Modal
  const handleOpenCreate = () => {
    setNewType('Encaissement');
    setNewTierType('Client');
    setNewTierId(scopedClients[0]?.id || '');
    setNewMontant(0);
    setNewMode('Espèces');
    setNewBanque('Caisse Centrale');
    setNewRef(`PC-${Date.now().toString().slice(-4)}`);
    setNewNotes('Opération de trésorerie courante');
    setIsModalOpen(true);
  };

  // Submit Create Movement
  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMontant <= 0) return;

    let tierNom = 'Divers';
    if (newTierType === 'Client') {
      const c = scopedClients.find(cli => cli.id === newTierId);
      if (c) tierNom = c.nom;
    } else if (newTierType === 'Fournisseur') {
      const f = scopedFournisseurs.find(fou => fou.id === newTierId);
      if (f) tierNom = f.nom;
    }

    const year = new Date().getFullYear();
    const count = reglements.length + 1;
    const prefix = newType === 'Encaissement' ? 'ENC' : 'DEC';
    const numeroPiece = `${prefix}-${year}-${count.toString().padStart(4, '0')}`;

    const newReg: Reglement = {
      id: `reg-${Date.now()}`,
      projetId: isGlobal ? (projets[0]?.id || 'p1') : selectedProjectId,
      numeroPiece,
      type: newType,
      tierId: newTierId,
      tierNom,
      tierType: newTierType,
      date: new Date().toISOString().split('T')[0],
      montant: newMontant,
      modePaiement: newMode,
      banque: newBanque,
      referencePaiement: newRef,
      notes: newNotes,
      statut: 'Validé'
    };

    onReglementsChange([newReg, ...reglements]);
    setIsModalOpen(false);
  };

  if (isCentralUgs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 sm:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-2xl border-4 border-white shrink-0">
          <span className="material-symbols-outlined text-[48px]">warehouse</span>
        </div>

        <div className="text-center space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            ERP Management • Société UGS
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pas de Vente Directe à la Société UGS</h1>
          
        </div>

        {/* Option to select a retail boutique POS */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-purple-600 text-[24px]">storefront</span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Boutiques & Points de Vente</h3>
                
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {retailBoutiques.map(boutique => (
              <div 
                key={boutique.id} 
                className="p-5 bg-slate-50 hover:bg-purple-50/60 border-2 border-slate-200 hover:border-purple-300 rounded-xl transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-extrabold text-[10px] rounded-md uppercase tracking-wider">
                      {boutique.codeBoutique}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-purple-900 transition-colors">{boutique.nom}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{boutique.adresse}, {boutique.ville}</p>
                </div>

                <button
                  onClick={() => onSelectProject && onSelectProject(boutique.id)}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                  Ouvrir Caisse {boutique.nom}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeSession && selectedProjectId !== 'all' && !isComptable) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-xl border-4 border-white">
          <span className="material-symbols-outlined text-[48px]">point_of_sale</span>
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Ouverture de Session de Caisse</h1>
          <p className="text-slate-500 max-w-md">
            Pour commencer à effectuer des ventes, vous devez ouvrir une nouvelle session et déclarer votre fond de caisse initial (valeur d'ouverture).
          </p>
        </div>

        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">Utilisateur</label>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {currentUser.nom.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-800 text-xs truncate">{currentUser.nom}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">Boutique</label>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="material-symbols-outlined text-indigo-500 text-[16px]">store</span>
                  <span className="font-bold text-slate-800 text-xs truncate">{currentProject?.nom || 'Projet'}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Fond de Caisse Initial (DT)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-2xl font-bold text-slate-900 focus:outline-none focus:border-purple-600 transition-all text-center"
                  placeholder="0.000"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">DT</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center font-medium italic">
                Saisissez le montant en espèces présent dans le tiroir-caisse à l'ouverture.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenSession}
            className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-3 group"
          >
            <span className="material-symbols-outlined text-[24px] group-hover:rotate-12 transition-transform">key</span>
            OUVRIR LA CAISSE
          </button>
        </div>

        {selectedProjectId === 'all' && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-xs font-bold max-w-sm text-center">
            Veuillez sélectionner une boutique spécifique pour ouvrir une session de caisse.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Main Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                {isComptable ? 'verified_user' : 'point_of_sale'}
              </span>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                {isComptable ? 'Audit des Caisses & Contrôle Financier' : 'Caisse & Ventes'}
              </h1>
              {isComptable ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-purple-200">
                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                    Mode Audit & Contrôle (Lecture Seule)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Consultation des sessions, clôtures (Tickets Z) et flux de trésorerie
                  </span>
                </div>
              ) : activeSession ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Caisse Ouverte
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    depuis {new Date(activeSession.dateOuverture).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">Terminal de point de vente et gestion des sessions de caisse</p>
              )}
            </div>
          </div>
        </div>

        {/* Header action toolbar removed as requested */}
      </div>

      {/* Session Opening / Guard */}
      {!activeSession && activeTab === 'pos' && !isComptable && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                <span className="material-symbols-outlined text-4xl">lock_open</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Ouverture de Session</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Veuillez déclarer votre fonds de caisse initial pour commencer à travailler.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 font-bold group-focus-within:scale-110 transition-transform">
                    payments
                  </span>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Montant initial (DT)..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-xl font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-center"
                    value={openingBalance || ''}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <button
                  onClick={handleOpenSession}
                  disabled={selectedProjectId === 'all'}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  Démarrer la Session
                </button>
                
                {selectedProjectId === 'all' && (
                  <p className="text-[10px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                    ⚠ Veuillez sélectionner une boutique spécifique avant d'ouvrir la caisse.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS TERMINAL TAB */}
      {activeTab === 'pos' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Bandeau d'état et calculs automatiques de la session de caisse en temps réel */}
          {activeSession && (
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-2xl p-4 text-white shadow-xl border border-purple-900/40">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <span className="material-symbols-outlined text-2xl">point_of_sale</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Caisse Ouverte
                      </span>
                      <span className="text-[11px] text-slate-400">• Session #{activeSession.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      Caissier : <span className="font-bold text-white">{currentUser.nom}</span> • Début : <span className="font-mono text-purple-300">{new Date(activeSession.dateOuverture).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>

                {/* KPIs en temps réel calculés automatiquement */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 flex-1 sm:flex-initial">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Fond Initial</p>
                    <p className="text-xs sm:text-sm font-bold font-mono text-amber-300">{activeSession.soldeInitial.toFixed(3)} DT</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 flex-1 sm:flex-initial">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Ventes Espèces</p>
                    <p className="text-xs sm:text-sm font-bold font-mono text-emerald-400">+{totalVentesEspeces.toFixed(3)} DT</p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl px-3.5 py-2 border border-purple-400/40 shadow-md flex-1 sm:flex-initial">
                    <p className="text-[10px] uppercase font-black tracking-wider text-purple-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">lock</span>
                      Total Tiroir (Auto)
                    </p>
                    <p className="text-sm sm:text-base font-black font-mono text-white">{soldeFinalCalcule.toFixed(3)} DT</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsClosingModalOpen(true)}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[17px]">lock</span>
                    <span>Clôturer Caisse</span>
                  </button>

                </div>
              </div>
            </div>
          )}

          {/* Toast Notification Sync Smartphone */}
          {syncNotification && (
            <div className="p-3.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white font-extrabold text-xs rounded-xl shadow-xl flex items-center justify-between animate-in slide-in-from-top duration-300 border border-purple-400/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
                  <span className="material-symbols-outlined text-[20px] animate-bounce">
                    {syncNotification.sourceDevice === 'smartphone' ? 'phone_iphone' : 'desktop_windows'}
                  </span>
                </div>
                <div>
                  <p className="font-black text-amber-300 text-[11px] uppercase tracking-wide">
                    ⚡ Synchronisation en direct
                  </p>
                  <p className="text-xs font-bold text-white mt-0.5">{syncNotification.message}</p>
                </div>
              </div>
              <button
                onClick={() => setSyncNotification(null)}
                className="p-1 text-purple-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {/* Scanner Console Control Panel */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessScan(scannerInput);
                }}
                className="flex-1 flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 text-[20px]">
                    barcode_reader
                  </span>
                  <input
                    id="scanner-input"
                    type="text"
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    placeholder="Entrez ou scannez un code-barres / QR Code (ex: 6191234567890)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all font-mono shadow-inner"
                  />
                </div>
              </form>

              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md shadow-purple-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 border border-purple-400/40 active:scale-95"
                title="Scanner par caméra smartphone en continu sans fatigue"
              >
                <span className="material-symbols-outlined text-[19px]">photo_camera</span>
                <span>Scanner Caméra (Scan Rapide ⚡)</span>
              </button>
            </div>
          </div>


          {/* Scanner Feedback Notification Toast */}
          {scannerFeedback && (
            <div className={`p-4 rounded-xl font-extrabold text-xs shadow-lg flex items-center justify-between animate-in zoom-in-95 border ${
              scannerFeedback.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-400'
                : scannerFeedback.type === 'warning'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-rose-600 text-white border-rose-500'
            }`}>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[24px] shrink-0">
                  {scannerFeedback.type === 'success' ? 'check_circle' : scannerFeedback.type === 'warning' ? 'warning' : 'cancel'}
                </span>
                <div>
                  <p className="leading-relaxed font-bold">{scannerFeedback.message}</p>
                  {scannerFeedback.article && (
                    <div className="mt-1 flex items-center gap-3 text-[11px] opacity-90 font-mono">
                      <span>Article : {scannerFeedback.article.designation}</span>
                      <span>• Prix : {scannerFeedback.article.prixVenteHT} DT</span>
                      <span>• Stock : {scannerFeedback.article.stock} unités</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setScannerFeedback(null)}
                className="p-1 hover:bg-black/10 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {posSuccessMsg && (
            <div className="p-4 bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-between animate-in zoom-in-95">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                {posSuccessMsg}
              </span>
              <button onClick={() => setPosSuccessMsg(null)} className="text-emerald-100 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}

          {/* Mobile Segmented Switcher (Catalogue vs Panier) */}
          <div className="lg:hidden flex items-center p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setPosMobileTab('catalog')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                posMobileTab === 'catalog'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              <span>Catalogue ({filteredPosArticles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setPosMobileTab('cart')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                posMobileTab === 'cart'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
              <span>Panier</span>
              {cart.length > 0 && (
                <span className={`ml-1 text-[11px] font-mono font-bold ${posMobileTab === 'cart' ? 'text-amber-300' : 'text-purple-700'}`}>
                  ({cart.reduce((s, i) => s + i.quantite, 0)}) • {cartTotalTTC.toFixed(2)} DT
                </span>
              )}
            </button>
          </div>

          {/* Main Grid: Products vs Ticket Panier */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Product Search & Catalog (7 cols) */}
            <div className={`lg:col-span-7 space-y-4 ${posMobileTab === 'cart' ? 'hidden lg:block' : 'block'}`}>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={posSearchTerm}
                    onChange={(e) => setPosSearchTerm(e.target.value)}
                    placeholder="Rechercher un article (nom, référence, code-barres)..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all shadow-2xs"
                  />
                  {posSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setPosSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                    </button>
                  )}
                </div>

                {/* Filters & Sort Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Category Filter Pills */}
                  <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setPosCategoryFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                        posCategoryFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tous les articles ({scopedArticles.length})
                    </button>
                    {categoriesList.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPosCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                          posCategoryFilter === cat
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={posTypeFilter}
                      onChange={(e) => setPosTypeFilter(e.target.value as any)}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value="all">Tous types</option>
                      <option value="Produit">Produits physiques</option>
                      <option value="Service">Services & Prestations</option>
                    </select>

                    <select
                      value={posSortBy}
                      onChange={(e) => setPosSortBy(e.target.value as any)}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value="most_sold">Les plus vendus 🔥</option>
                      <option value="name_asc">De A à Z</option>
                      <option value="price_asc">Prix croissant</option>
                      <option value="price_desc">Prix décroissant</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Services Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  Ajout Rapide :
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const moArticle = scopedArticles.find(a => a.id === 'mo-install' || a.designation.toLowerCase().includes('main d\'œuvre'));
                    if (moArticle) {
                      setCart(prev => {
                        const exists = prev.find(i => i.article.id === moArticle.id);
                        if (exists) return prev.map(i => i.article.id === moArticle.id ? { ...i, quantite: i.quantite + 1 } : i);
                        return [...prev, { article: moArticle, quantite: 1, prixVenteHT: moArticle.prixVenteHT }];
                      });
                    } else {
                      const tempMO: Article = {
                        id: 'mo-temp',
                        designation: 'Main d\'œuvre Standard',
                        code: 'SRV-MO',
                        typeArticle: 'Service',
                        famille: 'Services',
                        prixVenteHT: 15.000,
                        prixAchatHT: 0,
                        stock: 999,
                        stocks: {},
                        projetId: selectedProjectId,
                        statut: 'Actif',
                        tva: 19
                      };
                      setCart(prev => {
                        const exists = prev.find(i => i.article.id === tempMO.id);
                        if (exists) return prev.map(i => i.article.id === tempMO.id ? { ...i, quantite: i.quantite + 1 } : i);
                        return [...prev, { article: tempMO, quantite: 1, prixVenteHT: tempMO.prixVenteHT }];
                      });
                    }
                  }}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-[11px] font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">build</span>
                  Main d'œuvre (15 DT)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const srvLivraison: Article = {
                      id: 'srv-livraison',
                      designation: 'Service Livraison',
                      code: 'SRV-LIV',
                      typeArticle: 'Service',
                      famille: 'Services',
                      prixVenteHT: 7.000,
                      prixAchatHT: 0,
                      stock: 999,
                      stocks: {},
                      projetId: selectedProjectId,
                      statut: 'Actif',
                      tva: 19
                    };
                    setCart(prev => {
                      const exists = prev.find(i => i.article.id === srvLivraison.id);
                      if (exists) return prev.map(i => i.article.id === srvLivraison.id ? { ...i, quantite: i.quantite + 1 } : i);
                      return [...prev, { article: srvLivraison, quantite: 1, prixVenteHT: srvLivraison.prixVenteHT }];
                    });
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                  Livraison (7 DT)
                </button>
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredPosArticles.map(article => {
                  const inCart = cart.find(ci => ci.article.id === article.id);
                  const price = article.prixVenteHT || 0;

                  return (
                    <div
                      key={article.id}
                      onClick={() => handleAddToCart(article, 1)}
                      className={`p-4 bg-white rounded-xl border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md ${
                        inCart ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20' : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      {inCart && (
                        <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">shopping_cart</span>
                          In Cart ({inCart.quantite})
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 group-hover:bg-purple-100 group-hover:text-purple-700 transition-colors">
                          <span className="material-symbols-outlined text-[24px]">inventory_2</span>
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                            {article.code}
                          </span>
                          <h4 className="text-xs font-extrabold text-slate-900 truncate group-hover:text-purple-700 transition-colors">
                            {article.designation}
                          </h4>
                          <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {article.famille || 'Général'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Prix Unitaire</span>
                          <span className="text-base font-bold text-slate-900">
                            {price.toFixed(3)} <span className="text-xs font-bold text-slate-500">DT</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(article, 1);
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Ajouter
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredPosArticles.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
                    <span className="material-symbols-outlined text-slate-300 text-[48px]">search_off</span>
                    <p className="text-xs font-bold text-slate-500 mt-2">Aucun produit trouvé dans le catalogue.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Ticket Panier & Total (5 cols) */}
            <div className={`lg:col-span-5 space-y-4 ${posMobileTab === 'catalog' ? 'hidden lg:block' : 'block'}`}>
              {/* Mobile Back Button to Catalog */}
              <button
                type="button"
                onClick={() => setPosMobileTab('catalog')}
                className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-xl transition-colors cursor-pointer w-fit mb-1"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Continuer les achats (Catalogue)
              </button>

              <div className="bg-white rounded-xl border border-slate-200/90 shadow-md overflow-hidden flex flex-col h-full">
                {/* Ticket Header */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-[20px]">shopping_bag</span>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">Panier de Caisse</h3>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-[11px] text-rose-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-rose-500/20 hover:bg-rose-500/30 px-2 py-1 rounded-lg transition-colors"
                      title="Supprimer tous les articles du panier"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                      Supprimer tous
                    </button>
                  )}
                </div>

                {/* Client Selector */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Client Facturé :</label>
                  <select
                    value={posClientId}
                    onChange={(e) => setPosClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="">Client de passage (sans compte)</option>
                    {scopedClients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom} ({c.code})</option>
                    ))}
                  </select>
                </div>

                {/* Cart Items List */}
                <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto divide-y divide-slate-100 flex-1">
                  {cart.map(item => {
                    const pu = item.prixVenteHT || 0;
                    const subtotal = item.quantite * pu;

                    return (
                      <div key={item.article.id} className="pt-3 first:pt-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-extrabold text-slate-900 leading-tight">
                              {item.article.designation}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.article.code}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                item.article.typeArticle === 'Service'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {item.article.typeArticle || 'Produit'}
                              </span>
                            </div>

                            {/* Accès caissier pour modifier le montant unitaire de chaque produit ou service */}
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px] text-purple-600">edit</span>
                                P.U :
                              </span>
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={item.prixVenteHT}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    handleUpdateCartPrice(item.article.id, isNaN(val) ? 0 : val);
                                  }}
                                  className="w-20 text-xs font-bold px-2 py-0.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 text-purple-900 font-mono"
                                  title="Modifier le montant de ce produit ou service"
                                />
                                <span className="ml-1 text-[10px] font-bold text-slate-600 font-mono">DT</span>
                              </div>
                              {item.article.prixVenteHT !== undefined && item.prixVenteHT !== item.article.prixVenteHT && (
                                <span className="text-[9px] text-slate-400 italic">
                                  (Base: {item.article.prixVenteHT.toFixed(3)} DT)
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.article.id)}
                            className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>

                        {/* Quantity Controls & Subtotal (BF-PROD-019) */}
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                          {/* Qté buttons */}
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.article.id, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantite}
                              onChange={(e) => handleSetCartQty(item.article.id, parseInt(e.target.value) || 1)}
                              className="w-10 text-center text-xs font-extrabold text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.article.id, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          {/* Subtotal calculation */}
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Sous-total</span>
                            <span className="text-xs font-bold text-purple-700">
                              {subtotal.toFixed(3)} DT
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {cart.length === 0 && (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <span className="material-symbols-outlined text-[36px] text-slate-300">add_shopping_cart</span>
                      <p className="text-xs font-bold">Le panier est vide.</p>
                      <p className="text-[11px]">Cliquez sur un article à gauche pour l'ajouter.</p>
                    </div>
                  )}
                </div>

                {/* Total Calculation Footer (TVA & Timbre fiscal retirés) */}
                <div className="p-4 bg-slate-900 text-white space-y-3 border-t border-slate-800">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400 font-bold">
                      <span>Total ({cart.reduce((s, i) => s + i.quantite, 0)} articles) :</span>
                      <span className="text-white font-mono">{cartTotalNet.toFixed(3)} DT</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400 font-medium py-0.5">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>Sans TVA • Sans Timbre Fiscal</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-emerald-400 pt-2 border-t border-slate-800">
                      <span>TOTAL À PAYER :</span>
                      <span>{cartTotalNet.toFixed(3)} DT</span>
                    </div>
                  </div>

                  {/* Payment Mode Selector - Hidden for School shop to simplify */}
                  {selectedProjectId !== '2' && (
                    <div className="space-y-1 pt-2 border-t border-slate-800">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Moyen de Paiement :</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['Espèces', 'Chèque', 'Virement', 'Traite'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPosPaymentMode(mode)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                              posPaymentMode === mode
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProjectId === '2' && (
                    <div className="pt-2 border-t border-slate-800">
                      <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        Paiement : Espèces
                      </p>
                    </div>
                  )}

                  {/* Complete Checkout Button */}
                  <button
                    type="button"
                    disabled={cart.length === 0}
                    onClick={handleCheckoutPosSale}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 border-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border disabled:border-slate-800"
                  >
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                    <span>Encaisser ({cartTotalNet.toFixed(3)} DT)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Floating Cart Peek Bar */}
          {posMobileTab === 'catalog' && cart.length > 0 && (
            <div className="lg:hidden fixed bottom-14 left-3 right-3 z-30 bg-slate-950/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-800 flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {cart.reduce((s, i) => s + i.quantite, 0)}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Panier</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">{cartTotalNet.toFixed(3)} DT</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPosMobileTab('cart')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Encaisser</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* JOURNAL TAB */}
      {activeTab === 'journal' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isComptable ? 'Journal des Mouvements & Rapprochements Bancaires' : 'Historique des Mouvements de Caisse'}
              </h2>
              <p className="text-xs text-slate-500">
                {isComptable 
                  ? 'Audit des encaissements clients, décaissements fournisseurs et flux certifiés' 
                  : 'Historique des entrées et sorties d\'argent'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isComptable ? (
                <>
                  <button
                    onClick={() => {
                      setNewType('Encaissement');
                      setNewTierType('Client');
                      setNewTierId(scopedClients[0]?.id || '');
                      setNewMontant(0);
                      setNewMode('Espèces');
                      setNewBanque('Caisse Centrale');
                      setNewRef(`ENC-${Date.now().toString().slice(-4)}`);
                      setNewNotes('Encaissement client au comptant');
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                    + Entrée d'argent
                  </button>

                  <button
                    onClick={() => {
                      setNewType('Décaissement');
                      setNewTierType('Fournisseur');
                      setNewTierId(scopedFournisseurs[0]?.id || '');
                      setNewMontant(0);
                      setNewMode('Virement');
                      setNewBanque('BIAT');
                      setNewRef(`DEC-${Date.now().toString().slice(-4)}`);
                      setNewNotes('Décaissement fournisseur / charge');
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                    - Sortie d'argent
                  </button>

                  <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Autre Opération
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-slate-500 text-[16px]">policy</span>
                    Contrôle de Conformité
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Entrées d'Argent</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                +{totalEncaissements.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
              </p>
              <span className="text-xs text-slate-500 mt-1 block">Ventes et encaissements reçus</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sorties d'Argent</span>
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </span>
              </div>
              <p className="text-2xl font-bold text-rose-600 mt-2">
                -{totalDecaissements.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
              </p>
              <span className="text-xs text-slate-500 mt-1 block">Dépenses et paiements fournisseurs</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-purple-200 shadow-sm bg-purple-50/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">Argent en Caisse</span>
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {soldeNetCaisse.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-purple-700">DT</span>
              </p>
              <span className="text-xs text-purple-700 font-semibold mt-1 block">Solde disponible</span>
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
                  placeholder="Rechercher une opération, client, fournisseur..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Toutes les opérations</option>
                  <option value="Encaissement">Entrées d'argent (+)</option>
                  <option value="Décaissement">Sorties d'argent (-)</option>
                </select>

                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tous les modes</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Virement">Virement</option>
                  <option value="Traite">Traite</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">N° Opération</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Client / Fournisseur</th>
                    <th className="py-3.5 px-4">Document lié</th>
                    <th className="py-3.5 px-4">Paiement</th>
                    <th className="py-3.5 px-4 text-right">Montant</th>
                    <th className="py-3.5 px-4 text-center">Sens</th>
                    <th className="py-3.5 px-4 text-right">Reçu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredReglements.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-purple-600">receipt</span>
                        {reg.numeroPiece}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(reg.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900">{reg.tierNom}</span>
                        <span className="block text-[10px] text-slate-400">{reg.tierType}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {reg.documentRef || 'Règlement direct'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{reg.modePaiement}</span>
                        {reg.banque && <span className="block text-[10px] text-slate-400">{reg.banque}</span>}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold text-sm ${
                        reg.type === 'Encaissement' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {reg.type === 'Encaissement' ? '+' : '-'}{reg.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          reg.type === 'Encaissement' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {reg.type === 'Encaissement' ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(() => {
                            const matchedSale = ventes.find(v => v.numero === reg.documentRef || v.id === reg.documentRef);
                            if (matchedSale) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setSelectedTicketVente(matchedSale)}
                                  className="flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 hover:border-purple-600 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs"
                                  title="Consulter le ticket de panier complet"
                                >
                                  <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                                  <span>Ticket</span>
                                </button>
                              );
                            }
                            return null;
                          })()}

                          <button
                            type="button"
                            onClick={() => generateReceiptPdf(reg, currentProject)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Télécharger le Reçu PDF"
                          >
                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredReglements.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                        Aucun mouvement de caisse enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sessions de Caisse & Procès-Verbaux Z */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-[20px]">receipt_long</span>
                  Historique des Sessions & Clôtures de Caisse (Tickets Z)
                </h3>
                <p className="text-xs text-slate-500">Soldes d'ouverture, soldes finaux certifiés et ré-impression des procès-verbaux</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Session N°</th>
                    <th className="py-3 px-4">Caissier</th>
                    <th className="py-3 px-4">Date Ouverture</th>
                    <th className="py-3 px-4">Date Clôture</th>
                    <th className="py-3 px-4 text-right">Fond Initial</th>
                    <th className="py-3 px-4 text-right">Solde Final Certifié</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Ticket Z</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sessions.filter(s => selectedProjectId === 'all' || s.projetId === selectedProjectId).map(sess => {
                    const sSales = ventes.filter(v => 
                      v.projetId === sess.projetId && 
                      (!v.auteurId || v.auteurId === sess.utilisateurId) &&
                      v.date >= sess.dateOuverture.split('T')[0] &&
                      v.statut !== 'Devis' && v.statut !== 'Annulée'
                    );
                    const sRegs = reglements.filter(r => r.projetId === sess.projetId && r.date >= sess.dateOuverture.split('T')[0]);
                    const finalVal = sess.soldeFinalReel ?? sess.soldeFinalTheorique ?? sess.soldeInitial;

                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-900">
                          #{sess.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {sess.utilisateurNom || 'Caissier'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {new Date(sess.dateOuverture).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {sess.dateFermeture ? new Date(sess.dateFermeture).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">
                          {sess.soldeInitial.toFixed(3)} DT
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-purple-700">
                          {sess.statut === 'Fermee' ? `${finalVal.toFixed(3)} DT` : 'En cours...'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sess.statut === 'Ouverte' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sess.statut === 'Ouverte' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            {sess.statut === 'Ouverte' ? 'En Cours' : 'Clôturée (Certifiée)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => generateZReportPdf({
                              session: sess,
                              projet: projets.find(p => p.id === sess.projetId),
                              caissier: { id: sess.utilisateurId, nom: sess.utilisateurNom, email: '', role: 'caissier', projetId: sess.projetId, statut: 'Actif' },
                              ventesSession: sSales,
                              reglementsSession: sRegs,
                              soldeFinalCalcule: finalVal
                            })}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                            title="Télécharger / Imprimer le Ticket Z"
                          >
                            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                            <span className="hidden sm:inline">Ticket Z</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                        Aucune session de caisse enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MOVEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Ajouter une Entrée ou Sortie d'Argent</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Sens de l'opération</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('Encaissement')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      newType === 'Encaissement' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    + Entrée d'argent
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('Décaissement')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      newType === 'Décaissement' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    - Sortie d'argent
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Client ou Fournisseur</label>
                <select
                  value={newTierType}
                  onChange={(e) => setNewTierType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 mb-2"
                >
                  <option value="Client">Client</option>
                  <option value="Fournisseur">Fournisseur</option>
                  <option value="Autre">Autre / Divers</option>
                </select>

                {newTierType === 'Client' && (
                  <select
                    value={newTierId}
                    onChange={(e) => setNewTierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {scopedClients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                )}

                {newTierType === 'Fournisseur' && (
                  <select
                    value={newTierId}
                    onChange={(e) => setNewTierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {scopedFournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Montant (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={newMontant}
                    onChange={(e) => setNewMontant(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Moyen de Paiement</label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement">Virement</option>
                    <option value="Traite">Traite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Banque / Compte</label>
                <input
                  type="text"
                  value={newBanque}
                  onChange={(e) => setNewBanque(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer l'opération
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMERA SCANNER MODAL (BF-PROD-020) */}
      {isCameraScannerOpen && (
        <CameraBarcodeScannerModal
          articles={articles}
          onScanSuccess={(code) => handleProcessScan(code)}
          onClose={() => setIsCameraScannerOpen(false)}
        />
      )}

      {/* Modal Clôture de Caisse Certifiée et Automatique */}
      {isClosingModalOpen && activeSession && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <span className="material-symbols-outlined text-2xl">lock_clock</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    Clôture & Arrêté de Caisse
                  </h3>
                  <p className="text-xs text-slate-300">
                    Arrêté des comptes certifié sans modification manuelle du montant final
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsClosingModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Grand Badge Montant Final Automatique */}
              <div className="p-5 bg-gradient-to-br from-purple-50 via-slate-50 to-emerald-50 rounded-2xl border-2 border-purple-200 text-center space-y-2 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-widest text-purple-700 inline-flex items-center gap-1.5 bg-purple-100/80 px-3 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                  Montant Final dans la Caisse (Calculé Automatiquement)
                </span>
                
                <div className="text-4xl font-black text-slate-950 tracking-tight font-mono">
                  {soldeFinalCalcule.toFixed(3)} <span className="text-xl font-bold text-purple-700">DT</span>
                </div>

                <p className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Montant certifié par le système (Non modifiable)
                </p>
              </div>

              {/* Tableau de décomposition détaillée */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 text-slate-600 font-semibold border-b border-slate-200/60">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">savings</span>
                    Fonds de caisse initial (Ouverture) :
                  </span>
                  <span className="font-mono font-bold text-slate-900">{activeSession.soldeInitial.toFixed(3)} DT</span>
                </div>

                <div className="flex justify-between items-center py-1 text-slate-600 font-semibold border-b border-slate-200/60">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">payments</span>
                    (+) Encaissements Ventes en Espèces :
                  </span>
                  <span className="font-mono font-bold text-emerald-600">+{totalVentesEspeces.toFixed(3)} DT</span>
                </div>

                {sessionReglementsManuels.encaissementsEspeces > 0 && (
                  <div className="flex justify-between items-center py-1 text-slate-600 font-semibold border-b border-slate-200/60">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-emerald-500">add_circle</span>
                      (+) Entrées d'espèces manuelles :
                    </span>
                    <span className="font-mono font-bold text-emerald-600">+{sessionReglementsManuels.encaissementsEspeces.toFixed(3)} DT</span>
                  </div>
                )}

                {sessionReglementsManuels.decaissementsEspeces > 0 && (
                  <div className="flex justify-between items-center py-1 text-slate-600 font-semibold border-b border-slate-200/60">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-rose-500">remove_circle</span>
                      (-) Décaissements / Dépenses espèces :
                    </span>
                    <span className="font-mono font-bold text-rose-600">-{sessionReglementsManuels.decaissementsEspeces.toFixed(3)} DT</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 text-slate-600 font-semibold border-b border-slate-200/60">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-indigo-500">account_balance</span>
                    Chèques collectés (à déposer) :
                  </span>
                  <span className="font-mono font-bold text-indigo-700">{totalVentesCheque.toFixed(3)} DT</span>
                </div>

                <div className="pt-2 flex justify-between items-center text-sm font-black text-slate-950 uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-purple-600">calculate</span>
                    Solde de Clôture Certifié :
                  </span>
                  <span className="font-mono text-purple-700">{soldeFinalCalcule.toFixed(3)} DT</span>
                </div>
              </div>

              {/* Remarques / Observations de clôture */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Remarques / Observations de clôture (facultatif)
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500 min-h-[55px]"
                  placeholder="Ex: Clôture fin de journée, RAS..."
                />
              </div>

              {/* Boutons d'actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCloseSession}
                  className="flex-[2] py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Confirmer la Clôture ({soldeFinalCalcule.toFixed(3)} DT)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GESTION DES RETOURS & AVOIRS DE CAISSE */}
      {isPosReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">assignment_return</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Gestion des Retours & Avoirs
                  </h2>
                  <p className="text-xs text-slate-500">
                    Session Caisse : <span className="font-semibold text-slate-700">{currentUser.nom}</span> • Boutique {currentProject?.nom || ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setPosReturnActiveTab('nouveau')}
                    className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                      posReturnActiveTab === 'nouveau' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nouveau Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosReturnActiveTab('historique')}
                    className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                      posReturnActiveTab === 'historique' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Historique ({scopedRetours.length})
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPosReturnModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Tab: Nouveau Retour */}
            {posReturnActiveTab === 'nouveau' && (
              <form onSubmit={handlePosSubmitReturn} className="flex-1 overflow-y-auto py-4 space-y-4">
                {/* Mode: avec ticket vs sans ticket */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-max">
                  <button
                    type="button"
                    onClick={() => {
                      setPosReturnType('ticket');
                      setPosReturnLines([]);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      posReturnType === 'ticket' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    À partir d'un Ticket / Facture
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPosReturnType('libre');
                      setPosReturnSelectedSaleId('');
                      const defArt = articles[0];
                      if (defArt) {
                        setPosReturnLines([{
                          articleId: defArt.id,
                          articleCode: defArt.code,
                          designation: defArt.designation,
                          quantiteVendue: 1,
                          quantiteRetournee: 1,
                          prixUnitaire: defArt.prixVenteHT,
                          motif: 'Changement d\'avis',
                          remettreEnStock: true
                        }]);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      posReturnType === 'libre' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Retour direct sans ticket
                  </button>
                </div>

                {/* Recherche & Sélection de vente */}
                {posReturnType === 'ticket' && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Sélectionner le ticket ou la facture de vente
                    </label>
                    <input
                      type="text"
                      placeholder="Rechercher par N° ticket (V-...) ou nom du client..."
                      value={posReturnTicketSearch}
                      onChange={(e) => setPosReturnTicketSearch(e.target.value)}
                      className="w-full px-3 py-1.5 mb-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                    />

                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
                      {posAvailableSales.map(v => (
                        <div
                          key={v.id}
                          onClick={() => handlePosSelectSale(v)}
                          className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            posReturnSelectedSaleId === v.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
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
                      {posAvailableSales.length === 0 && (
                        <p className="p-3 text-center text-xs text-slate-400">Aucune vente trouvée.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Client selector if return is direct */}
                {posReturnType === 'libre' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Client</label>
                    <select
                      value={posReturnClientId}
                      onChange={(e) => setPosReturnClientId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.nom} ({c.telephone || 'Client'})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Table of items to return */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Articles à retourner</span>
                    {posReturnType === 'libre' && (
                      <button
                        type="button"
                        onClick={() => {
                          const defArt = articles[0];
                          if (defArt) {
                            setPosReturnLines(prev => [...prev, {
                              articleId: defArt.id,
                              articleCode: defArt.code,
                              designation: defArt.designation,
                              quantiteVendue: 1,
                              quantiteRetournee: 1,
                              prixUnitaire: defArt.prixVenteHT,
                              motif: 'Changement d\'avis',
                              remettreEnStock: true
                            }]);
                          }
                        }}
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
                          {posReturnType === 'ticket' && <th className="py-2 px-2 text-center">Qté Vendue</th>}
                          <th className="py-2 px-2 text-center w-28">Qté à Retourner</th>
                          <th className="py-2 px-2 text-right">P.U (DT)</th>
                          <th className="py-2 px-3">Motif</th>
                          <th className="py-2 px-2 text-center">Remettre stock</th>
                          <th className="py-2 px-3 text-right">Total (DT)</th>
                          {posReturnType === 'libre' && <th className="py-2 px-2 text-center w-8"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {posReturnLines.map((l, index) => (
                          <tr key={index} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3">
                              {posReturnType === 'libre' ? (
                                <select
                                  value={l.articleId}
                                  onChange={(e) => {
                                    const art = articles.find(a => a.id === e.target.value);
                                    if (art) {
                                      setPosReturnLines(prev => prev.map((item, idx) => idx === index ? {
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

                            {posReturnType === 'ticket' && (
                              <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                                {l.quantiteVendue}
                              </td>
                            )}

                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={posReturnType === 'ticket' ? l.quantiteVendue : 999}
                                value={l.quantiteRetournee}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setPosReturnLines(prev => prev.map((item, idx) => idx === index ? {
                                    ...item,
                                    quantiteRetournee: posReturnType === 'ticket' ? Math.min(val, item.quantiteVendue) : val
                                  } : item));
                                }}
                                className="w-18 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-slate-200 rounded"
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
                                  setPosReturnLines(prev => prev.map((item, idx) => idx === index ? { ...item, motif: val } : item));
                                }}
                                className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                              >
                                <option value="Changement d'avis">Changement d'avis</option>
                                <option value="Défectueux">Défectueux</option>
                                <option value="Erreur de référence">Erreur de référence</option>
                                <option value="Non conforme">Non conforme</option>
                                <option value="Article endommagé">Article endommagé</option>
                                <option value="Autre">Autre</option>
                              </select>
                            </td>

                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={l.remettreEnStock}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setPosReturnLines(prev => prev.map((item, idx) => idx === index ? { ...item, remettreEnStock: checked } : item));
                                }}
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {(l.quantiteRetournee * l.prixUnitaire).toFixed(3)} DT
                            </td>

                            {posReturnType === 'libre' && (
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setPosReturnLines(prev => prev.filter((_, idx) => idx !== index))}
                                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}

                        {posReturnLines.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-400">
                              Sélectionnez une vente ci-dessus pour charger ses articles.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mode de restitution & Récapitulatif */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mode de restitution du montant
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="radio"
                          name="posRefundMode"
                          value="Espèces"
                          checked={posReturnRefundMode === 'Espèces'}
                          onChange={() => setPosReturnRefundMode('Espèces')}
                          className="text-indigo-600"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Remboursement Espèces (Tiroir Caisse)</p>
                          <p className="text-[10px] text-slate-500">Déduit directement de la caisse (décaissement immédiat du tiroir)</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="radio"
                          name="posRefundMode"
                          value="Avoir"
                          checked={posReturnRefundMode === 'Avoir'}
                          onChange={() => setPosReturnRefundMode('Avoir')}
                          className="text-indigo-600"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Avoir Client (Bon d'achat)</p>
                          <p className="text-[10px] text-slate-500">Génère un bon d'avoir pour un prochain achat (aucun décaissement)</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="radio"
                          name="posRefundMode"
                          value="Échange"
                          checked={posReturnRefundMode === 'Échange'}
                          onChange={() => setPosReturnRefundMode('Échange')}
                          className="text-indigo-600"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Échange direct d'article</p>
                          <p className="text-[10px] text-slate-500">Échange en magasin sans sortie de fonds</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Motif général / Remarque
                      </label>
                      <textarea
                        rows={2}
                        value={posReturnMotif}
                        onChange={(e) => setPosReturnMotif(e.target.value)}
                        placeholder="Observation sur le retour..."
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                          Montant à Rembourser / Avoir
                        </p>
                        <p className="text-[11px] text-indigo-600">
                          {posReturnRefundMode === 'Espèces' ? 'Espèces à retirer du tiroir' : 'Montant de l\'avoir'}
                        </p>
                      </div>
                      <span className="text-xl font-black font-mono text-indigo-700 tabular-nums">
                        {posReturnLines.reduce((acc, l) => acc + (l.quantiteRetournee * l.prixUnitaire), 0).toFixed(3)} DT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPosReturnModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={posReturnLines.filter(l => l.quantiteRetournee > 0).length === 0}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-lg">check</span>
                    <span>Valider le Retour</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Historique des Retours */}
            {posReturnActiveTab === 'historique' && (
              <div className="flex-1 overflow-y-auto py-4">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">N° Retour</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Ticket Vente</th>
                        <th className="py-2.5 px-3">Client</th>
                        <th className="py-2.5 px-2 text-right">Montant</th>
                        <th className="py-2.5 px-3 text-center">Restitution</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scopedRetours.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{r.numero}</td>
                          <td className="py-2.5 px-3 text-slate-600">{r.date}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{r.venteNumero || 'Direct'}</td>
                          <td className="py-2.5 px-3 text-slate-900 font-medium">{r.clientNom}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                            {r.montantTotal.toFixed(3)} DT
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {r.modeRemboursement}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setPosViewingReturn(r)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                title="Voir détails"
                              >
                                <span className="material-symbols-outlined text-base">visibility</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => generateReturnSlipPdf(r, currentProject)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Imprimer Bon de Retour (PDF)"
                              >
                                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {scopedRetours.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400">
                            Aucun retour enregistré pour cette boutique.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL VOIR DETAIL RETOUR */}
      {posViewingReturn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Détail Bon de Retour {posViewingReturn.numero}
              </h3>
              <button
                type="button"
                onClick={() => setPosViewingReturn(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="py-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg">
                <div>
                  <span className="text-slate-400 block text-[10px]">Client</span>
                  <span className="font-semibold text-slate-900">{posViewingReturn.clientNom}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mode de restitution</span>
                  <span className="font-bold text-indigo-700">{posViewingReturn.modeRemboursement}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="py-1.5 px-2">Article</th>
                      <th className="py-1.5 px-2 text-center">Qté</th>
                      <th className="py-1.5 px-2 text-right">P.U</th>
                      <th className="py-1.5 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {posViewingReturn.lignes.map((l, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-2 font-medium">{l.designation}</td>
                        <td className="py-1.5 px-2 text-center font-mono">{l.quantiteRetournee}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{l.prixUnitaire.toFixed(3)}</td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold">{(l.quantiteRetournee * l.prixUnitaire).toFixed(3)} DT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                <span className="font-bold text-slate-700">Total :</span>
                <span className="font-mono font-bold text-rose-600">{posViewingReturn.montantTotal.toFixed(3)} DT</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => generateReturnSlipPdf(posViewingReturn, currentProject)}
                className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                <span>Imprimer (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TICKET DE PANIER MODAL */}


      {selectedTicketVente && (
        <TicketPanierModal
          vente={selectedTicketVente}
          client={clients.find(c => c.id === selectedTicketVente.clientId || c.nom === selectedTicketVente.clientNom)}
          projet={projets.find(p => p.id === selectedTicketVente.projetId) || currentProject || projets[0]}
          currentUser={currentUser}
          onClose={() => setSelectedTicketVente(null)}
        />
      )}
    </div>
  );
}
