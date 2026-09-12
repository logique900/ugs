const fs = require('fs');
let code = fs.readFileSync('src/components/Ventes.tsx', 'utf8');
code = code.replace(/<p className="text-xs text-slate-500 mt-0\.5">[\s\S]*?<\/p>/, '');
fs.writeFileSync('src/components/Ventes.tsx', code);
