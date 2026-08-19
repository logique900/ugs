import re

with open('src/components/Clients.tsx', 'r') as f:
    content = f.read()

old_form = """                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Type de Tiers *</label>"""
new_form = """                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isGlobal && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Boutique d'affectation *</label>
                        <select
                          required
                          value={formData.projetId || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, projetId: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {projets.map(p => (
                            <option key={p.id} value={p.id}>{p.nom}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Type de Tiers *</label>"""
content = content.replace(old_form, new_form)

with open('src/components/Clients.tsx', 'w') as f:
    f.write(content)
