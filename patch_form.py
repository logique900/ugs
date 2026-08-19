import re

with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Update the form inside the modal
form_identification_old = """                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Code Article *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: ART-001"
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      />
                    </div>"""

form_identification_new = """                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Code Article *</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: ART-001"
                          className="flex-1 px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
                          value={formData.code}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                        />
                        <button type="button" onClick={generateArticleCode} className="p-2.5 bg-surface-container border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors" title="Générer automatiquement">
                          <span className="material-symbols-outlined text-[18px]">autorenew</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Référence Interne</label>
                      <input 
                        type="text" 
                        placeholder="Ex: REF-ABC-123"
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
                        value={formData.referenceInterne || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, referenceInterne: e.target.value }))}
                      />
                    </div>"""

content = content.replace(form_identification_old, form_identification_new)

# Add remaining fields like Category, Brand, Measurement unit to Identification section
famille_old = """                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Famille *</label>
                      <input 
                        type="text"
                        required
                        list="familles-list"
                        placeholder="Ex: Fournitures, Équipement..."
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
                        value={formData.famille}
                        onChange={(e) => setFormData(prev => ({ ...prev, famille: e.target.value }))}
                      />
                      <datalist id="familles-list">
                        {familles.map(f => <option key={f} value={f} />)}
                      </datalist>
                    </div>"""

famille_new = famille_old + """
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Catégorie</label>
                      <input 
                        type="text"
                        placeholder="Ex: Informatique, Bois..."
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
                        value={formData.categorie || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, categorie: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Marque</label>
                      <input 
                        type="text"
                        placeholder="Ex: Logitech, Dell..."
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
                        value={formData.marque || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, marque: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Unité de mesure</label>
                      <input 
                        type="text"
                        placeholder="Ex: Unité, kg, m²..."
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
                        value={formData.uniteMesure || 'Unité'}
                        onChange={(e) => setFormData(prev => ({ ...prev, uniteMesure: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Codes-barres (séparés par virgule)</label>
                      <input 
                        type="text"
                        placeholder="Scan ou saisie manuelle..."
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
                        value={(formData.codeBarres || []).join(', ')}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeBarres: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                      />
                    </div>
"""
content = content.replace(famille_old, famille_new)

# Add Stock thresholds
stock_old = """                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Stock Actuel</label>
                      <input 
                        type="number"
                        min="0"
                        required
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-orange-500 transition-all"
                        value={formData.stock}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                      />
                    </div>"""

stock_new = stock_old + """
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Stock Minimum (Alerte)</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-orange-500 transition-all"
                        value={formData.stockMinimum || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockMinimum: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Stock Maximum</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-orange-500 transition-all"
                        value={formData.stockMaximum || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockMaximum: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Stock Sécurité</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-orange-500 transition-all"
                        value={formData.stockSecurite || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockSecurite: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Dépôt Principal</label>
                      <input 
                        type="text"
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-orange-500 transition-all"
                        value={formData.depotPrincipal || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, depotPrincipal: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Statut</label>
                      <select 
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-orange-500 transition-all"
                        value={formData.statut || 'Actif'}
                        onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as any }))}
                      >
                        <option value="Actif">Actif</option>
                        <option value="Inactif">Inactif</option>
                      </select>
                    </div>
"""
content = content.replace(stock_old, stock_new)

alert_old = """Le système vous alertera automatiquement lorsque ce produit passera en dessous de 15 unités."""
alert_new = """Le système vous alertera automatiquement lorsque ce produit passera en dessous de {formData.stockMinimum || 15} unités."""
content = content.replace(alert_old, alert_new)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)
