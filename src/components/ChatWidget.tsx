import React, { useState, useRef, useEffect } from 'react';
import { Vente, Achat, Client, Fournisseur, Article } from '../types';

interface ChatWidgetProps {
  ventes: Vente[];
  achats: Achat[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  articles: Article[];
}

export function ChatWidget({ ventes, achats, clients, fournisseurs, articles }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string}[]>([
    { role: 'assistant', text: 'Bonjour ! Je suis votre assistant ERP intelligent. Posez-moi vos questions sur le chiffre d\'affaires, les créances ou les stocks.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const erpContext = {
        totalVentes: ventes.reduce((acc, v) => acc + v.montantTTC, 0),
        ventesNonPayees: ventes.filter(v => (v.montantPaye || 0) < v.montantTTC).map(v => ({ id: v.numero, client: v.clientNom, montantDu: v.montantTTC - (v.montantPaye || 0) })),
        articlesStockFaible: articles.filter(a => a.stock < (a.seuilAlerte || 15)).map(a => ({ nom: a.designation, stock: a.stock })),
        totalAchats: achats.reduce((acc, a) => acc + a.montantTTC, 0),
      };

      const res = await fetch('/api/chat-erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, erpContext })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: `Erreur: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Erreur de connexion à l'assistant.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center transition-transform hover:scale-110 z-50 group"
      >
        <span className="material-symbols-outlined text-[28px]">{isOpen ? 'close' : 'smart_toy'}</span>
        {!isOpen && (
           <span className="absolute right-full mr-3 whitespace-nowrap bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
             Demander à l'IA
           </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">smart_toy</span>
              <span className="font-bold">Assistant ERP (Gemini)</span>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-2xl text-sm bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 shrink-0 flex items-center gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Posez votre question..."
              className="flex-1 px-4 py-2 bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
            />
            <button type="submit" disabled={isLoading || !inputValue.trim()} className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center disabled:opacity-50">
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
