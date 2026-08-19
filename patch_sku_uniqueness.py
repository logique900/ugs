import re

with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

old_func = """  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.designation) return;

    if (editingArticle) {"""

new_func = """  const [formError, setFormError] = useState('');

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.code || !formData.designation) return;

    // Check SKU uniqueness (BF-PROD-002)
    const duplicate = articles.find(a => a.code.trim().toLowerCase() === formData.code?.trim().toLowerCase() && (!editingArticle || a.id !== editingArticle.id));
    if (duplicate) {
      setFormError(`⚠ Cette référence existe déjà. Produit existant : "${duplicate.designation}" (SKU : ${duplicate.code})`);
      return;
    }

    if (editingArticle) {"""

content = content.replace(old_func, new_func)

# Also insert formError display in modal if present
old_modal_header = """            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">"""

new_modal_header = """            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">"""

# Let's add formError banner right above the tabs or inside the form
old_form_start = """            {/* Modal Body Form */}
            <form onSubmit={handleSaveArticle} className="flex-1 overflow-y-auto p-6 space-y-6">"""

new_form_start = """            {/* Modal Body Form */}
            <form onSubmit={handleSaveArticle} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-700 animate-in shake">
                  <span className="material-symbols-outlined text-[22px] shrink-0 text-rose-600">error</span>
                  <p className="text-xs font-bold leading-relaxed">{formError}</p>
                </div>
              )}"""

content = content.replace(old_form_start, new_form_start)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Added SKU uniqueness check and error display in Articles.tsx")
