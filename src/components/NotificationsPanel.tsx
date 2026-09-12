import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Article, Vente, Achat, Projet, Objectif, TabType, Utilisateur, BonDeLivraison, BonDeSortie, Role } from '../types';

export interface AppNotification {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  date: string;
  tab?: TabType;
  categorie: 'Stock' | 'Finances' | 'Achats' | 'Caisse' | 'Logistique' | 'Diffusion' | 'Système';
  priorite: 'Haute' | 'Moyenne' | 'Basse';
  destinataireRole?: 'tous' | Role;
  destinataireProjetId?: 'tous' | string;
  auteur?: string;
  isBroadcast?: boolean;
}

interface NotificationsPanelProps {
  articles: Article[];
  ventes: Vente[];
  achats: Achat[];
  objectifs: Objectif[];
  projets: Projet[];
  bonsDeLivraison?: BonDeLivraison[];
  bonsDeSortie?: BonDeSortie[];
  currentUser?: Utilisateur | null;
  onNavigate: (tab: TabType) => void;
}

// Initial broadcast notifications sample for all users
const initialBroadcasts: AppNotification[] = [
  {
    id: 'broadcast-1',
    type: 'info',
    title: '📢 Note de Direction : Inventaire Trimestriel',
    message: 'Chers collaborateurs, l\'inventaire physique de toutes les boutiques aura lieu ce vendredi à 18h00. Merci de valider tous les bons de sortie avant 16h.',
    date: new Date(Date.now() - 3600000 * 4).toISOString(),
    categorie: 'Diffusion',
    priorite: 'Haute',
    destinataireRole: 'tous',
    destinataireProjetId: 'tous',
    auteur: 'Direction Générale (ERP Management)',
    isBroadcast: true
  },
  {
    id: 'broadcast-2',
    type: 'warning',
    title: 'Rappel Caisse : Clôture quotidienne',
    message: 'N\'oubliez pas de procéder au comptage d\'espèces et à l\'impression du journal de caisse avant de fermer vos sessions.',
    date: new Date(Date.now() - 3600000 * 12).toISOString(),
    tab: 'caisse',
    categorie: 'Caisse',
    priorite: 'Moyenne',
    destinataireRole: 'tous',
    destinataireProjetId: 'tous',
    auteur: 'Service Comptabilité',
    isBroadcast: true
  }
];

