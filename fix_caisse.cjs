const fs = require('fs');
let code = fs.readFileSync('src/components/Caisse.tsx', 'utf8');
code = code.replace(/<p className="text-slate-600 text-sm leading-relaxed">[\s\S]*?<\/p>/, '');
code = code.replace(/<p className="text-xs text-slate-500">Sélectionnez une boutique pour ouvrir sa caisse de vente<\/p>/, '');
fs.writeFileSync('src/components/Caisse.tsx', code);
