import re

with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Add categories state and category modal state
state_insertion = """  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'ident' | 'tarifs' | 'stock'>('ident');
  const [formError, setFormError] = useState('');
  
  // Categories management (BF-PROD-004)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState<string[]>([
    'Informatique > Ordinateurs',
    'Informatique > Laptops',
    'Informatique > Écrans',
    'Informatique > Imprimantes',
    'Téléphonie > Smartphones',
    'Téléphonie > Tablettes',
    'Téléphonie > Accessoires',
    'Réseau > Switches',
    'Réseau > Routeurs',
    'Réseau > Câbles',
    'Réseau > Accessoires réseau',
    'Matériaux BTP',
    'Outillage & Quincaillerie',
    'Électricité & Câblage'
  ]);
  const [newCategoryName, setNewCategoryName] = useState('');"""

content = content.replace(
    '  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);',
    state_insertion
)

# Let's add the "Gérer Catégories" button in the action header (near "Référencer un Article")
old_header_buttons = """          <div className="flex flex-wrap items-center gap-2">
            {currentUser.role !== 'caissier' && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Référencer un Article
              </button>
            )}
          </div>"""

new_header_buttons = """          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              Gérer les Catégories
            </button>
            {currentUser.role !== 'caissier' && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Référencer un Article
              </button>
            )}
          </div>"""

content = content.replace(old_header_buttons, new_header_buttons)

# Add category modal at the end before final closing div
category_modal_jsx = """
      {/* Category Management Modal (BF-PROD-004) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">account_tree</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Gestion des Catégories & Familles</h3>
                  <p className="text-xs text-slate-400">Arborescence et classification des produits (BF-PROD-004)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Add Category Form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">add_circle</span> Ajouter une catégorie / sous-catégorie
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Réseau > Routeurs ou Informatique > Laptops"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (newCategoryName.trim() && !categoriesList.includes(newCategoryName.trim())) {
                        setCategoriesList([...categoriesList, newCategoryName.trim()]);
                        setNewCategoryName('');
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all whitespace-nowrap"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Categories List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Catégories Actives ({categoriesList.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoriesList.map((cat, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-indigo-300 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600 text-[18px]">folder</span>
                        <span className="text-xs font-bold text-slate-800">{cat}</span>
                      </div>
                      <button
                        onClick={() => setCategoriesList(categoriesList.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer la catégorie"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
"""

# Insert before the last closing div of Articles.tsx
content = content.replace("    </div>\n  );\n}", category_modal_jsx + "\n    </div>\n  );\n}")

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Added categories management modal and state")
