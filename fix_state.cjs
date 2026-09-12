const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

code = code.replace(
  "const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);",
  "const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);\n  const [avecVehicule, setAvecVehicule] = useState(true);"
);

code = code.replace(
  "setIsTransferModalOpen(true);",
  "setIsTransferModalOpen(true);\n    setAvecVehicule(true);"
);

fs.writeFileSync('src/components/Stock.tsx', code);
