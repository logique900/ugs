with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

broken_block = """            {/* Modal Body Form */}
            <form onSubmit={handleSaveArticle} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-700 animate-in shake">
                  <span className="material-symbols-outlined text-[22px] shrink-0 text-rose-600">error</span>
                </div>
              )}"""

fixed_block = """            {/* Modal Body Form */}
            <form onSubmit={handleSaveArticle} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-700">
                  <span className="material-symbols-outlined text-[22px] shrink-0 text-rose-600">error</span>
                  <p className="text-xs font-bold leading-relaxed">{formError}</p>
                </div>
              )}"""

if broken_block in content:
    content = content.replace(broken_block, fixed_block)
    print("Fixed broken formError block")
else:
    # Let's replace whatever formError snippet exists
    pass

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)
