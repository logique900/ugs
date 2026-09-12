const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeLivraison.tsx', 'utf8');

code = code.replace(/<p className="text-xs text-slate-600 mt-2">\s*Avenue Habib Bourguiba, Sfax • Tél: \+216 74 000 001<br \/>\s*Matricule Fiscal: 1234567\/M\/A\/M\/000 • Email: centrale@erp-management.com/g,
'<p className="text-xs text-slate-600 mt-2">Avenue Habib Bourguiba, Sfax • Tél: +216 74 000 001<br />Matricule Fiscal: 1234567/M/A/M/000 • Email: centrale@erp-management.com</p>');

fs.writeFileSync('src/components/BonsDeLivraison.tsx', code);
