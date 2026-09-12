const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

const targetFunction = `  const handleRemoveTransferLine = (lineId: string) => {`;
const replaceFunction = `  const handleProcessTransferScan = (rawCode: string) => {
    if (!rawCode.trim()) return;
    const code = rawCode.trim();

    const found = articles.find(a => 
      a.codeBarre === code || 
      (a.codeBarresSecondaires && a.codeBarresSecondaires.includes(code)) ||
      a.codeArticle === code
    );

    if (found) {
      setTransferForm(prev => {
        const existingLineIndex = prev.lignes.findIndex(l => l.articleId === found.id);
        if (existingLineIndex >= 0) {
          const newLignes = [...prev.lignes];
          newLignes[existingLineIndex] = {
            ...newLignes[existingLineIndex],
            quantite: (newLignes[existingLineIndex].quantite || 0) + 1
          };
          return { ...prev, lignes: newLignes };
        } else {
          const emptyLineIndex = prev.lignes.findIndex(l => !l.articleId);
          if (emptyLineIndex >= 0) {
            const newLignes = [...prev.lignes];
            newLignes[emptyLineIndex] = {
              ...newLignes[emptyLineIndex],
              articleId: found.id,
              quantite: 1
            };
            return { ...prev, lignes: newLignes };
          } else {
            return {
              ...prev,
              lignes: [
                ...prev.lignes,
                { id: \`line-\${Date.now()}\`, articleId: found.id, quantite: 1 }
              ]
            };
          }
        }
      });
    } else {
      alert(\`Article non trouvé pour le code: \${code}\`);
    }
    setTransferScannerInput('');
  };

  const handleRemoveTransferLine = (lineId: string) => {`;
code = code.replace(targetFunction, replaceFunction);


const targetUI = `<div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBulkPickerOpen(!isBulkPickerOpen)}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      ⚡ Sélection groupée rapide
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTransferLine()}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Ajouter une ligne
                    </button>
                  </div>`;
const replaceUI = `<div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2 py-1">
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">barcode_scanner</span>
                      <input 
                        type="text" 
                        value={transferScannerInput}
                        onChange={(e) => setTransferScannerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleProcessTransferScan(transferScannerInput);
                          }
                        }}
                        placeholder="Scanner..."
                        className="bg-transparent border-none text-xs w-28 focus:outline-none font-bold text-slate-700"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setIsTransferScannerOpen(true)}
                        className="ml-1 w-6 h-6 rounded-lg bg-indigo-100 hover:bg-indigo-600 hover:text-white text-indigo-600 flex items-center justify-center transition-colors tooltip-trigger"
                        title="Ouvrir la caméra"
                      >
                        <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsBulkPickerOpen(!isBulkPickerOpen)}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      ⚡ Rapide
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTransferLine()}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Ajouter
                    </button>
                  </div>`;
code = code.replace(targetUI, replaceUI);

const targetModalClose = `{isTransferModalOpen && (`;
const replaceModalClose = `{isTransferScannerOpen && (
        <CameraBarcodeScannerModal
          onScanSuccess={(code) => handleProcessTransferScan(code)}
          onClose={() => setIsTransferScannerOpen(false)}
        />
      )}
      
      {isTransferModalOpen && (`;
code = code.replace(targetModalClose, replaceModalClose);


fs.writeFileSync('src/components/Stock.tsx', code);
