const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeLivraison.tsx', 'utf8');

code = code.replace(/<p className="text-xs text-slate-500">Sécurité : Chaque Bon de Livraison possède un identifiant unique \(ex: OUT-2026-XXXXXX\) pour éviter les doublons\.<\/p>/, '');
code = code.replace(/<p className="text-xs text-slate-500">L'annulation d'une facture ne réintègre pas automatiquement le stock\. Seul un retour formalisé génère un mouvement d'ENTRÉE \(\+stock\)\.<\/p>/, '');
code = code.replace(/centrale@erp-management\.com/g, 'contact@societe-ugs.com');

fs.writeFileSync('src/components/BonsDeLivraison.tsx', code);
