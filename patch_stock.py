import re

with open('src/components/Stock.tsx', 'r') as f:
    content = f.read()

old_isglobal = """  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);"""

new_isglobal = """  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);
  const isProjectActive = currentProject ? (currentProject.statut === 'Active' || currentProject.statut === 'Actif') : true;"""

if old_isglobal in content:
    content = content.replace(old_isglobal, new_isglobal)

old_header = """      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">"""
new_header = """      {/* Section Header */}
      {!isProjectActive && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-sm font-bold">
          <span className="material-symbols-outlined text-[24px]">warning</span>
          Cette boutique est actuellement inactive. Vous ne pouvez pas gérer le stock.
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">"""

if old_header in content:
    content = content.replace(old_header, new_header)

old_btn_stock = """          <button 
            onClick={() => { setModalArticleId(null); setModalType('Entrée'); }}
            className="group relative inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md overflow-hidden"
          >
            <span className="material-symbols-outlined text-[20px] mr-2">add_shopping_cart</span>
            Nouvelle Entrée
          </button>"""
new_btn_stock = """          <button 
            onClick={() => { setModalArticleId(null); setModalType('Entrée'); }}
            disabled={!isProjectActive}
            className={`group relative inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-bold transition-all shadow-md overflow-hidden ${!isProjectActive ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-primary hover:bg-red-700 text-white'}`}
          >
            <span className="material-symbols-outlined text-[20px] mr-2">add_shopping_cart</span>
            Nouvelle Entrée
          </button>"""

if old_btn_stock in content:
    content = content.replace(old_btn_stock, new_btn_stock)

old_row_btn1 = """                            <button 
                              onClick={() => { setModalArticleId(article.id); setModalType('Entrée'); }}
                              className="p-1.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Ajouter (Entrée)"
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>"""
new_row_btn1 = """                            <button 
                              onClick={() => { setModalArticleId(article.id); setModalType('Entrée'); }}
                              disabled={!isProjectActive}
                              className={`p-1.5 rounded-lg transition-colors ${!isProjectActive ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white cursor-pointer'}`}
                              title="Ajouter (Entrée)"
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>"""

if old_row_btn1 in content:
    content = content.replace(old_row_btn1, new_row_btn1)

old_row_btn2 = """                            <button 
                              onClick={() => { setModalArticleId(article.id); setModalType('Sortie'); }}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Retirer (Sortie / Perte)"
                            >
                              <span className="material-symbols-outlined text-[18px]">remove</span>
                            </button>"""
new_row_btn2 = """                            <button 
                              onClick={() => { setModalArticleId(article.id); setModalType('Sortie'); }}
                              disabled={!isProjectActive}
                              className={`p-1.5 rounded-lg transition-colors ${!isProjectActive ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white cursor-pointer'}`}
                              title="Retirer (Sortie / Perte)"
                            >
                              <span className="material-symbols-outlined text-[18px]">remove</span>
                            </button>"""
if old_row_btn2 in content:
    content = content.replace(old_row_btn2, new_row_btn2)

with open('src/components/Stock.tsx', 'w') as f:
    f.write(content)
