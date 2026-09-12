const fs = require('fs');
let code = fs.readFileSync('src/components/PredictiveAnalytics.tsx', 'utf8');
code = code.replace(/<p className="text-xs text-slate-500 dark:text-slate-400">\s*Anticipation de la demande, détection des ruptures de stock et génération intelligente des commandes fournisseurs\s*<\/p>/, '');
fs.writeFileSync('src/components/PredictiveAnalytics.tsx', code);
