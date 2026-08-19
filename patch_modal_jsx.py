import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

# Using regex to find everything from {isEditModalOpen && ( up to )}\n    </div>
pattern = r"\{isEditModalOpen && \(\n.*?<div className=\"fixed inset-0.*?</div>\n\s*\)\}\n\s*</div>"
match = re.search(pattern, content, re.DOTALL)

if match:
    old_modal = match.group(0)
    
    new_modal = """{isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">storefront</span>
                </div>
                <div>
                  <h3 className="font-title-lg font-bold text-slate-900">
                    {editingProject ? "Modifier la Boutique" : "Ajouter une Boutique"}
                  </h3>
                  <p className="text-xs text-slate-500">Remplissez les informations de la succursale</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-6">
              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
                  <span className="material-symbols-outlined text-[20px]">error</span>
                  {formError}
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Informations Principales */}
                <div className="space-y-5">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">info</span>
                    Informations Principales
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Nom de la boutique <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: UGS Sfax Centre"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.nom}
                        onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Code boutique <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: SF-CENTRE-001"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase"
                        value={formData.codeBoutique}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeBoutique: e.target.value.toUpperCase() }))}
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Identifiant unique de la boutique.</p>
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Statut <span className="text-red-500">*</span></label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.statut}
                        onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as Projet['statut'] }))}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Archivée">Archivée</option>
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">Une boutique inactive n'accepte pas de nouvelles opérations.</p>
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Responsable</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Mohamed Ali"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.responsable}
                        onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Coordonnées & Localisation */}
                <div className="space-y-5">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">location_on</span>
                    Coordonnées & Localisation
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Adresse physique <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Avenue Habib Bourguiba"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.adresse}
                        onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Ville <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Sfax"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          value={formData.ville}
                          onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Gouvernorat</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Sfax"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          value={formData.gouvernorat}
                          onChange={(e) => setFormData(prev => ({ ...prev, gouvernorat: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Téléphone <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: 74 000 001"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          value={formData.telephone}
                          onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Email</label>
                        <input 
                          type="email" 
                          placeholder="Ex: contact@boutique.tn"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description supplémentaire</label>
                      <textarea 
                        rows={2}
                        placeholder="Notes internes..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>"""

    content = content.replace(old_modal, new_modal)
    
    with open('src/components/ProjectPortal.tsx', 'w') as f:
        f.write(content)
else:
    print("Could not match modal JSX regex.")
