const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

const targetSummary = `<div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Chauffeur / Livreur :</span>
                    <span className="font-bold text-slate-800">{lastTransferVoucher.chauffeur || 'Service Logistique ERP Management'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Véhicule :</span>
                    <span className="font-bold text-slate-800">{lastTransferVoucher.immatriculation || 'Non renseigné'}</span>
                  </div>`;

const replaceSummary = `{lastTransferVoucher.chauffeur && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Chauffeur / Livreur :</span>
                      <span className="font-bold text-slate-800">{lastTransferVoucher.chauffeur}</span>
                    </div>
                  )}
                  {lastTransferVoucher.immatriculation && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Véhicule :</span>
                      <span className="font-bold text-slate-800">{lastTransferVoucher.immatriculation}</span>
                    </div>
                  )}`;
                  
code = code.replace(targetSummary, replaceSummary);

const targetVisa = `<div className="border border-dashed border-slate-300 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Visa Transporteur</span>
                  <p className="text-[11px] font-bold text-slate-900">{lastTransferVoucher.chauffeur || 'Chauffeur Logistique'}</p>
                  <div className="h-10 border-b border-slate-200 mt-2"></div>
                </div>`;

const replaceVisa = `{lastTransferVoucher.chauffeur && (
                <div className="border border-dashed border-slate-300 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Visa Transporteur</span>
                  <p className="text-[11px] font-bold text-slate-900">{lastTransferVoucher.chauffeur}</p>
                  <div className="h-10 border-b border-slate-200 mt-2"></div>
                </div>
                )}`;
                
code = code.replace(targetVisa, replaceVisa);
fs.writeFileSync('src/components/Stock.tsx', code);