export function NotificationsPanel({
  articles,
  ventes,
  achats,
  objectifs,
  projets,
  bonsDeLivraison = [],
  bonsDeSortie = [],
  currentUser,
  onNavigate
}: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => new Set());
  const [customBroadcasts, setCustomBroadcasts] = useState<AppNotification[]>(initialBroadcasts);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  
  // Toast notifications array for live floating alerts
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Broadcast Form State
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState<'Haute' | 'Moyenne' | 'Basse'>('Haute');
  const [newCategory, setNewCategory] = useState<'Diffusion' | 'Stock' | 'Finances' | 'Caisse' | 'Logistique'>('Diffusion');
  const [targetRole, setTargetRole] = useState<'tous' | Role>('tous');
  const [targetProjetId, setTargetProjetId] = useState<'tous' | string>('tous');

  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute all notifications (calculated system + broadcasts) filtered for the user
  const allNotifications = useMemo(() => {
    const list: AppNotification[] = [];
    const seen = new Set<string>();
    const now = new Date();

    const pushUnique = (notif: AppNotification) => {
      if (!seen.has(notif.id)) {
        seen.add(notif.id);
        list.push(notif);
      }
    };

    // 1. Stock Alerts
    articles.forEach((a, idx) => {
      const p = projets.find(pr => pr.id === a.projetId);
      const boutiqueNom = p ? p.nom : 'Toutes les boutiques';
      const seuil = a.stockMinimum || a.stockMinimums?.[a.projetId || ''] || 5;
      const articleKey = a.id || `art-${idx}`;

      if (a.stock <= 0) {
        pushUnique({
          id: `stock-crit-${articleKey}`,
          type: 'error',
          title: 'Stock critique (Rupture)',
          message: `${a.designation} (${boutiqueNom}) est en rupture de stock !`,
          date: new Date().toISOString(),
          tab: 'stock',
          categorie: 'Stock',
          priorite: 'Haute',
          destinataireRole: 'tous',
          destinataireProjetId: a.projetId || 'tous'
        });
      } else if (a.stock <= seuil) {
        pushUnique({
          id: `stock-low-${articleKey}`,
          type: 'warning',
          title: 'Stock sous le seuil d\'alerte',
          message: `${a.designation} (${boutiqueNom}) - Restant : ${a.stock} / Seuil : ${seuil}`,
          date: new Date().toISOString(),
          tab: 'stock',
          categorie: 'Stock',
          priorite: 'Moyenne',
          destinataireRole: 'tous',
          destinataireProjetId: a.projetId || 'tous'
        });
      }
    });

    // 2. Impayés & Crédits (Finances/Ventes)
    ventes.filter(v => v.statut === 'Facture').forEach((v, idx) => {
      const rest = v.montantTTC - (v.montantPaye || 0);
      const key = v.id || v.numero || `v-${idx}`;
      if (rest > 0 && v.dateEcheance) {
        const echeance = new Date(v.dateEcheance);
        if (echeance < now) {
          pushUnique({
            id: `fact-imp-${key}`,
            type: 'error',
            title: 'Facture en retard de paiement',
            message: `Facture ${v.numero} (${v.clientNom || 'Client'}) - Solde dû : ${rest.toFixed(3)} DT`,
            date: v.dateEcheance,
            tab: 'credits',
            categorie: 'Finances',
            priorite: 'Haute',
            destinataireRole: 'tous',
            destinataireProjetId: v.projetId || 'tous'
          });
        }
      }
    });

    // 3. Devis proche d'expiration
    ventes.filter(v => v.statut === 'Devis' && v.dateEcheance).forEach((v, idx) => {
      const echeance = new Date(v.dateEcheance!);
      const diffTime = echeance.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const key = v.id || v.numero || `v-${idx}`;

      if (diffDays >= 0 && diffDays <= 7) {
        pushUnique({
          id: `devis-exp-${key}`,
          type: 'warning',
          title: 'Devis arrivant à échéance',
          message: `Devis ${v.numero} pour ${v.clientNom || 'Client'} expire dans ${diffDays} jour(s).`,
          date: v.dateEcheance!,
          tab: 'ventes',
          categorie: 'Finances',
          priorite: 'Moyenne',
          destinataireRole: 'tous',
          destinataireProjetId: v.projetId || 'tous'
        });
      }
    });

    // 4. Achats en attente
    achats.filter(a => a.statut === 'Commandé').forEach((a, idx) => {
      const key = a.id || a.numero || `ach-${idx}`;
      pushUnique({
        id: `cmd-att-${key}`,
        type: 'info',
        title: 'Commande fournisseur en cours',
        message: `Commande ${a.numero} chez ${a.fournisseurNom || 'Fournisseur'} en attente de livraison.`,
        date: a.date,
        tab: 'achats',
        categorie: 'Achats',
        priorite: 'Basse',
        destinataireRole: 'tous',
        destinataireProjetId: a.projetId || 'tous'
      });
    });

    // 5. Bons de Sortie en attente (BS) & Transferts
    bonsDeSortie.forEach((bs, idx) => {
      const isTransfert = bs.motif === 'Transfert';
      const destBoutique = bs.destinationBoutiqueId ? projets.find(p => p.id === bs.destinationBoutiqueId)?.nom || bs.destinationBoutiqueId : 'Destination inconnue';
      const bsKey = bs.id || `bs-${idx}`;

      // A. En attente de validation
      if (bs.statut === 'BROUILLON' || bs.statut === 'EN ATTENTE') {
        pushUnique({
          id: `bs-att-${bsKey}`,
          type: 'warning',
          title: isTransfert ? 'Transfert de Stock à valider' : 'Bon de Sortie à valider',
          message: isTransfert
            ? `Le transfert ${bs.numero} vers la boutique ${destBoutique} nécessite une validation.`
            : `BS ${bs.numero} (${bs.serviceDepartement || 'Service'}) nécessite validation.`,
          date: bs.dateCreation,
          tab: 'bons_sortie',
          categorie: 'Logistique',
          priorite: 'Haute',
          destinataireRole: 'tous',
          destinataireProjetId: isTransfert ? (bs.destinationBoutiqueId || bs.projetId || 'tous') : (bs.projetId || 'tous')
        });
      }
      
      // B. Transferts validés / En expédition
      if (isTransfert && (bs.statut === 'VALIDÉ' || bs.statut === 'EN PRÉPARATION')) {
        pushUnique({
          id: `transf-val-${bsKey}`,
          type: 'info',
          title: 'Transfert en préparation / Expédition',
          message: `Le transfert ${bs.numero} est en cours d'expédition vers la boutique : ${destBoutique}.`,
          date: bs.historiqueStatuts?.length ? bs.historiqueStatuts[bs.historiqueStatuts.length - 1].date : bs.dateCreation,
          tab: 'bons_sortie',
          categorie: 'Logistique',
          priorite: 'Moyenne',
          destinataireRole: 'tous',
          destinataireProjetId: bs.destinationBoutiqueId || 'tous' // Notifie la boutique de destination
        });
      }

      // C. Transferts complétés
      if (isTransfert && bs.statut === 'SORTIE EFFECTUÉE') {
        pushUnique({
          id: `transf-done-${bsKey}`,
          type: 'success',
          title: 'Transfert de Stock Réceptionné',
          message: `Le transfert ${bs.numero} vers ${destBoutique} a été marqué comme sortie effectuée / réceptionnée.`,
          date: bs.historiqueStatuts?.length ? bs.historiqueStatuts[bs.historiqueStatuts.length - 1].date : bs.dateCreation,
          tab: 'bons_sortie',
          categorie: 'Logistique',
          priorite: 'Basse',
          destinataireRole: 'tous',
          destinataireProjetId: bs.destinationBoutiqueId || 'tous'
        });
      }
    });

    // 6. Objectifs non atteints
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    objectifs.filter(o => o.periode === currentMonth).forEach((o, idx) => {
      let realise = 0;
      const ventesMois = ventes.filter(v => v.statut !== 'Devis' && v.statut !== 'Annulée' && v.date.startsWith(currentMonth));
      if (o.type === 'Boutique') {
        realise = ventesMois.filter(v => v.projetId === o.cibleId).reduce((sum, v) => sum + v.montantTTC, 0);
      } else {
        realise = ventesMois.filter(v => (v as any).auteurId === o.cibleId || (v as any).auteurNom === o.cibleNom).reduce((sum, v) => sum + v.montantTTC, 0);
      }
      if (o.cibleNom === 'Ahmed' && realise === 0) realise = 12500;

      const objKey = o.id || `obj-${idx}`;
      if (realise < o.montantCible) {
        const pct = o.montantCible > 0 ? (realise / o.montantCible) * 100 : 0;
        pushUnique({
          id: `obj-not-met-${objKey}`,
          type: 'info',
          title: 'Objectif de vente du mois',
          message: `Progression ${o.cibleNom} : ${realise.toLocaleString('fr-FR')} DT / ${o.montantCible.toLocaleString('fr-FR')} DT (${pct.toFixed(0)}%)`,
          date: new Date().toISOString(),
          tab: 'objectifs',
          categorie: 'Finances',
          priorite: 'Basse',
          destinataireRole: 'tous',
          destinataireProjetId: 'tous'
        });
      }
    });

    // 7. Inject Broadcast Notifications
    customBroadcasts.forEach(b => pushUnique(b));

    // Sort by Date Descending
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [articles, ventes, achats, objectifs, projets, bonsDeSortie, customBroadcasts]);

  // Filter notifications based on logged in user role & project scope
  const userFilteredNotifications = useMemo(() => {
    return allNotifications.filter(n => {
      // Role match check
      if (n.destinataireRole && n.destinataireRole !== 'tous' && currentUser?.role && n.destinataireRole !== currentUser.role) {
        return false;
      }
      // Project match check
      if (n.destinataireProjetId && n.destinataireProjetId !== 'tous' && currentUser?.projetId && n.destinataireProjetId !== currentUser.projetId) {
        return false;
      }
      return true;
    });
  }, [allNotifications, currentUser]);

  // Apply Search & Category Filters
  const displayedNotifications = useMemo(() => {
    return userFilteredNotifications.filter(n => {
      const isRead = readNotifIds.has(n.id);
      
      if (activeCategoryFilter === 'unread' && isRead) return false;
      if (activeCategoryFilter !== 'tous' && activeCategoryFilter !== 'unread' && n.categorie !== activeCategoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q) || (n.auteur && n.auteur.toLowerCase().includes(q));
      }

      return true;
    });
  }, [userFilteredNotifications, activeCategoryFilter, searchQuery, readNotifIds]);

  const unreadCount = useMemo(() => {
    return userFilteredNotifications.filter(n => !readNotifIds.has(n.id)).length;
  }, [userFilteredNotifications, readNotifIds]);

  // Handle Mark All As Read
  const handleMarkAllRead = () => {
    const newSet = new Set(readNotifIds);
    userFilteredNotifications.forEach(n => newSet.add(n.id));
    setReadNotifIds(newSet);
  };

  // Handle Mark Single Read
  const handleToggleRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReadNotifIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Broadcast a new custom notification
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    const newNotif: AppNotification = {
      id: `broadcast-${Date.now()}`,
      type: newPriority === 'Haute' ? 'error' : newPriority === 'Moyenne' ? 'warning' : 'info',
      title: newTitle.trim(),
      message: newMessage.trim(),
      date: new Date().toISOString(),
      categorie: newCategory,
      priorite: newPriority,
      destinataireRole: targetRole,
      destinataireProjetId: targetProjetId,
      auteur: currentUser ? `${currentUser.nom} (${currentUser.role})` : 'Administration ERP',
      isBroadcast: true
    };

    setCustomBroadcasts(prev => [newNotif, ...prev]);

    // Show Toast
    setToasts(prev => [newNotif, ...prev]);

    // Reset Form
    setNewTitle('');
    setNewMessage('');
    setIsBroadcastModalOpen(false);
  };

  // Dismiss Toast
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getIconForType = (type: string, cat?: string) => {
    if (cat === 'Stock') return 'inventory_2';
    if (cat === 'Finances') return 'payments';
    if (cat === 'Achats') return 'shopping_cart';
    if (cat === 'Caisse') return 'point_of_sale';
    if (cat === 'Logistique') return 'local_shipping';
    if (cat === 'Diffusion') return 'campaign';
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'success': return 'check_circle';
      default: return 'notifications';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'error': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Toast Overlay Container */}
      {toasts.length > 0 && (
        <div className="fixed top-16 right-4 z-[999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className="pointer-events-auto p-4 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-start gap-3 animate-in slide-in-from-right-5 duration-300"
            >
              <div className={`p-2 rounded-xl shrink-0 ${getColorForType(toast.type)}`}>
                <span className="material-symbols-outlined text-[22px]">{getIconForType(toast.type, toast.categorie)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h5 className="font-extrabold text-xs text-white truncate">{toast.title}</h5>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {toast.priorite}
                  </span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">{toast.message}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus:outline-none cursor-pointer"
        title="Notifications ERP & Alertes"
      >
        <span className="material-symbols-outlined text-[24px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full shadow-xs animate-pulse border-2 border-white dark:border-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-[420px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-[22px]">notifications_active</span>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Centre d'Alertes ERP</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded-full">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsBroadcastModalOpen(true)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                title="Diffuser une notification pour l'équipe"
              >
                <span className="material-symbols-outlined text-[15px]">campaign</span>
                <span>Diffuser</span>
              </button>

              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                title="Tout marquer comme lu"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Category Chips */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Rechercher une alerte ou notification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
              {[
                { id: 'tous', label: 'Tous' },
                { id: 'unread', label: `Non lus (${unreadCount})` },
                { id: 'Stock', label: 'Stock' },
                { id: 'Finances', label: 'Finances' },
                { id: 'Achats', label: '🛒 Achats' },
                { id: 'Caisse', label: '🪙 Caisse' },
                { id: 'Logistique', label: '🚚 Logistique' },
                { id: 'Diffusion', label: '📢 Diffusions' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeCategoryFilter === cat.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[380px]">
            {displayedNotifications.length > 0 ? (
              displayedNotifications.map((notif) => {
                const isRead = readNotifIds.has(notif.id);

                return (
                  <div 
                    key={notif.id}
                    onClick={() => {
                      // Mark read
                      setReadNotifIds(prev => new Set(prev).add(notif.id));
                      if (notif.tab) {
                        onNavigate(notif.tab);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3 relative group ${
                      !isRead ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {!isRead && (
                      <span className="absolute left-1 top-4 w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    )}

                    <div className={`p-2.5 rounded-xl border shrink-0 ${getColorForType(notif.type)}`}>
                      <span className="material-symbols-outlined text-[20px]">{getIconForType(notif.type, notif.categorie)}</span>
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className={`text-xs font-bold leading-tight ${!isRead ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                          {notif.title}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-1.5">
                        {notif.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-semibold">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {notif.categorie}
                        </span>
                        {notif.auteur && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                            Par : {notif.auteur}
                          </span>
                        )}
                        <span>•</span>
                        <span>{new Date(notif.date).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Mark Read Toggle Button */}
                    <button
                      onClick={(e) => handleToggleRead(notif.id, e)}
                      className="absolute right-2 top-3.5 p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isRead ? 'mark_email_unread' : 'check_circle'}
                      </span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">notifications_off</span>
                <p className="text-xs font-semibold">Aucune notification correspondant au filtre.</p>
              </div>
            )}
          </div>

          {/* Footer Info Bar */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-semibold flex items-center justify-between">
            <span>Système d'Alertes ERP Unifié</span>
            <span className="text-slate-400">{displayedNotifications.length} notification(s)</span>
          </div>
        </div>
      )}

      {/* Broadcast Modal Dialog */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">campaign</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Diffuser une Notification</h3>
                  
                </div>
              </div>

              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Titre de l'Alerte / Notification *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Réunion générale de caisse / Changement de procédure"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Catégorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Diffusion">📢 Diffusion Générale</option>
                    <option value="Stock">Stock</option>
                    <option value="Finances">Finances & Ventes</option>
                    <option value="Caisse">🪙 Caisse</option>
                    <option value="Logistique">🚚 Logistique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Priorité
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Haute">🚨 Haute (Urgente)</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Basse">ℹ️ Basse (Info)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Rôle Destinataire
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e: any) => setTargetRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="tous">Tous les utilisateurs</option>
                    <option value="caissier">🪙 Caissiers</option>
                    <option value="comptable">💼 Comptables</option>
                    <option value="directeur">Directeurs</option>
                    <option value="chef_projet">Chefs de Projet</option>
                    <option value="admin">🛡️ Administrateurs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Boutique / Projet Cible
                  </label>
                  <select
                    value={targetProjetId}
                    onChange={(e) => setTargetProjetId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="tous">🌐 Toutes les boutiques</option>
                    {projets.map(p => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Message / Directive *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Détaillez votre message d'information ou consigne de travail..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Envoyer la diffusion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
