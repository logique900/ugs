import re

with open('src/components/AdminUsers.tsx', 'r') as f:
    content = f.read()

old_select = """              {formData.role !== 'admin' && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Boutique d'Affectation</label>
                  <select 
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                    value={formData.projetId}
                    onChange={(e) => setFormData(prev => ({ ...prev, projetId: e.target.value }))}
                  >
                    {projets.map(p => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>
              )}"""

new_select = """              {formData.role !== 'admin' && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-3">Boutiques d'Affectation</label>
                  <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 max-h-[160px] overflow-y-auto flex flex-col gap-2">
                    {projets.map(p => {
                      const isSelected = formData.projetsAffectes.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-outline-variant shadow-sm hover:shadow-md">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-2"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, projetsAffectes: [...prev.projetsAffectes, p.id] }));
                              } else {
                                setFormData(prev => ({ ...prev, projetsAffectes: prev.projetsAffectes.filter(id => id !== p.id) }));
                              }
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-on-surface">{p.nom}</span>
                            <span className="text-[10px] text-on-surface-variant font-mono">{p.codeBoutique || 'SANS CODE'}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {formData.projetsAffectes.length === 0 && (
                    <p className="text-[11px] text-error mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      Veuillez sélectionner au moins une boutique
                    </p>
                  )}
                </div>
              )}"""

if old_select in content:
    content = content.replace(old_select, new_select)
else:
    print("Could not find old select")

with open('src/components/AdminUsers.tsx', 'w') as f:
    f.write(content)

