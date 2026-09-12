const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDAchat.tsx', 'utf8');

const insertTarget = `          </div>
        </div>

        {/* Workflow steps diagram */}`;
        
const replacement = `          </div>
        </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Commandes</span>
            <span className="material-symbols-outlined text-[18px] text-blue-400">shopping_cart</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBA.length}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Réceptions Validées</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400">inventory</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBA.filter(ba => ba.statut === 'Réceptionné').length}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Attente / Partiel</span>
            <span className="material-symbols-outlined text-[18px] text-amber-400">pending_actions</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{filteredBA.filter(ba => ba.statut === 'En Attente' || ba.statut === 'Partiellement Reçu').length}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Valeur Totale TTC</span>
            <span className="material-symbols-outlined text-[18px] text-indigo-400">payments</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {filteredBA.reduce((sum, ba) => sum + ba.montantTTC, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-400">DT</span>
          </p>
        </div>
      </div>

        {/* Workflow steps diagram */}`;

code = code.replace(insertTarget, replacement);

fs.writeFileSync('src/components/BonsDAchat.tsx', code);
