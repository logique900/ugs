const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const badBlockRegex = /return \(\s*onSelectProject=\{setSelectedProjectId\}[\s\S]*?onActionLogsChange=\{setActionLogs\}\s*\/>\s*\);/;

const fix = `return (
            <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200 m-6 max-w-2xl mx-auto">
              <span className="material-symbols-outlined text-5xl text-amber-500 mb-3">lock</span>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Module Désactivé</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Ce module a été retiré.
              </p>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Retour
              </button>
            </div>
          );`;

code = code.replace(badBlockRegex, fix);
fs.writeFileSync('src/App.tsx', code);
