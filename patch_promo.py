import re

with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Add Prix Promotionnel HT to pricing section
prix_old = """                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Prix de Vente HT (DT)</label>
                      <input 
                        type="number"
                        step="0.001"
                        min="0"
                        required
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-green-500 transition-all"
                        value={formData.prixVenteHT}
                        onChange={(e) => setFormData(prev => ({ ...prev, prixVenteHT: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>"""

prix_new = prix_old + """
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Prix Promotionnel HT (DT) (Optionnel)</label>
                      <input 
                        type="number"
                        step="0.001"
                        min="0"
                        className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-green-500 transition-all"
                        value={formData.prixPromotionnelHT || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, prixPromotionnelHT: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>"""
content = content.replace(prix_old, prix_new)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)
