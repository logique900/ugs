const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

const targetStr = `              {/* Paramètres Logistiques */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date de Transfert *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferForm.date}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Chauffeur ou Livreur
                  </label>
                  <input
                    type="text"
                    value={transferForm.chauffeur}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, chauffeur: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                    placeholder="Nom du chauffeur"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Véhicule (Matricule)
                  </label>
                  <input
                    type="text"
                    value={transferForm.immatriculation}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, immatriculation: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                    placeholder="Ex: 185 TN 4210"
                  />
                </div>
              </div>`;

const replacementStr = `              {/* Paramètres Logistiques & Transport */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-sm font-bold text-slate-700 flex items-center cursor-pointer gap-2 w-full">
                    <input
                      type="checkbox"
                      checked={avecVehicule}
                      onChange={(e) => {
                        setAvecVehicule(e.target.checked);
                        if (!e.target.checked) {
                          setTransferForm(prev => ({ ...prev, chauffeur: '', immatriculation: '' }));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    Transport avec véhicule (livreur / transporteur)
                  </label>
                </div>

                <div className={\`grid grid-cols-1 \${avecVehicule ? 'sm:grid-cols-3' : 'sm:grid-cols-1'} gap-3\`}>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Date de Transfert *
                    </label>
                    <input
                      type="date"
                      required
                      value={transferForm.date}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  
                  {avecVehicule && (
                    <>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                          Chauffeur ou Livreur
                        </label>
                        <input
                          type="text"
                          value={transferForm.chauffeur}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, chauffeur: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                          placeholder="Nom du chauffeur"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                          Véhicule (Matricule)
                        </label>
                        <input
                          type="text"
                          value={transferForm.immatriculation}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, immatriculation: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs"
                          placeholder="Ex: 185 TN 4210"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>`;

if (code.includes('Date de Transfert *')) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/components/Stock.tsx', code);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find the target string");
}
