const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDeLivraison.tsx', 'utf8');

const targetStr = `{/* Print Document Content */}
            <div className="p-6 border border-slate-200 rounded-xl space-y-6 bg-white text-slate-900">
              {/* Company Header */}
              <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-900 text-white font-bold text-xl flex items-center justify-center rounded-lg">
                      ERP Management
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-indigo-950 tracking-tight">ERP Management</h2>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Avenue Habib Bourguiba, Sfax • Tél: +216 74 000 001<br />Matricule Fiscal: 1234567/M/A/M/000 • Email: contact@societe-ugs.com</p>
                </div>
                <div className="text-right space-y-1">
                  <h3 className="text-2xl font-bold text-indigo-900">BON DE LIVRAISON</h3>
                </div>
              </div>

              {/* Client & Delivery Info */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-indigo-900 tracking-wider">Client & Facturation</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-indigo-900 tracking-wider">Adresse de Livraison & Transport</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-indigo-900 text-white font-bold uppercase text-[9px] tracking-wider">
                    <th className="p-2.5">Réf / Code</th>
                    <th className="p-2.5">Désignation Produit</th>
                    <th className="p-2.5 text-center">Qté Commandée</th>
                    <th className="p-2.5 text-center">Qté Livrée</th>
                    <th className="p-2.5 text-right">Prix HT</th>
                    <th className="p-2.5 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {showPrintModal.lignes.map((l, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-mono text-[11px] font-bold">{l.code}</td>
                      <td className="p-2.5 font-bold">{l.designation}</td>
                      <td className="p-2.5 text-center text-slate-500">{l.qteCommandee}</td>
                      <td className="p-2.5 text-center font-extrabold text-indigo-950">{l.qteLivree}</td>
                      <td className="p-2.5 text-right">{l.prixUnitaireHT.toFixed(2)} DT</td>
                      <td className="p-2.5 text-right font-bold">{l.totalHT.toFixed(2)} DT</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & QR Verification */}
              <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 p-1 border rounded flex items-center justify-center">
                    <Barcode1D value={showPrintModal.numero} width={1} height={40} />
                  </div>
                  <div className="text-[9px] text-slate-500 max-w-xs">
                    Authentification QR Code • Mouvement Stock ID: <strong className="font-mono text-indigo-900">{showPrintModal.stockOperationId || 'OUT-UNIQUE'}</strong>. Document officiel ERP Management.
                  </div>
                </div>
                <div className="text-right space-y-1 text-xs">
                </div>
              </div>

              {/* Signatures Block */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
                <div className="h-24 border border-dashed border-slate-300 rounded-xl p-3 flex flex-col justify-between">
                  <span className="font-bold text-slate-700">Cachet & Signature Transporteur / Magasinier ERP Management</span>
                  <span className="text-[10px] text-slate-400">Date & Nom</span>
                </div>
                <div className="h-24 border border-dashed border-slate-300 rounded-xl p-3 flex flex-col justify-between">
                  <span className="font-bold text-slate-700">Nom & Signature Client Réceptionnaire</span>
                  <span className="text-[10px] text-slate-400">Bon pour réception conforme</span>
                </div>
              </div>
            </div>`;

