import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

# Replace filteredProjets.map with paginatedProjets.map
content = content.replace("filteredProjets.map(projet => {", "paginatedProjets.map(projet => {")

# Wrap the grid
grid_start = """<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Project Cards */}"""

grid_end = """            <h3 className="font-title-lg text-title-lg text-on-surface font-bold mb-1 group-hover:text-red-700 transition-colors">Nouvelle Boutique</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Créer un nouvel espace de travail indépendant.</p>
          </div>
        </div>"""

if grid_start in content and grid_end in content:
    idx_start = content.find(grid_start)
    idx_end = content.find(grid_end) + len(grid_end)
    
    grid_content = content[idx_start:idx_end]
    
    new_layout = f"""{{viewMode === 'grid' ? (
        {grid_content}
    ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={{() => handleSort('codeBoutique')}}>
                    <div className="flex items-center gap-2">Code {{sortConfig.key === 'codeBoutique' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={{() => handleSort('nom')}}>
                    <div className="flex items-center gap-2">Boutique {{sortConfig.key === 'nom' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={{() => handleSort('ville')}}>
                    <div className="flex items-center gap-2">Ville {{sortConfig.key === 'ville' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={{() => handleSort('responsable')}}>
                    <div className="flex items-center gap-2">Responsable {{sortConfig.key === 'responsable' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={{() => handleSort('statut')}}>
                    <div className="flex items-center gap-2">Statut {{sortConfig.key === 'statut' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}}</div>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {{paginatedProjets.map(projet => (
                  <tr key={{projet.id}} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{{projet.codeBoutique || '---'}}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{{projet.nom}}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{{projet.description}}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-600 font-medium">{{projet.ville || '---'}}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-700 font-medium">{{projet.responsable || '---'}}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {{getStatusBadge(projet.statut)}}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={{(e) => {{ e.stopPropagation(); setSelectedProjectModal(projet); }}}}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Voir Détails"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button 
                          onClick={{(e) => handleOpenEditModal(projet, e)}}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button 
                          onClick={{(e) => handleToggleStatus(projet, e)}}
                          className={{`p-2 rounded-lg transition-colors ${{projet.statut === 'Active' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}}`}}
                          title={{projet.statut === 'Active' ? 'Désactiver' : 'Activer'}}
                        >
                          <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                        </button>
                        <button 
                          onClick={{(e) => {{ e.stopPropagation(); onSelectProject(projet.id); }}}}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Accéder à l'espace de travail"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}}
                {{paginatedProjets.length === 0 && (
                  <tr>
                    <td colSpan={{6}} className="px-5 py-12 text-center text-slate-500">
                      Aucune boutique trouvée correspondant à vos critères.
                    </td>
                  </tr>
                )}}
              </tbody>
            </table>
          </div>
        </div>
    )}}
    
    {{/* Pagination Controls */}}
    {{totalPages > 1 && (
      <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-sm text-slate-500">
          Affichage {{(currentPage - 1) * itemsPerPage + 1}} à {{Math.min(currentPage * itemsPerPage, filteredProjets.length)}} sur {{filteredProjets.length}}
        </span>
        <div className="flex items-center gap-1">
          <button 
            disabled={{currentPage === 1}}
            onClick={{() => setCurrentPage(p => Math.max(1, p - 1))}}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          
          {{Array.from({{length: totalPages}}).map((_, i) => (
            <button
              key={{i}}
              onClick={{() => setCurrentPage(i + 1)}}
              className={{`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${{currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}}`}}
            >
              {{i + 1}}
            </button>
          ))}}
          
          <button 
            disabled={{currentPage === totalPages}}
            onClick={{() => setCurrentPage(p => Math.min(totalPages, p + 1))}}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>
    )}}"""

    content = content[:idx_start] + new_layout + content[idx_end:]

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)

