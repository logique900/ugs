const fs = require('fs');

const files = [
  'src/components/Achats.tsx',
  'src/components/Credits.tsx',
  'src/components/Categories.tsx',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Achats
    code = code.replace(/<p className="text-xs text-slate-500 mt-0\.5">\s*Bons de commande, réceptions marchandises, gestion des décaissements et export PDF\s*<\/p>/g, '');
    
    // Credits
    code = code.replace(/<p className="text-xs text-slate-500 mt-0\.5">Suivi des lettres et rappels de paiement envoyés aux clients<\/p>/g, '');
    
    // Categories
    code = code.replace(/<p className="text-xs text-slate-500">Modifiez la recherche ou créez une nouvelle catégorie\.<\/p>/g, '');
    
    fs.writeFileSync(file, code);
  }
}
