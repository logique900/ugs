import React from 'react';
import { Hammer } from 'lucide-react';

interface EmptyStateProps {
  title: string;
}

export function EmptyState({ title }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-400">
        <Hammer className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Module {title}</h2>
      <p className="text-slate-500 max-w-md">
        Ce module est en cours de développement. Il regroupera toutes les fonctionnalités liées à la gestion {title.toLowerCase()}.
      </p>
    </div>
  );
}
