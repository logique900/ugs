import React, { useState } from 'react';
import { Vente, Client, Projet } from '../types';
import { generateInvoicePdf } from '../utils/pdfExportEngine';

interface FacturePrintModalProps {
  vente: Vente;
  client?: Client;
  projet?: Projet | null;
  typeDocument?: 'DEVIS' | 'COMMANDE' | 'FACTURE' | 'BON DE LIVRAISON';
  onClose: () => void;
}

// Helper to convert number to French words for Tunisian Dinars (Dinars & Millimes)
export function numberToFrenchWords(num: number): string {
  if (isNaN(num) || num <= 0) return 'ZÉRO DINAR';

  const dinars = Math.floor(num);
  const millimes = Math.round((num - dinars) * 1000);

  const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
  const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
  const tens = ['', 'DIX', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE', 'QUATRE-VINGT', 'QUATRE-VINGT'];

  function convertBelowThousand(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) {
      if (h === 1) {
        result += 'CENT ';
      } else {
        result += units[h] + ' CENT' + (remainder === 0 ? 'S ' : ' ');
      }
    }

    if (remainder > 0) {
      if (remainder < 10) {
        result += units[remainder] + ' ';
      } else if (remainder < 20) {
        result += teens[remainder - 10] + ' ';
      } else {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        if (t === 7) {
          result += 'SOIXANTE-' + teens[u] + ' ';
        } else if (t === 9) {
          result += 'QUATRE-VINGT-' + teens[u] + ' ';
        } else if (u === 1 && t !== 8) {
          result += tens[t] + ' ET UN ';
        } else if (u === 0 && t === 8) {
          result += 'QUATRE-VINGTS ';
        } else {
          result += tens[t] + (u > 0 ? '-' + units[u] : '') + ' ';
        }
      }
    }
    return result.trim();
  }

  function convert(n: number): string {
    if (n === 0) return '';
    let res = '';
    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const rem = n % 1000;

    if (millions > 0) {
      res += (millions === 1 ? 'UN MILLION ' : convertBelowThousand(millions) + ' MILLIONS ');
    }
    if (thousands > 0) {
      res += (thousands === 1 ? 'MILLE ' : convertBelowThousand(thousands) + ' MILLE ');
    }
    if (rem > 0) {
      res += convertBelowThousand(rem);
    }
    return res.trim();
  }

  const dinarStr = dinars === 1 ? 'UN DINAR' : (convert(dinars) || 'ZÉRO') + ' DINARS';
  const millimeStr = millimes > 0 ? ` ET ${millimes} MILLIMES` : '';
  return (dinarStr + millimeStr).toUpperCase();
}

