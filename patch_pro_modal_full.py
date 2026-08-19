import re

with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Locate where {isModalOpen && starts
idx = content.find("{isModalOpen &&")
if idx == -1:
    print("Could not find {isModalOpen &&")
    exit(1)

prefix = content[:idx]

professional_modal_jsx = """{/* Advanced Professional Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">
                    {editingArticle ? 'edit_square' : 'inventory_2'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">
                    {editingArticle ? "Modification de la Fiche Article" : "Référencer un Nouveau Produit"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editingArticle ? `Mise à jour des paramètres de l'article ${editingArticle.code}` : 'Renseignez les informations commerciales, tarifaires et logistiques'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setActiveModalTab('ident')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'ident'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">badge</span>
                1. Identification & Général
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('tarifs')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'tarifs'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                2. Tarification & Taxes
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('stock')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'stock'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">warehouse</span>
                3. Stocks & Seuils
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveArticle} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: IDENTIFICATION */}
              {activeModalTab === 'ident' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Référence / SKU <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: LAP-HP-0015"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.code || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Nom Commercial / Désignation <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Laptop HP 15"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.designation || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Catégorie / Famille <span className="text-rose-500">*</span>
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        value={formData.famille || 'Matériaux BTP'}
                        onChange={(e) => setFormData(prev => ({ ...prev, famille: e.target.value }))}
                      >
                        <option value="Matériaux BTP">Matériaux BTP</option>
                        <option value="Ordinateurs portables">Ordinateurs portables</option>
                        <option value="Électronique & Informatique">Électronique & Informatique</option>
                        <option value="Outillage & Quincaillerie">Outillage & Quincaillerie</option>
                        <option value="Électricité & Câblage">Électricité & Câblage</option>
                        <option value="Divers / Consommables">Divers / Consommables</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Code-barres (EAN / UPC)
                      </label>
                      <input 
                        type="text"
                        placeholder="Ex: 6191234567890"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={(formData.codeBarres || []).join(', ')}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeBarres: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Description Détaillée
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Informations techniques, spécifications ou remarques..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs resize-none"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {formData.code && (
                    <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Aperçu Code-barres</span>
                      <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">
                        <Barcode value={formData.code} width={1.5} height={45} displayValue={true} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TARIFICATION */}
              {activeModalTab === 'tarifs' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Prix d'Achat HT (DT)
                      </label>
                      <input 
                        type="number"
                        step="0.001"
                        min="0"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.prixAchatHT || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, prixAchatHT: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Prix de Vente HT (DT) <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="number"
                        step="0.001"
                        min="0"
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.prixVenteHT || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, prixVenteHT: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Prix Promotionnel HT (DT) (Optionnel)
                      </label>
                      <input 
                        type="number"
                        step="0.001"
                        min="0"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.prixPromotionnelHT || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, prixPromotionnelHT: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Taux de TVA (%)
                      </label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        value={formData.tva ?? 19}
                        onChange={(e) => setFormData(prev => ({ ...prev, tva: parseInt(e.target.value) }))}
                      >
                        <option value={19}>19% (Standard)</option>
                        <option value={13}>13% (Intermédiaire)</option>
                        <option value={7}>7% (Réduit)</option>
                        <option value={0}>0% (Exonéré)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900">Marge Commerciale Estimée :</span>
                    <span className="font-black text-indigo-700 text-sm">
                      {(((formData.prixVenteHT || 0) - (formData.prixAchatHT || 0)).toFixed(3))} DT 
                      ({formData.prixVenteHT ? (((formData.prixVenteHT - (formData.prixAchatHT || 0)) / formData.prixVenteHT) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: STOCKS & SEUILS */}
              {activeModalTab === 'stock' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Quantité / Stock Actuel <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="number"
                        min="0"
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.stock || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Statut de l'Article
                      </label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        value={formData.statut || 'Actif'}
                        onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as any }))}
                      >
                        <option value="Actif">🟢 Actif (En Vente)</option>
                        <option value="Inactif">🔴 Inactif (Désactivé)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Stock Minimum (Alerte)
                      </label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.stockMinimum || 10}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockMinimum: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Stock Sécurité
                      </label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.stockSecurite || 5}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockSecurite: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Stock Maximum
                      </label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.stockMaximum || 100}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockMaximum: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 items-start">
                    <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
                    <div>
                      <p className="text-xs font-bold text-amber-900">Gestion des Alertes de Réapprovisionnement</p>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                        Le système déclenchera une alerte automatique sur le tableau de bord lorsque la quantité en stock descendra en dessous du seuil minimum de {formData.stockMinimum || 10} unités.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-5 mt-6 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  Champs marqués d'une <span className="text-rose-500 font-bold">*</span> sont obligatoires
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border border-slate-300"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    Enregistrer l'Article
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}"""

content = prefix + professional_modal_jsx

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Successfully replaced article modal with professional tabbed design.")
