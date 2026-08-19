import re

with open('src/components/Dashboard.tsx', 'r') as f:
    content = f.read()

# Let's find where the KPI cards grid ends and insert our breakdown card if isGlobal is true
target = """          {/* Stock Global */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Valorisation Stock</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">
                {stockValuation.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
              </p>
              <span className="text-xs text-slate-500 mt-2 block">{stockGlobal} unités physiques</span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </div>
          </div>"""

breakdown_code = """          {/* Stock Global */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Valorisation Stock</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">
                {stockValuation.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">DT</span>
              </p>
              <span className="text-xs text-slate-500 mt-2 block">{stockGlobal} unités physiques</span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </div>
          </div>

          {/* CA PAR BOUTIQUE (BF-BOUT-013 Global Breakdown) */}
          {isGlobal && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">CA & Performances par Boutique (Consolidation Globale)</h3>
                  <p className="text-xs text-slate-500">Répartition détaillée du chiffre d'affaires et des volumes par succursale</p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                  {projets.length} Boutiques Actives
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projets.map(p => {
                  const bVentes = ventes.filter(v => v.projetId === p.id && v.statut !== 'Devis' && v.statut !== 'Annulée');
                  const bDevis = ventes.filter(v => v.projetId === p.id && v.statut === 'Devis');
                  const bFactures = bVentes.filter(v => v.statut !== 'Devis');
                  const bCa = bVentes.reduce((sum, v) => sum + v.montantTTC, 0);
                  const bArticles = articles.filter(a => a.projetId === p.id);
                  const bRupture = bArticles.filter(a => a.stock <= 0).length;
                  const bFaible = bArticles.filter(a => a.stock > 0 && a.stock <= (a.stockMinimum || 5)).length;

                  return (
                    <div key={p.id} className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">{p.nom}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded uppercase">{p.codeBoutique || p.id}</span>
                      </div>
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Chiffre d'Affaires :</span>
                          <span className="font-black text-blue-600">{bCa.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Ventes / Factures :</span>
                          <span className="font-bold text-slate-800">{bVentes.length} factures</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Devis / Commandes :</span>
                          <span className="font-bold text-slate-800">{bDevis.length} devis</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Ruptures de stock :</span>
                          <span className={`font-bold ${bRupture > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{bRupture} produits</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Stock faible :</span>
                          <span className={`font-bold ${bFaible > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{bFaible} produits</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}"""

if target in content:
    content = content.replace(target, breakdown_code)
    with open('src/components/Dashboard.tsx', 'w') as f:
        f.write(content)
    print("Successfully patched Dashboard.tsx with CA PAR BOUTIQUE breakdown")
else:
    print("Target not found in Dashboard.tsx")

