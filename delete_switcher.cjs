const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// The block to remove:
const regex = /\{\/\* Project Switcher Dropdown in Sidebar for Super Admin & Multi-assigned users \*\/\}[\s\S]*?<\/div>\s*\}\s*\{\/\* Navigation Sections \*\/\}/;

code = code.replace(regex, '{/* Navigation Sections */}');
fs.writeFileSync('src/components/Sidebar.tsx', code);
