import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

old_toolbar = """                <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h2 className="font-display-sm md:font-display-md text-display-sm md:text-display-md text-on-surface mb-1 md:mb-2">Espaces de Travail & Boutiques</h2>
                    <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant">Sélectionnez une boutique pour accéder à sa gestion commerciale et logistique ou consulter sa fiche détaillée.</p>
                  </div>
                </div>"""

new_toolbar = """                <div className="mb-6 md:mb-8 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display-sm md:font-display-md text-display-sm md:text-display-md text-on-surface mb-1 md:mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600">storefront</span>
                        Boutiques & Succursales
                      </h2>
                      <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant">Sélectionnez une boutique pour accéder à sa gestion commerciale et logistique ou consulter sa fiche détaillée.</p>
                    </div>
                    <button 
                      onClick={handleOpenNewModal}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all shrink-0"
                    >
                      <span className="material-symbols-outlined">add_business</span>
                      Nouvelle Boutique
                    </button>
                  </div>
                  
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
                      <div className="relative flex-1 min-w-[200px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                        <input 
                          type="text" 
                          placeholder="Rechercher (nom, code, resp.)..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Archivée">Archivée</option>
                      </select>
                      <select 
                        value={villeFilter}
                        onChange={(e) => setVilleFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="all">Toutes les villes</option>
                        {uniqueVilles.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                      <button 
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Vue Liste (Tableau)"
                      >
                        <span className="material-symbols-outlined text-[20px]">table_rows</span>
                      </button>
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Vue Grille (Cartes)"
                      >
                        <span className="material-symbols-outlined text-[20px]">grid_view</span>
                      </button>
                    </div>
                  </div>
                </div>"""

if old_toolbar in content:
    content = content.replace(old_toolbar, new_toolbar)
else:
    print("Old toolbar not found")

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)

