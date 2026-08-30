import React, { useState, useMemo } from 'react';
import { Vente, Projet, Article, Client, TabType, SessionCaisse, SessionActionLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface RapportsProps {
  ventes: Vente[];
  projets: Projet[];
  articles: Article[];
  clients: Client[];
  selectedProjectId: string;
  sessions: SessionCaisse[];
  actionLogs: SessionActionLog[];
}

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function Rapports({ ventes, projets, articles, clients, selectedProjectId, sessions, actionLogs }: RapportsProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'caisse'>('sales');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'semi' | 'month' | 'year' | 'all'>('month');
  const [filterBoutique, setFilterBoutique] = useState<string>(selectedProjectId === 'all' ? 'all' : selectedProjectId);

  // 1. Filter Ventes
  const filteredVentes = useMemo(() => {
    return ventes.filter(v => {
      // Exclude devis & annulées
      if (v.statut === 'Devis' || v.statut === 'Annulée') return false;
      
      // Boutique filter
      if (filterBoutique !== 'all' && v.projetId !== filterBoutique) return false;

      // Date filter
      if (dateRange !== 'all') {
        const dateVente = new Date(v.date);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (dateRange === 'today') {
          if (dateVente < startOfDay) return false;
        } else if (dateRange === 'week') {
          const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (dateVente < weekAgo) return false;
        } else if (dateRange === 'semi') {
          const semiAgo = new Date(startOfDay.getTime() - 15 * 24 * 60 * 60 * 1000);
          if (dateVente < semiAgo) return false;
        } else if (dateRange === 'month') {
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (dateVente < monthAgo) return false;
        } else if (dateRange === 'year') {
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          if (dateVente < yearAgo) return false;
        }
      }

      return true;
    });
  }, [ventes, filterBoutique, dateRange]);

  // 2. Metrics & KPI
  const totalCA = filteredVentes.reduce((sum, v) => sum + v.montantTTC, 0);
  const totalVentesCount = filteredVentes.length;
  
  // Articles Count & Stock Value
  const articlesInScope = filterBoutique === 'all' ? articles : articles.filter(a => a.projetId === filterBoutique);
  const stockValuation = articlesInScope.reduce((sum, a) => sum + (a.stock * (a.prixVenteHT || 0)), 0);

  // 3. CA par Boutique (if global)
  const caParBoutique = useMemo(() => {
    const data: Record<string, number> = {};
    filteredVentes.forEach(v => {
      const p = projets.find(pr => pr.id === v.projetId);
      const name = p ? p.nom : 'Inconnu';
      data[name] = (data[name] || 0) + v.montantTTC;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredVentes, projets]);

  // 4. Produits les plus/moins vendus
  const topProducts = useMemo(() => {
    const map: Record<string, { qty: number, total: number }> = {};
    filteredVentes.forEach(v => {
      (v.lignes || []).forEach(l => {
        if (!map[l.designation]) map[l.designation] = { qty: 0, total: 0 };
        map[l.designation].qty += l.quantite;
        map[l.designation].total += l.totalTTC;
      });
    });
    const sorted = Object.entries(map).map(([name, stats]) => ({ name, qty: stats.qty, total: stats.total })).sort((a, b) => b.qty - a.qty);
    return {
      top: sorted.slice(0, 5),
      bottom: sorted.slice(-5).reverse().filter(x => x.qty > 0)
    };
  }, [filteredVentes]);

  // 5. CA par Période (Evolution)
  const evolutionCA = useMemo(() => {
    const data: Record<string, number> = {};
    filteredVentes.forEach(v => {
      const d = new Date(v.date);
      let key = d.toLocaleDateString('fr-FR');
      if (dateRange === 'year' || dateRange === 'all') {
        key = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      }
      data[key] = (data[key] || 0) + v.montantTTC;
    });
    // Sort chronologically logic is simplified here by assuming records are roughly ordered, but actually better to parse
    // For simplicity, we just return them mapped.
    return Object.entries(data).map(([date, ca]) => ({ date, ca }));
  }, [filteredVentes, dateRange]);

  // 6. Filter Sessions & Logs
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (filterBoutique !== 'all' && s.projetId !== filterBoutique) return false;
      
      const dateSession = new Date(s.dateOuverture);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateRange === 'today') {
        if (dateSession < startOfDay) return false;
      } else if (dateRange === 'week') {
        const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (dateSession < weekAgo) return false;
      } else if (dateRange === 'semi') {
        const semiAgo = new Date(startOfDay.getTime() - 15 * 24 * 60 * 60 * 1000);
        if (dateSession < semiAgo) return false;
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        if (dateSession < monthAgo) return false;
      } else if (dateRange === 'year') {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        if (dateSession < yearAgo) return false;
      }
      return true;
    });
  }, [sessions, filterBoutique, dateRange]);

  const filteredLogs = useMemo(() => {
    return actionLogs.filter(l => {
      const session = sessions.find(s => s.id === l.sessionId);
      if (!session) return false;
      if (filterBoutique !== 'all' && session.projetId !== filterBoutique) return false;

      const dateLog = new Date(l.timestamp);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateRange === 'today') {
        if (dateLog < startOfDay) return false;
      } else if (dateRange === 'week') {
        const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (dateLog < weekAgo) return false;
      } else if (dateRange === 'semi') {
        const semiAgo = new Date(startOfDay.getTime() - 15 * 24 * 60 * 60 * 1000);
        if (dateLog < semiAgo) return false;
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        if (dateLog < monthAgo) return false;
      } else if (dateRange === 'year') {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        if (dateLog < yearAgo) return false;
      }
      return true;
    });
  }, [actionLogs, sessions, filterBoutique, dateRange]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header & Filters */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center">
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Rapports</h2>
            <p className="text-slate-500 text-sm">Suivi des ventes et de la caisse</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl w-max border border-slate-200">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'sales' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              Ventes
            </button>
            <button
              onClick={() => setActiveTab('caisse')}
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'caisse' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
              Caisses
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase">Période</label>
            <select 
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500 font-bold"
            >
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="semi">15 derniers jours</option>
              <option value="month">30 derniers jours</option>
              <option value="year">12 derniers mois</option>
              <option value="all">Tout l'historique</option>
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase">Boutique</label>
            <select 
              value={filterBoutique}
              onChange={e => setFilterBoutique(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="all">Toutes les boutiques</option>
              {projets.map(p => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT BASED ON TAB */}
      {activeTab === 'sales' ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CA Généré (Période)</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500">DT</span></p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ventes (Factures)</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalVentesCount}</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Panier Moyen</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalVentesCount > 0 ? (totalCA / totalVentesCount).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '0,00'} <span className="text-xs text-slate-500">DT</span></p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Valorisation Stock (Prix Vente)</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{stockValuation.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500">DT</span></p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution CA */}
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Évolution du Chiffre d'Affaires</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionCA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="ca" name="CA (DT)" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CA par Boutique */}
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">CA par Boutique</h3>
              {caParBoutique.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={caParBoutique}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {caParBoutique.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR')} DT`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {caParBoutique.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                 <div className="h-[300px] flex items-center justify-center text-slate-400">Aucune donnée</div>
              )}
            </div>
          </div>

          {/* Top & Flop Products Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Produits */}
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Top 5 Produits (Quantité)</h3>
                <span className="material-symbols-outlined text-emerald-500">trending_up</span>
              </div>
              {topProducts.top.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.top.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}</div>
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]" title={p.name}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold text-slate-900">{p.qty} <span className="text-xs text-slate-500 font-normal">unités</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">Aucune donnée sur la période</div>
              )}
            </div>

            {/* Flop Produits */}
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Les 5 Moins Vendus (Quantité)</h3>
                <span className="material-symbols-outlined text-rose-500">trending_down</span>
              </div>
              {topProducts.bottom.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.bottom.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{topProducts.bottom.length - i}</div>
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]" title={p.name}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold text-slate-900">{p.qty} <span className="text-xs text-slate-500 font-normal">unités</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">Aucune donnée sur la période</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Caisse Sessions History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600">history</span>
                Sessions de caisse
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Caissier</th>
                    <th className="py-4 px-6">Ouverture</th>
                    <th className="py-4 px-6">Fermeture</th>
                    <th className="py-4 px-6 text-right">Solde Initial</th>
                    <th className="py-4 px-6 text-right">Solde Réel</th>
                    <th className="py-4 px-6 text-right">Écart</th>
                    <th className="py-4 px-6 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.map(session => (
                    <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">{session.utilisateurNom}</td>
                      <td className="py-4 px-6 text-slate-600">
                        {new Date(session.dateOuverture).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {session.dateFermeture ? new Date(session.dateFermeture).toLocaleString('fr-FR') : '-'}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-slate-600">
                        {session.soldeInitial.toFixed(3)} DT
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                        {session.soldeFinalReel?.toFixed(3) || '-'} DT
                      </td>
                      <td className={`py-4 px-6 text-right font-mono font-bold ${ (session.ecart || 0) < 0 ? 'text-rose-600' : (session.ecart || 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {session.ecart !== undefined ? (session.ecart > 0 ? `+${session.ecart.toFixed(3)}` : session.ecart.toFixed(3)) : '-'} DT
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          session.statut === 'Ouverte' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {session.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredSessions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold italic">
                        Aucune session enregistrée sur cette période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">list_alt</span>
                Activités des caissiers
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Horodatage</th>
                    <th className="py-4 px-6">Action</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6 text-right">Montant</th>
                    <th className="py-4 px-6">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6 text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                      </td>
                      <td className="py-3 px-6 font-black text-slate-900">{log.action}</td>
                      <td className="py-3 px-6">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          log.type === 'Vente' ? 'bg-indigo-100 text-indigo-700' :
                          log.type === 'Ouverture' ? 'bg-emerald-100 text-emerald-700' :
                          log.type === 'Fermeture' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-slate-900">
                        {log.montant ? `${log.montant.toFixed(3)} DT` : '-'}
                      </td>
                      <td className="py-3 px-6 text-slate-500 italic max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold italic">
                        Aucune action enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
