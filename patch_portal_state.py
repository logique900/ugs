import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

# 1. State changes
old_state = """  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Projet | null>(null);
  const [formData, setFormData] = useState<Partial<Projet>>({"""

new_state = """  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState('all');
  const [villeFilter, setVilleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [sortConfig, setSortConfig] = useState<{ key: keyof Projet, direction: 'asc' | 'desc' }>({ key: 'nom', direction: 'asc' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Projet | null>(null);
  const [formData, setFormData] = useState<Partial<Projet>>({"""

if old_state in content:
    content = content.replace(old_state, new_state)

# 2. Add derived variables (Villes unqiues, etc.) and filtering logic
old_filter = """  const filteredProjets = projets.filter(p => 
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );"""

new_filter = """  // Extraction des villes uniques
  const uniqueVilles = Array.from(new Set(projets.map(p => p.ville).filter(Boolean)));

  const filteredProjets = projets.filter(p => {
    const matchesSearch = p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.responsable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.codeBoutique?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.statut === statusFilter;
    const matchesVille = villeFilter === 'all' || p.ville === villeFilter;
    return matchesSearch && matchesStatus && matchesVille;
  }).sort((a, b) => {
    const aValue = String(a[sortConfig.key] || '').toLowerCase();
    const bValue = String(b[sortConfig.key] || '').toLowerCase();
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(filteredProjets.length / itemsPerPage);
  const paginatedProjets = filteredProjets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: keyof Projet) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const handleToggleStatus = (projet: Projet, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatut = projet.statut === 'Active' ? 'Inactive' : 'Active';
    onProjetsChange(projets.map(p => p.id === projet.id ? { ...p, statut: newStatut } : p));
  };"""

if old_filter in content:
    content = content.replace(old_filter, new_filter)

# 3. Replace Toolbar in overview
old_toolbar = """                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h2 className="font-title-lg font-bold text-on-surface text-xl">Succursales Actives</h2>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                      <input 
                        type="text" 
                        placeholder="Rechercher une succursale..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant rounded-xl text-sm font-medium focus:outline-none focus:border-red-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>"""

new_toolbar = """                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h2 className="font-title-lg font-bold text-on-surface text-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">storefront</span>
                    Boutiques & Succursales
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64 min-w-[200px]">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                      <input 
                        type="text" 
                        placeholder="Rechercher (nom, code, resp.)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 shadow-sm"
                      />
                    </div>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 shadow-sm"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Archivée">Archivée</option>
                    </select>
                    <select 
                      value={villeFilter}
                      onChange={(e) => setVilleFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 shadow-sm"
                    >
                      <option value="all">Toutes les villes</option>
                      {uniqueVilles.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button 
                        onClick={() => setViewMode('table')}
                        className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Vue Liste"
                      >
                        <span className="material-symbols-outlined text-[18px]">table_rows</span>
                      </button>
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Vue Grille"
                      >
                        <span className="material-symbols-outlined text-[18px]">grid_view</span>
                      </button>
                    </div>
                  </div>
                </div>"""

if old_toolbar in content:
    content = content.replace(old_toolbar, new_toolbar)

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)

