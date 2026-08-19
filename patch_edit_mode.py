import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

# Make Code Boutique disabled when editing
old_code_input = """                      <input 
                        type="text" 
                        required
                        placeholder="Ex: SF-CENTRE-001"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase"
                        value={formData.codeBoutique}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeBoutique: e.target.value.toUpperCase() }))}
                      />"""

new_code_input = """                      <input 
                        type="text" 
                        required
                        disabled={!!editingProject}
                        placeholder="Ex: SF-CENTRE-001"
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all uppercase ${editingProject ? 'bg-slate-100 border-transparent text-slate-500 cursor-not-allowed' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}
                        value={formData.codeBoutique}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeBoutique: e.target.value.toUpperCase() }))}
                      />"""

if old_code_input in content:
    content = content.replace(old_code_input, new_code_input)
else:
    print("Warning: Code boutique input not found for patching")

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)
