import re

with open('src/components/Achats.tsx', 'r') as f:
    content = f.read()

# Add state for newProjetId
old_state = """  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSupplierId, setNewSupplierId] = useState('');"""
new_state = """  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjetId, setNewProjetId] = useState('');
  const [newSupplierId, setNewSupplierId] = useState('');"""
content = content.replace(old_state, new_state)

# Initialize newProjetId in handleOpenCreateModal
old_open_modal = """  const handleOpenCreateModal = () => {
    setNewSupplierId('');"""
new_open_modal = """  const handleOpenCreateModal = () => {
    setNewProjetId(isGlobal ? (projets[0]?.id || '1') : selectedProjectId);
    setNewSupplierId('');"""
content = content.replace(old_open_modal, new_open_modal)

# Use newProjetId in save
old_projet_id_save1 = """        projetId: selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId,
        type: 'Fournisseur',"""
new_projet_id_save1 = """        projetId: newProjetId,
        type: 'Fournisseur',"""
content = content.replace(old_projet_id_save1, new_projet_id_save1)

old_projet_id_save2 = """      projetId: supplier?.projetId || (isGlobal ? (projets[0]?.id || 'p1') : selectedProjectId),
      fournisseurId: finalSupplierId,"""
new_projet_id_save2 = """      projetId: newProjetId,
      fournisseurId: finalSupplierId,"""
content = content.replace(old_projet_id_save2, new_projet_id_save2)

# Update form JSX
old_form_top = """            <form onSubmit={handleSavePurchase} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">"""
new_form_top = """            <form onSubmit={handleSavePurchase} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
              {isGlobal && (
                <div className="grid grid-cols-1 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Boutique d'affectation (Obligatoire en vue globale)</label>
                    <select
                      required
                      value={newProjetId}
                      onChange={(e) => setNewProjetId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      {projets.map(p => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">"""
content = content.replace(old_form_top, new_form_top)

with open('src/components/Achats.tsx', 'w') as f:
    f.write(content)
