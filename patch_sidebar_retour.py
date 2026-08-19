import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

old_logo = """        {/* Logo & Header */}
        <div className={`p-4 md:p-6 flex items-center justify-between transition-all duration-300 ${isCollapsed ? 'md:justify-center' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <span className="material-symbols-outlined text-white text-[22px]">domain</span>
            </div>
            <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
              <span className="text-white font-black text-lg tracking-tight leading-tight">Portail ERP</span>
              <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider">Business Suite</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isCollapsed ? 'menu_open' : 'menu_open'}
            </span>
          </button>
        </div>"""

new_logo = """        {/* Logo & Header */}
        <div className={`p-4 md:p-6 flex flex-col gap-4 transition-all duration-300`}>
          <div className={`flex items-center justify-between ${isCollapsed ? 'md:justify-center' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <span className="material-symbols-outlined text-white text-[22px]">domain</span>
              </div>
              <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
                <span className="text-white font-black text-lg tracking-tight leading-tight">Portail ERP</span>
                <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider">Business Suite</span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isCollapsed ? 'menu_open' : 'menu_open'}
              </span>
            </button>
          </div>
          
          {currentUser?.role === 'admin' && (
            <button
              onClick={onReturnToPortal}
              className={`flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors ${isCollapsed ? 'md:justify-center' : ''}`}
            >
              <span className="material-symbols-outlined text-[16px]">apps</span>
              {!isCollapsed && <span>Portail Central</span>}
            </button>
          )}
        </div>"""

content = content.replace(old_logo, new_logo)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
