const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /{ id: 'stock', label: 'Stock Central & Transferts', icon: 'warehouse' },\s*{ id: 'articles', label: 'Catalogue Articles', icon: 'inventory_2' }/,
  `{ id: 'stock', label: 'Catalogue & Stock', icon: 'warehouse' }`
);

code = code.replace(
  /{ id: 'articles', label: 'Produits', icon: 'school' }, { id: 'stock', label: 'Stock Boutique', icon: 'warehouse' }/,
  `{ id: 'stock', label: 'Produits & Stock', icon: 'warehouse' }`
);

code = code.replace(
  /{ id: 'stock', label: 'Vue Globale des Stocks', icon: 'warehouse' },\s*{ id: 'articles', label: 'Catalogue Global', icon: 'inventory_2' }/,
  `{ id: 'stock', label: 'Catalogue & Stock', icon: 'warehouse' }`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
