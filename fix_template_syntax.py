with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Fix broken template strings in tab buttons
content = content.replace(
    """className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}""",
    """className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'ident'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}"""
)

content = content.replace(
    """className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}""",
    """className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'tarifs'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}"""
)

content = content.replace(
    """className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}""",
    """className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'stock'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}"""
)

# Also fix formError condition if damaged
content = content.replace(
    """              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-700 animate-in shake">
                  <span className="material-symbols-outlined text-[22px] shrink-0 text-rose-600">error</span>
                </div>
              )}""",
    """              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-700">
                  <span className="material-symbols-outlined text-[22px] shrink-0 text-rose-600">error</span>
                  <p className="text-xs font-bold leading-relaxed">{formError}</p>
                </div>
              )}"""
)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Fixed template syntax")
