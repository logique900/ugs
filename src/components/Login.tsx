import React, { useState } from 'react';
import { Utilisateur } from '../types';
import { mockUsers } from '../data';

interface LoginProps {
  onLogin: (user: Utilisateur) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulation d'authentification basée sur l'email
    const user = mockUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    
    if (user) {
      setError('');
      onLogin(user);
    } else {
      setError('Utilisateur non trouvé. Comptes disponibles : admin@entreprise.com, comptable@ugs.tn, caissier.ugs@entreprise.com, caissier.scolaire@entreprise.com');
    }
  };

  const handleQuickLogin = (demoUserEmail: string, demoUserPass: string) => {
    setEmail(demoUserEmail);
    setPassword(demoUserPass);
    const user = mockUsers.find(u => u.email.toLowerCase() === demoUserEmail.toLowerCase());
    if (user) {
      setError('');
      onLogin(user);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen w-full bg-slate-50 overflow-y-auto lg:overflow-hidden">
      {/* Left Panel - Branding / Welcome Message (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 p-12 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/30">
              <span className="material-symbols-outlined text-[24px]">domain</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight block">Société UGS</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Siège Central</span>
            </div>
          </div>

          <h1 className="text-[44px] leading-tight font-black mb-6 mt-16 tracking-tight">
            Société UGS.<br/>
            <span className="text-indigo-400">Siège Central</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-md leading-relaxed font-medium">
            Bienvenue sur la plateforme centrale de pilotage du groupe UGS. Supervisez vos stocks, analysez vos distributions et pilotez l'ensemble de vos boutiques depuis une interface unifiée.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-20 -right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Right Panel - Authentication Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 bg-white relative z-10 shadow-2xl lg:shadow-none min-h-screen lg:min-h-0 my-auto">
        <div className="w-full max-w-md">
          {/* Bienvenue pour vue mobile */}
          <div className="lg:hidden mb-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/30 mb-4">
              <span className="material-symbols-outlined text-[28px]">domain</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center">Société UGS</h2>
            <p className="text-slate-500 text-center mt-2 text-sm font-medium uppercase tracking-widest">Siège Central</p>
          </div>

          <div className="hidden lg:block mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Connexion</h2>
            <p className="text-slate-500">Veuillez vous authentifier pour accéder à l'espace collaborateur.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <span className="material-symbols-outlined text-rose-500 shrink-0">error</span>
                <p className="text-sm font-medium text-rose-700">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Adresse e-mail</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">mail</span>
                <input 
                  type="email" 
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 font-medium placeholder:text-slate-400"
                  placeholder="admin@entreprise.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
                <input 
                  type="password" 
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 font-medium placeholder:text-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer appearance-none w-4.5 h-4.5 border border-slate-300 rounded cursor-pointer checked:bg-indigo-600 checked:border-indigo-600 transition-colors" />
                  <span className="material-symbols-outlined text-white text-[14px] absolute opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                </div>
                <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:underline">Mot de passe oublié ?</a>
            </div>

            <button 
              type="submit" 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 mt-2 shadow-lg shadow-slate-900/20 active:scale-[0.98]"
            >
              Se connecter
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>

          {/* Quick Demo Access Section */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-[0.15em] text-center">
              Comptes de Démonstration (1-clic)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin@ugs.tn', 'demo123')}
                className="flex flex-col items-center justify-center p-3 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform ring-4 ring-white">
                  <span className="material-symbols-outlined text-[22px] text-indigo-700">verified_user</span>
                </div>
                <span className="text-[12px] text-slate-900 font-black">Super Admin</span>
                <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">Contrôle Total</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@ugs.tn', 'demo123')}
                className="flex flex-col items-center justify-center p-3 bg-white hover:bg-red-50/50 border border-slate-100 hover:border-red-200 rounded-2xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[22px] text-red-600">admin_panel_settings</span>
                </div>
                <span className="text-[12px] text-slate-900 font-black">Admin</span>
                <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">Boutiques & Flux</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('comptable@ugs.tn', 'demo123')}
                className="flex flex-col items-center justify-center p-3 bg-white hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-200 rounded-2xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[22px] text-emerald-600">account_balance</span>
                </div>
                <span className="text-[12px] text-slate-900 font-black">Comptable</span>
                <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">Finances & KPI</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('caissier@ugs.tn', 'demo123')}
                className="flex flex-col items-center justify-center p-3 bg-white hover:bg-amber-50/50 border border-slate-100 hover:border-amber-200 rounded-2xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[22px] text-amber-600">point_of_sale</span>
                </div>
                <span className="text-[12px] text-slate-900 font-black">Caissier UGS</span>
                <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">Siège Sfax</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('caissier.scolaire@ugs.tn', 'demo123')}
                className="flex flex-col items-center justify-center p-3 bg-white hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all text-center shadow-sm hover:shadow-md group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[22px] text-blue-600">storefront</span>
                </div>
                <span className="text-[12px] text-slate-900 font-black">Caissier S.</span>
                <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">Scolaire Plus</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
