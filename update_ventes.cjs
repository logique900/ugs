const fs = require('fs');
let code = fs.readFileSync('src/components/Ventes.tsx', 'utf8');

if (!code.includes('import { FacturePrintModal }')) {
    code = code.replace(
        "import { generateInvoicePdf, generateReceiptPdf, generateCreditAgreementPdf } from '../utils/pdfExportEngine';",
        "import { generateInvoicePdf, generateReceiptPdf, generateCreditAgreementPdf } from '../utils/pdfExportEngine';\nimport { FacturePrintModal } from './FacturePrintModal';"
    );
}

if (!code.includes('showFacturePrintModal, setShowFacturePrintModal')) {
    code = code.replace(
        "const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);",
        "const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);\n  const [showFacturePrintModal, setShowFacturePrintModal] = useState<Vente | null>(null);"
    );
}

// Replace the PDF download button with opening the Print Modal
const targetBtn = `<button
                          onClick={() => generateInvoicePdf(vente, client, currentProject)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200"
                          title="Télécharger Facture PDF"
                        >
                          <span className="material-symbols-outlined text-[13px]">picture_as_pdf</span>
                          PDF
                        </button>`;

const newBtn = `<button
                          onClick={() => setShowFacturePrintModal(vente)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200"
                          title="Aperçu et Imprimer Facture"
                        >
                          <span className="material-symbols-outlined text-[13px]">print</span>
                          Imprimer
                        </button>`;

if (code.includes(targetBtn)) {
    code = code.replace(targetBtn, newBtn);
}

// Add the modal component at the end of the file, just before the last </div>
const modalComponent = `
      {/* Facture Print Modal */}
      {showFacturePrintModal && (
        <FacturePrintModal
          vente={showFacturePrintModal}
          client={clients.find(c => c.id === showFacturePrintModal.clientId)}
          projet={projets.find(p => p.id === showFacturePrintModal.projetId)}
          onClose={() => setShowFacturePrintModal(null)}
        />
      )}
    </div>
  );
}`;

if (!code.includes('<FacturePrintModal')) {
    // replace the last '    </div>\n  );\n}' with the modal
    const lastIndex = code.lastIndexOf('    </div>\n  );\n}');
    if (lastIndex !== -1) {
        code = code.substring(0, lastIndex) + modalComponent;
    }
}

fs.writeFileSync('src/components/Ventes.tsx', code);
console.log('Ventes.tsx updated successfully');
