import React, { useState } from 'react';
import { Fournisseur, Achat, Article, Projet, LigneAchat } from '../../types';
import { generatePurchaseOrderPdf } from '../../utils/pdfExportEngine';

interface SupplierQuickPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  fournisseur: Fournisseur;
  articles: Article[];
  projets: Projet[];
  selectedProjectId: string;
  onSavePurchase: (newAchat: Achat) => void;
}

export function SupplierQuickPurchaseModal({
  isOpen,
  onClose,
  fournisseur,
  articles,
  projets,
  selectedProjectId,
  onSavePurchase
}: SupplierQuickPurchaseModalProps) {
  if (!isOpen) return null;

  const currentProject = projets.find(p => p.id === (fournisseur.projetId || selectedProjectId)) || projets[0];

  const [dateAchat, setDateAchat] = useState<string>(new Date().toISOString().split('T')[0]);
  const [delaiJours, setDelaiJours] = useState<number>(fournisseur.delaiPaiement || 30);
  const [modePaiement, setModePaiement] = useState<'Virement' | 'Chèque' | 'Traite' | 'Espèces'>(
    fournisseur.modeReglementPrefere || 'Virement'
  );
  const [notes, setNotes] = useState<string>('');
  
  // Lines
  const [lignes, setLignes] = useState<LigneAchat[]>([
    {
      articleId: articles[0]?.id || '1',
      code: articles[0]?.code || 'ART001',
      designation: articles[0]?.designation || 'Matériaux Standard',
      quantite: 10,
      prixUnitaireHT: articles[0]?.prixAchatHT || 50,
      totalHT: (articles[0]?.prixAchatHT || 50) * 10,
      totalTTC: (articles[0]?.prixAchatHT || 50) * 10 * 1.19
    }
  ]);

  const handleAddLine = () => {
    const art = articles[0];
    setLignes([
      ...lignes,
      {
        articleId: art?.id || String(Date.now()),
        code: art?.code || 'ART',
        designation: art?.designation || 'Article standard',
        quantite: 1,
        prixUnitaireHT: art?.prixAchatHT || 10,
        totalHT: art?.prixAchatHT || 10,
        totalTTC: (art?.prixAchatHT || 10) * 1.19
      }
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, idx) => idx !== index));
    }
  };

  const handleLineChange = (index: number, field: keyof LigneAchat, value: any) => {
    const updated = [...lignes];
    const current = { ...updated[index] };

    if (field === 'articleId') {
      const found = articles.find(a => a.id === value);
      if (found) {
        current.articleId = found.id;
        current.code = found.code;
        current.designation = found.designation;
        current.prixUnitaireHT = found.prixAchatHT || current.prixUnitaireHT;
      }
    } else {
      (current as any)[field] = value;
    }

    const qty = Number(current.quantite) || 0;
    const pu = Number(current.prixUnitaireHT) || 0;
    current.totalHT = qty * pu;
    current.totalTTC = current.totalHT * 1.19;

    updated[index] = current;
    setLignes(updated);
  };

  const totalHT = lignes.reduce((acc, l) => acc + l.totalHT, 0);
  const totalTTC = totalHT * 1.19;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dateObj = new Date(dateAchat);
    dateObj.setDate(dateObj.getDate() + Number(delaiJours));
    const dateEcheance = dateObj.toISOString().split('T')[0];

    const newAchat: Achat = {
      id: String(Date.now()),
      projetId: fournisseur.projetId || (selectedProjectId === 'all' ? '1' : selectedProjectId),
      numero: `ACH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
      fournisseurId: fournisseur.id,
      date: dateAchat,
      dateEcheance,
      montantHT: totalHT,
      montantTTC: totalTTC,
      montantRegle: 0,
      statut: 'Commandé',
      modePaiement,
      lignes,
      notes: notes || `Commande émise pour ${fournisseur.nom}`
    };

    onSavePurchase(newAchat);
    generatePurchaseOrderPdf(newAchat, fournisseur, currentProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary-fixed">
              <span className="material-symbols-outlined text-[22px]">add_shopping_cart</span>
            </div>
            <div>
              <h3 className="font-bold text-base">Émettre un Bon d'Achat : {fournisseur.nom}</h3>
              <p className="text-xs text-slate-400">Génération instantanée du bon de commande et du document PDF</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto text-xs">
            
            {/* Top metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-on-surface mb-1 block">Date de la Commande</label>
                <input
                  type="date"
                  required
                  value={dateAchat}
                  onChange={(e) => setDateAchat(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface mb-1 block">Délai Règlement (Jours)</label>
                <input
                  type="number"
                  value={delaiJours}
                  onChange={(e) => setDelaiJours(Number(e.target.value))}
                  className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-bold text-purple-700"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface mb-1 block">Mode de Paiement Prévu</label>
                <select
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value as any)}
                  className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                >
                  <option value="Virement">Virement Bancaire</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Traite">Traite</option>
                  <option value="Espèces">Espèces</option>
                </select>
              </div>
            </div>

            {/* Articles Table */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-on-surface uppercase tracking-wider text-[11px]">Articles & Quantités à Commander</span>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="px-2.5 py-1 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Ajouter Ligne
                </button>
              </div>

              <div className="border border-outline-variant rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low font-bold text-on-surface-variant border-b border-outline-variant">
                    <tr>
                      <th className="px-3 py-2.5">Article Référencé</th>
                      <th className="px-3 py-2.5 w-24">Quantité</th>
                      <th className="px-3 py-2.5 w-28 text-right">P.U HT (DT)</th>
                      <th className="px-3 py-2.5 w-28 text-right">Total HT</th>
                      <th className="px-2 py-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {lignes.map((line, idx) => (
                      <tr key={idx} className="hover:bg-surface-container-low/40">
                        <td className="p-2">
                          <select
                            value={line.articleId}
                            onChange={(e) => handleLineChange(idx, 'articleId', e.target.value)}
                            className="w-full p-2 border border-outline-variant rounded-lg text-xs bg-surface-container-lowest outline-none font-medium"
                          >
                            {articles.map(art => (
                              <option key={art.id} value={art.id}>
                                {art.code ? `[${art.code}] ` : ''}{art.designation} ({art.prixAchatHT} DT HT)
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={line.quantite}
                            onChange={(e) => handleLineChange(idx, 'quantite', Number(e.target.value))}
                            className="w-full p-2 border border-outline-variant rounded-lg text-xs bg-surface-container-lowest outline-none font-bold text-center"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.prixUnitaireHT}
                            onChange={(e) => handleLineChange(idx, 'prixUnitaireHT', Number(e.target.value))}
                            className="w-full p-2 border border-outline-variant rounded-lg text-xs bg-surface-container-lowest outline-none text-right font-mono"
                          />
                        </td>
                        <td className="p-2 text-right font-black text-on-surface">
                          {line.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                        </td>
                        <td className="p-2 text-center">
                          {lignes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-error hover:text-error/80 p-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 flex justify-between items-center">
              <div>
                <span className="text-on-surface-variant block text-[11px]">TVA Standard (19%) applicable</span>
                <span className="font-bold text-xs text-on-surface">Paiement selon conditions : {delaiJours} jours net</span>
              </div>
              <div className="text-right space-y-1">
                <div className="text-xs text-on-surface-variant">
                  Total Brut HT : <span className="font-bold text-on-surface">{totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                </div>
                <div className="text-sm font-black text-primary">
                  Total TTC : {totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-on-surface mb-1 block">Instructions de Livraison / Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lieu de déchargement, contact sur place..."
                className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              Enregistrer & Télécharger Bon d'Achat PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
