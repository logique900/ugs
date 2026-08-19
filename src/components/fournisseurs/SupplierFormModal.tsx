import React, { useState, useEffect } from 'react';
import { Fournisseur, Projet } from '../../types';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fournisseur: Fournisseur) => void;
  initialData?: Fournisseur | null;
  projets: Projet[];
  selectedProjectId: string;
  fournisseursCount: number;
}

export function SupplierFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  projets,
  selectedProjectId,
  fournisseursCount
}: SupplierFormModalProps) {
  const isGlobal = selectedProjectId === 'all';

  const defaultState: Partial<Fournisseur> = {
    nom: '',
    code: `FRN-${String(fournisseursCount + 1).padStart(3, '0')}`,
    typeTier: 'Entreprise',
    matriculeFiscal: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: 'Tunis',
    codePostal: '',
    pays: 'Tunisie',
    siteWeb: '',
    contactNom: '',
    contactPoste: '',
    contactTel: '',
    contactEmail: '',
    statut: 'Actif',
    categorie: 'Grossiste',
    delaiPaiement: 30,
    plafondCredit: 30000,
    modeReglementPrefere: 'Virement',
    banque: 'BIAT',
    rib: '',
    notes: '',
    evaluationQualite: 5,
    projetId: isGlobal ? (projets[0]?.id || '1') : selectedProjectId
  };

  const [formData, setFormData] = useState<Partial<Fournisseur>>(defaultState);
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'finance'>('general');

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        ...defaultState,
        code: `FRN-${String(fournisseursCount + 1).padStart(3, '0')}`,
        projetId: isGlobal ? (projets[0]?.id || '1') : selectedProjectId
      });
    }
  }, [initialData, isOpen, fournisseursCount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom) return;

    const savedSupplier: Fournisseur = {
      id: initialData?.id || String(Date.now()),
      nom: formData.nom.trim(),
      code: formData.code?.trim() || `FRN-${String(fournisseursCount + 1).padStart(3, '0')}`,
      typeTier: formData.typeTier || 'Entreprise',
      matriculeFiscal: formData.matriculeFiscal?.trim() || '',
      email: formData.email?.trim() || '',
      telephone: formData.telephone?.trim() || '',
      adresse: formData.adresse?.trim() || '',
      ville: formData.ville?.trim() || 'Tunis',
      codePostal: formData.codePostal?.trim() || '',
      pays: formData.pays?.trim() || 'Tunisie',
      siteWeb: formData.siteWeb?.trim() || '',
      contactNom: formData.contactNom?.trim() || '',
      contactPoste: formData.contactPoste?.trim() || '',
      contactTel: formData.contactTel?.trim() || '',
      contactEmail: formData.contactEmail?.trim() || '',
      statut: formData.statut || 'Actif',
      categorie: formData.categorie || 'Grossiste',
      delaiPaiement: Number(formData.delaiPaiement) || 30,
      plafondCredit: Number(formData.plafondCredit) || 30000,
      modeReglementPrefere: formData.modeReglementPrefere || 'Virement',
      banque: formData.banque?.trim() || '',
      rib: formData.rib?.trim() || '',
      notes: formData.notes?.trim() || '',
      evaluationQualite: Number(formData.evaluationQualite) || 5,
      projetId: formData.projetId || (isGlobal ? '1' : selectedProjectId)
    };

    onSave(savedSupplier);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary-fixed">
              <span className="material-symbols-outlined text-[24px]">add_business</span>
            </div>
            <div>
              <h3 className="font-bold text-base">
                {initialData ? `Modifier Fournisseur : ${initialData.nom}` : 'Nouveau Fournisseur / Partenaire'}
              </h3>
              <p className="text-xs text-slate-400">Renseignez la fiche d'identité et les conditions commerciales</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-outline-variant bg-surface-container-low px-6 pt-2">
          {[
            { id: 'general', label: '1. Identification & Société', icon: 'business' },
            { id: 'contact', label: '2. Contact & Localisation', icon: 'location_on' },
            { id: 'finance', label: '3. Fiscalité & Conditions', icon: 'payments' }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === t.id
                  ? 'border-primary text-primary bg-surface-container-lowest rounded-t-xl'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
            
            {/* TAB 1: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-on-surface mb-1 block">Raison Sociale / Nom du Fournisseur *</label>
                    <input
                      type="text"
                      required
                      value={formData.nom || ''}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      placeholder="Ex: Comptoir Méditerranéen des Matériaux"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Code Référence</label>
                    <input
                      type="text"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="FRN-001"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Catégorie d'activité</label>
                    <select
                      value={formData.categorie}
                      onChange={(e) => setFormData({ ...formData, categorie: e.target.value as any })}
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-medium"
                    >
                      <option value="Grossiste">Grossiste</option>
                      <option value="Fabricant">Fabricant</option>
                      <option value="Importateur">Importateur</option>
                      <option value="Sous-traitant">Sous-traitant</option>
                      <option value="Prestataire">Prestataire</option>
                      <option value="Matériaux">Matériaux BTP</option>
                      <option value="Outillage">Outillage & Équipement</option>
                      <option value="Transport">Transport & Logistique</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Type de Structure</label>
                    <select
                      value={formData.typeTier}
                      onChange={(e) => setFormData({ ...formData, typeTier: e.target.value as any })}
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-medium"
                    >
                      <option value="Entreprise">Entreprise (Société / SARL / SA)</option>
                      <option value="Particulier">Artisan / Particulier</option>
                      <option value="Sous-traitant">Sous-traitant Spécialisé</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Statut Relationnel</label>
                    <select
                      value={formData.statut}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-medium"
                    >
                      <option value="Actif">Actif (Opérationnel)</option>
                      <option value="Inactif">Inactif</option>
                      <option value="Bloqué">Bloqué / Contentieux</option>
                    </select>
                  </div>

                  {isGlobal && (
                    <div className="sm:col-span-2">
                      <label className="font-bold text-on-surface mb-1 block">Projet d'Affectation</label>
                      <select
                        value={formData.projetId}
                        onChange={(e) => setFormData({ ...formData, projetId: e.target.value })}
                        className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-medium"
                      >
                        {projets.map(p => (
                          <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CONTACT */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Téléphone Principal *</label>
                    <input
                      type="tel"
                      required
                      value={formData.telephone || ''}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="+216 71 000 000"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Email Commercial</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@fournisseur.com"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Nom Interlocuteur / Contact Référent</label>
                    <input
                      type="text"
                      value={formData.contactNom || ''}
                      onChange={(e) => setFormData({ ...formData, contactNom: e.target.value })}
                      placeholder="Ex: M. Sami Trabelsi"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Poste du Contact</label>
                    <input
                      type="text"
                      value={formData.contactPoste || ''}
                      onChange={(e) => setFormData({ ...formData, contactPoste: e.target.value })}
                      placeholder="Ex: Responsable Grands Comptes"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-on-surface mb-1 block">Adresse du Siège / Entrepôt</label>
                    <input
                      type="text"
                      value={formData.adresse || ''}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                      placeholder="Zone Industrielle, Rue des Usines..."
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Ville</label>
                    <input
                      type="text"
                      value={formData.ville || ''}
                      onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                      placeholder="Tunis, Sousse, Sfax..."
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Pays</label>
                    <input
                      type="text"
                      value={formData.pays || ''}
                      onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                      placeholder="Tunisie"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FINANCE */}
            {activeTab === 'finance' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Matricule Fiscal</label>
                    <input
                      type="text"
                      value={formData.matriculeFiscal || ''}
                      onChange={(e) => setFormData({ ...formData, matriculeFiscal: e.target.value })}
                      placeholder="1234567/X/A/M/000"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Banque Domiciliataire</label>
                    <input
                      type="text"
                      value={formData.banque || ''}
                      onChange={(e) => setFormData({ ...formData, banque: e.target.value })}
                      placeholder="BIAT, Attijari, STB, Amen Bank..."
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-on-surface mb-1 block">Relevé d'Identité Bancaire (RIB - 20 chiffres)</label>
                    <input
                      type="text"
                      value={formData.rib || ''}
                      onChange={(e) => setFormData({ ...formData, rib: e.target.value })}
                      placeholder="08 001 0001234567890 45"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Délai de Règlement Accordé (Jours)</label>
                    <input
                      type="number"
                      value={formData.delaiPaiement || 30}
                      onChange={(e) => setFormData({ ...formData, delaiPaiement: Number(e.target.value) })}
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none font-bold text-purple-700"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Mode de Paiement Préférentiel</label>
                    <select
                      value={formData.modeReglementPrefere}
                      onChange={(e) => setFormData({ ...formData, modeReglementPrefere: e.target.value as any })}
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                    >
                      <option value="Virement">Virement Bancaire</option>
                      <option value="Chèque">Chèque</option>
                      <option value="Traite">Traite / Lettre de change</option>
                      <option value="Espèces">Espèces</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-on-surface mb-1 block">Notes & Conditions Spécifiques</label>
                    <textarea
                      rows={2}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Conditions d'escompte, remises par volume, protocoles de livraison..."
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl"
            >
              Annuler
            </button>
            <div className="flex gap-2">
              {activeTab !== 'general' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'finance' ? 'contact' : 'general')}
                  className="px-4 py-2 text-xs font-bold text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl"
                >
                  Précédent
                </button>
              )}
              {activeTab !== 'finance' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'general' ? 'contact' : 'finance')}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl shadow-xs"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md"
                >
                  {initialData ? 'Mettre à jour Fournisseur' : 'Créer le Fournisseur'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
