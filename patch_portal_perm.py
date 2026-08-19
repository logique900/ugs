import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

# Add import if not present
if 'canPerformAction' not in content:
    content = "import { canPerformAction } from '../lib/permissions';\n" + content

# Guard handleDeleteProject
old_del = """  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Évite de déclencher onSelectProject
    if(confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
        onProjetsChange(projets.filter(p => p.id !== id));
    }
  };"""

new_del = """  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Évite de déclencher onSelectProject
    if (!canPerformAction(currentUser, 'delete')) {
      alert("Action non autorisée pour votre profil (Droits insuffisants).");
      return;
    }
    if(confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
        onProjetsChange(projets.filter(p => p.id !== id));
    }
  };"""

content = content.replace(old_del, new_del)

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)

print("Patched ProjectPortal.tsx successfully")
