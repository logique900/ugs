const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeSortie.tsx', 'utf8');

// The BS component didn't have KPIs at all. Let's insert them right after the header block.
// The header block ends with:
/*
      </div>

      {/* BL vs BS Comparative Table *\/}
*/

const insertTarget = `      </div>\n\n      {/* BL vs BS Comparative Table */}`;
const replacement = `      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total BS Émis</span>
            <span className="material-symbols-outlined text-[18px] text-purple-400">outbox</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBS.length}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Articles Sortis</span>
            <span className="material-symbols-outlined text-[18px] text-indigo-400">inventory_2</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBS.reduce((acc, bs) => acc + bs.lignes.reduce((sum, l) => sum + l.qteDemandee, 0), 0)}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Transports Internes</span>
            <span className="material-symbols-outlined text-[18px] text-amber-400">local_shipping</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBS.filter(bs => bs.motif === 'Transfert').length}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sorties Validées</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400">verified</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBS.filter(bs => bs.statut === 'Validé (Sortie Stock)').length}</p>
        </div>
      </div>

      {/* BL vs BS Comparative Table */}`;

code = code.replace(insertTarget, replacement);

fs.writeFileSync('src/components/BonsDeSortie.tsx', code);
