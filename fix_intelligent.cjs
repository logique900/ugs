const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

// 1. Remove state hook
code = code.replace(/const \[activeStockMode, setActiveStockMode\] = useState<'intelligent' \| 'classique'>\(isAdmin \? 'intelligent' : 'classique'\);\n?/, '');

// 2. Remove switcher and the ternary condition, leaving only the "classique" content
const startIndex = code.indexOf('{/* Mode Switcher: Stock Intelligent (P3) vs Stock Opérationnel */}');
const searchString = `      ) : (\n        <>\n`;
const splitIndex = code.indexOf(searchString, startIndex);

if (startIndex !== -1 && splitIndex !== -1) {
  code = code.substring(0, startIndex) + code.substring(splitIndex + searchString.length);
} else {
  console.log("Could not find start or split index");
}

// 3. Remove the trailing `</>\n      )}` at the end
const endRegex = /<\/>\s*\)\}\s*<\/div>\s*\);\s*\}\s*$/;
code = code.replace(endRegex, '</div>\n  );\n}\n');

fs.writeFileSync('src/components/Stock.tsx', code);
