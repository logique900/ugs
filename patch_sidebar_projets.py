import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

old_filter = """  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentProject = projets.find(p => p.id === selectedProjectId);"""

new_filter = """  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'directeur';
  const allowedProjets = isAdmin ? projets : projets.filter(p => currentUser?.projetsAffectes?.includes(p.id));
  
  const currentProject = allowedProjets.find(p => p.id === selectedProjectId);"""

content = content.replace(old_filter, new_filter)


old_select = """              <select 
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
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
                className="w-full pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >
                {isAdmin && <option value="all">🏢 Système Central (Global)</option>}
                <optgroup label={isAdmin ? "Boutiques Actives" : "Mes Boutiques"}>
                  {allowedProjets.map(p => (
                    <option key={p.id} value={p.id}>📁 {p.nom}</option>
                  ))}
                </optgroup>
              </select>"""

content = content.replace(old_select, new_select)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)

