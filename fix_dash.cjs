const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
code = code.replace(/<p className="text-xs text-slate-500 mt-1">[\s\S]*?<\/p>/, '');
code = code.replace(/<p className="text-xs text-slate-500">Détail du chiffre d'affaires et des stocks pour chaque boutique<\/p>/, '');
fs.writeFileSync('src/components/Dashboard.tsx', code);
