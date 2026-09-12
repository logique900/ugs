const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

// 1. Add state for the toggle inside Stock component
// Let's find a good place to put it. `const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);`
const stateInsertPoint = "const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);";
const stateReplacement = `const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);\n  const [avecVehicule, setAvecVehicule] = useState(true);`;
code = code.replace(stateInsertPoint, stateReplacement);

// 2. In handleOpenTransferModal, reset it to true
const openModalPoint = "setIsTransferModalOpen(true);";
const openModalReplacement = `setIsTransferModalOpen(true);\n    setAvecVehicule(true);`;
code = code.replace(openModalPoint, openModalReplacement);

// 3. Wrap Chauffeur and Immatriculation fields with the toggle.
const fieldsStartStr = `                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Véhicule (Matricule)
                  </label>`;

// Actually, I need to see the exact structure around Chauffeur. Let's grep it to be precise.
