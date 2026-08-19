import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

old_select = """              <select
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-slate-800/90 hover:bg-slate-800 text-white border border-slate-700/80 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none transition-all shadow-xs"
              >
                <option value="all">🏢 Système Central (Global)</option>
                <optgroup label="Boutiques Actives">
                  {projets.map(p => (
                    <option key={p.id} value={p.id}>📁 {p.nom}</option>
                  ))}
                </optgroup>
              </select>"""

new_select = """              <select
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                disabled={!isAdmin && allowedProjets.length <= 1}
                className={`w-full pl-8 pr-7 py-2 bg-slate-800/90 hover:bg-slate-800 text-white border border-slate-700/80 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 appearance-none transition-all shadow-xs ${!isAdmin && allowedProjets.length <= 1 ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                {isAdmin && <option value="all">🏢 Toutes les boutiques</option>}
                <optgroup label={isAdmin ? "Boutiques Actives" : "Mes Boutiques"}>
                  {allowedProjets.map(p => (
                    <option key={p.id} value={p.id}>📁 {p.nom}</option>
                  ))}
                </optgroup>
              </select>"""

content = content.replace(old_select, new_select)

old_condition = """        {currentUser?.role === 'admin' && !isCollapsed && ("""
new_condition = """        {(isAdmin || allowedProjets.length > 1) && !isCollapsed && ("""

content = content.replace(old_condition, new_condition)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)

