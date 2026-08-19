import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

# Replace formData state
old_formdata = """  const [formData, setFormData] = useState<{
    nom: string;
    description: string;
    responsable: string;
    statut: 'Actif' | 'En pause' | 'Archivé';
  }>({
    nom: '',
    description: '',
    responsable: '',
    statut: 'Actif',
  });"""

new_formdata = """  const [formData, setFormData] = useState<Partial<Projet>>({
    nom: '',
    codeBoutique: '',
    adresse: '',
    ville: '',
    gouvernorat: '',
    telephone: '',
    email: '',
    description: '',
    responsable: '',
    statut: 'Active',
  });
  const [formError, setFormError] = useState('');"""

if old_formdata in content:
    content = content.replace(old_formdata, new_formdata)

# Replace handleOpenEditModal
old_open_edit = """  const handleOpenEditModal = (projet: Projet, e: React.MouseEvent) => {
    e.stopPropagation(); // Évite de déclencher onSelectProject
    setEditingProject(projet);
    setFormData({ 
      nom: projet.nom, 
      description: projet.description, 
      responsable: projet.responsable, 
      statut: projet.statut 
    });
    setIsEditModalOpen(true);
  };"""

new_open_edit = """  const handleOpenEditModal = (projet: Projet, e: React.MouseEvent) => {
    e.stopPropagation(); // Évite de déclencher onSelectProject
    setEditingProject(projet);
    setFormError('');
    setFormData({ 
      nom: projet.nom,
      codeBoutique: projet.codeBoutique || '',
      adresse: projet.adresse || '',
      ville: projet.ville || '',
      gouvernorat: projet.gouvernorat || '',
      telephone: projet.telephone || '',
      email: projet.email || '',
      description: projet.description || '', 
      responsable: projet.responsable || '', 
      statut: projet.statut 
    });
    setIsEditModalOpen(true);
  };
  
  const handleOpenNewModal = () => {
    setEditingProject(null);
    setFormError('');
    setFormData({
      nom: '',
      codeBoutique: '',
      adresse: '',
      ville: '',
      gouvernorat: '',
      telephone: '',
      email: '',
      description: '',
      responsable: '',
      statut: 'Active',
    });
    setIsEditModalOpen(true);
  };"""

if old_open_edit in content:
    content = content.replace(old_open_edit, new_open_edit)

# Replace handleSaveProject
old_save_project = """  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.responsable) return;

    if (editingProject) {
      onProjetsChange(projets.map(p => p.id === editingProject.id ? { ...p, ...formData } : p));
    } else {
      const newProject: Projet = {
        id: `p-${Date.now()}`,
        ...formData,
        dateCreation: new Date().toISOString().split('T')[0],
      };
      onProjetsChange([newProject, ...projets]);
    }
    setIsEditModalOpen(false);
  };"""

new_save_project = """  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nom || !formData.codeBoutique || !formData.adresse || !formData.ville || !formData.telephone) {
      setFormError('Veuillez remplir tous les champs obligatoires (*).');
      return;
    }

    // Code boutique doit être unique
    const isCodeDuplicate = projets.some(p => p.codeBoutique?.toLowerCase() === formData.codeBoutique?.toLowerCase() && p.id !== editingProject?.id);
    if (isCodeDuplicate) {
      setFormError('Le code boutique est déjà utilisé par une autre boutique.');
      return;
    }

    if (editingProject) {
      onProjetsChange(projets.map(p => p.id === editingProject.id ? { ...p, ...formData as Projet } : p));
    } else {
      const newProject: Projet = {
        id: `p-${Date.now()}`,
        ...(formData as Projet),
        dateCreation: new Date().toISOString().split('T')[0],
      };
      onProjetsChange([newProject, ...projets]);
    }
    setIsEditModalOpen(false);
  };"""

if old_save_project in content:
    content = content.replace(old_save_project, new_save_project)

# Replace handleOpenEditModal trigger on New Project Button
content = content.replace("onClick={() => setIsEditModalOpen(true)}", "onClick={handleOpenNewModal}")

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)
