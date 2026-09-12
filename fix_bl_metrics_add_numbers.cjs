const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeLivraison.tsx', 'utf8');

// Insert metric values
code = code.replace(
  /<div className="flex justify-between items-start text-slate-400">\s*<span className="text-\[11px\] font-bold uppercase tracking-wider">Total BL Émis<\/span>\s*<span className="material-symbols-outlined text-\[18px\] text-indigo-400">receipt_long<\/span>\s*<\/div>/,
  `<div className="flex justify-between items-start text-slate-400">
    <span className="text-[11px] font-bold uppercase tracking-wider">Total BL Émis</span>
    <span className="material-symbols-outlined text-[18px] text-indigo-400">receipt_long</span>
  </div>
  <p className="text-2xl font-bold text-white mt-2">{filteredBLs.length}</p>`
);

code = code.replace(
  /<div className="flex justify-between items-start text-slate-400">\s*<span className="text-\[11px\] font-bold uppercase tracking-wider">Livraisons Effectuées<\/span>\s*<span className="material-symbols-outlined text-\[18px\] text-emerald-400">verified<\/span>\s*<\/div>/,
  `<div className="flex justify-between items-start text-slate-400">
    <span className="text-[11px] font-bold uppercase tracking-wider">Livraisons Effectuées</span>
    <span className="material-symbols-outlined text-[18px] text-emerald-400">verified</span>
  </div>
  <p className="text-2xl font-bold text-white mt-2">{filteredBLs.filter(b => b.statut === 'Livré').length}</p>`
);

code = code.replace(
  /<div className="flex justify-between items-start text-slate-400">\s*<span className="text-\[11px\] font-bold uppercase tracking-wider">En Cours \/ Transit<\/span>\s*<span className="material-symbols-outlined text-\[18px\] text-amber-400">local_shipping<\/span>\s*<\/div>/,
  `<div className="flex justify-between items-start text-slate-400">
    <span className="text-[11px] font-bold uppercase tracking-wider">En Cours / Transit</span>
    <span className="material-symbols-outlined text-[18px] text-amber-400">local_shipping</span>
  </div>
  <p className="text-2xl font-bold text-white mt-2">{filteredBLs.filter(b => b.statut === 'En Transit' || b.statut === 'En Préparation').length}</p>`
);

code = code.replace(
  /<div className="flex justify-between items-start text-slate-400">\s*<span className="text-\[11px\] font-bold uppercase tracking-wider">Valeur Livrée TTC<\/span>\s*<span className="material-symbols-outlined text-\[18px\] text-indigo-400">payments<\/span>\s*<\/div>/,
  `<div className="flex justify-between items-start text-slate-400">
    <span className="text-[11px] font-bold uppercase tracking-wider">Valeur Livrée TTC</span>
    <span className="material-symbols-outlined text-[18px] text-indigo-400">payments</span>
  </div>
  <p className="text-2xl font-bold text-white mt-2">
    {filteredBLs.filter(b => b.statut === 'Livré').reduce((sum, b) => sum + b.montantTTC, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-400">DT</span>
  </p>`
);

fs.writeFileSync('src/components/BonsDeLivraison.tsx', code);
