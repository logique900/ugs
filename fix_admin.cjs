const fs = require('fs');
let code = fs.readFileSync('src/components/AdminUsers.tsx', 'utf8');
code = code.replace(/<p className="text-sm text-slate-600 leading-relaxed mb-6">[\s\S]*?<\/p>/, '');
fs.writeFileSync('src/components/AdminUsers.tsx', code);
