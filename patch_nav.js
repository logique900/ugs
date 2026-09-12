const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the entire nav block with a single unified bottom nav
const navRegex = /<nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900\/95 backdrop-blur-md border-t border-slate-800 px-2 py-1\.5 flex items-center justify-around shadow-2xl">[\s\S]*?<\/nav>/;

const newNav = `<nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={\`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer \${
              activeTab === 'dashboard' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }\`}
          >
            <span className="material-symbols-outlined text-[22px]">dashboard</span>
            <span className="text-[10px] tracking-tight mt-0.5">Tableau</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('livraisons')}
            className={\`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer \${
              activeTab === 'livraisons' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }\`}
          >
            <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            <span className="text-[10px] tracking-tight mt-0.5">BL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bons_sortie')}
            className={\`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer \${
              activeTab === 'bons_sortie' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }\`}
          >
            <span className="material-symbols-outlined text-[22px]">output</span>
            <span className="text-[10px] tracking-tight mt-0.5">BS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={\`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer \${
              activeTab === 'stock' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }\`}
          >
            <span className="material-symbols-outlined text-[22px]">warehouse</span>
            <span className="text-[10px] tracking-tight mt-0.5">Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
            <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
          </button>
        </nav>`;

code = code.replace(navRegex, newNav);
fs.writeFileSync('src/App.tsx', code);
