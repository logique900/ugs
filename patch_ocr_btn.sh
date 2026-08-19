#!/bin/bash
sed -i '/<h3 className="font-extrabold text-base text-slate-900">Créer un Bon de Commande Fournisseur<\/h3>/i \
                <label className="cursor-pointer ml-4 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2">\n                  <span className="material-symbols-outlined text-[18px]">document_scanner</span>\n                  {isOCRProcessing ? "Scan en cours..." : "Scanner Facture avec IA"}\n                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleOCRUpload} disabled={isOCRProcessing} />\n                </label>\
' src/components/Achats.tsx
