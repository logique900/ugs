import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

old_buttons = """                    {isAdmin && (
                      <button 
                        onClick={handleOpenNewModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all shrink-0"
                      >
                        <span className="material-symbols-outlined">add_business</span>
                        Nouvelle Boutique
                      </button>
                    )}"""

new_buttons = """                    {isAdmin && (
                      <div className="flex gap-2 shrink-0">
                        <button 
                          onClick={() => onSelectProject('all')}
                          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-all"
                        >
                          <span className="material-symbols-outlined">public</span>
                          Toutes les boutiques
                        </button>
                        <button 
                          onClick={handleOpenNewModal}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all"
                        >
                          <span className="material-symbols-outlined">add_business</span>
                          Nouvelle Boutique
                        </button>
                      </div>
                    )}"""

content = content.replace(old_buttons, new_buttons)

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)

