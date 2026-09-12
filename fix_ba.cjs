const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDAchat.tsx', 'utf8');
code = code.replace(/<p className="text-blue-100\/80 text-xs sm:text-sm leading-relaxed">[\s\S]*?<\/p>/, '');
fs.writeFileSync('src/components/BonsDAchat.tsx', code);
