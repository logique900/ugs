import React, { useState, useMemo, useEffect } from 'react';
import { Reglement, Projet, Vente, Achat, Client, Fournisseur, Utilisateur, Article, LigneVente, MouvementStock, SessionCaisse, SessionActionLog } from '../types';
import { generateReceiptPdf } from '../utils/pdfExportEngine';
import { generateZReportPdf } from '../utils/caisseZReport';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
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
  const [posMode, setPosMode] = useState<'Vente' | 'Devis'>('Vente');

  // Scanner Engine State (BF-PROD-020)
  const [scannerInput, setScannerInput] = useState('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannerFeedback, setScannerFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    article?: Article;
  } | null>(null);

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
    const moArticle = scopedArticles.find(a => a.id === 'mo-install');
    if (moArticle) {
      return [{ article: moArticle, quantite: 1, prixVenteHT: moArticle.prixVenteHT || 0 }];
    }
    return [];
  };

  useEffect(() => {
    setCart(getDefaultCart());
  }, [selectedProjectId, scopedArticles.length]); // Reset cart when project changes or articles load

  const handleCancelPosSale = () => {
    setCart(getDefaultCart());
    setPosClientId('');
    setPosPaymentMode('Espèces');
    setPosSuccessMsg(null);
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

  // POS Cart Calculations
  const cartTotalHT = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantite * (item.prixVenteHT || 0)), 0);
  }, [cart]);

  const cartTotalTTC = useMemo(() => {
    return cart.reduce((sum, item) => {
      const pu = item.prixVenteHT || 0;
      const tva = item.article.tva || 19;
      return sum + (item.quantite * pu * (1 + tva / 100));
    }, 0);
  }, [cart]);

  // Add Article to POS Cart (BF-PROD-019)
  const handleAddToCart = (article: Article, initialQty: number = 1) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.article.id === article.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantite: updated[existingIndex].quantite + initialQty
        };
        return updated;
      } else {
        return [...prev, { article, quantite: initialQty, prixVenteHT: article.prixVenteHT || 0 }];
      }
    });
  };

  const handleUpdateCartQty = (articleId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.article.id === articleId) {
          const newQ = item.quantite + delta;
          return newQ > 0 ? { ...item, quantite: newQ } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleSetCartQty = (articleId: string, exactQty: number) => {
    if (exactQty <= 0) {
      setCart(prev => prev.filter(item => item.article.id !== articleId));
    } else {
      setCart(prev => prev.map(item => item.article.id === articleId ? { ...item, quantite: exactQty } : item));
    }
  };

  const handleUpdateCartPrice = (articleId: string, newPrice: number) => {
    setCart(prev => prev.map(item => item.article.id === articleId ? { ...item, prixVenteHT: newPrice } : item));
  };

  const handleRemoveFromCart = (articleId: string) => {
    setCart(prev => prev.filter(item => item.article.id !== articleId));
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

    if (posMode === 'Vente') {
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

    const year = new Date().getFullYear();
    const saleCount = ventes.length + 1;
    const saleNum = `TC-${year}-${saleCount.toString().padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const lignes: LigneVente[] = cart.map((item, idx) => {
      const pu = item.prixVenteHT || 0;
      const tva = item.article.tva || 19;
      const totalHT = item.quantite * pu;
      const totalTTC = totalHT * (1 + tva / 100);
      return {
        id: `l-${Date.now()}-${idx}`,
        articleId: item.article.id,
        designation: item.article.designation,
        quantite: item.quantite,
        prixUnitaireHT: pu,
        tauxTVA: tva,
        remisePourcentage: 0,
        totalHT,
        totalTTC
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
      montantHT: cartTotalHT,
      montantTTC: cartTotalTTC,
      montantPaye: cartTotalTTC,
      statut: 'Payée',
      modePaiement: posPaymentMode,
      lignes,
      notes: 'Vente directe au comptoir (Panier Caisse)'
    };

    if (onVentesChange) {
      onVentesChange([newSale, ...ventes]);
    }

    // Generate Reglement Encaissement
    const regCount = reglements.length + 1;
    const numeroPiece = `ENC-${year}-${regCount.toString().padStart(4, '0')}`;
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

    // Update Article Stocks & Automatically Register Stock Movements (Only if Vente)
    if (posMode === 'Vente') {
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

      // Auto PDF Receipt
      generateReceiptPdf(newReg, currentProject);
      
      setPosSuccessMsg(
        `Vente ${saleNum} validée (${cartTotalTTC.toFixed(3)} DT) ! Mouvements de stock enregistrés.`
      );
    } else {
      setPosSuccessMsg(
        `Devis ${saleNum} généré avec succès (${cartTotalTTC.toFixed(3)} DT) !`
      );
    }
    setCart(getDefaultCart());
    setTimeout(() => setPosSuccessMsg(null), 5000);
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

        <div className="flex items-center gap-2">
          {activeSession && !isComptable && (
            <button
              onClick={() => setIsClosingModalOpen(true)}
              className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border border-rose-200"
            >
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
              Fermer la Caisse
            </button>
          )}

          {/* View Mode Tabs */}
          {!isComptable && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto ml-2">
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('journal')}
                  className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                    activeTab === 'journal'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span>Audit des Caisses (Tickets Z)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                  activeTab === 'pos'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                <span>Terminal de Vente (Panier)</span>
              </button>
            </div>
          )}
        </div>
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

                  <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 flex-1 sm:flex-initial">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Chèques / Autres</p>
                    <p className="text-xs sm:text-sm font-bold font-mono text-indigo-300">{(totalVentesCheque + totalVentesAutres).toFixed(3)} DT</p>
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

          {/* POS Mode Selection */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-max border border-slate-200">
            <button
              type="button"
              onClick={() => setPosMode('Vente')}
              className="px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-500 text-white shadow-md"
            >
              <span className="material-symbols-outlined text-[16px]">receipt</span>
              Vente Directe
            </button>
          </div>

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
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  Scanner
                </button>
              </form>

              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 border border-purple-500"
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                Caméra Web / QR Code
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
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Prix HT Automatique</span>
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
                      onClick={() => setCart(getDefaultCart())}
                      className="text-[11px] text-rose-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      Vider
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
                            {item.article.typeArticle === 'Service' ? (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 font-mono">P.U:</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={item.prixVenteHT}
                                  onChange={(e) => handleUpdateCartPrice(item.article.id, parseFloat(e.target.value) || 0)}
                                  className="w-20 text-xs px-1 py-0.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 font-bold text-indigo-700"
                                  title="Prix modifiable (Service)"
                                />
                                <span className="text-[10px] font-bold text-slate-400 font-mono">DT</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 font-mono">
                                {item.article.code} | Prix unitaire: {pu.toFixed(3)} DT
                              </span>
                            )}
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
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Sous-total HT</span>
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

                {/* Total Calculation Footer (BF-PROD-019) */}
                <div className="p-4 bg-slate-900 text-white space-y-3 border-t border-slate-800">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400 font-bold">
                      <span>Total HT :</span>
                      <span className="text-white font-mono">{cartTotalHT.toFixed(3)} DT</span>
                    </div>
                    <div className="flex justify-between text-slate-400 font-bold">
                      <span>TVA Estimée (19%) :</span>
                      <span className="text-white font-mono">{(cartTotalTTC - cartTotalHT).toFixed(3)} DT</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-emerald-400 pt-2 border-t border-slate-800">
                      <span>TOTAL À PAYER :</span>
                      <span>{cartTotalTTC.toFixed(3)} DT</span>
                    </div>
                  </div>

                  {/* Payment Mode Selector (Only for Vente) - Hidden for School shop to simplify */}
                  {posMode === 'Vente' && selectedProjectId !== '2' && (
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

                  {selectedProjectId === '2' && posMode === 'Vente' && (
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
                    className={`w-full py-3 ${posMode === 'Devis' ? 'bg-amber-400 hover:bg-amber-300 border-amber-400' : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400'} disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border disabled:border-slate-800`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{posMode === 'Devis' ? 'request_quote' : 'payments'}</span>
                    {posMode === 'Devis' ? `Créer le Devis (${cartTotalTTC.toFixed(3)} DT)` : `Encaisser (${cartTotalTTC.toFixed(3)} DT)`}
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
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Total TTC Panier</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">{cartTotalTTC.toFixed(3)} DT</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPosMobileTab('cart')}
                className={`px-4 py-2 ${posMode === 'Devis' ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-500 hover:bg-emerald-400'} text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer`}
              >
                <span>{posMode === 'Devis' ? 'Voir Devis' : 'Encaisser'}</span>
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
                        <button
                          onClick={() => generateReceiptPdf(reg, currentProject)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Télécharger le Reçu PDF"
                        >
                          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                        </button>
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
    </div>
  );
}
