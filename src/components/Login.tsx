import React, { useState } from 'react';
import { Utilisateur } from '../types';
import warehouseImg from '../assets/images/warehouse_logistics_1789025797917.jpg';

interface LoginProps {
  onLogin: (user: Utilisateur) => void;
  users: Utilisateur[];
}

export function Login({ onLogin, users }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    
    if (!user) {
      setError('Aucun compte trouvé avec cette adresse e-mail.');
      return;
    }
    if (user.statut === 'Inactif') {
      setError('Ce compte est désactivé par le Super-Administrateur. Veuillez contacter la direction.');
      return;
    }
    if (user.motDePasse && user.motDePasse !== password) {
      setError('Mot de passe incorrect. Veuillez vérifier vos identifiants.');
      return;
    }
    setError('');
    onLogin(user);
  };

  const handleQuickLogin = (demoUserEmail: string, demoUserPass: string) => {
    setEmail(demoUserEmail);
    setPassword(demoUserPass);
    const user = users.find(u => u.email.toLowerCase() === demoUserEmail.toLowerCase());
    if (user) {
      if (user.statut === 'Inactif') {
        setError('Ce compte est désactivé par le Super-Administrateur.');
        return;
      }
      setError('');
      onLogin(user);
    } else {
      setError('Compte de démonstration introuvable.');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans">
      {/* LEFT PANEL (55%) */}
      <div className="hidden lg:flex flex-col w-[55%] bg-slate-950 relative overflow-hidden text-white p-12 xl:p-16">
        {/* Gradients and Abstract Shapes */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 z-0 pointer-events-none" />
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full z-0 pointer-events-none" />
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[100px] rounded-full z-0 pointer-events-none" />
        
        {/* Diagonal lines pattern (SVG) */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 mb-16 relative z-10">
            <img src="/logo.png" alt="UGS" className="w-14 h-14 object-contain bg-white rounded-2xl p-1.5 shadow-md" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-2xl font-bold font-display-sm tracking-tight text-white leading-tight">UGS Distribution.</h1>
              <p className="text-[12px] font-semibold text-blue-300 uppercase tracking-widest mt-0.5">Portail ERP Central</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center relative">
            <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight mb-6 leading-[1.15] text-white relative z-10">
              Connectez-vous à votre espace dédié avec vos identifiants fournis par le Super-Administrateur.
            </h2>
            <p className="text-slate-400 text-base xl:text-lg max-w-2xl mb-12 relative z-10">
              Supervisez vos stocks, caisses, ventes et achats selon vos permissions.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-[85%] mb-12 relative z-10">
              {/* Card 1 */}
              <div className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined">inventory_2</span>
                </div>
                <h3 className="text-white font-semibold mb-1">Gestion des stocks</h3>
                <p className="text-xs xl:text-sm text-slate-400">Suivi en temps réel</p>
              </div>
              {/* Card 2 */}
              <div className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <h3 className="text-white font-semibold mb-1">Ventes & Achats</h3>
                <p className="text-xs xl:text-sm text-slate-400">Tableaux de bord</p>
              </div>
              {/* Card 3 */}
              <div className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined">shield_person</span>
                </div>
                <h3 className="text-white font-semibold mb-1">Accès sécurisé</h3>
                <p className="text-xs xl:text-sm text-slate-400">Selon vos permissions</p>
              </div>
              {/* Card 4 */}
              <div className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
                <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined">speed</span>
                </div>
                <h3 className="text-white font-semibold mb-1">Performance</h3>
                <p className="text-xs xl:text-sm text-slate-400">Fiabilité & scalabilité</p>
              </div>
            </div>

            {/* Warehouse Image in geometric shape */}
            <div className="absolute right-0 bottom-0 w-[70%] max-w-[600px] aspect-[16/10] rounded-tl-[64px] overflow-hidden shadow-[-20px_-20px_60px_rgba(0,0,0,0.5)] z-0 hidden lg:block opacity-60 hover:opacity-100 transition-all duration-700 border-t border-l border-white/10 group cursor-default">
              <img src={warehouseImg} alt="Logistique" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-l from-slate-950/30 via-transparent to-slate-950/90 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL (45%) */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center relative bg-slate-50 p-6 sm:p-12 overflow-y-auto min-h-screen">
        <div className="w-full max-w-[420px] mx-auto flex flex-col justify-center min-h-full py-12">
          
          {/* Main Login Card */}
          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-[14px] shadow-md shadow-blue-600/20 flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[24px]">lock</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2 font-display-sm">Connexion ERP</h2>
            <p className="text-sm text-slate-500 text-center mb-8 font-medium">Saisissez votre adresse e-mail et votre mot de passe pour accéder à votre espace dédié.</p>
            
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Adresse e-mail</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">mail</span>
                  <input 
                    type="email" 
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all text-slate-900 font-medium placeholder:text-slate-400 font-mono text-sm"
                    placeholder="votre.email@erp-management.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock_outline</span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all text-slate-900 font-medium placeholder:text-slate-400 font-mono text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" className="peer appearance-none w-4.5 h-4.5 border border-slate-300 rounded cursor-pointer checked:bg-blue-600 checked:border-blue-600 transition-colors" />
                    <span className="material-symbols-outlined text-white text-[14px] absolute opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Se souvenir de moi</span>
                </label>
              </div>

              <button 
                type="submit" 
                className="w-full bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 mt-2 shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] active:scale-[0.98] cursor-pointer border border-blue-800/20"
              >
                Accéder à mon Espace
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </form>
          </div>

          {/* Quick Demo Access Section */}
          <div className="mt-2">
            <p className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.15em] text-center">
              Accès Rapide Démonstration (1-clic)
            </p>
            <div className="flex flex-col gap-2">
              {/* Row 1 - 2 cards */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('superadmin@erp-management.com', 'demo123')}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm hover:shadow-md transition-all text-left group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">verified_user</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-900 font-bold leading-tight">Super Admin</span>
                    <span className="block text-[10px] text-slate-500 font-medium leading-tight mt-0.5">Gestion utilisateurs</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@erp-management.com', 'demo123')}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm hover:shadow-md transition-all text-left group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                    <span className="material-symbols-outlined text-[18px] text-orange-600">domain</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-900 font-bold leading-tight">Admin ERP</span>
                    <span className="block text-[10px] text-slate-500 font-medium leading-tight mt-0.5">Société UGS Sarl</span>
                  </div>
                </button>
              </div>

              {/* Row 2 - 3 cards */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('comptable@erp-management.com', 'demo123')}
                  className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm hover:shadow-md transition-all text-center group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mb-1.5 shrink-0 group-hover:bg-emerald-100 transition-colors">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">account_balance</span>
                  </div>
                  <span className="block text-[10px] text-slate-900 font-bold leading-tight">Comptable</span>
                  <span className="block text-[9px] text-slate-500 font-medium leading-tight mt-0.5">Finances & KPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('caissier@erp-management.com', 'demo123')}
                  className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm hover:shadow-md transition-all text-center group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center mb-1.5 shrink-0 group-hover:bg-cyan-100 transition-colors">
                    <span className="material-symbols-outlined text-[16px] text-cyan-600">point_of_sale</span>
                  </div>
                  <span className="block text-[10px] text-slate-900 font-bold leading-tight">Caissier ERP</span>
                  <span className="block text-[9px] text-slate-500 font-medium leading-tight mt-0.5 line-clamp-1">Management POS</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('caissier.scolaire@erp-management.com', 'demo123')}
                  className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm hover:shadow-md transition-all text-center group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center mb-1.5 shrink-0 group-hover:bg-violet-100 transition-colors">
                    <span className="material-symbols-outlined text-[16px] text-violet-600">storefront</span>
                  </div>
                  <span className="block text-[10px] text-slate-900 font-bold leading-tight">Caissier S.</span>
                  <span className="block text-[9px] text-slate-500 font-medium leading-tight mt-0.5">POS Scolaire</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-12 text-center pb-4">
            <p className="text-[11px] font-bold text-slate-400">
              UGS Distribution | ERP Central v2.5.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
