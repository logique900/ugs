const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Remove the Panel for Admin block
const adminPanelRegex = /\{\/\*\s*Panel for Admin: Strictly limited to Magasin Principal\s*\*\/\}[\s\S]*?\{\/\*\s*Project Switcher Dropdown in Sidebar for Super Admin & Multi-assigned users\s*\*\/\}/;

code = code.replace(adminPanelRegex, '{/* Project Switcher Dropdown in Sidebar for Super Admin & Multi-assigned users */}');

fs.writeFileSync('src/components/Sidebar.tsx', code);
