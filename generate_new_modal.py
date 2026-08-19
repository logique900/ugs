import re

new_modal = """{isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-[96vw] max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 my-2">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[28px]">
                    {editingClient ? 'edit_note' : 'person_add'}
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-on-surface">
                    {editingClient ? `Modifier le Client : ${editingClient.nom}` : 'Créer un Nouveau Client'}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium">
                    {editingClient ? 'Mettez à jour les coordonnées et les conditions de crédit.' : 'Renseignez l\\'identité, la domiciliation et les modalités financières.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveClient} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto bg-surface p-6">
                
                {/* AI Helper Banner */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[24px]">auto_awesome</span>
                    <div>
                      <span className="text-sm text-on-surface font-bold block">Assistant de pré-configuration</span>
                      <span className="text-xs text-on-surface-variant">Appliquez rapidement des conditions de crédit types.</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyAiCreditPreset('Grand Compte', 'Entreprise')}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-primary/20 hover:bg-primary/10 text-primary transition-colors shadow-sm"
                    >
                      Grand Compte (60j)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiCreditPreset('PME', 'Entreprise')}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-primary/20 hover:bg-primary/10 text-primary transition-colors shadow-sm"
                    >
                      PME (30j)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiCreditPreset('Particulier', 'Particulier')}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-primary/20 hover:bg-primary/10 text-primary transition-colors shadow-sm"
                    >
                      Particulier (Comptant)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Section 1: Identité */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                      <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
                        <span className="material-symbols-outlined text-[20px]">badge</span>
                        1. Identité & Catégorisation
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Raison Sociale / Nom Complet *</label>
                          <input
                            type="text"
                            required
                            value={formData.nom}
                            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            placeholder="Ex: Société Alpha"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Code Client *</label>
                          <input
                            type="text"
                            required
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder="Ex: CLI-2024-001"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm font-mono bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Type de Client</label>
                          <select
                            value={formData.typeTier}
                            onChange={(e) => setFormData({ ...formData, typeTier: e.target.value as any })}
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          >
                            <option value="Entreprise">Entreprise / B2B</option>
                            <option value="Particulier">Particulier / B2C</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Catégorie</label>
                          <input
                            type="text"
                            value={formData.categorie}
                            onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                            placeholder="Ex: Grossiste, VIP..."
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Matricule Fiscal / CIN</label>
                          <input
                            type="text"
                            value={formData.matriculeFiscal}
                            onChange={(e) => setFormData({ ...formData, matriculeFiscal: e.target.value })}
                            placeholder="Ex: 1234567/X/A/M/000"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Conditions Financières */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                      <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
                        <span className="material-symbols-outlined text-[20px]">account_balance</span>
                        2. Conditions Financières & Banque
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Plafond de Crédit (DT)</label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={formData.plafondCredit}
                            onChange={(e) => setFormData({ ...formData, plafondCredit: Number(e.target.value) })}
                            placeholder="Ex: 10000"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Délai de Paiement (Jours)</label>
                          <input
                            type="number"
                            min="0"
                            step="15"
                            value={formData.delaiPaiement}
                            onChange={(e) => setFormData({ ...formData, delaiPaiement: Number(e.target.value) })}
                            placeholder="Ex: 30"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Banque Domiciliée</label>
                          <input
                            type="text"
                            value={formData.banque}
                            onChange={(e) => setFormData({ ...formData, banque: e.target.value })}
                            placeholder="Ex: BIAT, Amen Bank, BNP..."
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">RIB / IBAN</label>
                          <input
                            type="text"
                            value={formData.rib}
                            onChange={(e) => setFormData({ ...formData, rib: e.target.value })}
                            placeholder="Ex: 08 001 0001234567890 45"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm font-mono bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Section 3: Coordonnées & Contact */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                      <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
                        <span className="material-symbols-outlined text-[20px]">contact_mail</span>
                        3. Coordonnées & Contact Principal
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Téléphone Entreprise *</label>
                          <input
                            type="tel"
                            required
                            value={formData.telephone}
                            onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                            placeholder="Ex: +216 71 000 000"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Email Contact / Facturation</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Ex: contact@client.com"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Adresse Complète</label>
                          <input
                            type="text"
                            value={formData.adresse}
                            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                            placeholder="Ex: 14 Rue des Entrepreneurs, Zone Industrielle"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Ville</label>
                          <input
                            type="text"
                            value={formData.ville}
                            onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                            placeholder="Ex: Tunis"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Pays</label>
                          <input
                            type="text"
                            value={formData.pays}
                            onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                            placeholder="Ex: Tunisie"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        
                        <div className="sm:col-span-2 border-t border-outline-variant/30 pt-4 mt-2">
                          <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-4">Interlocuteur Référent</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className="text-xs font-bold text-on-surface mb-1.5 block">Nom & Prénom</label>
                              <input
                                type="text"
                                value={formData.contactNom}
                                onChange={(e) => setFormData({ ...formData, contactNom: e.target.value })}
                                placeholder="Ex: M. Jean Dupont"
                                className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-on-surface mb-1.5 block">Poste / Fonction</label>
                              <input
                                type="text"
                                value={formData.contactPoste}
                                onChange={(e) => setFormData({ ...formData, contactPoste: e.target.value })}
                                placeholder="Ex: Directeur Achats"
                                className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Notes */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                      <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
                        <span className="material-symbols-outlined text-[20px]">note_alt</span>
                        4. Observations & Notes Spécifiques
                      </h4>
                      <div>
                        <textarea
                          rows={3}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Instructions particulières de livraison, accords commerciaux spécifiques, horaires de réception..."
                          className="w-full p-4 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-outline-variant bg-surface-container-low flex justify-end gap-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 text-sm font-extrabold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  <span>{editingClient ? 'Enregistrer les Modifications' : 'Créer le Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}"""

with open('src/components/Clients.tsx', 'r') as f:
    content = f.read()

start_marker = "{/* MODAL : NOUVEAU / MODIFIER CLIENT"
end_marker = "{/* DRAWER / MODAL : FICHE 360° DU CLIENT"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find the target block")
    exit(1)

# We want to replace everything from start_marker's end (after comment) to end_marker
# Let's find the actual start of the `{isFormModalOpen && (`
actual_start_idx = content.find("{isFormModalOpen && (", start_idx)

# We want to replace from actual_start_idx to just before end_marker (the closing `)}` plus whitespace)
# We will just split and join.

content_before = content[:actual_start_idx]

# Let's find the `      {/* ========================================================================= */}` right before end_marker
footer_marker = "      {/* ========================================================================= */}"
footer_idx = content.rfind(footer_marker, start_idx, end_idx)

if footer_idx != -1:
    content_after = content[footer_idx:]
else:
    content_after = content[end_idx:]

new_content = content_before + new_modal + "\n" + content_after

with open('src/components/Clients.tsx', 'w') as f:
    f.write(new_content)

print("Updated Clients.tsx successfully")
