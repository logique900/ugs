import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Update handleLogin
old_handle_login = """  const handleLogin = (user: Utilisateur) => {
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

new_handle_login = """  const handleLogin = (user: Utilisateur) => {
    setCurrentUser(user);
    
    const affectations = user.projetsAffectes || [];
    
    if (user.role === 'admin' || user.role === 'directeur') {
      setShowPortal(true);
      setSelectedProjectId('all');
      setActiveTab('dashboard');
    } else if (affectations.length > 1) {
      // User has multiple assigned boutiques, must choose one
      setShowPortal(true);
      setSelectedProjectId('all');
      setActiveTab(user.role === 'comptable' ? 'dashboard' : 'ventes');
    } else {
      // Single boutique or no specific assignment
      setShowPortal(false);
      setSelectedProjectId(affectations[0] || user.projetId || '1');
      setActiveTab(user.role === 'comptable' ? 'dashboard' : 'ventes');
    }
  };"""

if old_handle_login in content:
    content = content.replace(old_handle_login, new_handle_login)
else:
    print("Could not find old handleLogin")

# Update ProjectPortal call to pass currentUser
old_portal_call = """  if (showPortal && currentUser.role === 'admin') {
    return (
      <ProjectPortal 
        onLogout={handleLogout} 
        projets={projets}

        onProjetsChange={setProjets}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setActiveTab('dashboard');
          setShowPortal(false);
        }} 
      />
    );
  }"""

new_portal_call = """  if (showPortal) {
    // Only admins or multi-boutique users see the portal
    return (
      <ProjectPortal 
        currentUser={currentUser}
        onLogout={handleLogout} 
        projets={projets}
        onProjetsChange={setProjets}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setActiveTab(currentUser.role === 'comptable' || currentUser.role === 'admin' ? 'dashboard' : 'ventes');
          setShowPortal(false);
        }} 
      />
    );
  }"""

if old_portal_call in content:
    content = content.replace(old_portal_call, new_portal_call)
else:
    print("Could not find ProjectPortal call")

with open('src/App.tsx', 'w') as f:
    f.write(content)

