import React, { useState, useEffect, useRef } from 'react';
import { Article, Client, Vente, Projet, TabType } from '../types';

interface GlobalSearchProps {
  articles: Article[];
  clients: Client[];
  ventes: Vente[];
  projets: Projet[];
  onNavigate: (tab: TabType, id?: string) => void;
}

export function GlobalSearch({ articles, clients, ventes, projets, onNavigate }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getBoutiqueName = (projetId?: string) => {
    if (!projetId) return 'Toutes les boutiques';
    return projets.find(p => p.id === projetId)?.nom || 'Boutique';
  };

  const getFilteredResults = () => {
    if (!query || query.trim().length < 2) return [];

    const lowerQuery = query.toLowerCase();
    const results: any[] = [];

    // Search Articles
    articles.forEach(a => {
      if (
        a.designation.toLowerCase().includes(lowerQuery) ||
        a.code.toLowerCase().includes(lowerQuery) ||
        (a.referenceInterne && a.referenceInterne.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          id: a.id,
          type: 'Produit',
          icon: 'inventory_2',
          title: a.designation,
          subtitle: `Code: ${a.code} | Stock: ${a.stock || 0}`,
          tab: 'articles'
        });
      }
    });

    // Search Clients
    clients.forEach(c => {
      if (
        c.nom.toLowerCase().includes(lowerQuery) ||
        (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
        (c.telephone && c.telephone.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          id: c.id,
          type: 'Client',
          icon: 'person',
          title: c.nom,
          subtitle: `Tél: ${c.telephone || '-'}`,
          tab: 'clients'
        });
      }
    });

    // Search Ventes & Devis
    ventes.forEach(v => {
      if (
        v.numero.toLowerCase().includes(lowerQuery) ||
        (v.clientNom && v.clientNom.toLowerCase().includes(lowerQuery))
      ) {
        const typeDoc = v.statut === 'Devis' ? 'Devis' : 'Facture';
        results.push({
          id: v.id,
          type: typeDoc,
          icon: v.statut === 'Devis' ? 'request_quote' : 'receipt_long',
          title: `${typeDoc} #${v.numero}`,
          subtitle: `Client : ${v.clientNom || 'Passager'} | Boutique : ${getBoutiqueName(v.projetId)} | Montant : ${v.montantTTC.toFixed(3)} DT | Date : ${new Date(v.date).toLocaleDateString('fr-FR')}`,
          tab: 'ventes'
        });
      }
    });

    return results.slice(0, 15);
  };

  const results = getFilteredResults();

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div 
        className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
          <span className="material-symbols-outlined absolute left-6 text-slate-400">search</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher facture, client, produit... (ex: FAC-2026-00145)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3 bg-transparent text-slate-900 dark:text-white text-lg focus:outline-none placeholder-slate-400"
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute right-4 px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-md text-xs font-bold"
          >
            ESC
          </button>
        </div>

        {query.trim().length >= 2 && (
          <div className="max-h-96 overflow-y-auto p-2">
            {results.length > 0 ? (
              <div className="space-y-1">
                {results.map((res, i) => (
                  <button
                    key={`${res.type}-${res.id}-${i}`}
                    onClick={() => {
                      onNavigate(res.tab as TabType);
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl flex items-start gap-4 transition-colors group focus:outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <span className="material-symbols-outlined">{res.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-slate-900 dark:text-white truncate">{res.title}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                          {res.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{res.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-3 opacity-50">search_off</span>
                <p>Aucun résultat trouvé pour "{query}"</p>
              </div>
            )}
          </div>
        )}
        
        {query.trim().length < 2 && (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">keyboard</span>
            <p>Tapez au moins 2 caractères pour rechercher</p>
          </div>
        )}
      </div>
    </div>
  );
}
