import React, { useState } from 'react';
import { Fournisseur, Achat, Reglement, Article, Projet } from '../../types';
import { generateReceiptPdf, generatePurchaseOrderPdf } from '../../utils/pdfExportEngine';

interface SupplierDetailModalProps {
  fournisseur: Fournisseur;
  onClose: () => void;
  onEdit: (fournisseur: Fournisseur) => void;
  onOpenPayment: (fournisseur: Fournisseur, achatId?: string) => void;
  onOpenCredit: (fournisseur: Fournisseur, achatId?: string) => void;
  onExportStatement: (fournisseur: Fournisseur) => void;
  onUpdateRating?: (fournisseurId: string, rating: number) => void;
  achats?: Achat[];
  reglements?: Reglement[];
  articles?: Article[];
  projets?: Projet[];
  selectedProjectId?: string;
  onNewPurchase?: (fournisseur: Fournisseur) => void;
}

export function SupplierDetailModal({
  fournisseur,
  onClose,
  onEdit,
  onOpenPayment,
  onOpenCredit,
  onExportStatement,
  onUpdateRating,
  achats = [],
  reglements = [],
  articles = [],
  projets = [],
  selectedProjectId,
  onNewPurchase
}: SupplierDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'achats' | 'reglements' | 'articles' | 'echeancier'>('overview');
  const [copiedRib, setCopiedRib] = useState(false);
  const [ratingHover, setRatingHover] = useState<number | null>(null);

  // Financial computations
  const fournisseurAchats = achats.filter(a => a.fournisseurId === fournisseur.id);
  const totalAchete = fournisseurAchats.reduce((acc, a) => acc + a.montantTTC, 0);

  const fournisseurReglements = reglements.filter(
    r => r.tierId === fournisseur.id && r.type === 'Décaissement'
  );
  const totalRegleDirect = fournisseurReglements
    .filter(r => r.statut === 'Validé')
    .reduce((acc, r) => acc + r.montant, 0);

  const totalRegleAchats = fournisseurAchats.reduce((acc, a: any) => {
    return acc + (a.montantPaye ?? a.montantRegle ?? (a.statut === 'Payé' ? a.montantTTC : 0));
  }, 0);

  const totalRegle = Math.max(totalRegleDirect, totalRegleAchats);
  const soldeDu = Math.max(0, totalAchete - totalRegle);

  // Articles supplied aggregation
  const suppliedArticlesMap = new Map<string, { code: string; designation: string; totalQty: number; avgUnitPrice: number; totalSpent: number; orderCount: number }>();

  fournisseurAchats.forEach(a => {
    if (a.lignes && a.lignes.length > 0) {
      a.lignes.forEach(l => {
        const key = l.code || l.designation;
        const existing = suppliedArticlesMap.get(key);
        if (existing) {
          existing.totalQty += l.quantite;
          existing.totalSpent += l.totalHT || (l.quantite * l.prixUnitaireHT);
          existing.orderCount += 1;
          existing.avgUnitPrice = existing.totalSpent / existing.totalQty;
        } else {
          suppliedArticlesMap.set(key, {
            code: l.code || 'ART',
            designation: l.designation,
            totalQty: l.quantite,
            avgUnitPrice: l.prixUnitaireHT,
            totalSpent: l.totalHT || (l.quantite * l.prixUnitaireHT),
            orderCount: 1
          });
        }
      });
    }
  });

  const suppliedArticlesList = Array.from(suppliedArticlesMap.values());

  const handleCopyRib = () => {
    if (fournisseur.rib) {
      navigator.clipboard.writeText(fournisseur.rib);
      setCopiedRib(true);
      setTimeout(() => setCopiedRib(false), 3000);
    }
  };

  const currentProject = projets.find(p => p.id === (fournisseur.projetId || selectedProjectId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-6 flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <span className="material-symbols-outlined text-[30px]">local_shipping</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">{fournisseur.nom}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {fournisseur.statut || 'Actif'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {fournisseur.categorie || 'Grossiste'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2">
                <span>Code: {fournisseur.code || `FRN-${fournisseur.id}`}</span>
                <span>•</span>
                <span>MF: {fournisseur.matriculeFiscal || 'Non spécifié'}</span>
                <span>•</span>
                <span>{fournisseur.ville || 'Tunis'}, {fournisseur.pays || 'Tunisie'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => onExportStatement(fournisseur)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Télécharger le relevé d'engagements PDF"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-400">picture_as_pdf</span>
              <span>Relevé PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-outline-variant bg-surface-container-low overflow-x-auto">
          {[
            { id: 'overview', label: "Vue d'ensemble", icon: 'account_box' },
            { id: 'achats', label: `Bons d'Achats & Factures (${fournisseurAchats.length})`, icon: 'receipt_long' },
            { id: 'reglements', label: `Règlements & Décaissements (${fournisseurReglements.length})`, icon: 'payments' },
            { id: 'articles', label: `Catalogue & Matériaux (${suppliedArticlesList.length})`, icon: 'inventory_2' },
            { id: 'echeancier', label: 'Échéancier & Crédit', icon: 'calendar_month' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-surface-container-lowest rounded-t-xl shadow-xs'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Quick Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Commandé / Acheté</span>
                  <p className="text-xl font-black text-on-surface mt-1.5">{totalAchete.toLocaleString('fr-FR')} <span className="text-xs font-normal">DT</span></p>
                  <p className="text-[11px] text-blue-600 font-medium mt-1">{fournisseurAchats.length} bons d'achats enregistrés</p>
                </div>

                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Règlements Effectués</span>
                  <p className="text-xl font-black text-emerald-600 mt-1.5">{totalRegle.toLocaleString('fr-FR')} <span className="text-xs font-normal">DT</span></p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">{fournisseurReglements.length} décaissements validés</p>
                </div>

                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Solde Dû à Décaisser</span>
                  <p className={`text-xl font-black mt-1.5 ${soldeDu > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {soldeDu.toLocaleString('fr-FR')} <span className="text-xs font-normal">DT</span>
                  </p>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-1">
                    {soldeDu > 0 ? 'Factures en attente de paiement' : 'Compte fournisseur à jour'}
                  </p>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Contact & Localisation */}
                <div className="bg-surface-container-low/60 rounded-2xl p-5 border border-outline-variant/60 space-y-3.5">
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">contacts</span>
                    Coordonnées & Interlocuteur
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Contact Référent :</span>
                      <span className="font-bold text-on-surface">{fournisseur.contactNom || 'Service Commercial'}</span>
                    </div>
                    {fournisseur.contactPoste && (
                      <div className="flex justify-between py-1 border-b border-outline-variant/40">
                        <span className="text-on-surface-variant">Poste / Fonction :</span>
                        <span className="font-semibold text-on-surface">{fournisseur.contactPoste}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-outline-variant/40 items-center">
                      <span className="text-on-surface-variant">Téléphone :</span>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${fournisseur.telephone}`} className="font-bold text-primary hover:underline">
                          {fournisseur.telephone}
                        </a>
                        <a 
                          href={`https://wa.me/${fournisseur.telephone.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20"
                          title="Ouvrir WhatsApp"
                        >
                          <span className="material-symbols-outlined text-[14px]">chat</span>
                        </a>
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Email :</span>
                      <a href={`mailto:${fournisseur.email}`} className="font-bold text-primary hover:underline">
                        {fournisseur.email || 'Non renseigné'}
                      </a>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Adresse :</span>
                      <span className="font-semibold text-on-surface text-right">{fournisseur.adresse || 'Siège principal'}, {fournisseur.ville || ''}</span>
                    </div>
                  </div>
                </div>

                {/* Fiscal & Banking */}
                <div className="bg-surface-container-low/60 rounded-2xl p-5 border border-outline-variant/60 space-y-3.5">
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">account_balance</span>
                    Données Bancaires & Fiscales
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Matricule Fiscal :</span>
                      <span className="font-mono font-bold text-on-surface">{fournisseur.matriculeFiscal || 'Non spécifié'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Banque Domiciliataire :</span>
                      <span className="font-bold text-on-surface">{fournisseur.banque || 'Non renseignée'}</span>
                    </div>
                    <div className="flex flex-col py-1 border-b border-outline-variant/40 gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Relevé d'Identité Bancaire (RIB) :</span>
                        <button
                          onClick={handleCopyRib}
                          className="px-2 py-0.5 bg-surface-container-lowest border border-outline-variant rounded-md text-[10px] font-bold text-primary hover:bg-primary/10 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          {copiedRib ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                      <span className="font-mono font-bold text-slate-800 text-xs tracking-wider bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/60 break-all">
                        {fournisseur.rib || '00 000 0000000000000 00'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Délai de Paiement Négocié :</span>
                      <span className="font-bold text-purple-700">{fournisseur.delaiPaiement || 30} jours net</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating & Internal Notes */}
              <div className="bg-surface-container-low/60 rounded-2xl p-5 border border-outline-variant/60 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-500">grade</span>
                    Évaluation Qualité & Ponctualité
                  </h3>

                  {/* Interactive Star Rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(null)}
                        onClick={() => onUpdateRating && onUpdateRating(fournisseur.id, star)}
                        className="text-amber-500 hover:scale-110 transition-transform focus:outline-none"
                        title={`Noter ${star}/5 étoiles`}
                      >
                        <span className={`material-symbols-outlined text-[22px] ${(ratingHover || fournisseur.evaluationQualite || 5) >= star ? 'fill-current' : ''}`}>
                          star
                        </span>
                      </button>
                    ))}
                    <span className="text-xs font-black text-on-surface ml-2">
                      {fournisseur.evaluationQualite || 5} / 5
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/60 text-xs">
                  <span className="font-bold text-on-surface-variant block mb-1">Notes & Observations Internes :</span>
                  <p className="text-on-surface leading-relaxed">
                    {fournisseur.notes || 'Aucune observation particulière consignée pour ce fournisseur.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACHATS */}
          {activeTab === 'achats' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Bons d'Achats & Factures Fournisseur
                </h3>
                {onNewPurchase && (
                  <button
                    onClick={() => onNewPurchase(fournisseur)}
                    className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm hover:bg-primary/90"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                    Nouveau Bon d'Achat
                  </button>
                )}
              </div>

              <div className="border border-outline-variant rounded-2xl overflow-hidden bg-surface-container-lowest">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low font-bold text-on-surface-variant border-b border-outline-variant">
                    <tr>
                      <th className="px-3.5 py-3">N° Pièce</th>
                      <th className="px-3.5 py-3">Date</th>
                      <th className="px-3.5 py-3">Échéance</th>
                      <th className="px-3.5 py-3">Statut</th>
                      <th className="px-3.5 py-3 text-right">Montant HT</th>
                      <th className="px-3.5 py-3 text-right">Montant TTC</th>
                      <th className="px-3.5 py-3 text-right">Reste Dû</th>
                      <th className="px-3.5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {fournisseurAchats.map(a => {
                      const paye = (a as any).montantPaye ?? (a as any).montantRegle ?? (a.statut === 'Payé' ? a.montantTTC : 0);
                      const reste = Math.max(0, a.montantTTC - paye);

                      return (
                        <tr key={a.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="px-3.5 py-3 font-bold text-primary font-mono">{a.numero}</td>
                          <td className="px-3.5 py-3 text-on-surface-variant">{new Date(a.date).toLocaleDateString('fr-FR')}</td>
                          <td className="px-3.5 py-3 text-on-surface-variant font-mono">
                            {a.dateEcheance ? new Date(a.dateEcheance).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="px-3.5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.statut === 'Payé' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              a.statut === 'Reçu' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {a.statut}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-right font-medium">{a.montantHT.toLocaleString('fr-FR')} DT</td>
                          <td className="px-3.5 py-3 text-right font-bold text-on-surface">{a.montantTTC.toLocaleString('fr-FR')} DT</td>
                          <td className="px-3.5 py-3 text-right font-black text-amber-600">
                            {reste.toLocaleString('fr-FR')} DT
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {reste > 0 && (
                                <button
                                  onClick={() => onOpenPayment(fournisseur, a.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                                  title="Payer cette facture"
                                >
                                  <span className="material-symbols-outlined text-[13px]">payments</span>
                                  Payer
                                </button>
                              )}
                              <button
                                onClick={() => generatePurchaseOrderPdf(a, fournisseur, currentProject)}
                                className="p-1 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-high"
                                title="Télécharger le bon d'achat PDF"
                              >
                                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {fournisseurAchats.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-on-surface-variant">
                          Aucun bon d'achat enregistré pour ce fournisseur.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REGLEMENTS */}
          {activeTab === 'reglements' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Historique des Règlements & Décaissements Effectués
              </h3>

              <div className="border border-outline-variant rounded-2xl overflow-hidden bg-surface-container-lowest">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low font-bold text-on-surface-variant border-b border-outline-variant">
                    <tr>
                      <th className="px-3.5 py-3">N° Pièce</th>
                      <th className="px-3.5 py-3">Date</th>
                      <th className="px-3.5 py-3">Mode</th>
                      <th className="px-3.5 py-3">Banque & Réf.</th>
                      <th className="px-3.5 py-3 text-right">Montant Réglé</th>
                      <th className="px-3.5 py-3 text-center">Statut</th>
                      <th className="px-3.5 py-3 text-center">Reçu PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {fournisseurReglements.map(r => (
                      <tr key={r.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-3.5 py-3 font-bold text-primary font-mono">{r.numeroPiece}</td>
                        <td className="px-3.5 py-3 text-on-surface-variant">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-3.5 py-3 font-semibold">{r.modePaiement}</td>
                        <td className="px-3.5 py-3 text-on-surface-variant font-mono">
                          {r.banque ? `${r.banque} • ` : ''}{r.referencePaiement || r.documentRef || '-'}
                        </td>
                        <td className="px-3.5 py-3 text-right font-black text-emerald-600">
                          {r.montant.toLocaleString('fr-FR')} DT
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {r.statut}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <button
                            onClick={() => generateReceiptPdf(r, currentProject)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Télécharger le reçu de règlement PDF"
                          >
                            <span className="material-symbols-outlined text-[18px]">receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {fournisseurReglements.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-on-surface-variant">
                          Aucun règlement enregistré pour ce fournisseur.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ARTICLES SUPPLIED */}
          {activeTab === 'articles' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Catalogue des Articles & Matériaux Approvisionnés
              </h3>

              <div className="border border-outline-variant rounded-2xl overflow-hidden bg-surface-container-lowest">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low font-bold text-on-surface-variant border-b border-outline-variant">
                    <tr>
                      <th className="px-3.5 py-3">Code Article</th>
                      <th className="px-3.5 py-3">Désignation</th>
                      <th className="px-3.5 py-3 text-center">Commandes</th>
                      <th className="px-3.5 py-3 text-right">Quantité Cumulée</th>
                      <th className="px-3.5 py-3 text-right">P.U HT Moyen</th>
                      <th className="px-3.5 py-3 text-right">Total HT Dépensé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {suppliedArticlesList.map((art, idx) => (
                      <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-3.5 py-3 font-mono font-bold text-primary">{art.code}</td>
                        <td className="px-3.5 py-3 font-semibold text-on-surface">{art.designation}</td>
                        <td className="px-3.5 py-3 text-center font-medium text-on-surface-variant">{art.orderCount} fois</td>
                        <td className="px-3.5 py-3 text-right font-bold text-on-surface">{art.totalQty.toLocaleString('fr-FR')}</td>
                        <td className="px-3.5 py-3 text-right font-mono">{art.avgUnitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</td>
                        <td className="px-3.5 py-3 text-right font-black text-on-surface">{art.totalSpent.toLocaleString('fr-FR')} DT</td>
                      </tr>
                    ))}
                    {suppliedArticlesList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-on-surface-variant">
                          Aucun article approvisionné répertorié dans les bons d'achats.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CREDIT & ECHEANCIER */}
          {activeTab === 'echeancier' && (
            <div className="space-y-5">
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4.5 text-xs text-purple-900 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-purple-950">Accord de Crédit & Facilités Fournisseur</h4>
                  <p className="mt-1 text-purple-800">
                    Délai standard négocié : <strong>{fournisseur.delaiPaiement || 30} jours</strong> • Plafond de crédit accordé : <strong>{fournisseur.plafondCredit ? `${fournisseur.plafondCredit.toLocaleString('fr-FR')} DT` : '30 000 DT'}</strong>
                  </p>
                </div>
                <button
                  onClick={() => onOpenCredit(fournisseur)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                  Nouvel Échéancier
                </button>
              </div>

              <div className="bg-surface-container-low/60 rounded-2xl p-5 border border-outline-variant/60 space-y-3">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">État des dettes à échéance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/60">
                    <span className="text-on-surface-variant">Total en-cours exigible :</span>
                    <p className="text-lg font-black text-amber-600 mt-1">{soldeDu.toLocaleString('fr-FR')} DT</p>
                  </div>
                  <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/60">
                    <span className="text-on-surface-variant">Mode de règlement préférentiel :</span>
                    <p className="text-lg font-black text-purple-700 mt-1">{fournisseur.modeReglementPrefere || 'Virement'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-low flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPayment(fournisseur)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">payments</span>
              Bouton Paiement
            </button>

            <button
              onClick={() => onOpenCredit(fournisseur)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              Bouton Crédit
            </button>

            <button
              onClick={() => onEdit(fournisseur)}
              className="px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">edit</span>
              Modifier Fiche
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
