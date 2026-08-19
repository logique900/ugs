import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

old_select_wrapper = """              <select 
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >"""

new_select_wrapper = """              <select 
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                disabled={!isAdmin && allowedProjets.length <= 1}
                className={`w-full pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-500 appearance-none ${!isAdmin && allowedProjets.length <= 1 ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >"""

content = content.replace(old_select_wrapper, new_select_wrapper)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)

