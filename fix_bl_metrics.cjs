const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeLivraison.tsx', 'utf8');

code = code.replace(/<span className="text-\[10px\] text-indigo-300 mt-0\.5 block">Document\(s\) logistique\(s\)<\/span>/, '');
code = code.replace(/<span className="text-\[10px\] text-slate-300 mt-0\.5 block">Preuves de réception validées<\/span>/, '');
code = code.replace(/<span className="text-\[10px\] text-slate-300 mt-0\.5 block">Préparation & Expéditions<\/span>/, '');
code = code.replace(/<span className="text-\[10px\] text-slate-300 mt-0\.5 block">Marchandises sorties<\/span>/, '');
code = code.replace(/<span className="px-2\.5 py-1 bg-emerald-500\/20 text-emerald-300 text-\[10px\] font-extrabold rounded-full border border-emerald-500\/30 flex items-center gap-1">\s*<span className="w-1\.5 h-1\.5 rounded-full bg-emerald-400 animate-pulse"><\/span>\s*Sécurité anti-doublon de stock\s*<\/span>/, '');
code = code.replace(/<span className="px-3 py-1 bg-indigo-500\/20 text-indigo-300 text-\[10px\] font-bold tracking-widest uppercase rounded-full border border-indigo-500\/30">\s*Logistique & Livraisons\s*<\/span>/, '');

fs.writeFileSync('src/components/BonsDeLivraison.tsx', code);
