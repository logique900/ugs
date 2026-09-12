const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

const regex = /<div className="flex flex-wrap items-center gap-2 sm:gap-3">[\s\S]*?Transfert Dépôt ➔ Boutique[\s\S]*?Nouvelle Sortie[\s\S]*?Nouvelle Entrée[\s\S]*?<\/div>/;
code = code.replace(regex, '');

fs.writeFileSync('src/components/Stock.tsx', code);
