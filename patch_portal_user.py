import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

# 1. Update interface
old_interface = """interface ProjectPortalProps {
  onSelectProject: (id: string) => void;
  onLogout?: () => void;
  projets: Projet[];
  onProjetsChange: (projets: Projet[]) => void;
}"""

new_interface = """import { Utilisateur } from '../types';

interface ProjectPortalProps {
  currentUser?: Utilisateur;
  onSelectProject: (id: string) => void;
  onLogout?: () => void;
  projets: Projet[];
  onProjetsChange: (projets: Projet[]) => void;
}"""
content = content.replace(old_interface, new_interface)

# 2. Update props signature
old_sig = """export function ProjectPortal({ onSelectProject, onLogout, projets, onProjetsChange }: ProjectPortalProps) {"""
new_sig = """export function ProjectPortal({ currentUser, onSelectProject, onLogout, projets, onProjetsChange }: ProjectPortalProps) {"""
content = content.replace(old_sig, new_sig)

# 3. Handle state initialization for portalView based on role
# Wait, let's just initialize portalView to 'projects' if not admin
old_state = """  const [portalView, setPortalView] = useState<'overview' | 'projects' | 'users' | 'statistics' | 'audit'>('overview');"""
new_state = """  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'directeur';
  const allowedProjets = isAdmin ? projets : projets.filter(p => currentUser?.projetsAffectes?.includes(p.id));
  
  const [portalView, setPortalView] = useState<'overview' | 'projects' | 'users' | 'statistics' | 'audit'>(isAdmin ? 'overview' : 'projects');"""
content = content.replace(old_state, new_state)

# 4. Update the usage of `projets` to `allowedProjets` in the filter logic
old_filter = """  // Extraction des villes uniques
  const uniqueVilles = Array.from(new Set(projets.map(p => p.ville).filter(Boolean)));

  const filteredProjets = projets.filter(p => {"""
new_filter = """  // Extraction des villes uniques
  const uniqueVilles = Array.from(new Set(allowedProjets.map(p => p.ville).filter(Boolean)));

  const filteredProjets = allowedProjets.filter(p => {"""
content = content.replace(old_filter, new_filter)

# 5. Hide the sidebar tabs if not admin
old_sidebar_links = """        <nav className="flex-1 px-3 py-6 space-y-2">
          <button 
            onClick={() => setPortalView('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'overview' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'overview' ? "fill" : "regular"}>dashboard</span>
            <span className="font-label-md text-sm">Vue d'ensemble</span>
          </button>
          <button 
            onClick={() => setPortalView('projects')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'projects' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'projects' ? "fill" : "regular"}>folder_managed</span>
            <span className="font-label-md text-sm">Boutiques</span>
          </button>
          <button 
            onClick={() => setPortalView('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'users' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'users' ? "fill" : "regular"}>group</span>
            <span className="font-label-md text-sm">Utilisateurs</span>
          </button>
          <button 
            onClick={() => setPortalView('statistics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'statistics' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'statistics' ? "fill" : "regular"}>bar_chart</span>
            <span className="font-label-md text-sm">Statistiques</span>
          </button>
          <button 
            onClick={() => setPortalView('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'audit' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'audit' ? "fill" : "regular"}>history</span>
            <span className="font-label-md text-sm">Audit & Logs</span>
          </button>"""

new_sidebar_links = """        <nav className="flex-1 px-3 py-6 space-y-2">
          {isAdmin && (
            <button 
              onClick={() => setPortalView('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'overview' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'overview' ? "fill" : "regular"}>dashboard</span>
              <span className="font-label-md text-sm">Vue d'ensemble</span>
            </button>
          )}
          <button 
            onClick={() => setPortalView('projects')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'projects' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'projects' ? "fill" : "regular"}>folder_managed</span>
            <span className="font-label-md text-sm">Boutiques</span>
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={() => setPortalView('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'users' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'users' ? "fill" : "regular"}>group</span>
                <span className="font-label-md text-sm">Utilisateurs</span>
              </button>
              <button 
                onClick={() => setPortalView('statistics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'statistics' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'statistics' ? "fill" : "regular"}>bar_chart</span>
                <span className="font-label-md text-sm">Statistiques</span>
              </button>
              <button 
                onClick={() => setPortalView('audit')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'audit' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'audit' ? "fill" : "regular"}>history</span>
                <span className="font-label-md text-sm">Audit & Logs</span>
              </button>
            </>
          )}"""

content = content.replace(old_sidebar_links, new_sidebar_links)


# 6. Hide the mobile sidebar tabs if not admin
old_mobile_links = """        <div className="flex border-t border-red-800/60 overflow-x-auto bg-red-950/40">
          <button 
            onClick={() => setPortalView('overview')}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'overview' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[16px]">dashboard</span>
            <span className="whitespace-nowrap">Vue d'ensemble</span>
          </button>
          <button 
            onClick={() => setPortalView('projects')}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'projects' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[16px]">folder_managed</span>
            <span className="whitespace-nowrap">Boutiques</span>
          </button>
          <button 
            onClick={() => setPortalView('users')}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'users' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            <span className="whitespace-nowrap">Utilisateurs</span>
          </button>
          <button 
            onClick={() => setPortalView('statistics')}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'statistics' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            <span className="whitespace-nowrap">Statistiques</span>
          </button>
        </div>"""

