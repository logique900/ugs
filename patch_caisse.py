import re

with open('src/components/Caisse.tsx', 'r') as f:
    content = f.read()

old_isglobal = """  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);"""

new_isglobal = """  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);
  const isProjectActive = currentProject ? (currentProject.statut === 'Active' || currentProject.statut === 'Actif') : true;"""

if old_isglobal in content:
    content = content.replace(old_isglobal, new_isglobal)

old_header = """      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">"""
new_header = """      {/* Header */}
      {!isProjectActive && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-sm font-bold">
          <span className="material-symbols-outlined text-[24px]">warning</span>
          Cette boutique est actuellement inactive. Vous ne pouvez pas créer de nouveaux mouvements de caisse.
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">"""

if old_header in content:
    content = content.replace(old_header, new_header)

old_btn_caisse = """          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouveau Mouvement
          </button>"""
new_btn_caisse = """          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={!isProjectActive}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-bold text-sm rounded-xl transition-all ${!isProjectActive ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer'}`}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouveau Mouvement
          </button>"""

if old_btn_caisse in content:
    content = content.replace(old_btn_caisse, new_btn_caisse)

with open('src/components/Caisse.tsx', 'w') as f:
    f.write(content)
