const fs = require('fs');
let code = fs.readFileSync('src/components/SmartStockDashboard.tsx', 'utf8');

code = code.replace(/<p className="text-xs text-rose-800 dark:text-rose-400 mt-0\.5 leading-relaxed">[\s\S]*?<\/p>/, '');
code = code.replace(/<p className="text-xs text-purple-800 dark:text-purple-400 mt-0\.5 leading-relaxed">[\s\S]*?<\/p>/, '');
code = code.replace(/<p className="text-xs text-blue-800 dark:text-blue-400 mt-0\.5 leading-relaxed">[\s\S]*?<\/p>/, '');
code = code.replace(/<p className="text-xs text-amber-800 dark:text-amber-400 mt-0\.5 leading-relaxed">[\s\S]*?<\/p>/, '');

fs.writeFileSync('src/components/SmartStockDashboard.tsx', code);
