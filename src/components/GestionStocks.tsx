import React, { useState, useEffect } from 'react';
import { Utilisateur, Article, Projet, MouvementStock, Vente, Fournisseur, Achat, TabType } from '../types';
import { Articles } from './Articles';
import { Stock } from './Stock';

interface GestionStocksProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  articles: Article[];
  onArticlesChange: (articles: Article[]) => void;
  mouvements: MouvementStock[];
  onMouvementsChange: (mouvements: MouvementStock[]) => void;
  projets: Projet[];
  ventes?: Vente[];
  fournisseurs?: Fournisseur[];
  onGenerateAchat?: (nouvelAchat: Partial<Achat>) => void;
  onNavigate?: (tab: TabType) => void;
  initialSubTab?: 'catalogue' | 'mouvements';
}

export default function GestionStocks(props: GestionStocksProps) {
  return (
    <div className="space-y-4">
      {/* Module Header - Catalogue Articles */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Catalogue & Articles</h1>
              <p className="text-xs text-slate-500">Gestion du catalogue des articles, prix de vente et références</p>
            </div>
          </div>
        </div>
      </div>

      {/* Render Articles Catalog */}
      <div className="mt-4">
        <Articles
          currentUser={props.currentUser}
          selectedProjectId={props.selectedProjectId}
          articles={props.articles}
          onArticlesChange={props.onArticlesChange}
          projets={props.projets}
        />
      </div>
    </div>
  );
}
