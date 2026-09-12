const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

const targetState = "const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);";
const replaceState = `const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferScannerOpen, setIsTransferScannerOpen] = useState(false);
  const [transferScannerInput, setTransferScannerInput] = useState('');`;

code = code.replace(targetState, replaceState);
fs.writeFileSync('src/components/Stock.tsx', code);
