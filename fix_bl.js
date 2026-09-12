const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeLivraison.tsx', 'utf8');

// The issue was I removed a line with <p> but not its closing tag, or I removed a div by mistake.
