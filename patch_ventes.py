import re

with open('src/components/Ventes.tsx', 'r') as f:
    content = f.read()

# Add state for newProjetId
old_state = """  const [newClientId, setNewClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');"""
new_state = """  const [newProjetId, setNewProjetId] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');"""
content = content.replace(old_state, new_state)

# Initialize newProjetId in handleOpenCreateModal
old_open_modal = """  const handleOpenCreateModal = (mode: 'Facture' | 'Devis') => {
    setModalMode(mode);
    setNewClientId('');"""
new_open_modal = """  const handleOpenCreateModal = (mode: 'Facture' | 'Devis') => {
    setModalMode(mode);
    setNewProjetId(isGlobal ? (projets[0]?.id || '1') : selectedProjectId);
    setNewClientId('');"""
content = content.replace(old_open_modal, new_open_modal)

# Use newProjetId in save
old_projet_id_save1 = """        projetId: selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId,
        type: 'Client',"""
new_projet_id_save1 = """        projetId: newProjetId,
        type: 'Client',"""
content = content.replace(old_projet_id_save1, new_projet_id_save1)

old_projet_id_save2 = """      projetId: selectedProjectId === 'all' ? (projets[0]?.id || 'p1') : selectedProjectId,
      clientId: finalClientId,"""
new_projet_id_save2 = """      projetId: newProjetId,
      clientId: finalClientId,"""
content = content.replace(old_projet_id_save2, new_projet_id_save2)

# Update form JSX
old_form_top = """            <form onSubmit={handleSaveSale} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4">"""
new_form_top = """            <form onSubmit={handleSaveSale} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
              {isGlobal && (
                <div className="grid grid-cols-1 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Boutique d'affectation (Obligatoire en vue globale)</label>
                    <select
                      required
                      value={newProjetId}
                      onChange={(e) => setNewProjetId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {projets.map(p => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4">"""
content = content.replace(old_form_top, new_form_top)

with open('src/components/Ventes.tsx', 'w') as f:
    f.write(content)
