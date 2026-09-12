import React, { useState } from 'react';
import { BonDeLivraison, Client, Projet } from '../types';
import { numberToFrenchWords } from './FacturePrintModal';

interface BonDeLivraisonPrintModalProps {
  bl: BonDeLivraison;
  client?: Client;
  projet?: Projet | null;
  onClose: () => void;
}

export function BonDeLivraisonPrintModal({ bl, client, projet, onClose }: BonDeLivraisonPrintModalProps) {
  // Dynamic controls
  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>(
    bl.notes || 'Marchandise livrée en parfait état. Réception conforme.'
  );
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);

  // Clean document number
  const cleanNumber = bl.numero.replace(/^BL-/, '');

  // Dynamic Company Profile
  const cName = projet?.entrepriseNom || projet?.nom || 'SOCIETE UNIVERS GSM DE SUD';
  const cAddress = projet?.adresse || '112, OMAR IBN KHATAB ZRIG, GABES S3';
  const cMF = projet?.matriculeFiscal || '1532846 G/A/M/000';
  const cRib = projet?.rib 
    ? `${projet.rib}${projet.banque ? ` - ${projet.banque}` : ''}`
    : '04 705 012 0051487155 82 - Attijari Bank';
  const cPhone = projet?.telephone || '75 655 555';
  const cVille = projet?.ville || 'Gabes - Tunisie';

  // Dynamic Client Profile
  const clientNom = bl.clientNom || client?.nom || 'Client Divers';
  const clientCode = client?.code || (bl.clientId ? (bl.clientId.length > 8 ? bl.clientId.substring(0, 8).toUpperCase() : bl.clientId) : 'CL-001');
  const clientMF = bl.matriculeFiscalClient || client?.matriculeFiscal || '___/___/___';
  const clientAdresse = bl.adresseLivraison || bl.adresseFacturation || client?.adresse || 'Tunisie';
  const clientVille = client?.ville || client?.pays || '';
  const clientTel = bl.telephoneClient || client?.telephone || '';

  // Dynamic Transport info
  const chauffeur = bl.chauffeur || bl.transporteur || '-';
  const camion = bl.immatriculation || '-';
  const dateFormatted = bl.dateLivraison 
    ? bl.dateLivraison.split('-').reverse().join('/') 
    : (bl.dateCreation ? bl.dateCreation.split('-').reverse().join('/') : new Date().toLocaleDateString('fr-FR'));

  // Dynamic Line item calculations
  const rawLignes = bl.lignes || [];
  const lines = rawLignes.map((ligne, idx) => {
    const qte = typeof ligne.qteLivree === 'number' ? ligne.qteLivree : (typeof (ligne as any).quantite === 'number' ? (ligne as any).quantite : 1);
    const puHT = typeof ligne.prixUnitaireHT === 'number' ? ligne.prixUnitaireHT : 0;
    const remisePct = typeof ligne.remisePourcentage === 'number' ? ligne.remisePourcentage : 0;
    const tauxTVA = typeof ligne.tauxTVA === 'number' ? ligne.tauxTVA : 19;
    
    const totalHT = typeof ligne.totalHT === 'number' && ligne.totalHT > 0 
      ? ligne.totalHT 
      : qte * puHT * (1 - remisePct / 100);
    const montantTVA = totalHT * (tauxTVA / 100);
    const totalTTC = typeof ligne.totalTTC === 'number' && ligne.totalTTC > 0 
      ? ligne.totalTTC 
      : totalHT + montantTVA;

    return {
      code: ligne.code || `ART-${String(idx + 1).padStart(3, '0')}`,
      designation: ligne.designation || 'Article',
      unite: ligne.unite || 'PCS',
      quantite: qte,
      prixUnitaireHT: puHT,
      remisePct,
      tauxTVA,
      totalHT,
      montantTVA,
      totalTTC,
    };
  });

  // Dynamic TVA grouping
  const tvaGroupsMap: Record<number, { assiette: number; montant: number }> = {};
  lines.forEach((l) => {
    const t = l.tauxTVA;
    if (!tvaGroupsMap[t]) {
      tvaGroupsMap[t] = { assiette: 0, montant: 0 };
    }
    tvaGroupsMap[t].assiette += l.totalHT;
    tvaGroupsMap[t].montant += l.montantTVA;
  });

  const computedHT = lines.reduce((acc, l) => acc + l.totalHT, 0);
  const computedTVA = lines.reduce((acc, l) => acc + l.montantTVA, 0);

  const montantHT = (typeof bl.montantHT === 'number' && bl.montantHT > 0) ? bl.montantHT : computedHT;
  const montantTVA = (typeof bl.montantTVA === 'number' && bl.montantTVA > 0) 
    ? bl.montantTVA 
    : (computedTVA > 0 ? computedTVA : Math.max(0, (bl.montantTTC || 0) - montantHT));
  const montantTTC = (typeof bl.montantTTC === 'number' && bl.montantTTC > 0) ? bl.montantTTC : (montantHT + montantTVA);

  const tvaEntries = Object.keys(tvaGroupsMap).length > 0
    ? Object.entries(tvaGroupsMap).map(([taux, data]) => ({ taux: Number(taux), ...data }))
    : [{ taux: 19, assiette: montantHT, montant: montantTVA }];

  const montantEnLettres = numberToFrenchWords(montantTTC);

  return (
    <div id="print-modal-backdrop" className="fixed inset-0 bg-[#172033]/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          #print-modal-backdrop {
            position: static !important;
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          .print-document {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="print-document bg-white text-[#172033] rounded-sm max-w-[210mm] w-full shadow-2xl my-8 print:my-0 font-sans overflow-hidden border border-[#DCE5F0] flex flex-col justify-between">
        
        {/* ==================================================
            BARRE D'ACTIONS ET CONTRÔLES DYNAMIQUES (Non imprimée)
        ================================================== */}
        <div className="flex flex-col gap-2.5 print:hidden border-b border-[#DCE5F0] px-6 py-3 bg-[#F5F8FC] no-print">
          <div className="flex justify-between items-center">
            {/* Mode BL (Chiffré vs Non chiffré) */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-[#DCE5F0] shadow-xs">
              <span className="text-[10px] font-black text-[#64748B] uppercase px-2">Type de BL :</span>
              <button
                type="button"
                onClick={() => setShowPrices(true)}
                className={`px-3 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                  showPrices
                    ? 'bg-[#102F57] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#102F57] hover:bg-[#F5F8FC]'
                }`}
              >
                BL Chiffré (avec prix)
              </button>
              <button
                type="button"
                onClick={() => setShowPrices(false)}
                className={`px-3 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                  !showPrices
                    ? 'bg-[#102F57] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#102F57] hover:bg-[#F5F8FC]'
                }`}
              >
                BL Logistique (quantités seules)
              </button>
            </div>

            {/* Print and Close Actions */}
            <div className="flex items-center gap-2.5">
              <button
                id="btn-imprimer-bl"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#102F57] hover:bg-[#173F73] text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">print</span>
                Imprimer BL
              </button>
              <button 
                id="btn-fermer-bl-modal"
                onClick={onClose} 
                className="px-3.5 py-2 text-[#64748B] hover:text-[#172033] hover:bg-[#DCE5F0]/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                Fermer
              </button>
            </div>
          </div>

          {/* Dynamic Options Bar */}
          <div className="flex items-center justify-between text-[11px] text-[#64748B] font-medium pt-1 border-t border-[#DCE5F0]/60">
            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showStamp}
                  onChange={(e) => setShowStamp(e.target.checked)}
                  className="rounded text-[#102F57] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Afficher le cachet / signature</span>
              </label>

              {bl.commandeRef && (
                <span className="flex items-center gap-1 text-[10.5px] text-[#102F57] font-bold">
                  <span className="material-symbols-outlined text-xs">receipt_long</span>
                  Réf. Commande : {bl.commandeRef}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#102F57]">check_circle</span>
              <span className="text-[10px] text-[#64748B]">BL N° {cleanNumber} dynamique</span>
            </div>
          </div>
        </div>

        {/* ==================================================
            BARRE SUPÉRIEURE (Bande décorative bleu marine + accent magenta)
        ================================================== */}
        <div className="h-2.5 bg-[#102F57] relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-full bg-[#D41468] -skew-x-12 translate-x-12"></div>
        </div>

        {/* ==================================================
            CONTENU PRINCIPAL DU DOCUMENT A4
        ================================================== */}
        <div className="p-0 bg-white relative flex-1 flex flex-col justify-between">
          
          <div>
            {/* ==================================================
                HEADER DYNAMIQUE
            ================================================== */}
            <div className="pt-8 pb-5 px-10 flex justify-between items-start">
              {/* IDENTITÉ ENTREPRISE DYNAMIQUE */}
              <div className="space-y-4 flex-1 pr-6">
                <h1 className="text-2xl font-black text-[#102F57] uppercase tracking-tight leading-none">
                  {cName}
                </h1>
                
                <div className="space-y-1.5 text-[10.5px] font-medium text-[#64748B]">
                  <p className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[15px] text-[#102F57]">location_on</span>
                    <span>Adresse : {cAddress}</span>
                  </p>
                  <p className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[15px] text-[#102F57]">badge</span>
                    <span>M.F : {cMF}</span>
                  </p>
                  <p className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[15px] text-[#102F57]">account_balance</span>
                    <span>RIB : {cRib}</span>
                  </p>
                </div>
              </div>

              {/* LOGO UGS DISTRIBUTION DYNAMIQUE */}
              <div className="w-56 flex flex-col items-end shrink-0">
                <div className="p-1 rounded-md border border-[#DCE5F0]/60 bg-white shadow-xs">
                  <img 
                    src={projet?.logoUrl || '/image.png'} 
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== `${window.location.origin}/logo.png`) {
                        target.src = '/logo.png';
                      }
                    }}
                    alt="Logo" 
                    className="max-h-20 w-auto object-contain" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <div className="w-20 h-0.5 bg-[#D41468] mt-2 rounded-full"></div>
              </div>
            </div>

            <div className="px-10 space-y-6">
              {/* ==================================================
                  TITRE DU DOCUMENT DYNAMIQUE
              ================================================== */}
              <div className="flex justify-between items-end border-b-2 border-[#102F57]/10 pb-4">
                <div className="space-y-1.5">
                  <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">
                    <span className="text-[#102F57]">BON DE LIVRAISON</span>
                    <span className="text-[#D41468] ml-3">N° {cleanNumber}</span>
                  </h2>
                  <div className="flex items-center gap-2 text-[#64748B] font-bold text-[11px] uppercase tracking-wider pt-1">
                    <span className="material-symbols-outlined text-[15px] text-[#D41468]">calendar_month</span>
                    <span>{dateFormatted}</span>
                  </div>
                </div>
                <p className="text-[10px] font-black text-[#64748B] uppercase tracking-[0.2em]">
                  Page : 1 / 1
                </p>
              </div>

              {/* ==================================================
                  INFORMATIONS CLIENT & LIVRAISON DYNAMIQUES
              ================================================== */}
              <div className="grid grid-cols-2 gap-8">
                {/* ZONE GAUCHE : Informations livraison */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-[#102F57] uppercase tracking-widest flex items-center gap-1.5 border-b border-[#DCE5F0] pb-1.5 w-fit">
                    <span className="material-symbols-outlined text-xs text-[#102F57]">local_shipping</span>
                    Informations livraison
                  </h3>
                  <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[11px]">
                    <span className="text-[#64748B] font-bold uppercase">Code Client</span>
                    <span className="text-[#172033] font-black">: {clientCode}</span>
                    
                    <span className="text-[#64748B] font-bold uppercase">Chauffeur</span>
                    <span className="text-[#172033] font-black">: {chauffeur}</span>
                    
                    <span className="text-[#64748B] font-bold uppercase">Camion</span>
                    <span className="text-[#172033] font-black">: {camion}</span>
                  </div>
                </div>

                {/* ZONE DROITE : CLIENT / DESTINATAIRE DYNAMIQUE */}
                <div className="bg-[#F5F8FC] border border-[#DCE5F0] p-4 rounded-lg relative overflow-hidden shadow-xs">
                  <div className="absolute top-0 right-0 w-1 h-full bg-[#D41468]"></div>
                  <div className="flex gap-3.5 items-start">
                    <div className="w-8 h-8 bg-[#102F57] rounded-md flex items-center justify-center shrink-0 text-white">
                      <span className="material-symbols-outlined text-base">person</span>
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-[9.5px] font-black text-[#D41468] uppercase tracking-widest leading-none">
                        CLIENT / DESTINATAIRE
                      </p>
                      <h3 className="font-black text-sm uppercase tracking-tight text-[#102F57] leading-tight pt-0.5">
                        {clientNom}
                      </h3>
                      <p className="uppercase text-[10.5px] font-semibold text-[#64748B] leading-snug">
                        {clientAdresse}
                      </p>
                      {(clientVille || clientTel) && (
                        <p className="uppercase text-[10.5px] font-bold text-[#172033] tracking-wide">
                          {clientVille} {clientTel ? `— Tél: ${clientTel}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ==================================================
                  TABLEAU DES PRODUITS DYNAMIQUE
              ================================================== */}
              <div className="border border-[#DCE5F0] rounded-sm overflow-hidden min-h-[300px] flex flex-col shadow-xs">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-[#102F57] text-white">
                      <th className="py-2.5 px-3.5 font-black uppercase text-left w-24">Code</th>
                      <th className="py-2.5 px-3.5 font-black uppercase text-left">Désignation</th>
                      <th className="py-2.5 px-3.5 font-black uppercase text-center w-14">Qté</th>
                      {showPrices && (
                        <>
                          <th className="py-2.5 px-3.5 font-black uppercase text-right w-24">P.U.H.T</th>
                          <th className="py-2.5 px-3.5 font-black uppercase text-right w-28">Montant H.T</th>
                          <th className="py-2.5 px-3.5 font-black uppercase text-center w-16 border-r border-[#DCE5F0]/10">TVA %</th>
                        </>
                      )}
                      {!showPrices && (
                        <th className="py-2.5 px-3.5 font-black uppercase text-center w-36 border-r border-[#DCE5F0]/10">État réception</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE5F0]">
                    {lines.map((l, i) => (
                      <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#F5F8FC]'}`}>
                        <td className="px-3.5 py-2 text-[#64748B] font-medium text-left">{l.code}</td>
                        <td className="px-3.5 py-2 font-bold uppercase text-[#102F57] text-left">{l.designation}</td>
                        <td className="px-3.5 py-2 text-center font-black text-[#172033]">{l.quantite}</td>
                        {showPrices && (
                          <>
                            <td className="px-3.5 py-2 text-right font-semibold text-[#102F57]">{l.prixUnitaireHT.toFixed(3)}</td>
                            <td className="px-3.5 py-2 text-right font-black text-[#172033]">{l.totalHT.toFixed(3)}</td>
                            <td className="px-3.5 py-2 text-center font-bold text-[#64748B]">{l.tauxTVA.toFixed(2)}</td>
                          </>
                        )}
                        {!showPrices && (
                          <td className="px-3.5 py-2 text-center text-[#64748B] italic">Conforme</td>
                        )}
                      </tr>
                    ))}
                    {/* Dynamic blank rows for visual stability */}
                    {Array.from({ length: Math.max(0, 8 - lines.length) }).map((_, i) => (
                      <tr 
                        key={`empty-${i}`} 
                        className={`h-7 ${ (i + lines.length) % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#F5F8FC]'}`}
                      >
                        <td colSpan={showPrices ? 6 : 4}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ==================================================
                  TVA, RÉCAPITULATIF FINANCIER & MONTANT EN LETTRES
              ================================================== */}
              {showPrices ? (
                <div className="grid grid-cols-[1.2fr_1fr] gap-8 pt-1">
                  <div className="space-y-4">
                    {/* SECTION TVA DYNAMIQUE PAR TAUX */}
                    <div className="bg-[#F5F8FC] border border-[#DCE5F0] rounded-lg overflow-hidden shadow-xs">
                      <table className="w-full text-[10px]">
                        <thead className="bg-[#DCE5F0]/40 text-[#102F57] font-black uppercase text-[9px] tracking-widest border-b border-[#DCE5F0]">
                          <tr>
                            <th className="py-1.5 px-3.5 text-left">T.V.A. %</th>
                            <th className="py-1.5 px-3.5 text-right">Assiette</th>
                            <th className="py-1.5 px-3.5 text-right">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DCE5F0]">
                          {tvaEntries.map((tva, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3.5 font-black text-[#102F57]">{tva.taux.toFixed(2)}</td>
                              <td className="py-2 px-3.5 text-right font-semibold text-[#172033]">{tva.assiette.toFixed(3)}</td>
                              <td className="py-2 px-3.5 text-right font-black text-[#D41468]">{tva.montant.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* MONTANT EN LETTRES DYNAMIQUE */}
                    <div className="space-y-1">
                      <p className="text-[9.5px] text-[#64748B] font-black uppercase tracking-widest">
                        Arrêté le présent bon de livraison à la somme de :
                      </p>
                      <div className="bg-[#102F57] text-white px-4 py-2.5 rounded-md font-bold text-[10.5px] uppercase tracking-wide leading-relaxed shadow-xs">
                        {montantEnLettres}
                      </div>
                    </div>
                  </div>

                  {/* RÉCAPITULATIF FINANCIER DYNAMIQUE */}
                  <div className="bg-[#F5F8FC] border border-[#DCE5F0] rounded-lg p-4 space-y-2 shadow-xs">
                    <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-bold">
                      <span className="text-[#64748B]">Total HT Brut</span>
                      <span className="text-[#102F57] font-black">{montantHT.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-bold">
                      <span className="text-[#64748B]">Total HT Net</span>
                      <span className="text-[#102F57] font-black">{montantHT.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-bold pb-2.5 border-b border-[#DCE5F0]">
                      <span className="text-[#64748B]">Total TVA</span>
                      <span className="text-[#102F57] font-black">{montantTVA.toFixed(3)}</span>
                    </div>
                    
                    {/* Net à Payer */}
                    <div className="pt-1.5 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-[12px] font-black uppercase tracking-widest text-[#102F57] block">
                          Net à Payer
                        </span>
                        <div className="h-1 w-12 bg-[#D41468] rounded-full"></div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black tracking-tighter text-[#102F57]">
                          {montantTTC.toFixed(3)}
                        </span>
                        <span className="text-[#64748B] text-[10px] font-black ml-1 uppercase">TND</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#F5F8FC] border border-[#DCE5F0] rounded-lg p-4 flex items-center justify-between text-[11px]">
                  <span className="text-[#102F57] font-bold uppercase">Bon de livraison logistique — Quantités vérifiées et délivrées</span>
                  <span className="text-[#64748B] font-semibold">Total articles livrés : {lines.reduce((acc, l) => acc + l.quantite, 0)} pièces</span>
                </div>
              )}

              {/* ==================================================
                  SIGNATURES (3 zones alignées)
              ================================================== */}
              <div className="grid grid-cols-3 gap-6 pt-2 pb-6">
                {/* 1. NOTES DYNAMIQUES & ÉDITABLES */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <h4 className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-widest text-[#102F57]">
                      <span className="material-symbols-outlined text-sm text-[#D41468]">notes</span>
                      NOTES
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(!isEditingNotes)}
                      className="text-[9px] text-[#64748B] hover:text-[#102F57] font-bold print:hidden no-print"
                    >
                      {isEditingNotes ? 'Valider' : 'Modifier'}
                    </button>
                  </div>
                  {isEditingNotes ? (
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-24 border border-[#DCE5F0] bg-white rounded-md p-2 text-[9.5px] text-[#172033] focus:outline-none focus:ring-1 focus:ring-[#102F57] resize-none"
                    />
                  ) : (
                    <div className="h-24 border border-[#DCE5F0] bg-white rounded-md p-2.5 text-[9.5px] text-[#64748B] italic leading-relaxed overflow-hidden">
                      {notes}
                    </div>
                  )}
                </div>
                
                {/* 2. SIGNATURE CLIENT */}
                <div className="space-y-1.5 text-center">
                  <h4 className="flex justify-center items-center gap-1.5 text-[9.5px] font-black uppercase tracking-widest text-[#102F57]">
                    <span className="material-symbols-outlined text-sm text-[#D41468]">edit</span>
                    SIGNATURE CLIENT
                  </h4>
                  <div className="h-24 border border-[#DCE5F0] bg-white rounded-md"></div>
                </div>

                {/* 3. SIGNATURE & CACHET AVEC FILIGRANE OPTIONNEL */}
                <div className="space-y-1.5 text-center">
                  <h4 className="flex justify-center items-center gap-1.5 text-[9.5px] font-black uppercase tracking-widest text-[#102F57]">
                    <span className="material-symbols-outlined text-sm text-[#D41468]">verified</span>
                    SIGNATURE & CACHET
                  </h4>
                  <div className="h-24 border border-[#DCE5F0] bg-white rounded-md flex items-center justify-center relative overflow-hidden">
                    {showStamp && (
                      <div className="absolute inset-0 opacity-[0.05] flex items-center justify-center pointer-events-none transform -rotate-12">
                        <img src="/image.png" alt="Cachet" className="w-32 grayscale" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ==================================================
              FOOTER PROFESSIONNEL DYNAMIQUE
          ================================================== */}
          <div className="w-full bg-[#102F57] py-4 px-10 relative overflow-hidden shrink-0 mt-auto">
            <div className="absolute top-0 right-0 h-full w-24 bg-[#D41468] -skew-x-12 translate-x-10"></div>
            
            <div className="flex justify-between items-center relative z-10 text-white/90">
              <div className="flex gap-8 text-[9.5px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#D41468]">call</span>
                  {cPhone}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#D41468]">print</span>
                  75 655 509
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#D41468]">location_on</span>
                  {cVille}
                </span>
              </div>
              
              <div className="flex flex-col items-end">
                <p className="text-[9.5px] font-black uppercase tracking-[0.25em] text-white">
                  Votre partenaire en solutions de sécurité
                </p>
                <p className="text-[8.5px] font-medium opacity-70 tracking-wider uppercase text-[#D41468] mt-0.5">
                  {cName}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
