const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeSortie.tsx', 'utf8');

code = code.replace(/<p className="text-\[10px\] text-indigo-700 font-medium mt-1">\s*Les stocks seront automatiquement crédités dans cette boutique lors de la validation du bon de sortie\./g, 
'<p className="text-[10px] text-indigo-700 font-medium mt-1">Les stocks seront automatiquement crédités dans cette boutique lors de la validation du bon de sortie.</p>');

code = code.replace(/<p className="text-xs font-bold text-indigo-700">\s*Destination : \{selectedBS\.destinationBoutiqueNom\}/g,
'<p className="text-xs font-bold text-indigo-700">Destination : {selectedBS.destinationBoutiqueNom}</p>');

fs.writeFileSync('src/components/BonsDeSortie.tsx', code);
