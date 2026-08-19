import re

with open('src/components/AdminUsers.tsx', 'r') as f:
    content = f.read()

old_state = """  // Form State
  const [formData, setFormData] = useState<{
    nom: string;
    email: string;
    role: Role;
    statut: 'Actif' | 'Inactif';
    projetId: string;
  }>({
    nom: '',
    email: '',
    role: 'caissier',
    statut: 'Actif',
    projetId: '1',
  });"""

new_state = """  // Form State
  const [formData, setFormData] = useState<{
    nom: string;
    email: string;
    role: Role;
    statut: 'Actif' | 'Inactif';
    projetId: string;
    projetsAffectes: string[];
  }>({
    nom: '',
    email: '',
    role: 'caissier',
    statut: 'Actif',
    projetId: '1',
    projetsAffectes: ['1'],
  });"""

content = content.replace(old_state, new_state)

old_open_add = """  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      nom: '',
      email: '',
      role: 'caissier',
      statut: 'Actif',
      projetId: projets[0]?.id || '1',
    });
    setIsModalOpen(true);
  };"""

new_open_add = """  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      nom: '',
      email: '',
      role: 'caissier',
      statut: 'Actif',
      projetId: projets[0]?.id || '1',
      projetsAffectes: [projets[0]?.id || '1'],
    });
    setIsModalOpen(true);
  };"""

content = content.replace(old_open_add, new_open_add)

old_open_edit = """  const handleOpenEditModal = (user: Utilisateur) => {
    setEditingUser(user);
    setFormData({
      nom: user.nom,
      email: user.email,
      role: user.role,
      statut: user.statut || 'Actif',
      projetId: user.projetId || '1',
    });
    setIsModalOpen(true);
  };"""

new_open_edit = """  const handleOpenEditModal = (user: Utilisateur) => {
    setEditingUser(user);
    setFormData({
      nom: user.nom,
      email: user.email,
      role: user.role,
      statut: user.statut || 'Actif',
      projetId: user.projetId || '1',
      projetsAffectes: user.projetsAffectes || (user.projetId ? [user.projetId] : []),
    });
    setIsModalOpen(true);
  };"""

content = content.replace(old_open_edit, new_open_edit)

old_save = """    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        ...formData
      } : u));
    } else {
      const newUser: Utilisateur = {
        id: `u-${Date.now()}`,
        ...formData,
        projetsAffectes: formData.role === 'admin' ? ['1', '2', '3'] : [formData.projetId]
      };
      setUsers(prev => [newUser, ...prev]);
    }"""

new_save = """    const userToSave = {
      ...formData,
      projetsAffectes: formData.role === 'admin' ? projets.map(p => p.id) : formData.projetsAffectes,
      projetId: formData.projetsAffectes.length > 0 ? formData.projetsAffectes[0] : formData.projetId
    };

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        ...userToSave
      } : u));
    } else {
      const newUser: Utilisateur = {
        id: `u-${Date.now()}`,
        ...userToSave,
        motDePasse: 'default123'
      };
      setUsers(prev => [newUser, ...prev]);
    }"""

content = content.replace(old_save, new_save)

old_project_badges = """                      {assignedProject ? (
                        <span className="font-semibold">{assignedProject.nom}</span>
                      ) : (
                        <span className="text-on-surface-variant font-medium">Toutes les boutiques</span>
                      )}"""

new_project_badges = """                      {user.role === 'admin' ? (
                        <span className="text-on-surface-variant font-medium">Toutes les boutiques</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(user.projetsAffectes || []).slice(0, 2).map(pid => {
                            const p = projets.find(pr => pr.id === pid);
                            return p ? (
                              <span key={pid} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                                {p.nom}
                              </span>
                            ) : null;
                          })}
                          {(user.projetsAffectes || []).length > 2 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold">
                              +{(user.projetsAffectes || []).length - 2}
                            </span>
                          )}
                        </div>
                      )}"""

content = content.replace(old_project_badges, new_project_badges)


with open('src/components/AdminUsers.tsx', 'w') as f:
    f.write(content)

