import re

with open('src/components/AdminUsers.tsx', 'r') as f:
    content = f.read()

old_delete = """  const handleDeleteUser = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };"""

new_delete = """  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, statut: u.statut === 'Actif' ? 'Inactif' : 'Actif' };
      }
      return u;
    }));
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };"""

content = content.replace(old_delete, new_delete)

old_actions_block = """                        <button 
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Modifier les droits"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors" 
                            title="Supprimer l'utilisateur"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}"""

new_actions_block = """                        <button
                          onClick={() => {
                            if(confirm("Réinitialiser le mot de passe de cet utilisateur ? (Nouveau: 'password123')")) {
                               alert("Le mot de passe a été réinitialisé à 'password123'.");
                            }
                          }}
                          className="p-2 text-on-surface-variant hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Réinitialiser le mot de passe"
                        >
                          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Modifier les droits"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        {user.role !== 'admin' && (
                          <>
                            <button 
                              onClick={() => toggleUserStatus(user.id)}
                              className={`p-2 rounded-lg transition-colors ${user.statut === 'Actif' ? 'text-on-surface-variant hover:text-error hover:bg-error/10' : 'text-error bg-error/10 hover:bg-error/20'}`}
                              title={user.statut === 'Actif' ? 'Désactiver le compte' : 'Activer le compte'}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {user.statut === 'Actif' ? 'person_off' : 'person_check'}
                              </span>
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors" 
                              title="Supprimer l'utilisateur"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </>
                        )}"""

content = content.replace(old_actions_block, new_actions_block)

with open('src/components/AdminUsers.tsx', 'w') as f:
    f.write(content)
