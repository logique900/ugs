const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeSortie.tsx', 'utf8');

// Remove explanations
code = code.replace(/<p className="text-\[10px\] text-indigo-700 font-medium mt-1">Les stocks seront automatiquement crédités dans cette boutique lors de la validation du bon de sortie\.<\/p>/g, '');

// The KPIs in BonsDeSortie are missing, so I'll insert a standard metrics block like in BL, under the header.
// Let's first look at the header:
const headerRegex = /<h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">[\s\S]*?Bons de Sortie \(BS\)[\s\S]*?<\/h1>/;

if (code.match(headerRegex)) {
  const metricsBlock = `
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total BS Émis</span>
            <p className="text-2xl font-bold text-slate-900 mt-2">{filteredBS.length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Articles Sortis</span>
            <p className="text-2xl font-bold text-slate-900 mt-2">{filteredBS.reduce((acc, bs) => acc + bs.lignes.reduce((sum, l) => sum + l.qteDemandee, 0), 0)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Transports Internes</span>
            <p className="text-2xl font-bold text-slate-900 mt-2">{filteredBS.filter(bs => bs.motif === 'Transfert').length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sorties Validées</span>
            <p className="text-2xl font-bold text-emerald-600 mt-2">{filteredBS.filter(bs => bs.statut === 'Validé (Sortie Stock)').length}</p>
          </div>
        </div>
`;
  // We will insert this later if we know where exactly. Let's see the header again.
}

fs.writeFileSync('src/components/BonsDeSortie.tsx', code);
