const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(/<span className="text-\[11px\] text-slate-400 font-medium">Accès direct aux tâches fréquentes<\/span>/, '');
code = code.replace(/<p className="text-xs text-slate-500">Analyse de la marge brute et des flux de trésorerie<\/p>/, '');
code = code.replace(/<p className="text-\[11px\] text-slate-500">Filtrage multi-dates et compilation comptable<\/p>/, '');

fs.writeFileSync('src/components/Dashboard.tsx', code);