const replaceStr = `{/* Print Document Content */}
            <div className="p-8 space-y-6 bg-white text-black font-sans text-xs">
              
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h1 className="text-lg font-bold">SOCIETE UNIVERS GSM DE SUD</h1>
                  <p>Adresse: 112, OMAR IBN KHATAB ZRIG, GABES S3</p>
                  <p>M.F: 1532846 G/A/M/000</p>
                  <p>RIB: 04 705 012 0051487155 82 - Attijari Bank</p>
                </div>
                
                {/* Logo UGS Style */}
                <div className="flex flex-col items-center">
                  <div className="flex items-end gap-1 mb-1">
                    <div className="w-4 h-6 bg-fuchsia-600"></div>
                    <div className="w-4 h-8 bg-fuchsia-600"></div>
                    <div className="w-4 h-12 bg-fuchsia-600"></div>
                  </div>
                  <div className="border-[3px] border-black px-2 py-0.5 tracking-[0.2em] font-black text-2xl">
                    UGS
                  </div>
                </div>
              </div>

              {/* Document Title & Page */}
              <div className="border-b-[3px] border-black pb-1 mb-6 flex justify-between items-end">
                <div className="w-1/4"></div>
                <h2 className="text-xl font-bold">Bon de Livraison N° {showPrintModal.numero.replace('BL-', '')}</h2>
                <div className="text-[10px] w-1/4 text-right">Page : 1 / 1</div>
              </div>

              {/* Info Client & Meta */}
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                  <p className="font-bold">{showPrintModal.date.split('-').reverse().join('/')}</p>
                  <div className="mt-4 space-y-1.5">
                    <p>Code Client : <span className="font-bold">{showPrintModal.clientId || '1016'}</span></p>
                    <p>Code TVA : <span className="inline-block w-24 border-b border-black border-dashed"></span></p>
                    <p>Chauffeur : <span className="font-bold">{showPrintModal.transporteur || ''}</span></p>
                    <p>Camion : <span className="font-bold">{showPrintModal.immatriculation || ''}</span></p>
                  </div>
                </div>
                
                <div className="border border-black p-4 w-64 text-center space-y-2 h-32 flex flex-col justify-center">
                  <p className="font-bold text-sm uppercase">{showPrintModal.clientNom}</p>
                  <p className="uppercase">{showPrintModal.clientAdresse || 'Non renseignée'}</p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left border-collapse border border-black text-xs mb-8">
                <thead>
                  <tr className="border-b border-black">
                    <th className="p-2 border-r border-black font-bold text-center w-24">Code</th>
                    <th className="p-2 border-r border-black font-bold text-center">Désignation</th>
                    <th className="p-2 border-r border-black font-bold text-center w-12">Qté</th>
                    <th className="p-2 border-r border-black font-bold text-center w-20">P.U.H.T</th>
                    <th className="p-2 border-r border-black font-bold text-center w-24">Montant H.T</th>
                    <th className="p-2 font-bold text-center w-16">TVA %</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {showPrintModal.lignes.map((l, i) => (
                    <tr key={i} className="h-8">
                      <td className="px-2 py-1 border-r border-black font-mono">{l.code}</td>
                      <td className="px-2 py-1 border-r border-black font-bold uppercase">{l.designation}</td>
                      <td className="px-2 py-1 border-r border-black text-right font-bold">{l.qteLivree}</td>
                      <td className="px-2 py-1 border-r border-black text-right">{(l.prixUnitaireHT || 0).toFixed(3)}</td>
                      <td className="px-2 py-1 border-r border-black text-right font-bold">{((l.qteLivree || 0) * (l.prixUnitaireHT || 0)).toFixed(3)}</td>
                      <td className="px-2 py-1 text-center font-bold">19.00</td>
                    </tr>
                  ))}
                  {/* Empty rows to fill space */}
                  {Array.from({ length: Math.max(0, 10 - showPrintModal.lignes.length) }).map((_, i) => (
                    <tr key={\`empty-\${i}\`} className="h-8">
                      <td className="px-2 py-1 border-r border-black"></td>
                      <td className="px-2 py-1 border-r border-black"></td>
                      <td className="px-2 py-1 border-r border-black"></td>
                      <td className="px-2 py-1 border-r border-black"></td>
                      <td className="px-2 py-1 border-r border-black"></td>
                      <td className="px-2 py-1"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="flex justify-between items-start">
                {/* Left Totals */}
                <div className="w-1/3">
                  <table className="w-full border-collapse border border-black mb-4">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="p-1.5 border-r border-black font-bold w-1/2">T.V.A. %</td>
                        <td className="p-1.5 border-r border-black"></td>
                        <td className="p-1.5 text-right font-bold w-1/3">19.00</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 border-r border-black font-bold">Assiette</td>
                        <td className="p-1.5 border-r border-black"></td>
                        <td className="p-1.5 text-right font-bold">{(showPrintModal.montantHT || 0).toFixed(3)}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border-r border-black font-bold">Montant</td>
                        <td className="p-1.5 border-r border-black"></td>
                        <td className="p-1.5 text-right font-bold">{(showPrintModal.montantTVA || 0).toFixed(3)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right Totals */}
                <div className="w-[30%]">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-1 pr-2 font-bold">Total HT Brut</td>
                        <td className="py-1 text-right font-bold">{(showPrintModal.montantHT || 0).toFixed(3)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-2 font-bold">Total HT Net</td>
                        <td className="py-1 text-right font-bold">{(showPrintModal.montantHT || 0).toFixed(3)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-2 font-bold">Total TVA</td>
                        <td className="py-1 text-right font-bold">{(showPrintModal.montantTVA || 0).toFixed(3)}</td>
                      </tr>
                      <tr className="border-t border-black">
                        <td className="py-2 pr-2 font-bold text-sm">Net à Payer</td>
                        <td className="py-2 text-right font-bold text-sm">{(showPrintModal.montantTTC || 0).toFixed(3)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Amount in Words */}
              <div className="my-6">
                <p className="italic mb-1">Arrêté le présent Bon de Livraison à la somme de:</p>
                <p className="font-bold uppercase">* {(showPrintModal.montantTTC || 0).toFixed(3)} DT *</p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 h-32">
                <div className="border border-black p-2 relative">
                  <span className="italic block text-center mt-2">Notes</span>
                </div>
                <div className="border border-black p-2 relative">
                  <span className="italic block text-center mt-2">Signature Client</span>
                </div>
                <div className="border border-black p-2 relative">
                  <span className="italic block text-center mt-2">Signature & Cachet</span>
                </div>
              </div>

              {/* QR Code / System ID */}
              <div className="mt-8 pt-2 border-t border-black/30 flex justify-between items-center text-[9px] text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Barcode1D value={showPrintModal.numero} width={1} height={20} displayValue={false} />
                  </div>
                  <span>Doc ID: {showPrintModal.numero}</span>
                </div>
                <span>Imprimé le {new Date().toLocaleDateString('fr-FR')} - ERP Management</span>
              </div>
            </div>`;

if (code.includes('ERP Management DISTRIBUTION - ERP CENTRAL') || code.includes('border-b-2 border-indigo-900')) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync('src/components/BonsDeLivraison.tsx', code);
    console.log('BonsDeLivraison printable view updated successfully');
} else {
    console.log('Could not find target string in BonsDeLivraison.tsx');
}
