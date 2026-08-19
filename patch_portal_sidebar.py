import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

# Wrap navigation items with role checks in ProjectPortal sidebar
old_nav = """        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1.5">
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

new_nav = """        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1.5">
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
            <button 
              onClick={() => setPortalView('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'users' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'users' ? "fill" : "regular"}>group</span>
              <span className="font-label-md text-sm">Utilisateurs</span>
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setPortalView('statistics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'statistics' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'statistics' ? "fill" : "regular"}>bar_chart</span>
              <span className="font-label-md text-sm">Statistiques</span>
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setPortalView('audit')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${portalView === 'audit' ? 'border-indigo-500 bg-slate-800 text-white font-bold shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[20px]" data-weight={portalView === 'audit' ? "fill" : "regular"}>history</span>
              <span className="font-label-md text-sm">Audit & Logs</span>
            </button>
          )}"""

content = content.replace(old_nav, new_nav)

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)

print("Successfully applied role checks to ProjectPortal sidebar navigation.")
