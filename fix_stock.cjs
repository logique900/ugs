const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');
code = code.replace(/Le Magasin Principal reçoit les marchandises de vos fournisseurs et approvisionne vos boutiques de vente\.\s*<\/p>/, '');
fs.writeFileSync('src/components/Stock.tsx', code);
