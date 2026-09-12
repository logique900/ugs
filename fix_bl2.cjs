const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeLivraison.tsx', 'utf8');

code = code.replace(/<p className="text-xs text-slate-500">\s*Sécurité : Chaque Bon de Livraison possède un identifiant unique \(ex: OUT-2026-XXXXXX\) pour éviter les doublons\./g,
'<p className="text-xs text-slate-500">Sécurité : Chaque Bon de Livraison possède un identifiant unique (ex: OUT-2026-XXXXXX) pour éviter les doublons.</p>');

code = code.replace(/<p className="text-xs text-slate-500">\s*L'annulation d'une facture ne réintègre pas automatiquement le stock\. Seul un retour formalisé génère un mouvement d'ENTRÉE \(\+stock\)\./g,
"<p className=\"text-xs text-slate-500\">L'annulation d'une facture ne réintègre pas automatiquement le stock. Seul un retour formalisé génère un mouvement d'ENTRÉE (+stock).</p>");

code = code.replace(/<p className="font-mono font-bold text-indigo-600">\s*\{showDetailModal\.stockOperationId \|\| 'DÉJÀ RETIRÉ DU STOCK'\}/g,
'<p className="font-mono font-bold text-indigo-600">{showDetailModal.stockOperationId || \'DÉJÀ RETIRÉ DU STOCK\'}</p>');

code = code.replace(/<p className="text-xs text-slate-600 mt-2">\s*Avenue Habib Bourguiba, Sfax • Tél: \+216 74 000 001<br \/>\s*MF: 1458920\/A\/M\/000/g,
'<p className="text-xs text-slate-600 mt-2">Avenue Habib Bourguiba, Sfax • Tél: +216 74 000 001<br />MF: 1458920/A/M/000</p>');

fs.writeFileSync('src/components/BonsDeLivraison.tsx', code);
