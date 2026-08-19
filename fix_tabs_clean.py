with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Replace the broken tab section with clean JSX
old_tabs_block = """            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setActiveModalTab('ident')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">badge</span>
                1. Identification & Général
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('tarifs')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                2. Tarification & Taxes
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('stock')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">warehouse</span>
                3. Stocks & Seuils
              </button>
            </div>"""

new_tabs_block = """            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setActiveModalTab('ident')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'ident'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">badge</span>
                1. Identification & Général
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('tarifs')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'tarifs'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                2. Tarification & Taxes
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('stock')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'stock'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">warehouse</span>
                3. Stocks & Seuils
              </button>
            </div>"""

if old_tabs_block in content:
    content = content.replace(old_tabs_block, new_tabs_block)
    print("Replaced tabs block successfully")
else:
    print("Could not find old_tabs_block exactly")

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)
