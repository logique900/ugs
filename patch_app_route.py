import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_login = """  const handleLogin = (user: Utilisateur) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setShowPortal(true);
      setSelectedProjectId('all');
    } else {
      setShowPortal(false);
      setSelectedProjectId(user.projetId || '1');
    }
  };"""

new_login = """  const handleLogin = (user: Utilisateur) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setShowPortal(true);
      setSelectedProjectId('all');
      setActiveTab('dashboard');
    } else if (user.role === 'comptable') {
      setShowPortal(false);
      setSelectedProjectId('all'); // Comptable sees all usually, or based on affectations
      setActiveTab('dashboard');
    } else {
      // Caissier
      setShowPortal(false);
      setSelectedProjectId(user.projetId || '1');
      setActiveTab('ventes'); // Caissier defaults to ventes
    }
  };"""

content = content.replace(old_login, new_login)

with open('src/App.tsx', 'w') as f:
    f.write(content)
