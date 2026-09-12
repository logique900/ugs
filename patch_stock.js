const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

const bannerRegex = /\{\/\* Bannière de Flux Magasin Principal ➔ Boutiques \*\/\}.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/s;
code = code.replace(bannerRegex, '');
fs.writeFileSync('src/components/Stock.tsx', code);
