const fs = require('fs');
let code = fs.readFileSync('src/components/Ventes.tsx', 'utf8');

code = code.replace(
    "onClick={() => generateInvoicePdf(vente, client, currentProject)}",
    "onClick={() => setShowFacturePrintModal(vente)}"
);
code = code.replace(
    'title="Télécharger Facture PDF"',
    'title="Imprimer Document"'
);
code = code.replace(
    '<span className="material-symbols-outlined text-[13px]">picture_as_pdf</span>',
    '<span className="material-symbols-outlined text-[13px]">print</span>'
);
code = code.replace(
    '                          PDF',
    '                          Imprimer'
);

fs.writeFileSync('src/components/Ventes.tsx', code);
