import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

old_btn = """          <button 
            onClick={onReturnToPortal}
            className={`text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ${isCollapsed ? 'p-2' : 'p-1.5'}`}
            title="Retourner au portail"
          >
            <span className="material-symbols-outlined text-[18px]">apps</span>
          </button>"""

new_btn = """          {(isAdmin || allowedProjets.length > 1) && (
            <button 
              onClick={onReturnToPortal}
              className={`text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ${isCollapsed ? 'p-2' : 'p-1.5'}`}
              title="Retourner au portail"
            >
              <span className="material-symbols-outlined text-[18px]">apps</span>
            </button>
          )}"""

content = content.replace(old_btn, new_btn)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)

