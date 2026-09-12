import React from 'react';
import { mockVentes, mockMonthlyData } from '../data';
import { Projet } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant p-3.5 rounded-xl shadow-xl font-body-sm">
        <p className="font-bold text-on-surface mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 text-xs py-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-on-surface-variant font-medium">{entry.name}:</span>
            </div>
            <span className="font-bold text-on-surface">{entry.value.toLocaleString('fr-FR')} DT</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface AdminStatisticsProps {
  projets: Projet[];
}

export function AdminStatistics({ projets }: AdminStatisticsProps) {
  const caByProject = projets.map(p => {
    const ca = mockVentes.filter(v => v.projetId === p.id && v.statut === 'Payée').reduce((acc, v) => acc + v.montantHT, 0);
    return { name: p.nom.split(' - ')[0], fullNom: p.nom, ca };
  }).sort((a, b) => b.ca - a.ca);

  const globalMonthlyData = mockMonthlyData['all'];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="font-display-sm text-display-sm text-on-surface mb-1">Statistiques & Reporting</h2>
          <p className="font-body-md text-on-surface-variant">Analyse détaillée des performances financières globales.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique Courbes: Ventes vs Achats Annuel */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col">
          <h3 className="font-title-lg text-title-lg text-on-surface mb-1">Tendances Financières Mensuelles</h3>
          <p className="font-body-sm text-on-surface-variant mb-6">Comparaison des revenus et dépenses cumulés sur 12 mois.</p>
          
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={globalMonthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminColorVentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="adminColorAchats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  height={32} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-semibold text-on-surface">{value === 'ventes' ? 'Ventes' : 'Achats'}</span>}
                />
                <Area type="monotone" dataKey="ventes" name="Ventes" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#adminColorVentes)" />
                <Area type="monotone" dataKey="achats" name="Achats" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#adminColorAchats)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique Barres: CA par Projet */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col">
          <h3 className="font-title-lg text-title-lg text-on-surface mb-1">Chiffre d'Affaires par Projet</h3>
          <p className="font-body-sm text-on-surface-variant mb-6">Répartition du CA facturé et payé par boutique.</p>
          
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caByProject} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ca" name="Chiffre d'Affaires" fill="#0284c7" radius={[8, 8, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

