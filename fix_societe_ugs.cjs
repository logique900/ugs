const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('grep -rl "Magasin Principal" src/').toString().split('\n').filter(Boolean);

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  // Handle specific variations if needed, but a global replace is usually fine for names.
  // We'll replace exact match "Magasin Principal" -> "Société UGS"
  // and "magazin principal" -> "Société UGS" (though grep didn't find the latter, we can use a case-insensitive regex if needed).
  code = code.replace(/Magasin Principal/g, 'Société UGS');
  code = code.replace(/magazin principal/gi, 'Société UGS');
  fs.writeFileSync(file, code);
}
