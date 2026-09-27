import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vente, Achat, Client, Fournisseur, Article, MouvementStock, Projet, Reglement, CreditEcheance, BonDeLivraison, BonDeSortie, RetourVente } from '../types';

// Helper colors
const COLOR_PRIMARY = [30, 27, 75] as const;  // Indigo 950 (#1e1b4b)
const COLOR_ACCENT = [225, 29, 72] as const;   // Rose accent (#E11D48)
const COLOR_DARK = [30, 27, 75] as const;      // Indigo 950
const COLOR_SECONDARY = [71, 85, 105] as const; // Slate 600
const COLOR_MUTED = [100, 116, 139] as const; // Slate 500
const COLOR_BG_LIGHT = [248, 250, 252] as const; // Slate 50
const COLOR_BORDER = [226, 232, 240] as const; // Slate 200

// Helper to format currency cleanly for jsPDF
const fmt = (num?: number) => {
  const n = num || 0;
  const parts = n.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${integerPart},${parts[1]} DT`;
};

/**
 * Apply clean running footers with pagination across all pages
 */
function applyPdfFooters(doc: jsPDF, documentTitle: string) {
  const totalPages = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(`UGS Distribution • ERP Multi-Projets • ${documentTitle} • Document Officiel`, 14, pageHeight - 7);
    doc.text(`Page ${i} / ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

/**
 * Helper to convert number to French words for Tunisian Dinars in PDF
 */
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

const fmt3 = (num?: number) => {
  const n = num || 0;
  return n.toFixed(3);
};

/**
 * 1. FACTURE & DEVIS CLIENT (PDF conforme au modèle officiel UGS)
 */
export function generateInvoicePdf(vente: Vente, client?: Client, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const isDevis = vente.statut === 'Devis' || vente.statut === 'En Négociation';
  const isCommande = vente.statut === 'Commande';
  const docTypeLabel = isDevis ? 'DEVIS' : isCommande ? 'COMMANDE' : 'FACTURE';

  const cleanNumber = vente.numero.replace(/^FAC-|^DEV-|^BC-|^BL-/, '');
  const cName = projet?.entrepriseNom || projet?.nom || 'SOCIETE UNIVERS GSM DE SUD';
  const cAddress = projet?.adresse || '112, OMAR IBN KHATAB ZRIG, GABES S3';
  const cMF = projet?.matriculeFiscal || '1532846 G/A/M/000';
  const cRib = projet?.rib || '04 705 012 0051487155 82 - Attijari Bank';

  const clientNom = vente.clientNom || client?.nom || 'SOCIÉTÉ GÉNÉRALE DE CONSTRUCTION';
  const clientCode = client?.code || (vente.clientId ? (vente.clientId.length > 8 ? vente.clientId.substring(0, 8).toUpperCase() : vente.clientId) : 'CLI-001');
  const clientAdresse = client?.adresse || 'ZONE INDUSTRIELLE VOIE 4';
  const clientVille = client?.ville || client?.pays || 'TUNIS';
  const clientTel = client?.telephone || '+216 71 234 567';

  const transportMeta = vente as unknown as { chauffeur?: string; transporteur?: string; immatriculation?: string; camion?: string };
  const chauffeur = transportMeta.chauffeur || transportMeta.transporteur || '-';
  const camion = transportMeta.immatriculation || transportMeta.camion || '-';

  // Couleurs du modèle UGS (Navy & Pink)
  const NAVY = [16, 47, 87] as const;      // #102F57
  const PINK = [225, 29, 72] as const;     // #E11D48
  const GREY_BG = [248, 250, 252] as const; // #F8FAFC
  const BORDER_COLOR = [226, 232, 240] as const; // #E2E8F0
  const TEXT_DARK = [23, 32, 51] as const;
  const TEXT_MUTED = [100, 116, 139] as const;

  // 1. Bande supérieure
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, 210, 3.5, 'F');
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(170, 0, 40, 3.5, 'F');

  // 2. Identité Entreprise (Gauche)
  let y = 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(cName.toUpperCase(), 14, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(`Adresse : ${cAddress}`, 14, y);
  y += 4;
  doc.text(`M.F : ${cMF}`, 14, y);
  y += 4;
  doc.text(`RIB : ${cRib}`, 14, y);

  // Logo UGS (Encadré Droit Enlarge)
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(132, 4, 64, 30, 1.5, 1.5, 'FD');
  try {
    doc.addImage('/logo.png', 'PNG', 134, 5, 60, 28);
  } catch (e) {}

  // 3. Titre du document & Date
  y = 33;
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.setLineWidth(0.3);
  doc.line(14, y, 196, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(docTypeLabel, 14, y);

  const titleWidth = doc.getTextWidth(docTypeLabel);
  doc.setTextColor(PINK[0], PINK[1], PINK[2]);
  doc.text(` N° ${cleanNumber}`, 14 + titleWidth, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  const dateFormatted = vente.date ? vente.date.split('-').reverse().join('/') : new Date().toLocaleDateString('fr-FR');
  const rawDueDate = vente.dateEcheance || (() => {
    if (!vente.date) return '';
    const d = new Date(vente.date);
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();
  const dueDateFormatted = rawDueDate ? rawDueDate.split('-').reverse().join('/') : '';
  
  const dateDisplay = dueDateFormatted 
    ? `  Date: ${dateFormatted}  |  Échéance / Validité (1 mois): ${dueDateFormatted}`
    : `  Date: ${dateFormatted}`;

  doc.text(dateDisplay, 14 + titleWidth + doc.getTextWidth(` N° ${cleanNumber}`) + 4, y);

  doc.text('PAGE : 1 / 1', 196, y, { align: 'right' });

  y += 3;
  doc.line(14, y, 196, y);

  // 4. Informations Livraison & Client
  y += 5;
  const boxTop = y;

  // Gauche : Informations livraison
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('INFORMATIONS LIVRAISON', 14, y + 4);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.line(14, y + 6, 85, y + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('CODE CLIENT', 14, y + 12);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${clientCode}`, 42, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('CHAUFFEUR', 14, y + 17);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${chauffeur}`, 42, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('CAMION', 14, y + 22);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${camion}`, 42, y + 22);

  // Droite : Client / Destinataire
  doc.setFillColor(GREY_BG[0], GREY_BG[1], GREY_BG[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(108, boxTop, 88, 26, 2, 2, 'FD');

  // Bandeau vertical rose sur bord droit du bloc client
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(194, boxTop, 2, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PINK[0], PINK[1], PINK[2]);
  doc.text('CLIENT / DESTINATAIRE', 112, boxTop + 5);

  doc.setFontSize(9);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(clientNom.toUpperCase(), 112, boxTop + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(clientAdresse, 112, boxTop + 16);
  doc.text(`${clientVille} — TÉL: ${clientTel}`, 112, boxTop + 21);

  y = boxTop + 31;

  // 5. Tableau des articles
  const rawLignes = vente.lignes || [];
  const lineCount = rawLignes.length;

  const lines = rawLignes.map((l) => [
    l.code || 'ART',
    l.designation,
    (l.quantite || 1).toString(),
    fmt3(l.prixUnitaireHT || 0),
    fmt3(l.totalHT || (l.quantite * l.prixUnitaireHT)),
    `${l.tauxTVA || l.tva || 19}.00`
  ]);

  // Adjust blank filler rows dynamically based on item count
  const minBlankRows = lineCount > 15 ? 0 : (lineCount > 10 ? 1 : (lineCount > 6 ? 3 : 5));
  while (lines.length < minBlankRows) {
    lines.push(['', '', '', '', '', '']);
  }

  // Dynamic font size and padding to strictly fit 1 single A4 page
  const fontSize = lineCount > 18 ? 6 : (lineCount > 12 ? 6.5 : (lineCount > 8 ? 7 : 7.5));
  const headFontSize = lineCount > 18 ? 6.5 : (lineCount > 12 ? 7 : 8);
  const cellPadding = lineCount > 18 ? 0.8 : (lineCount > 12 ? 1.2 : (lineCount > 8 ? 1.6 : 2.2));

  autoTable(doc, {
    startY: y,
    head: [['CODE', 'DÉSIGNATION', 'QTÉ', 'P.U.H.T', 'MONTANT H.T', 'TVA %']],
    body: lines,
    theme: 'grid',
    headStyles: {
      fillColor: [NAVY[0], NAVY[1], NAVY[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: headFontSize,
      halign: 'center',
      cellPadding: cellPadding
    },
    bodyStyles: {
      fontSize: fontSize,
      textColor: [30, 41, 59],
      cellPadding: cellPadding
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 28 },
      1: { cellWidth: 74 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 18 }
    }
  });

  // @ts-ignore
  let tableY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + (lineCount > 12 ? 3 : 5) : y + 40;

  // 6. Synthèse Financière (Tableau TVA + Montant en Lettres à gauche, Bloc Net à droite)
  const sumY = tableY;

  const timbreFiscal = typeof vente.timbreFiscal === 'number' ? vente.timbreFiscal : 1.000;
  const rawHT = rawLignes.reduce((a, l) => a + (l.totalHT || (l.quantite * l.prixUnitaireHT)), 0);
  const montantHT = (vente.montantHT && vente.montantHT > 0) ? vente.montantHT : (rawHT || vente.montantTTC / 1.19);
  const rawTVA = rawLignes.reduce((a, l) => a + ((l.totalHT || (l.quantite * l.prixUnitaireHT)) * ((l.tauxTVA || l.tva || 19) / 100)), 0);
  const montantTVA = rawTVA > 0 ? rawTVA : Math.max(0, (vente.montantTTC || 0) - montantHT - timbreFiscal);
  const baseTTC = montantHT + montantTVA;
  const montantTTC = (vente.montantTTC && vente.montantTTC > baseTTC) ? vente.montantTTC : (baseTTC + timbreFiscal);

  // Tableau TVA
  autoTable(doc, {
    startY: sumY,
    margin: { left: 14 },
    tableWidth: 88,
    head: [['T.V.A. %', 'ASSIETTE', 'MONTANT']],
    body: [
      ['19.00', fmt3(montantHT), fmt3(montantTVA)]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [100, 116, 139],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 1.8
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      halign: 'center',
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 32 },
      2: { cellWidth: 31, textColor: [PINK[0], PINK[1], PINK[2]], fontStyle: 'bold' }
    }
  });

  // @ts-ignore
  let tvaY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 3 : sumY + 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('ARRÊTÉ LE PRÉSENT FACTURE À LA SOMME DE :', 14, tvaY);

  tvaY += 2.5;
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(14, tvaY, 88, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(numberToFrenchWords(montantTTC), 16, tvaY + 5.2, { maxWidth: 84 });

  // Bloc récapitulatif à droite
  doc.setFillColor(GREY_BG[0], GREY_BG[1], GREY_BG[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(108, sumY, 88, 34, 2, 2, 'FD');

  let rightY = sumY + 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('TOTAL HT BRUT', 112, rightY);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(fmt3(montantHT), 191, rightY, { align: 'right' });

  rightY += 4.5;
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('TOTAL HT NET', 112, rightY);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(fmt3(montantHT), 191, rightY, { align: 'right' });

  rightY += 4.5;
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('TOTAL TVA', 112, rightY);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(fmt3(montantTVA), 191, rightY, { align: 'right' });

  rightY += 4.5;
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('TIMBRE FISCAL', 112, rightY);
  doc.setTextColor(PINK[0], PINK[1], PINK[2]);
  doc.text(fmt3(timbreFiscal), 191, rightY, { align: 'right' });

  rightY += 2.5;
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.line(112, rightY, 191, rightY);

  rightY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('NET À PAYER', 112, rightY);

  doc.setFontSize(11);
  doc.text(`${fmt3(montantTTC)} `, 182, rightY, { align: 'right' });
  doc.setFontSize(7.5);
  doc.text('TND', 191, rightY, { align: 'right' });

  // Soulignement rose sous NET À PAYER
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(112, rightY + 1.5, 12, 1, 'F');

  // 7. Bloc Signatures & Notes (3 encadrés côte à côte)
  let sigY = Math.max(tvaY + 12, sumY + 33);

  const boxW = 58;
  const boxH = 22;

  // Encadré 1 : Notes
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(14, sigY, boxW, boxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('NOTES', 18, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(vente.notes || (isDevis ? `Conditions : Devis valable 1 mois (30 jours). Date d'échéance : ${dueDateFormatted}.` : 'Marchandise conforme.'), 18, sigY + 11, { maxWidth: boxW - 8 });

  // Encadré 2 : Signature Client
  doc.roundedRect(76, sigY, boxW, boxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('SIGNATURE CLIENT', 80, sigY + 5);

  // Encadré 3 : Signature & Cachet
  doc.roundedRect(138, sigY, boxW, boxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('SIGNATURE & CACHET', 142, sigY + 5);

  // Filigrane discret dans l'encadré 3
  try {
    doc.addImage('/logo.png', 'PNG', 158, sigY + 6, 22, 12);
  } catch (e) {}

  // 8. Pied de page (Pied de page rose sur toute la largeur)
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(0, 283, 210, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`+216 75 655 555     75 655 509     GABÈS`, 14, 291);
  doc.text('VOTRE PARTENAIRE EN SOLUTIONS DE SÉCURITÉ', 196, 291, { align: 'right' });

  doc.save(`${docTypeLabel}_${cleanNumber}.pdf`);
}

/**
 * 2. BON DE COMMANDE FOURNISSEUR
 */
export function generatePurchaseOrderPdf(achat: Achat, fournisseur?: Fournisseur, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.rect(0, 0, 210, 32, 'F');

  // Decorative Accent
  doc.setFillColor(14, 165, 233); // Sky Blue (#0EA5E9)
  doc.rect(0, 32, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SOCIETE UNIVERS GSM DE SUD', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`BON DE COMMANDE ACHAT • Espace Projet : ${projet?.nom || 'Projet Principal'}`, 14, 20);
  doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')} • Service Achats & Chantiers`, 14, 26);

  // Add Company Logo
  try {
    doc.addImage('/logo.png', 'PNG', 142, 2, 52, 28);
  } catch (e) {
    console.error('Logo not found', e);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`N° ${achat.numero}`, 196, 14, { align: 'right' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date commande : ${new Date(achat.date).toLocaleDateString('fr-FR')}`, 196, 22, { align: 'right' });

  let currentY = 40;

  // Box Société
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(14, currentY, 88, 36, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text('COMMANDITAIRE / LIVRAISON', 18, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('SOCIETE UNIVERS GSM DE SUD', 18, currentY + 12);
  doc.text('112, OMAR IBN KHATAB ZRIG, GABES S3', 18, currentY + 17);
  doc.text(`Projet : ${projet?.nom || 'Site Gabès'}`, 18, currentY + 22);
  doc.text('Contact : +216 75 655 555', 18, currentY + 27);
  doc.text('Email : contact@ugs-distribution.tn', 18, currentY + 32);

  // Box Fournisseur
  doc.roundedRect(108, currentY, 88, 36, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text('FOURNISSEUR / SOUS-TRAITANT', 112, currentY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(fournisseur?.nom || 'Fournisseur Externe', 112, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Code Fournisseur : ${fournisseur?.code || 'FRN-00' + achat.fournisseurId}`, 112, currentY + 17);
  doc.text(`Adresse : ${fournisseur?.adresse || 'Non spécifiée'}, ${fournisseur?.ville || ''}`, 112, currentY + 22);
  doc.text(`Matricule Fiscal : ${fournisseur?.matriculeFiscal || 'Non spécifié'}`, 112, currentY + 27);
  doc.text(`Contact : ${fournisseur?.contactNom || 'Service Commercial'} (${fournisseur?.telephone || ''})`, 112, currentY + 32);

  currentY += 42;

  const tableRows = achat.lignes && achat.lignes.length > 0
    ? achat.lignes.map((lig, idx) => [
        (idx + 1).toString(),
        lig.code || 'ART',
        lig.designation,
        lig.quantite.toString(),
        fmt(lig.prixUnitaireHT),
        fmt(lig.totalHT),
        fmt(lig.totalTTC)
      ])
    : [
        ['1', 'ART-ACH', 'Matériaux et prestations selon bon de commande', '1', fmt(achat.montantHT), fmt(achat.montantHT), fmt(achat.montantTTC)]
      ];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Code', 'Désignation des Articles Commandés', 'Qté Demandée', 'P.U Achat HT', 'Total HT', 'Total TTC']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 22 },
      2: { cellWidth: 70 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 24 }
    }
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 8;

  // Summary Totals
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(125, finalY, 71, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Total HT Commandé :', 128, finalY + 7);
  doc.text(fmt(achat.montantHT), 192, finalY + 7, { align: 'right' });

  doc.text('TVA Estimée :', 128, finalY + 14);
  doc.text(fmt(achat.montantTTC - achat.montantHT), 192, finalY + 14, { align: 'right' });

  doc.setDrawColor(15, 23, 42);
  doc.line(128, finalY + 18, 192, finalY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOTAL TTC COMMANDE :', 128, finalY + 24);
  doc.text(fmt(achat.montantTTC), 192, finalY + 24, { align: 'right' });

  applyPdfFooters(doc, `Bon de Commande Achats N° ${achat.numero}`);
  doc.save(`Bon_Commande_${achat.numero}.pdf`);
}

/**
 * 3. RELEVÉ DE COMPTE CLIENT (SITUATION FINANCIÈRE & EN-COURS)
 */
export function generateClientStatementPdf(client: Client, ventes: Vente[], reglements: Reglement[], projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
  doc.rect(0, 32, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RELEVÉ DE COMPTE & SITUATION CLIENT', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`ERP Management Distribution • ERP Multi-Projets • Édité le ${new Date().toLocaleDateString('fr-FR')}`, 14, 21);
  doc.text(`Projet / Chantier : ${projet?.nom || 'Consolidé / Global'}`, 14, 26);

  // Add Company Logo
  try {
    doc.addImage('/logo.png', 'PNG', 155, 3, 40, 40);
  } catch (e) {
    console.error('Logo not found', e);
  }

  // Client Details Card
  let currentY = 40;
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(14, currentY, 182, 32, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(client.nom, 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(`Code : ${client.code || 'CLI-00' + client.id} • Catégorie : ${client.categorie || 'PME'} • Solvabilité : ${client.scoreSolvabilite || 80}/100`, 18, currentY + 14);
  doc.text(`Matricule Fiscal / CIN : ${client.matriculeFiscal || 'N/A'} • Tél : ${client.telephone}`, 18, currentY + 20);
  doc.text(`Plafond de Crédit Autorisé : ${fmt(client.plafondCredit || 20000)} • Délai accordé : ${client.delaiPaiement || 30} jours`, 18, currentY + 26);

  currentY += 38;

  // Compute Totals
  const totalFactures = ventes.reduce((acc, v) => acc + v.montantTTC, 0);
  const totalPaye = reglements.filter(r => r.tierId === client.id).reduce((acc, r) => acc + r.montant, 0);
  const soldeDu = totalFactures - totalPaye;

  // KPI Mini Cards
  doc.setFillColor(239, 246, 255); // Blue
  doc.roundedRect(14, currentY, 56, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 64, 175);
  doc.text('TOTAL FACTURÉ TTC', 18, currentY + 6);
  doc.setFontSize(9.5);
  doc.text(fmt(totalFactures), 18, currentY + 13);

  doc.setFillColor(240, 253, 244); // Green
  doc.roundedRect(77, currentY, 56, 18, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('TOTAL ENCAISSÉ', 81, currentY + 6);
  doc.setFontSize(9.5);
  doc.text(fmt(totalPaye), 81, currentY + 13);

  doc.setFillColor(254, 242, 242); // Red
  doc.roundedRect(140, currentY, 56, 18, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text('SOLDE RESTANT DÛ', 144, currentY + 6);
  doc.setFontSize(9.5);
  doc.text(fmt(soldeDu), 144, currentY + 13);

  currentY += 24;

  // Transactions list
  const historyRows = ventes.map(v => [
    new Date(v.date).toLocaleDateString('fr-FR'),
    'Facture Vente',
    v.numero,
    v.dateEcheance ? new Date(v.dateEcheance).toLocaleDateString('fr-FR') : '-',
    fmt(v.montantTTC),
    fmt(v.montantPaye || (v.statut === 'Payée' ? v.montantTTC : 0)),
    fmt(Math.max(0, v.montantTTC - (v.montantPaye || (v.statut === 'Payée' ? v.montantTTC : 0)))),
    v.statut
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Opération', 'N° Pièce', 'Échéance', 'Débit (TTC)', 'Crédit (Réglé)', 'Solde Dû', 'Statut']],
    body: historyRows,
    theme: 'grid',
    headStyles: {
      fillColor: [180, 20, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 7.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { cellWidth: 26 },
      2: { halign: 'center', cellWidth: 24 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 24 },
      7: { halign: 'center', cellWidth: 20 }
    }
  });

  applyPdfFooters(doc, `Relevé de Compte Client - ${client.nom}`);
  doc.save(`Releve_Compte_${client.nom.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 4. BALANCE ÂGÉE DES CRÉANCES & GESTION DU CRÉDIT
 */
export function generateAgingBalancePdf(echeances: CreditEcheance[], clients: Client[], projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Banner Landscape (297mm width)
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(0, 0, 297, 30, 'F');
  doc.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
  doc.rect(0, 30, 297, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('BALANCE ÂGÉE DES CRÉANCES & ÉCHÉANCIER DE RECOUVREMENT', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Système ERP Central • Multi-Projets • Périmètre : ${projet?.nom || 'Tous les Projets'} • Date d'analyse : ${new Date().toLocaleDateString('fr-FR')}`, 14, 21);

  // Add Company Logo
  try {
    doc.addImage('/logo.png', 'PNG', 245, 3, 40, 40);
  } catch (e) {
    console.error('Logo not found', e);
  }

  // Group by client and calculate buckets
  const totalNonEchu = echeances.filter(e => e.joursRetard <= 0).reduce((acc, e) => acc + e.soldeRestant, 0);
  const total1a30 = echeances.filter(e => e.joursRetard > 0 && e.joursRetard <= 30).reduce((acc, e) => acc + e.soldeRestant, 0);
  const total31a60 = echeances.filter(e => e.joursRetard > 30 && e.joursRetard <= 60).reduce((acc, e) => acc + e.soldeRestant, 0);
  const totalPlus60 = echeances.filter(e => e.joursRetard > 60).reduce((acc, e) => acc + e.soldeRestant, 0);
  const totalGlobalDu = totalNonEchu + total1a30 + total31a60 + totalPlus60;

  // Aging Summary Box
  let currentY = 37;
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(14, currentY, 269, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text(`Non Échues (< 0j) : ${fmt(totalNonEchu)}`, 20, currentY + 7);
  doc.text(`Retard 1-30j : ${fmt(total1a30)}`, 85, currentY + 7);
  doc.text(`Retard 31-60j : ${fmt(total31a60)}`, 145, currentY + 7);
  doc.text(`Retard > 60j : ${fmt(totalPlus60)}`, 210, currentY + 7);

  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.setFontSize(9.5);
  doc.text(`TOTAL EN-COURS GLOBAL : ${fmt(totalGlobalDu)}`, 20, currentY + 14);

  currentY += 23;

  const rows = echeances.map((e, idx) => [
    (idx + 1).toString(),
    e.clientNom,
    e.numeroFacture,
    new Date(e.dateFacture).toLocaleDateString('fr-FR'),
    new Date(e.dateEcheance).toLocaleDateString('fr-FR'),
    e.joursRetard > 0 ? `${e.joursRetard} j` : 'À terme',
    fmt(e.montantTTC),
    fmt(e.montantPaye),
    fmt(e.soldeRestant),
    e.joursRetard <= 0 ? fmt(e.soldeRestant) : '0,00 DT',
    e.joursRetard > 0 && e.joursRetard <= 30 ? fmt(e.soldeRestant) : '0,00 DT',
    e.joursRetard > 30 ? fmt(e.soldeRestant) : '0,00 DT',
    e.statut
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Client', 'N° Facture', 'Date Fact.', 'Échéance', 'Retard', 'Montant TTC', 'Réglé', 'Reste Dû', '< 0j', '1-30j', '> 30j', 'Statut Risque']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [180, 20, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 45 },
      2: { halign: 'center', cellWidth: 24 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 20 },
      8: { halign: 'right', cellWidth: 22 },
      9: { halign: 'right', cellWidth: 20 },
      10: { halign: 'right', cellWidth: 20 },
      11: { halign: 'right', cellWidth: 20 },
      12: { halign: 'center', cellWidth: 22 }
    }
  });

  applyPdfFooters(doc, `Balance Âgée des Créances Clients`);
  doc.save(`Balance_Agee_Creances_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * 5. LETTRE DE RELANCE IMPAYÉ CLIENT (OFFICIELLE)
 */
export function generateDunningLetterPdf(client: Client, facturesEnRetard: Vente[], niveau: 1 | 2 | 3 = 1, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const totalImpaye = facturesEnRetard.reduce((acc, f) => acc + (f.montantTTC - (f.montantPaye || 0)), 0);
  const penaliteForfaitaire = niveau >= 2 ? 40 : 0; // 40 DT de frais de recouvrement
  const totalARegler = totalImpaye + penaliteForfaitaire;

  // Header Banner
  doc.setFillColor(niveau === 3 ? 153 : niveau === 2 ? 180 : 30, niveau === 3 ? 27 : niveau === 2 ? 20 : 41, niveau === 3 ? 27 : niveau === 2 ? 30 : 59);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
  doc.rect(0, 32, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const titreNiveau = niveau === 3 ? 'MISE EN DEMEURE DE PAYER (NIVEAU 3)' : niveau === 2 ? 'LETTRE DE RELANCE FERME (NIVEAU 2)' : 'RAPPEL D\'ÉCHÉANCE ET RELANCE (NIVEAU 1)';
  doc.text(titreNiveau, 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`ERP Management Distribution • Service Recouvrement • Réf : REL-${client.id}-${niveau}-${Date.now().toString().slice(-4)}`, 14, 21);
  doc.text(`Date d'envoi : ${new Date().toLocaleDateString('fr-FR')} • Lettre Recommandée / Notification Officielle`, 14, 26);

  // Add Company Logo
  try {
    doc.addImage('/logo.png', 'PNG', 155, 3, 40, 40);
  } catch (e) {
    console.error('Logo not found', e);
  }

  let currentY = 40;

  // Client Box
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(105, currentY, 91, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(client.nom, 110, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`À l'attention de : ${client.contactNom || 'Direction Financière'}`, 110, currentY + 13);
  doc.text(`Adresse : ${client.adresse}, ${client.ville || ''}`, 110, currentY + 19);
  doc.text(`Matricule Fiscal : ${client.matriculeFiscal || 'N/A'}`, 110, currentY + 25);
  doc.text(`Téléphone : ${client.telephone}`, 110, currentY + 30);

  currentY += 40;

  // Objet
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(`OBJET : ${titreNiveau} - FACTURES EN SOUFFRANCE`, 14, currentY);

  currentY += 8;

  // Corps du texte
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);

  const intro = niveau === 1
    ? "Sauf erreur ou omission de notre part, nous constatons que les factures listées ci-dessous sont arrivées à échéance et n'ont pas encore fait l'objet d'un règlement sur nos comptes bancaires."
    : niveau === 2
    ? "Malgré notre premier rappel, nos services comptables constatent que votre compte présente toujours un solde débiteur impayé. Conformément à nos conditions générales de vente, des pénalités de retard sont désormais applicables."
    : "Nous vous mettons formellement EN DEMEURE par la présente de procéder au règlement intégral sous 48 heures ouvrées de votre dette. À défaut, le dossier sera transmis à notre contentieux juridique pour saisie conservatoire.";

  doc.text(intro, 14, currentY, { maxWidth: 182 });

  currentY += 16;

  // Table of overdue invoices
  const rows = facturesEnRetard.map(f => [
    f.numero,
    new Date(f.date).toLocaleDateString('fr-FR'),
    f.dateEcheance ? new Date(f.dateEcheance).toLocaleDateString('fr-FR') : 'Échue',
    fmt(f.montantTTC),
    fmt(f.montantPaye || 0),
    fmt(f.montantTTC - (f.montantPaye || 0))
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['N° Facture', 'Date Facture', 'Date Échéance', 'Montant TTC', 'Déjà Versé', 'Reste à Régler']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [180, 20, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 32 },
      1: { halign: 'center', cellWidth: 26 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 },
      5: { halign: 'right', cellWidth: 34 }
    }
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 8;

  // Total Box
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(14, finalY, 182, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(153, 27, 27);
  doc.text(`TOTAL EXIGIBLE IMMÉDIATEMENT : ${fmt(totalARegler)}`, 20, finalY + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`(Dont ${fmt(totalImpaye)} de principal facturé + ${fmt(penaliteForfaitaire)} d'indemnité forfaitaire de recouvrement)`, 20, finalY + 14);

  finalY += 26;

  // Bank coordinates for payment
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Coordonnées pour virement bancaire immédiat :', 14, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('• Banque : Attijari Bank', 14, finalY + 5);
  doc.text('• RIB Virement : 04 705 012 0051487155 82', 14, finalY + 10);
  doc.text(`• Réf. obligatoire au virement : RELANCE-${client.code || client.id}`, 14, finalY + 15);

  finalY += 24;
  doc.setFont('helvetica', 'bold');
  doc.text('Direction Générale & Pôle Recouvrement ERP', 120, finalY);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(115, finalY + 3, 75, 18, 2, 2);

  applyPdfFooters(doc, `Lettre de Relance - ${client.nom}`);
  doc.save(`Lettre_Relance_Niveau${niveau}_${client.nom.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 6. INVENTAIRE & VALORISATION DU STOCK
 */
export function generateStockInventoryPdf(articles: Article[], mouvements?: MouvementStock[], projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Banner
  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.rect(0, 0, 297, 30, 'F');
  doc.setFillColor(14, 165, 233); // Sky blue
  doc.rect(0, 30, 297, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('INVENTAIRE PHYSIQUE & VALORISATION DES STOCKS', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`ERP Management Distribution • ERP Logistique • Espace Projet : ${projet?.nom || 'Tous les Chantiers'} • Date : ${new Date().toLocaleDateString('fr-FR')}`, 14, 21);

  // Add Company Logo
  try {
    doc.addImage('/logo.png', 'PNG', 245, 3, 40, 40);
  } catch (e) {
    console.error('Logo not found', e);
  }

  const projId = projet?.id;
  const getStock = (a: Article): number => {
    if (typeof a.stock === 'number') return a.stock;
    if (a.stocks && typeof a.stocks === 'object') {
      if (projId && a.stocks[projId] !== undefined) return a.stocks[projId] || 0;
      return Object.values(a.stocks).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }
    return 0;
  };

  const valeurAchatTotale = articles.reduce((acc, a) => acc + (getStock(a) * (a.prixAchatHT || 0)), 0);
  const valeurVenteTotale = articles.reduce((acc, a) => acc + (getStock(a) * (a.prixVenteHT || 0)), 0);
  const margePotentielle = valeurVenteTotale - valeurAchatTotale;

  let currentY = 37;
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(14, currentY, 269, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Nombre de références : ${articles.length}`, 20, currentY + 7);
  doc.text(`Valorisation Coût Achat (PMP) : ${fmt(valeurAchatTotale)}`, 85, currentY + 7);
  doc.text(`Valeur Marchande Vente HT : ${fmt(valeurVenteTotale)}`, 175, currentY + 7);

  doc.setTextColor(16, 185, 129);
  doc.text(`Marge brute théorique : ${fmt(margePotentielle)}`, 20, currentY + 14);

  currentY += 23;

  const rows = articles.map((a, idx) => {
    const st = getStock(a);
    const pAchat = a.prixAchatHT || 0;
    const pVente = a.prixVenteHT || 0;
    const minSt = (a.stockMinimums && projId ? a.stockMinimums[projId] : a.stockMinimum) || a.seuilAlerte || 10;
    return [
      (idx + 1).toString(),
      a.code || '-',
      a.designation || '-',
      a.famille || '-',
      st.toString(),
      fmt(pAchat),
      fmt(pVente),
      fmt(st * pAchat),
      fmt(st * pVente),
      st <= minSt ? 'RÉAPPRO' : 'OPTIMAL'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Code', 'Désignation Article', 'Famille', 'Stock Dispo', 'P.U Achat HT', 'P.U Vente HT', 'Valeur Stock Achat', 'Valeur Stock Vente', 'Statut']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 24 },
      2: { cellWidth: 65 },
      3: { cellWidth: 35 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 24 },
      7: { halign: 'right', cellWidth: 28 },
      8: { halign: 'right', cellWidth: 28 },
      9: { halign: 'center', cellWidth: 20 }
    }
  });

  applyPdfFooters(doc, `Inventaire & Valorisation des Stocks`);
  doc.save(`Inventaire_Stock_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * 7. REÇU DE PAIEMENT / JUSTIFICATIF DE CAISSE
 */
export function generateReceiptPdf(reglement: Reglement, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [148, 210] }); // A5 format for receipt

  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(0, 0, 148, 26, 'F');
  doc.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
  doc.rect(0, 26, 148, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`REÇU D'${reglement.type.toUpperCase()}`, 10, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.0);
  doc.text(`UGS Distribution • Pièce N° ${reglement.numeroPiece}`, 10, 19);

  // Add Company Logo
  try {
    doc.addImage('/logo.png', 'PNG', 105, 3, 35, 35);
  } catch (e) {
    console.error('Logo not found', e);
  }

  let currentY = 32;

  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(10, currentY, 128, 48, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  doc.text(`Date de transaction :`, 14, currentY + 8);
  doc.text(new Date(reglement.date).toLocaleDateString('fr-FR'), 70, currentY + 8);

  doc.text(`Tiers concerné :`, 14, currentY + 15);
  doc.setFont('helvetica', 'bold');
  doc.text(`${reglement.tierNom} (${reglement.tierType})`, 70, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.text(`Document de référence :`, 14, currentY + 22);
  doc.text(reglement.documentRef || 'Règlement direct', 70, currentY + 22);

  doc.text(`Mode de règlement :`, 14, currentY + 29);
  doc.text(`${reglement.modePaiement} ${reglement.referencePaiement ? '(' + reglement.referencePaiement + ')' : ''}`, 70, currentY + 29);

  doc.text(`Notes / Observations :`, 14, currentY + 36);
  doc.text(reglement.notes || 'Règlement validé et imputé en comptabilité', 70, currentY + 36, { maxWidth: 64 });

  currentY += 54;

  // Montant Encart
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(10, currentY, 128, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 101, 52);
  doc.text('MONTANT ENCAISSÉ / PAYÉ :', 16, currentY + 11);
  doc.setFontSize(12);
  doc.text(fmt(reglement.montant), 132, currentY + 11, { align: 'right' });

  currentY += 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Signature du Tiers', 20, currentY);
  doc.text('Cachet de la Caisse UGS', 90, currentY);

  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(10, currentY + 3, 58, 20, 2, 2);
  doc.roundedRect(80, currentY + 3, 58, 20, 2, 2);

  applyPdfFooters(doc, `Reçu de Paiement N° ${reglement.numeroPiece}`);
  doc.save(`Recu_${reglement.numeroPiece}.pdf`);
}

/**
 * 8. CONVENTION & ACCORD DE CRÉDIT CLIENT (ÉCHÉANCIER)
 */
export function generateCreditAgreementPdf(
  client: any,
  montantTotal: number,
  acompte: number,
  echeances: Array<{ numero: number; date: string; montant: number }>,
  projet?: Projet | null,
  referenceDossier?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ref = referenceDossier || `CRD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const soldeFinancer = Math.max(0, montantTotal - acompte);

  // Header Banner
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
  doc.rect(0, 32, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CONVENTION D\'OCTROI DE CRÉDIT & ÉCHÉANCIER', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('ERP Management DISTRIBUTION - CONTRAT DE FACILITÉ DE PAIEMENT CLIENT', 14, 20);
  doc.text(`Projet : ${projet?.nom || 'Projet Central'} • Réf Dossier : ${ref}`, 14, 26);

  // Add Company Logo
  try {
    doc.addImage('/logo.png', 'PNG', 155, 3, 40, 40);
  } catch (e) {
    console.error('Logo not found', e);
  }

  let currentY = 40;

  // Box Parties
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(14, currentY, 88, 36, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('ORGANISME PRÊTEUR', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('SOCIETE UNIVERS GSM DE SUD', 18, currentY + 12);
  doc.text('Matricule Fiscal : 1532846 G/A/M/000', 18, currentY + 17);
  doc.text('112, OMAR IBN KHATAB ZRIG, GABES S3', 18, currentY + 22);
  doc.text('RIB : 04 705 012 0051487155 82 - Attijari Bank', 18, currentY + 27);

  // Box Client (Right)
  doc.roundedRect(108, currentY, 88, 36, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('BÉNÉFICIAIRE DU CRÉDIT (CLIENT)', 112, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(client.nom, 112, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Code : ${client.code || 'CLI-' + client.id} • Tél : ${client.telephone}`, 112, currentY + 17);
  doc.text(`MF / CIN : ${client.matriculeFiscal || 'Non spécifié'}`, 112, currentY + 22);
  doc.text(`Plafond autorisé : ${fmt(client.plafondCredit || 20000)}`, 112, currentY + 27);

  currentY += 42;

  // Synthesis Cards
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, 56, 22, 2, 2, 'F');
  doc.roundedRect(77, currentY, 56, 22, 2, 2, 'F');
  doc.roundedRect(140, currentY, 56, 22, 2, 2, 'F');

  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('MONTANT TOTAL ACHATS', 18, currentY + 6);
  doc.text('ACOMPTE VERSÉ (COMPTANT)', 81, currentY + 6);
  doc.text('SOLDE FINANCÉ À CRÉDIT', 144, currentY + 6);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(fmt(montantTotal), 18, currentY + 16);
  doc.setTextColor(22, 101, 52);
  doc.text(fmt(acompte), 81, currentY + 16);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(fmt(soldeFinancer), 144, currentY + 16);

  currentY += 28;

  // Installments Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('CALENDRIER DES ÉCHÉANCES DE PAIEMENT CONVENUES', 14, currentY);

  currentY += 4;

  const rows = echeances.map((ech) => [
    `Échéance N° ${ech.numero}`,
    new Date(ech.date).toLocaleDateString('fr-FR'),
    fmt(ech.montant),
    'Chèque / Traite / Virement',
    'En attente d\'encaissement'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['N° Tranche', 'Date d\'Exigibilité', 'Montant TTC', 'Mode Prévu', 'Statut Engagement']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [180, 20, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 40 },
      4: { cellWidth: 35, halign: 'center' }
    }
  });

  // @ts-ignore
  const nextY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : currentY + 50;

  // Legal Clauses Box
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('CONDITIONS GÉNÉRALES DU CRÉDIT & ENGAGEMENTS JURIDIQUES :', 14, nextY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('1. Réserve de propriété : Les marchandises demeurent la propriété exclusive du vendeur jusqu\'au paiement intégral du prix.', 14, nextY + 5);
  doc.text('2. Pénalités de retard : Tout retard de paiement donnera lieu de plein droit à l\'application d\'intérêts de retard au taux légal en vigueur.', 14, nextY + 10);
  doc.text('3. Déchéance du terme : Le défaut de paiement d\'une seule échéance rendra immédiatement exigible la totalité du solde restant dû.', 14, nextY + 15);

  // Signature Block
  const sigY = nextY + 24;
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(14, sigY, 86, 26, 2, 2);
  doc.roundedRect(110, sigY, 86, 26, 2, 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('Pour ERP Management Distribution (Accordé)', 20, sigY + 6);
  doc.text(`Pour le Client : ${client.nom}`, 116, sigY + 6);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('Signature & Cachet de la Direction', 20, sigY + 20);
  doc.text('Mention manuscrite "Bon pour accord de paiement"', 116, sigY + 20);

  applyPdfFooters(doc, `Convention de Crédit - ${client.nom}`);
  doc.save(`Convention_Credit_${client.nom.replace(/[^a-zA-Z0-9]/g, '_')}_${ref}.pdf`);
}

/**
 * 9. TICKET DE CAISSE THERMIQUE (80mm) / REÇU DE VENTE COMPTOIR
 */
export function generatePosTicketPdf(vente: Vente, client?: Client, projet?: Projet | null) {
  // Standard 80mm receipt width (approx 80mm x 200mm dynamic)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 220]
  });

  const cName = projet?.entrepriseNom || 'SOCIETE UNIVERS GSM DE SUD';
  const cMF = projet?.matriculeFiscal || '1532846 G/A/M/000';
  const cAddress = projet?.adresse || '112, OMAR IBN KHATAB ZRIG, GABES S3';
  const cPhone = projet?.telephone || '75 655 555';
  const boutiqueNom = projet?.nom || 'Boutique Univers GSM';

  let currentY = 10;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(cName.toUpperCase(), 40, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(boutiqueNom, 40, currentY, { align: 'center' });

  currentY += 4;
  doc.text(cAddress, 40, currentY, { align: 'center' });

  currentY += 4;
  doc.text(`MF: ${cMF} • Tél: ${cPhone}`, 40, currentY, { align: 'center' });

  currentY += 4;
  // Dotted separator
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, currentY, 74, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('TICKET DE CAISSE', 40, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ticket N° : ${vente.numero}`, 6, currentY);
  doc.text(`Date : ${new Date(vente.date).toLocaleDateString('fr-FR')}`, 74, currentY, { align: 'right' });

  currentY += 4;
  doc.text(`Caissier : ${vente.auteurNom || 'Caissier'}`, 6, currentY);
  doc.text(`Client : ${client?.nom || vente.clientNom || 'Client Comptoir'}`, 74, currentY, { align: 'right' });

  currentY += 4;
  doc.line(6, currentY, 74, currentY);

  currentY += 3;

  // Articles Table for 80mm ticket
  const rows = (vente.lignes || []).map(l => [
    l.designation,
    l.quantite.toString(),
    ((l.prixUnitaireHT || 0) * (1 + (l.tauxTVA || 19) / 100)).toFixed(3),
    (l.totalTTC || 0).toFixed(3)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Désignation', 'Qté', 'P.U TTC', 'Total TTC']],
    body: rows,
    theme: 'plain',
    margin: { left: 5, right: 5 },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 8, halign: 'center' },
      2: { cellWidth: 14, halign: 'right' },
      3: { cellWidth: 14, halign: 'right', fontStyle: 'bold' }
    }
  });

  // @ts-ignore
  let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 3 : currentY + 30;

  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, finalY, 74, finalY);

  finalY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Total HT :', 6, finalY);
  doc.text(`${(vente.montantHT || 0).toFixed(3)} DT`, 74, finalY, { align: 'right' });

  finalY += 3.5;
  doc.text('TVA Totale :', 6, finalY);
  doc.text(`${((vente.montantTTC || 0) - (vente.montantHT || 0)).toFixed(3)} DT`, 74, finalY, { align: 'right' });

  finalY += 5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(6, finalY - 3.5, 68, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL À PAYER TTC :', 8, finalY + 1.5);
  doc.text(`${(vente.montantTTC || 0).toFixed(3)} DT`, 72, finalY + 1.5, { align: 'right' });

  finalY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Règlement : ${vente.modePaiement || 'Espèces'}`, 6, finalY);
  doc.text(`Reçu : ${(vente.montantPaye ?? vente.montantTTC).toFixed(3)} DT`, 74, finalY, { align: 'right' });

  finalY += 6;
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, finalY, 74, finalY);

  finalY += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Merci pour votre confiance et à bientôt !', 40, finalY, { align: 'center' });

  finalY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Les articles achetés ne sont ni repris ni échangés sans ticket.', 40, finalY, { align: 'center' });

  doc.save(`Ticket_Caisse_${vente.numero}.pdf`);
}

/**
 * 10. BON DE LIVRAISON CLIENT (PDF DIRECT)
 */
export function generateDeliveryNotePdf(bl: BonDeLivraison, client?: Client, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const cName = projet?.entrepriseNom || projet?.nom || 'SOCIETE UNIVERS GSM DE SUD';
  const cMF = projet?.matriculeFiscal || '1532846 G/A/M/000';
  const cAddress = projet?.adresse || '112, OMAR IBN KHATAB ZRIG, GABES S3';

  // Header Banner
  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 32, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(cName.toUpperCase(), 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`BON DE LIVRAISON CLIENT • MF : ${cMF}`, 14, 20);
  doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')} • Dépôt/Boutique : ${bl.boutiqueNom || projet?.nom || 'UGS Distribution'}`, 14, 26);

  try {
    doc.addImage('/logo.png', 'PNG', 142, 2, 52, 28);
  } catch (e) {}

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`N° ${bl.numero}`, 196, 14, { align: 'right' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date Livraison : ${bl.dateLivraison || bl.dateCreation}`, 196, 22, { align: 'right' });

  let currentY = 40;

  // Company Box
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(14, currentY, 88, 36, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text('EXPÉDITEUR / ÉMETTEUR', 18, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(cName, 18, currentY + 12);
  doc.text(cAddress, 18, currentY + 17);
  doc.text(`Matricule Fiscal : ${cMF}`, 18, currentY + 22);
  doc.text(`Chauffeur/Transport : ${bl.chauffeur || bl.transporteur || 'Service Interne'}`, 18, currentY + 27);
  doc.text(`Camion/Immat : ${bl.immatriculation || 'Service UGS'}`, 18, currentY + 32);

  // Client Box
  doc.roundedRect(108, currentY, 88, 36, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text('DESTINATAIRE / CLIENT', 112, currentY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(bl.clientNom || client?.nom || 'Client Divers', 112, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Adresse Livraison : ${bl.adresseLivraison || client?.adresse || 'Tunisie'}`, 112, currentY + 17);
  doc.text(`Matricule Fiscal : ${bl.matriculeFiscalClient || client?.matriculeFiscal || 'Non spécifié'}`, 112, currentY + 22);
  doc.text(`Téléphone : ${bl.telephoneClient || client?.telephone || '-'}`, 112, currentY + 27);
  doc.text(`Réf. Commande : ${bl.commandeRef || 'N/A'}`, 112, currentY + 32);

  currentY += 42;

  const tableRows = (bl.lignes || []).map((l, idx) => [
    (idx + 1).toString(),
    l.code || 'ART',
    l.designation,
    (l.qteCommandee || 1).toString(),
    (l.qteLivree || (l as any).quantite || 1).toString(),
    fmt(l.prixUnitaireHT || 0),
    fmt(l.totalTTC || 0)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Code', 'Désignation des Articles Livrés', 'Qté Cmd', 'Qté Livrée', 'P.U HT', 'Total TTC']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 22 },
      2: { cellWidth: 70 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 20 }
    }
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 30;

  // Total Summary
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(125, finalY, 71, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('TOTAL GENERAL TTC :', 128, finalY + 10);
  doc.text(fmt(bl.montantTTC), 192, finalY + 10, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre d'articles : ${(bl.lignes || []).length}`, 128, finalY + 18);

  // Signatures
  finalY += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Visa Magasinier / Expéditeur', 20, finalY);
  doc.text('Visa Chauffeur / Transporteur', 85, finalY);
  doc.text('Nom & Signature Réceptionnaire Client', 140, finalY);

  doc.roundedRect(14, finalY + 4, 55, 18, 2, 2);
  doc.roundedRect(77, finalY + 4, 55, 18, 2, 2);
  doc.roundedRect(138, finalY + 4, 55, 18, 2, 2);

  applyPdfFooters(doc, `Bon de Livraison N° ${bl.numero}`);
  doc.save(`Bon_Livraison_${bl.numero}.pdf`);
}

/**
 * 11. BON DE SORTIE DE STOCK / BORDEREAU DE TRANSFERT (PDF DIRECT)
 */
export function generateStockExitPdf(bs: BonDeSortie, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isTransfert = bs.motif === 'Transfert';
  const docTitle = isTransfert ? 'BORDEREAU DE TRANSFERT INTER-BOUTIQUE' : 'BON DE SORTIE DE STOCK';

  // Header Banner
  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(16, 185, 129); // Emerald
  doc.rect(0, 32, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(docTitle, 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Dépôt Émetteur : ${bs.boutiqueNom || bs.entrepotSource || projet?.nom || 'Hub Central UGS'} • Date : ${bs.dateCreation}`, 14, 21);
  doc.text(`Demandeur / Motif : ${bs.demandeur || bs.auteurNom || 'Agent'} (${bs.motif})`, 14, 26);

  try {
    doc.addImage('/logo.png', 'PNG', 142, 2, 52, 28);
  } catch (e) {}

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`N° ${bs.numero}`, 196, 14, { align: 'right' });

  let currentY = 40;

  const tableRows = (bs.lignes || []).map((l, idx) => [
    (idx + 1).toString(),
    l.code || 'ART',
    l.designation,
    (l.qteSortie || l.qteDemandee || 1).toString(),
    fmt(l.prixUnitaireHT || 0),
    fmt(l.totalHT || 0)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Code', 'Désignation de l\'Article', 'Quantité Sortie', 'P.U HT', 'Total HT']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 24 },
      2: { cellWidth: 80 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 24 }
    }
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : currentY + 30;

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('Visa Magasinier / Émetteur', 20, finalY);
  doc.text('Visa Transporteur / Livreur', 85, finalY);
  doc.text('Visa Réceptionnaire / Destinataire', 140, finalY);

  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(14, finalY + 4, 55, 18, 2, 2);
  doc.roundedRect(77, finalY + 4, 55, 18, 2, 2);
  doc.roundedRect(138, finalY + 4, 55, 18, 2, 2);

  applyPdfFooters(doc, `${docTitle} N° ${bs.numero}`);
  doc.save(`${docTitle.replace(/\s+/g, '_')}_${bs.numero}.pdf`);
}

/**
 * Génère le Bon de Retour & Avoir Client Officiel (PDF)
 */
export function generateReturnSlipPdf(retour: RetourVente, projet?: Projet | null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;

  // Header band
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('BON DE RETOUR & AVOIR', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`N° ${retour.numero} • Date: ${retour.date}`, 14, 21);

  // Status badge on header
  doc.setFillColor(16, 185, 129); // Emerald
  doc.roundedRect(pageWidth - 45, 9, 31, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(retour.statut.toUpperCase(), pageWidth - 29.5, 15.5, { align: 'center' });

  let currentY = 36;

  // Entreprise & Boutique box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(projet?.nom || 'UGS Distribution - Boutique', 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  if (projet?.adresse) doc.text(`Adresse: ${projet.adresse}`, 14, currentY + 5);
  if (projet?.telephone) doc.text(`Tél: ${projet.telephone}`, 14, currentY + 9.5);
  if (projet?.matriculeFiscal) doc.text(`Matricule Fiscal: ${projet.matriculeFiscal}`, 14, currentY + 14);

  // Client & Reference Box
  const clientBoxX = pageWidth - 90;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(clientBoxX, currentY - 4, 76, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('INFORMATIONS CLIENT & PIÈCE', clientBoxX + 4, currentY + 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(`Client: ${retour.clientNom}`, clientBoxX + 4, currentY + 6);
  if (retour.venteNumero) doc.text(`Réf. Vente/Ticket: ${retour.venteNumero}`, clientBoxX + 4, currentY + 10.5);
  doc.text(`Mode restitution: ${retour.modeRemboursement}`, clientBoxX + 4, currentY + 15);
  if (retour.codeAvoir) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(`Code Avoir: ${retour.codeAvoir}`, clientBoxX + 4, currentY + 19.5);
  }

  currentY = 68;

  // Motif Box
  if (retour.motifGeneral) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, pageWidth - 28, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text('Motif du retour :', 18, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
    doc.text(retour.motifGeneral, 45, currentY + 5);
    currentY += 15;
  }

  // Articles Table
  const tableRows = retour.lignes.map((l, index) => [
    (index + 1).toString(),
    l.articleCode || '-',
    l.designation,
    l.quantiteRetournee.toString(),
    l.remettreEnStock ? 'Oui (Remis en stock)' : 'Non (Rebut/Isolé)',
    l.motif,
    fmt(l.prixUnitaire),
    fmt(l.totalLigne)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Code', 'Désignation', 'Qté Ret.', 'Réintég. Stock', 'Motif', 'P.U (DT)', 'Total (DT)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 52 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'center', cellWidth: 25 },
      5: { cellWidth: 28 },
      6: { halign: 'right', cellWidth: 17 },
      7: { halign: 'right', cellWidth: 17 }
    }
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : currentY + 30;

  // Total summary block
  const summaryX = pageWidth - 80;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(summaryX, finalY, 66, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('TOTAL RESTITUÉ :', summaryX + 4, finalY + 7);

  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72); // Rose/red
  doc.text(fmt(retour.montantTotal), summaryX + 62, finalY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(`Règlement : ${retour.modeRemboursement}`, summaryX + 4, finalY + 13);
  doc.text(`Opérateur : ${retour.auteurNom}`, summaryX + 4, finalY + 18);

  finalY += 30;

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('Signature & Cachet Responsable', 20, finalY);
  doc.text('Signature Client (Bon pour accord)', pageWidth - 70, finalY);

  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(14, finalY + 3, 60, 18, 2, 2);
  doc.roundedRect(pageWidth - 74, finalY + 3, 60, 18, 2, 2);

  applyPdfFooters(doc, `Bon de Retour N° ${retour.numero}`);
  doc.save(`Bon_de_Retour_${retour.numero}.pdf`);
}

/**
 * Generate Customer Loyalty Card (Format Badge / Carte Plastique 85.6mm x 54mm)
 */
export function generateLoyaltyCardPdf(client: Client, projet?: Projet | null) {
  // Format standard carte bancaire / carte fidélité (85.6 x 54 mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 54]
  });

  const boutiqueNom = projet?.nom || 'ERP Management Distribution';
  const fideliteCode = client.carteFideliteNumero || `FID-${(client.code || client.id).replace(/\D/g, '').padStart(6, '0') || '619001'}`;
  const points = client.pointsFidelite || 150;
  const tier = client.tierFidelite || (points > 1000 ? 'VIP' : points > 500 ? 'Gold' : points > 200 ? 'Silver' : 'Bronze');

  // Background gradient-like dark theme
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 85.6, 54, 'F');

  // Accent header band
  doc.setFillColor(tier === 'VIP' ? 217 : tier === 'Gold' ? 245 : tier === 'Silver' ? 148 : 124, tier === 'VIP' ? 70 : tier === 'Gold' ? 158 : tier === 'Silver' ? 163 : 58, tier === 'VIP' ? 239 : tier === 'Gold' ? 11 : tier === 'Silver' ? 184 : 237); // purple or gold or silver
  doc.rect(0, 0, 85.6, 6, 'F');

  // Gold/Tier Badge Top Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`MEMBRE PRIVILÈGE • ${tier.toUpperCase()}`, 80, 4.2, { align: 'right' });

  // Store Brand Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(boutiqueNom.toUpperCase(), 6, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('CARTE DE FIDÉLITÉ & AVANTAGES CLIENT', 6, 15.5);

  // Client Name & Loyalty ID Box
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(6, 18, 73.6, 16, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(client.nom.toUpperCase(), 9, 23.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(203, 213, 225);
  doc.text(`Tél : ${client.telephone || 'Non renseigné'}`, 9, 27.5);
  doc.text(`N° Carte : ${fideliteCode}`, 9, 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(`${points} PTS FIDÉLITÉ`, 75, 27.5, { align: 'right' });

  // Simulated Barcode in Footer for POS Scanner
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(6, 36.5, 73.6, 13.5, 1.5, 1.5, 'F');

  // Draw Code-128 / Barcode lines
  const barcodeX = 10;
  const barcodeY = 38;
  const barcodeHeight = 7.5;
  const pattern = [2, 1, 3, 1, 1, 2, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2];
  let curX = barcodeX;
  doc.setFillColor(0, 0, 0);
  for (let i = 0; i < pattern.length; i++) {
    const w = pattern[i] * 0.45;
    if (i % 2 === 0) {
      doc.rect(curX, barcodeY, w, barcodeHeight, 'F');
    }
    curX += w;
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`* ${fideliteCode} *`, 42.8, 48.5, { align: 'center' });

  doc.save(`Carte_Fidelite_${client.nom.replace(/\s+/g, '_')}_${fideliteCode}.pdf`);
}

