import React, { useRef } from 'react';
import { Vente, Projet, Client, Utilisateur } from '../types';
import { generatePosTicketPdf } from '../utils/pdfExportEngine';

interface TicketPanierModalProps {
  vente: Vente;
  projet?: Projet | null;
  client?: Client | null;
  currentUser?: Utilisateur | null;
  onClose: () => void;
}

export function TicketPanierModal({
  vente,
  projet,
  client,
  currentUser,
  onClose
}: TicketPanierModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);

  const totalQuantite = (vente.lignes || []).reduce((sum, l) => sum + (l.quantite || 1), 0);
  const totalHT = (vente.lignes || []).reduce((sum, l) => sum + (l.totalHT || 0), 0);
  const totalTVA = (vente.lignes || []).reduce((sum, l) => sum + ((l.totalTTC || 0) - (l.totalHT || 0)), 0);
  const storeName = projet?.nom || projet?.entrepriseNom || 'Boutique POS';
  const storeAddress = projet?.adresse || 'Tunis, Tunisie';
  const storePhone = projet?.telephone || '+216 71 000 000';
  const storeMF = projet?.matriculeFiscal || '1234567/A/M/000';

  const handlePrintThermal = () => {
    const printContent = printableRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=450,height=650');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up pour l'impression directe du ticket.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket de Caisse - ${vente.numero}</title>
          <style>
            @page {
              margin: 0;
              size: 80mm auto;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              color: #000;
              width: 76mm;
              margin: 2mm auto;
              padding: 4mm;
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .divider-double { border-top: 2px solid #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 2px; }
            td { padding: 2px 0; vertical-align: top; }
            .total-row { font-size: 13px; font-weight: bold; }
            .barcode { letter-spacing: 4px; font-size: 14px; margin-top: 4px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportPdf = () => {
    generatePosTicketPdf(vente, client || undefined, projet || undefined);
  };

  const handleShareWhatsApp = () => {
    const clientPhone = client?.telephone || '';
    const cleanPhone = clientPhone.replace(/\s+/g, '');
    const itemsList = (vente.lignes || []).map(l => `• ${l.quantite}x ${l.designation} = ${l.totalTTC.toFixed(3)} DT`).join('\n');
    const msg = `🧾 *Ticket de Panier ${vente.numero}*\n🏪 *${storeName}*\n📅 Date : ${new Date(vente.date).toLocaleDateString('fr-FR')}\n👤 Client : ${client?.nom || vente.clientNom || 'Client Comptoir'}\n\n*Articles :*\n${itemsList}\n\n💰 *Total TTC : ${vente.montantTTC.toFixed(3)} DT*\nMode de paiement : ${vente.modePaiement || 'Espèces'}\n\nMerci pour votre visite !`;

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
    } else {
      navigator.clipboard.writeText(msg);
      alert("📋 Résumé du ticket copié dans le presse-papier pour envoi WhatsApp !");
    }
  };

  const handleCopySummary = () => {
    const itemsList = (vente.lignes || []).map(l => `• ${l.quantite}x ${l.designation} = ${l.totalTTC.toFixed(3)} DT`).join('\n');
    const msg = `🧾 Ticket ${vente.numero} | ${storeName}\nDate: ${new Date(vente.date).toLocaleDateString('fr-FR')}\nTotal: ${vente.montantTTC.toFixed(3)} DT\nArticles:\n${itemsList}`;
    navigator.clipboard.writeText(msg);
    alert("📋 Résumé du ticket copié dans le presse-papier !");
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header modal */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Ticket de Panier & Mouvement</span>
                <span className="px-2 py-0.5 bg-purple-400/20 text-purple-300 border border-purple-400/30 text-[10px] font-mono rounded-md">
                  {vente.numero}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                Détail complet du panier et des articles vendus
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Receipt Body (Styled as a real POS thermal ticket) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/70 flex-1 flex justify-center">
          <div 
            ref={printableRef}
            className="w-full max-w-[340px] bg-white p-5 rounded-2xl shadow-md border border-slate-200 text-slate-900 font-mono text-xs space-y-3"
          >
            {/* Store Header */}
            <div className="text-center space-y-1">
              <h2 className="text-base font-black tracking-wider uppercase">{storeName}</h2>
              <p className="text-[11px] text-slate-600 font-sans">{storeAddress}</p>
              <p className="text-[11px] text-slate-600 font-sans">Tél: {storePhone}</p>
              {storeMF && <p className="text-[10px] text-slate-500 font-sans">MF: {storeMF}</p>}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2"></div>

            {/* Sale metadata */}
            <div className="text-[11px] space-y-0.5 font-sans">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Ticket N° :</span>
                <span className="font-mono font-bold text-slate-900">{vente.numero}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Date & Heure :</span>
                <span className="font-bold text-slate-900">
                  {new Date(vente.date).toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Caissier :</span>
                <span className="font-bold text-slate-900">{vente.auteurNom || currentUser?.nom || 'Caissier'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Client :</span>
                <span className="font-bold text-slate-900">{client?.nom || vente.clientNom || 'Client Comptoir'}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-2"></div>

            {/* Basket Items Table */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-[11px] text-slate-600 pb-1 border-b border-slate-200">
                <span>Désignation / Qté</span>
                <span>Total TTC</span>
              </div>

              <div className="space-y-2">
                {(vente.lignes || []).map((ligne, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span className="truncate pr-2">{ligne.designation}</span>
                      <span className="font-mono text-purple-900 shrink-0">{(ligne.totalTTC || 0).toFixed(3)} DT</span>
                    </div>
                    <div className="flex justify-between text-[10.5px] text-slate-500 font-sans">
                      <span>{ligne.quantite} x {(ligne.prixUnitaireHT * (1 + (ligne.tauxTVA || 19) / 100)).toFixed(3)} DT</span>
                      {ligne.remisePourcentage ? (
                        <span className="text-emerald-600 font-bold">-{ligne.remisePourcentage}%</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-slate-900 my-2"></div>

            {/* Financial Summary */}
            <div className="space-y-1 font-sans text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Nombre d'articles :</span>
                <span className="font-bold text-slate-900 font-mono">{totalQuantite}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total HT :</span>
                <span className="font-mono font-bold">{totalHT.toFixed(3)} DT</span>
              </div>
              {totalTVA > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>TVA :</span>
                  <span className="font-mono">{totalTVA.toFixed(3)} DT</span>
                </div>
              )}
              {vente.timbreFiscal ? (
                <div className="flex justify-between text-slate-600">
                  <span>Timbre Fiscal :</span>
                  <span className="font-mono">{vente.timbreFiscal.toFixed(3)} DT</span>
                </div>
              ) : null}

              <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-dashed border-slate-300">
                <span>TOTAL TTC :</span>
                <span className="font-mono text-purple-700">{vente.montantTTC.toFixed(3)} DT</span>
              </div>

              <div className="flex justify-between text-slate-700 pt-1 text-[11px]">
                <span className="font-semibold">Mode de règlement :</span>
                <span className="font-bold uppercase">{vente.modePaiement || 'Espèces'}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold text-[11px]">
                <span>Montant Payé :</span>
                <span className="font-mono">{(vente.montantPaye ?? vente.montantTTC).toFixed(3)} DT</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-2"></div>

            {/* Barcode & Footer Greeting */}
            <div className="text-center space-y-1 pt-1">
              <div className="font-mono font-black text-sm tracking-widest text-slate-900">
                ||| | |||| ||| || ||||| | ||
              </div>
              <p className="text-[10px] font-mono text-slate-500">*{vente.numero}*</p>
              <p className="text-[10.5px] font-medium text-slate-600 font-sans italic pt-1">
                Merci de votre fidélité & à bientôt !
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
              title="Copier le résumé du ticket"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Partager le ticket sur WhatsApp"
            >
              <span className="material-symbols-outlined text-[17px]">chat</span>
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
              <span>Reçu PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrintThermal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/25 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[17px]">print</span>
              <span>Imprimer Ticket (80mm)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
