import re

with open('src/components/Login.tsx', 'r') as f:
    content = f.read()

# Update handleSubmit function
old_submit = """  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = mockUsers.find(u => u.email === email);
    if (user) {
      onLogin(user);
    } else {
      setError("Identifiants incorrects. Veuillez réessayer.");
    }
  };"""

new_submit = """  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate real auth matching both email and password
    const user = mockUsers.find(u => u.email === email && (u.motDePasse === password || !u.motDePasse));
    if (user) {
      if (user.statut === 'Inactif') {
        setError("Ce compte est désactivé. Veuillez contacter l'administrateur.");
      } else {
        onLogin(user);
      }
    } else {
      setError("Adresse e-mail ou mot de passe incorrect.");
    }
  };"""

content = content.replace(old_submit, new_submit)

# Update Demo buttons
old_demo = """          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-widest text-center">Accès de démonstration</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  const user = mockUsers.find(u => u.email === 'admin@ugs-distribution.com');
                  if(user) onLogin(user);
                }}
                className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:bg-indigo-100 group-hover:scale-110 transition-all">
                  <span className="material-symbols-outlined text-[20px]">shield_person</span>
                </div>
                <span className="text-sm text-slate-900 font-bold">Admin</span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 truncate w-full">Connexion Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const user = mockUsers.find(u => u.email === 'jean.dupont@ugs-distribution.com');
                  if(user) onLogin(user);
                }}
                className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:bg-emerald-100 group-hover:scale-110 transition-all">
                  <span className="material-symbols-outlined text-[20px]">support_agent</span>
                </div>
                <span className="text-sm text-slate-900 font-bold">Agent</span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 truncate w-full">Connexion Agent</span>
              </button>
            </div>
          </div>"""

new_demo = """          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-widest text-center">Accès de démonstration</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@entreprise.com');
                  setPassword('admin123');
                }}
                className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <span className="text-xs text-slate-900 font-bold">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('comptable@entreprise.com');
                  setPassword('comptable123');
                }}
                className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <span className="text-xs text-slate-900 font-bold">Comptable</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('caissier.a@entreprise.com');
                  setPassword('caissier123');
                }}
                className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <span className="text-xs text-slate-900 font-bold">Caissier A</span>
              </button>
            </div>
          </div>"""

content = content.replace(old_demo, new_demo)

with open('src/components/Login.tsx', 'w') as f:
    f.write(content)
