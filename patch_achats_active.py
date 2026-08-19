import re

with open('src/components/Achats.tsx', 'r') as f:
    content = f.read()

old_btn = """          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouveau Bon d'Achat
          </button>"""

new_btn = """          <button
            onClick={handleOpenCreate}
            disabled={!isProjectActive}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl transition-all ${!isProjectActive ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md cursor-pointer'}`}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouveau Bon d'Achat
          </button>"""

content = content.replace(old_btn, new_btn)

with open('src/components/Achats.tsx', 'w') as f:
    f.write(content)

print("Patched Achats.tsx with isProjectActive check")