new_mobile_links = """        <div className="flex border-t border-red-800/60 overflow-x-auto bg-red-950/40">
          {isAdmin && (
            <button 
              onClick={() => setPortalView('overview')}
              className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'overview' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span className="whitespace-nowrap">Vue d'ensemble</span>
            </button>
          )}
          <button 
            onClick={() => setPortalView('projects')}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'projects' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[16px]">folder_managed</span>
            <span className="whitespace-nowrap">Boutiques</span>
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={() => setPortalView('users')}
                className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'users' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[16px]">group</span>
                <span className="whitespace-nowrap">Utilisateurs</span>
              </button>
              <button 
                onClick={() => setPortalView('statistics')}
                className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold transition-all ${portalView === 'statistics' ? 'border-b-2 border-yellow-400 bg-red-800/80 text-white' : 'text-red-200/80 border-b-2 border-transparent hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                <span className="whitespace-nowrap">Statistiques</span>
              </button>
            </>
          )}
        </div>"""

content = content.replace(old_mobile_links, new_mobile_links)

# 7. Hide the "Nouvelle Boutique" and edit/delete actions if not admin
old_new_button = """                    <button 
                      onClick={handleOpenNewModal}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all shrink-0"
                    >
                      <span className="material-symbols-outlined">add_business</span>
                      Nouvelle Boutique
                    </button>"""
new_new_button = """                    {isAdmin && (
                      <button 
                        onClick={handleOpenNewModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all shrink-0"
                      >
                        <span className="material-symbols-outlined">add_business</span>
                        Nouvelle Boutique
                      </button>
                    )}"""
content = content.replace(old_new_button, new_new_button)

old_table_actions = """                        <button 
                          onClick={(e) => handleOpenEditModal(projet, e)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button 
                          onClick={(e) => handleToggleStatus(projet, e)}
                          className={`p-2 rounded-lg transition-colors ${projet.statut === 'Active' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                          title={projet.statut === 'Active' ? 'Désactiver' : 'Activer'}
                        >
                          <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                        </button>"""
new_table_actions = """                        {isAdmin && (
                          <>
                            <button 
                              onClick={(e) => handleOpenEditModal(projet, e)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button 
                              onClick={(e) => handleToggleStatus(projet, e)}
                              className={`p-2 rounded-lg transition-colors ${projet.statut === 'Active' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                              title={projet.statut === 'Active' ? 'Désactiver' : 'Activer'}
                            >
                              <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                            </button>
                          </>
                        )}"""
content = content.replace(old_table_actions, new_table_actions)

old_grid_actions = """                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectModal(projet);
                      }}
                      className="py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-outline-variant flex items-center justify-center gap-1.5 transition-colors"
                      title="Détails"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span className="hidden lg:inline">Détails</span>
                    </button>
                    <button 
                      onClick={(e) => handleOpenEditModal(projet, e)}
                      className="py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-outline-variant flex items-center justify-center gap-1.5 transition-colors"
                      title="Modifier"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span className="hidden lg:inline">Modifier</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={(e) => handleDeleteProject(projet.id, e)}
                      className="py-2 px-3 bg-error/10 hover:bg-error/20 text-error text-xs font-bold rounded-xl border border-error/20 flex items-center justify-center gap-1.5 transition-colors"
                      title="Supprimer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span className="hidden lg:inline">Supprimer</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(projet.id);
                      }}
                      className="py-2 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span className="hidden lg:inline">Accéder</span>
                    </button>
                  </div>"""

new_grid_actions = """                  <div className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-2'} gap-2 pt-2`}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectModal(projet);
                      }}
                      className="py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-outline-variant flex items-center justify-center gap-1.5 transition-colors"
                      title="Détails"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span className="hidden lg:inline">Détails</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(projet.id);
                      }}
                      className="py-2 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span className="hidden lg:inline">Accéder</span>
                    </button>
                  </div>
                  {isAdmin && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button 
                        onClick={(e) => handleOpenEditModal(projet, e)}
                        className="py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-outline-variant flex items-center justify-center gap-1.5 transition-colors"
                        title="Modifier"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span className="hidden lg:inline">Modifier</span>
                      </button>
                      <button 
                        onClick={(e) => handleDeleteProject(projet.id, e)}
                        className="py-2 px-3 bg-error/10 hover:bg-error/20 text-error text-xs font-bold rounded-xl border border-error/20 flex items-center justify-center gap-1.5 transition-colors"
                        title="Supprimer"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span className="hidden lg:inline">Supprimer</span>
                      </button>
                    </div>
                  )}"""

content = content.replace(old_grid_actions, new_grid_actions)

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)