export function FacturePrintModal({ vente, client, projet, typeDocument, onClose }: FacturePrintModalProps) {
  // Determine initial document type dynamically from status, number, or prop
  const initialDocType: 'FACTURE' | 'BON DE LIVRAISON' | 'DEVIS' | 'COMMANDE' = 
    typeDocument || (
      vente.statut === 'Devis' || vente.statut === 'En Négociation' || vente.numero.startsWith('DEV-') ? 'DEVIS' :
      vente.statut === 'Commande' || vente.numero.startsWith('BC-') ? 'COMMANDE' :
      (vente.statut as string) === 'Livré' || vente.numero.startsWith('BL-') ? 'BON DE LIVRAISON' :
      'FACTURE'
    );

  // Dynamic interactive state
  const [currentDocType, setCurrentDocType] = useState<'FACTURE' | 'BON DE LIVRAISON' | 'DEVIS' | 'COMMANDE'>(initialDocType);
  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>(
    vente.notes || (initialDocType === 'DEVIS'
      ? "Conditions de ce devis : Offre commerciale valable 1 mois (30 jours) à compter de la date d'émission. Date d'échéance de règlement : 30 jours après émission."
      : "Marchandise conforme. Document officiel généré par ERP UGS.")
  );
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);

  // Clean document number without previous prefix
  const cleanNumber = vente.numero
    .replace(/^FAC-|^DEV-|^BC-|^BL-/, '');

  // Dynamic Company info from Project / Enterprise Profile
  const cName = projet?.entrepriseNom || projet?.nom || 'SOCIETE UNIVERS GSM DE SUD';
  const cAddress = projet?.adresse || '112, OMAR IBN KHATAB ZRIG, GABES S3';
  const cMF = projet?.matriculeFiscal || '1532846 G/A/M/000';
  const cRib = projet?.rib 
    ? `${projet.rib}${projet.banque ? ` - ${projet.banque}` : ''}`
    : '04 705 012 0051487155 82 - Attijari Bank';
  const cPhone = projet?.telephone || '75 655 555';
  const cVille = projet?.ville || 'Gabes - Tunisie';

  // Dynamic Client info
  const clientNom = vente.clientNom || client?.nom || 'Client Divers';
  const clientCode = client?.code || (vente.clientId ? (vente.clientId.length > 8 ? vente.clientId.substring(0, 8).toUpperCase() : vente.clientId) : 'CL-001');
  const clientMF = client?.matriculeFiscal || '___/___/___';
  const clientAdresse = client?.adresse || 'Tunisie';
  const clientVille = client?.ville || client?.pays || '';
  const clientTel = client?.telephone || '';

  // Dynamic Transport & Logistics fields if present on sale or meta
  const transportMeta = vente as unknown as { chauffeur?: string; transporteur?: string; immatriculation?: string; camion?: string };
  const chauffeur = transportMeta.chauffeur || transportMeta.transporteur || '-';
  const camion = transportMeta.immatriculation || transportMeta.camion || '-';

  // Dynamic Line item calculations
  const rawLignes = vente.lignes || [];
  const lines = rawLignes.map((ligne, idx) => {
    const qte = typeof ligne.quantite === 'number' ? ligne.quantite : 1;
    const puHT = typeof ligne.prixUnitaireHT === 'number' ? ligne.prixUnitaireHT : 0;
    const remisePct = typeof ligne.remise === 'number' ? ligne.remise : (typeof ligne.remisePourcentage === 'number' ? ligne.remisePourcentage : 0);
    const tauxTVA = typeof ligne.tva === 'number' ? ligne.tva : (typeof ligne.tauxTVA === 'number' ? ligne.tauxTVA : 19);
    
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
  const timbreFiscal = typeof vente.timbreFiscal === 'number' ? vente.timbreFiscal : 1.000;

  const montantHT = (typeof vente.montantHT === 'number' && vente.montantHT > 0) ? vente.montantHT : computedHT;
  const montantTVA = computedTVA > 0 ? computedTVA : Math.max(0, (vente.montantTTC || 0) - montantHT - timbreFiscal);
  const computedBaseTTC = montantHT + montantTVA;
  
  // Ensure montantTTC includes timbre fiscal
  const montantTTC = (typeof vente.montantTTC === 'number' && vente.montantTTC > computedBaseTTC)
    ? vente.montantTTC
    : (computedBaseTTC + timbreFiscal);

  const tvaEntries = Object.keys(tvaGroupsMap).length > 0
    ? Object.entries(tvaGroupsMap).map(([taux, data]) => ({ taux: Number(taux), ...data }))
    : [{ taux: 19, assiette: montantHT, montant: montantTVA }];

  const montantEnLettres = (vente as { montantLettres?: string }).montantLettres || numberToFrenchWords(montantTTC);

  const dateFormatted = vente.date 
    ? vente.date.split('-').reverse().join('/') 
    : new Date().toLocaleDateString('fr-FR');

  const rawDueDate = vente.dateEcheance || (() => {
    if (!vente.date) return '';
    const d = new Date(vente.date);
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();

  const dueDateFormatted = rawDueDate 
    ? rawDueDate.split('-').reverse().join('/') 
    : new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR');

  const lineCount = lines.length;
  const isCompact = lineCount > 8;
  const isUltraCompact = lineCount > 14;

  const headerPaddingClass = isUltraCompact ? "pt-4 pb-2 px-8" : (isCompact ? "pt-5 pb-3 px-10" : "pt-8 pb-5 px-10");
  const sectionSpacingClass = isUltraCompact ? "px-8 space-y-3" : (isCompact ? "px-10 space-y-4" : "px-10 space-y-6");
  const logoBoxClass = isUltraCompact ? "min-h-[70px] min-w-[140px] p-1" : (isCompact ? "min-h-[90px] min-w-[160px] p-1.5" : "min-h-[120px] min-w-[200px] p-2");
  const logoImgClass = isUltraCompact ? "max-h-20" : (isCompact ? "max-h-28" : "max-h-36");
  const tableTdPy = isUltraCompact ? "py-1 px-2.5 text-[8.5px]" : (isCompact ? "py-1.5 px-3 text-[9.5px]" : "py-2 px-3.5 text-[10px]");
  const tableThPy = isUltraCompact ? "py-1.5 px-2.5 text-[9px]" : (isCompact ? "py-2 px-3 text-[9.5px]" : "py-2.5 px-3.5 text-[10px]");
  const notesHeightClass = isUltraCompact ? "h-14" : (isCompact ? "h-18" : "h-24");

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
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <div className="print-document bg-white text-[#172033] rounded-sm max-w-[210mm] w-full min-h-[297mm] max-h-[297mm] shadow-2xl my-8 print:my-0 font-sans overflow-hidden border border-[#DCE5F0] flex flex-col justify-between">
        
        {/* ==================================================
            BARRE D'ACTIONS SIMPLE (Non imprimée)
        ================================================== */}
        <div className="flex justify-between items-center print:hidden border-b border-[#DCE5F0] px-6 py-3 bg-[#F5F8FC] no-print shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#102F57] text-lg">description</span>
            <span className="text-xs font-bold text-[#102F57] uppercase tracking-wider">Aperçu Officiel Document — {currentDocType} N° {cleanNumber}</span>
          </div>

          {/* Print and Close Actions */}
          <div className="flex items-center gap-2.5">
            <button
              id="btn-imprimer-document"
              onClick={() => window.print()}
              className="px-5 py-2 bg-[#102F57] hover:bg-[#173F73] text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">print</span>
              Imprimer / Télécharger
            </button>
            <button 
              id="btn-fermer-print-modal"
              onClick={onClose} 
              className="px-3.5 py-2 text-[#64748B] hover:text-[#172033] hover:bg-[#DCE5F0]/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Fermer
            </button>
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
        <div className="p-0 bg-white relative flex-1 flex flex-col justify-between overflow-hidden">
          
          <div>
            {/* ==================================================
                HEADER DYNAMIQUE
            ================================================== */}
            <div className={`${headerPaddingClass} flex justify-between items-start`}>
              {/* IDENTITÉ ENTREPRISE DYNAMIQUE */}
              <div className="space-y-2 flex-1 pr-6">
                <h1 className={`${isUltraCompact ? 'text-lg' : (isCompact ? 'text-xl' : 'text-2xl')} font-black text-[#102F57] uppercase tracking-tight leading-none`}>
                  {cName}
                </h1>
                
                <div className={`space-y-1 ${isUltraCompact ? 'text-[9px]' : 'text-[10.5px]'} font-medium text-[#64748B]`}>
                  <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#102F57]">location_on</span>
                    <span>Adresse : {cAddress}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#102F57]">badge</span>
                    <span>M.F : {cMF}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#102F57]">account_balance</span>
                    <span>RIB : {cRib}</span>
                  </p>
                </div>
              </div>

              {/* LOGO UGS DISTRIBUTION DYNAMIQUE */}
              <div className="w-80 flex flex-col items-end shrink-0">
                <div className={`rounded-lg border-2 border-[#DCE5F0] bg-white shadow-sm flex items-center justify-center ${logoBoxClass}`}>
                  <img 
                    src={projet?.logoUrl || '/image.png'} 
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== `${window.location.origin}/logo.png`) {
                        target.src = '/logo.png';
                      }
                    }}
                    alt="Logo Enterprise" 
                    className={`${logoImgClass} w-auto object-contain transition-all`} 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <div className="w-32 h-1 bg-[#D41468] mt-1.5 rounded-full"></div>
              </div>
            </div>

            <div className={sectionSpacingClass}>
              {/* ==================================================
                  TITRE DU DOCUMENT DYNAMIQUE
              ================================================== */}
              <div className="flex justify-between items-end border-b-2 border-[#102F57]/10 pb-2">
                <div className="space-y-1">
                  <h2 className={`${isUltraCompact ? 'text-xl' : (isCompact ? 'text-2xl' : 'text-3xl')} font-black tracking-tighter uppercase leading-none`}>
                    <span className="text-[#102F57]">{currentDocType}</span>
                    <span className="text-[#D41468] ml-3">N° {cleanNumber}</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-[#64748B] font-bold text-[10.5px] uppercase tracking-wider pt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#D41468]">calendar_month</span>
                      <span>Émis le : {dateFormatted}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#102F57] bg-[#F5F8FC] px-2 py-0.5 rounded border border-[#DCE5F0]">
                      <span className="material-symbols-outlined text-[14px] text-[#D41468]">event_available</span>
                      <span>{currentDocType === 'DEVIS' ? "Conditions : Validité Devis & Échéance (1 mois) : " : "Échéance : "}{dueDateFormatted}</span>
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-black text-[#64748B] uppercase tracking-[0.2em]">
                  Page : 1 / 1
                </p>
              </div>

              {/* ==================================================
                  INFORMATIONS CLIENT & LIVRAISON DYNAMIQUES
              ================================================== */}
              <div className="grid grid-cols-2 gap-6">
                {/* ZONE GAUCHE : Informations livraison / logistique */}
                <div className="space-y-2">
                  <h3 className="text-[9.5px] font-black text-[#102F57] uppercase tracking-widest flex items-center gap-1.5 border-b border-[#DCE5F0] pb-1 w-fit">
                    <span className="material-symbols-outlined text-xs text-[#102F57]">local_shipping</span>
                    Informations livraison
                  </h3>
                  <div className={`grid grid-cols-[80px_1fr] gap-y-1 ${isUltraCompact ? 'text-[9.5px]' : 'text-[10.5px]'}`}>
                    <span className="text-[#64748B] font-bold uppercase">Code Client</span>
                    <span className="text-[#172033] font-black">: {clientCode}</span>
                    
                    <span className="text-[#64748B] font-bold uppercase">Chauffeur</span>
                    <span className="text-[#172033] font-black">: {chauffeur}</span>
                    
                    <span className="text-[#64748B] font-bold uppercase">Camion</span>
                    <span className="text-[#172033] font-black">: {camion}</span>
                  </div>
                </div>

                {/* ZONE DROITE : CLIENT / DESTINATAIRE DYNAMIQUE */}
                <div className={`bg-[#F5F8FC] border border-[#DCE5F0] ${isUltraCompact ? 'p-2.5' : 'p-3.5'} rounded-lg relative overflow-hidden shadow-xs`}>
                  <div className="absolute top-0 right-0 w-1 h-full bg-[#D41468]"></div>
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 bg-[#102F57] rounded-md flex items-center justify-center shrink-0 text-white">
                      <span className="material-symbols-outlined text-sm">person</span>
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <p className="text-[9px] font-black text-[#D41468] uppercase tracking-widest leading-none">
                        CLIENT / DESTINATAIRE
                      </p>
                      <h3 className={`font-black ${isUltraCompact ? 'text-xs' : 'text-sm'} uppercase tracking-tight text-[#102F57] leading-tight pt-0.5`}>
                        {clientNom}
                      </h3>
                      <p className={`uppercase ${isUltraCompact ? 'text-[9.5px]' : 'text-[10px]'} font-semibold text-[#64748B] leading-snug`}>
                        {clientAdresse}
                      </p>
                      {(clientVille || clientTel) && (
                        <p className={`uppercase ${isUltraCompact ? 'text-[9.5px]' : 'text-[10px]'} font-bold text-[#172033] tracking-wide`}>
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
              <div className="border border-[#DCE5F0] rounded-sm overflow-hidden flex flex-col shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#102F57] text-white">
                      <th className={`${tableThPy} font-black uppercase text-left w-24`}>Code</th>
                      <th className={`${tableThPy} font-black uppercase text-left`}>Désignation</th>
                      <th className={`${tableThPy} font-black uppercase text-center w-14`}>Qté</th>
                      {showPrices && (
                        <>
                          <th className={`${tableThPy} font-black uppercase text-right w-24`}>P.U.H.T</th>
                          <th className={`${tableThPy} font-black uppercase text-right w-28`}>Montant H.T</th>
                          <th className={`${tableThPy} font-black uppercase text-center w-16 border-r border-[#DCE5F0]/10`}>TVA %</th>
                        </>
                      )}
                      {!showPrices && (
                        <th className={`${tableThPy} font-black uppercase text-center w-36 border-r border-[#DCE5F0]/10`}>Émargement / État</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE5F0]">
                    {lines.map((l, i) => (
                      <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#F5F8FC]'}`}>
                        <td className={`${tableTdPy} text-[#64748B] font-medium text-left`}>{l.code}</td>
                        <td className={`${tableTdPy} font-bold uppercase text-[#102F57] text-left`}>{l.designation}</td>
                        <td className={`${tableTdPy} text-center font-black text-[#172033]`}>{l.quantite}</td>
                        {showPrices && (
                          <>
                            <td className={`${tableTdPy} text-right font-semibold text-[#102F57]`}>{l.prixUnitaireHT.toFixed(3)}</td>
                            <td className={`${tableTdPy} text-right font-black text-[#172033]`}>{l.totalHT.toFixed(3)}</td>
                            <td className={`${tableTdPy} text-center font-bold text-[#64748B]`}>{l.tauxTVA.toFixed(2)}</td>
                          </>
                        )}
                        {!showPrices && (
                          <td className={`${tableTdPy} text-center text-[#64748B] italic`}>Conforme</td>
                        )}
                      </tr>
                    ))}
                    {/* Dynamic blank rows only if table is small */}
                    {Array.from({ length: Math.max(0, (lineCount > 12 ? 0 : (lineCount > 6 ? 2 : 4)) - lines.length) }).map((_, i) => (
                      <tr 
                        key={`empty-${i}`} 
                        className={`h-6 ${(i + lines.length) % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#F5F8FC]'}`}
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
                <div className="grid grid-cols-[1.2fr_1fr] gap-6 pt-0.5">
                  <div className="space-y-3">
                    {/* SECTION TVA DYNAMIQUE PAR TAUX */}
                    <div className="bg-[#F5F8FC] border border-[#DCE5F0] rounded-lg overflow-hidden shadow-xs">
                      <table className="w-full text-[9.5px]">
                        <thead className="bg-[#DCE5F0]/40 text-[#102F57] font-black uppercase text-[8.5px] tracking-widest border-b border-[#DCE5F0]">
                          <tr>
                            <th className="py-1 px-3 text-left">T.V.A. %</th>
                            <th className="py-1 px-3 text-right">Assiette</th>
                            <th className="py-1 px-3 text-right">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DCE5F0]">
                          {tvaEntries.map((tva, idx) => (
                            <tr key={idx}>
                              <td className="py-1 px-3 font-black text-[#102F57]">{tva.taux.toFixed(2)}</td>
                              <td className="py-1 px-3 text-right font-semibold text-[#172033]">{tva.assiette.toFixed(3)}</td>
                              <td className="py-1 px-3 text-right font-black text-[#D41468]">{tva.montant.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* MONTANT EN LETTRES DYNAMIQUE */}
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-[#64748B] font-black uppercase tracking-widest">
                        Arrêté le présent {currentDocType.toLowerCase()} à la somme de :
                      </p>
                      <div className="bg-[#102F57] text-white px-3.5 py-2 rounded-md font-bold text-[10px] uppercase tracking-wide leading-relaxed shadow-xs">
                        {montantEnLettres}
                      </div>
                    </div>
                  </div>

                  {/* RÉCAPITULATIF FINANCIER DYNAMIQUE */}
                  <div className="bg-[#F5F8FC] border border-[#DCE5F0] rounded-lg p-3 space-y-1.5 shadow-xs">
                    <div className="flex justify-between items-center text-[10.5px] uppercase tracking-wider font-bold">
                      <span className="text-[#64748B]">Total HT Brut</span>
                      <span className="text-[#102F57] font-black">{montantHT.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px] uppercase tracking-wider font-bold">
                      <span className="text-[#64748B]">Total HT Net</span>
                      <span className="text-[#102F57] font-black">{montantHT.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px] uppercase tracking-wider font-bold">
                      <span className="text-[#64748B]">Total TVA</span>
                      <span className="text-[#102F57] font-black">{montantTVA.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px] uppercase tracking-wider font-bold pb-2 border-b border-[#DCE5F0]">
                      <span className="text-[#64748B]">Timbre Fiscal</span>
                      <span className="text-[#D41468] font-black">{timbreFiscal.toFixed(3)} DT</span>
                    </div>
                    
                    {/* Net à Payer */}
                    <div className="pt-1 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#102F57] block">
                          Net à Payer
                        </span>
                        <div className="h-1 w-10 bg-[#D41468] rounded-full"></div>
                      </div>
                      <div className="text-right">
                        <span className={`${isUltraCompact ? 'text-lg' : 'text-xl'} font-black tracking-tighter text-[#102F57]`}>
                          {montantTTC.toFixed(3)}
                        </span>
                        <span className="text-[#64748B] text-[9.5px] font-black ml-1 uppercase">TND</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#F5F8FC] border border-[#DCE5F0] rounded-lg p-3 flex items-center justify-between text-[10.5px]">
                  <span className="text-[#102F57] font-bold uppercase">Bon de livraison logistique — Quantités vérifiées et délivrées</span>
                  <span className="text-[#64748B] font-semibold">Total articles livrés : {lines.reduce((acc, l) => acc + l.quantite, 0)} pièces</span>
                </div>
              )}

              {/* ==================================================
                  SIGNATURES (3 zones alignées)
              ================================================== */}
              <div className="grid grid-cols-3 gap-5 pt-1 pb-4">
                {/* 1. NOTES DYNAMIQUES & ÉDITABLES */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#102F57]">
                      <span className="material-symbols-outlined text-xs text-[#D41468]">notes</span>
                      NOTES
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(!isEditingNotes)}
                      className="text-[8.5px] text-[#64748B] hover:text-[#102F57] font-bold print:hidden no-print"
                    >
                      {isEditingNotes ? 'Valider' : 'Modifier'}
                    </button>
                  </div>
                  {isEditingNotes ? (
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`w-full ${notesHeightClass} border border-[#DCE5F0] bg-white rounded-md p-2 text-[9px] text-[#172033] focus:outline-none focus:ring-1 focus:ring-[#102F57] resize-none`}
                    />
                  ) : (
                    <div className={`w-full ${notesHeightClass} border border-[#DCE5F0] bg-white rounded-md p-2 text-[9px] text-[#64748B] italic leading-relaxed overflow-hidden`}>
                      {notes}
                    </div>
                  )}
                </div>
                
                {/* 2. SIGNATURE CLIENT */}
                <div className="space-y-1 text-center">
                  <h4 className="flex justify-center items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#102F57]">
                    <span className="material-symbols-outlined text-xs text-[#D41468]">edit</span>
                    SIGNATURE CLIENT
                  </h4>
                  <div className={`w-full ${notesHeightClass} border border-[#DCE5F0] bg-white rounded-md`}></div>
                </div>

                {/* 3. SIGNATURE & CACHET AVEC FILIGRANE OPTIONNEL */}
                <div className="space-y-1 text-center">
                  <h4 className="flex justify-center items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#102F57]">
                    <span className="material-symbols-outlined text-xs text-[#D41468]">verified</span>
                    SIGNATURE & CACHET
                  </h4>
                  <div className={`w-full ${notesHeightClass} border border-[#DCE5F0] bg-white rounded-md flex items-center justify-center relative overflow-hidden`}>
                    {showStamp && (
                      <div className="absolute inset-0 opacity-[0.05] flex items-center justify-center pointer-events-none transform -rotate-12">
                        <img src="/image.png" alt="Cachet" className="w-28 grayscale" />
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
          <div className="w-full bg-[#102F57] py-3 px-8 relative overflow-hidden shrink-0 mt-auto">
            <div className="absolute top-0 right-0 h-full w-24 bg-[#D41468] -skew-x-12 translate-x-10"></div>
            
            <div className="flex justify-between items-center relative z-10 text-white/90">
              <div className="flex gap-6 text-[9px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-[#D41468]">call</span>
                  {cPhone}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-[#D41468]">print</span>
                  75 655 509
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-[#D41468]">location_on</span>
                  {cVille}
                </span>
              </div>
              
              <div className="flex flex-col items-end">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white">
                  Votre partenaire en solutions de sécurité
                </p>
                <p className="text-[8px] font-medium opacity-70 tracking-wider uppercase text-[#D41468] mt-0.5">
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
