const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');
code = code.replace(/<p className="text-xs font-medium leading-relaxed">[\s\S]*?<\/p>/, '');
fs.writeFileSync('src/components/Stock.tsx', code);
