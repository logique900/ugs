import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vente, Achat, Client, Fournisseur, Article, MouvementStock, Projet, Reglement, CreditEcheance } from '../types';

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
 * Helper to convert number to words in French for invoices
 */
function numberToWords(amount: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  if (amount === 0) return 'zéro dinars et zéro millimes';

  const dinars = Math.floor(amount);
  const millimes = Math.round((amount - dinars) * 1000);

  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      if (t === 7 || t === 9) {
        return tens[t - 1] + '-' + units[10 + u];
      }
      return tens[t] + (u === 1 && t !== 8 ? ' et un' : u > 0 ? '-' + units[u] : '');
    }
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const r = n % 100;
      const hStr = h === 1 ? 'cent' : units[h] + ' cents';
      return hStr + (r > 0 ? ' ' + convertGroup(r) : '');
    }
    if (n < 1000000) {
      const th = Math.floor(n / 1000);
      const r = n % 1000;
      const thStr = th === 1 ? 'mille' : convertGroup(th) + ' mille';
      return thStr + (r > 0 ? ' ' + convertGroup(r) : '');
    }
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    const mStr = m === 1 ? 'un million' : convertGroup(m) + ' millions';
    return mStr + (r > 0 ? ' ' + convertGroup(r) : '');
  }

  const dinarsStr = convertGroup(dinars) || 'zéro';
  const millimesStr = millimes > 0 ? ` et ${convertGroup(millimes)} millimes` : '';
  return `${dinarsStr} dinars${millimesStr}`;
}

/**
 * 1. FACTURE & DEVIS CLIENT
 */
export function generateInvoicePdf(vente: Vente, client?: Client, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isDevis = vente.statut === 'Devis' || vente.statut === 'En Négociation';
  const isCommande = vente.statut === 'Commande';
  const docType = isDevis ? 'DEVIS COMMERCIAL' : isCommande ? 'COMMANDE CLIENT' : 'FACTURE DE VENTE';

  const cName = projet?.entrepriseNom || 'SOCIETE UNIVERS GSM DE SUD';
  const cMF = projet?.matriculeFiscal || '1532846 G/A/M/000';
  const cAddress = projet?.adresse || '112, OMAR IBN KHATAB ZRIG, GABES S3';
  const cPhone = projet?.telephone || '75 655 555';
  const cEmail = projet?.email || 'contact@univers-gsm.tn';
  const cBank = projet?.banque || 'Attijari Bank';
  const cRib = projet?.rib || '04 705 012 0051487155 82';

  // Header Banner - specific styling for Devis vs Invoice
  const bannerColor = isDevis ? [217, 119, 6] : isCommande ? [79, 70, 229] : COLOR_PRIMARY;
  const bannerAccent = isDevis ? [245, 158, 11] : isCommande ? [99, 102, 241] : COLOR_ACCENT;

  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.rect(0, 0, 210, 32, 'F');

  // Decorative Bottom Bar
  doc.setFillColor(bannerAccent[0], bannerAccent[1], bannerAccent[2]);
  doc.rect(0, 32, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(cName.toUpperCase(), 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Matricule Fiscal : ${cMF} • Tél : ${cPhone}`, 14, 19);
  doc.text(`Espace Chantier / Projet : ${projet?.nom || 'Projet Principal'} • Email : ${cEmail}`, 14, 25);

  // Add Company Logo
  try {
    doc.addImage('/logo.png', 'PNG', 115, 3, 40, 40);
  } catch (e) {
    console.error('Logo not found', e);
  }

  // Document Title & Number (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(docType, 196, 12, { align: 'right' });
  doc.setFontSize(10.5);
  doc.text(`N° ${vente.numero}`, 196, 19, { align: 'right' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date : ${new Date(vente.date).toLocaleDateString('fr-FR')}`, 196, 25, { align: 'right' });

  let currentY = 39;

  // Box Issuer Info (Left)
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(14, currentY, 88, 36, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.text('ÉMETTEUR (FOURNISSEUR / SOCIÉTÉ)', 18, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(cName, 18, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(cAddress, 18, currentY + 17);
  doc.text(`Matricule Fiscal : ${cMF}`, 18, currentY + 22);
  doc.text(`Email : ${cEmail} | Tél : ${cPhone}`, 18, currentY + 27);
  doc.text(`Banque : ${cBank} • RIB : ${cRib}`, 18, currentY + 32);

  // Box Client Info (Right)
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(108, currentY, 88, 36, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.text(isDevis ? 'DESTINATAIRE DU DEVIS' : 'CLIENT / FACTURÉ À', 112, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(client?.nom || 'Client Particulier', 112, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Code Client : ${client?.code || 'CLI-00' + vente.clientId}`, 112, currentY + 17);
  doc.text(`Adresse : ${client?.adresse || 'Non renseignée'}, ${client?.ville || ''}`, 112, currentY + 22);
  doc.text(`Matricule Fiscal / CIN : ${client?.matriculeFiscal || 'Non spécifié'}`, 112, currentY + 27);
  doc.text(`Téléphone : ${client?.telephone || 'Non renseigné'}`, 112, currentY + 32);

  currentY += 42;

  // Articles Table
  const tableRows = vente.lignes && vente.lignes.length > 0 
    ? vente.lignes.map((lig, idx) => [
        (idx + 1).toString(),
        lig.code || 'ART',
        lig.designation,
        lig.quantite.toString(),
        fmt(lig.prixUnitaireHT),
        lig.remise ? `${lig.remise}%` : '0%',
        lig.tva ? `${lig.tva}%` : '19%',
        fmt(lig.totalHT),
        fmt(lig.totalTTC)
      ])
    : [
        ['1', 'ART-01', 'Prestation / Marchandises selon devis', '1', fmt(vente.montantHT), '0%', '19%', fmt(vente.montantHT), fmt(vente.montantTTC)]
      ];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Code', 'Désignation des Articles & Prestations', 'Qté', 'P.U HT', 'Rem.', 'TVA', 'Total HT', 'Total TTC']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [bannerColor[0], bannerColor[1], bannerColor[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 62 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 12 },
      7: { halign: 'right', cellWidth: 20 },
      8: { halign: 'right', cellWidth: 22 }
    }
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 6;

  if (finalY > 215) {
    doc.addPage();
    finalY = 20;
  }

  // Amount in words banner
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(14, finalY, 182, 10, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(isDevis ? 'Arrêté le présent devis à la somme de :' : isCommande ? 'Arrêtée la présente commande à la somme de :' : 'Arrêtée la présente facture à la somme de :', 17, finalY + 6.5);
  doc.setFont('helvetica', 'italic');
  doc.text(numberToWords(vente.montantTTC), 75, finalY + 6.5);

  finalY += 13;

  // Conditions & Notes box (Left)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, finalY, 105, 42, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.text(isDevis ? 'CONDITIONS COMMERCIALES & VALIDITÉ' : 'MODALITÉS ET CONDITIONS DE RÈGLEMENT', 17, finalY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  
  if (isDevis) {
    doc.text(`• Validité de l'offre : 30 jours à compter de la date d'émission`, 17, finalY + 12);
    doc.text(`• Date limite de validité : ${vente.dateEcheance ? new Date(vente.dateEcheance).toLocaleDateString('fr-FR') : '30 jours'}`, 17, finalY + 17);
    doc.text(`• Modalité de paiement : ${vente.modePaiement || 'Comptant à la livraison / Virement'}`, 17, finalY + 22);
    doc.text(`• Observations : ${vente.notes || 'Offre sous réserve de disponibilité des stocks à la confirmation.'}`, 17, finalY + 27, { maxWidth: 98 });
    doc.text(`• Coordonnées Bancaires (RIB) : ${cBank} - ${cRib}`, 17, finalY + 36);
  } else {
    doc.text(`• Mode de règlement : ${vente.modePaiement || 'Virement Bancaire'}`, 17, finalY + 12);
    doc.text(`• Date d'échéance : ${vente.dateEcheance ? new Date(vente.dateEcheance).toLocaleDateString('fr-FR') : 'À réception'}`, 17, finalY + 17);
    doc.text(`• Statut du document : ${vente.statut.toUpperCase()}`, 17, finalY + 22);
    doc.text(`• Observations : ${vente.notes || 'Paiement sans escompte. Tout retard entraîne pénalités.'}`, 17, finalY + 27, { maxWidth: 98 });
    doc.text(`• Coordonnées Bancaires (RIB) : ${cBank} - ${cRib}`, 17, finalY + 36);
  }

  // Financial Totals Summary (Right)
  const montantPaye = vente.montantPaye ?? (vente.statut === 'Payée' ? vente.montantTTC : 0);
  const soldeRestant = Math.max(0, vente.montantTTC - montantPaye);
  const tvaTotal = Math.max(0, vente.montantTTC - vente.montantHT - 1.0);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(123, finalY, 73, 42, 2, 2, 'FD');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  
  doc.text('Total Brut HT :', 126, finalY + 7);
  doc.text(fmt(vente.montantHT), 193, finalY + 7, { align: 'right' });

  doc.text('TVA (19%) :', 126, finalY + 13);
  doc.text(fmt(tvaTotal), 193, finalY + 13, { align: 'right' });

  doc.text('Droit de Timbre :', 126, finalY + 19);
  doc.text('1,000 DT', 193, finalY + 19, { align: 'right' });

  doc.setDrawColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.line(126, finalY + 22, 193, finalY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.text(isDevis ? 'TOTAL DEVIS TTC :' : 'NET À PAYER TTC :', 126, finalY + 27);
  doc.text(fmt(vente.montantTTC), 193, finalY + 27, { align: 'right' });

  doc.setFontSize(7.5);
  if (isDevis) {
    doc.setTextColor(100, 116, 139);
    doc.text('Acompte souhaité (30%) :', 126, finalY + 33);
    doc.text(fmt(vente.montantTTC * 0.3), 193, finalY + 33, { align: 'right' });

    doc.setTextColor(71, 85, 105);
    doc.text('Solde à la livraison :', 126, finalY + 39);
    doc.text(fmt(vente.montantTTC * 0.7), 193, finalY + 39, { align: 'right' });
  } else {
    doc.setTextColor(16, 185, 129);
    doc.text('Montant Réglé :', 126, finalY + 33);
    doc.text(fmt(montantPaye), 193, finalY + 33, { align: 'right' });

    doc.setTextColor(soldeRestant > 0 ? 220 : 71, soldeRestant > 0 ? 38 : 85, soldeRestant > 0 ? 38 : 105);
    doc.text('SOLDE RESTANT DÛ :', 126, finalY + 39);
    doc.text(fmt(soldeRestant), 193, finalY + 39, { align: 'right' });
  }

  // Signatures Footer
  finalY += 48;
  if (finalY > 245) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  
  if (isDevis) {
    doc.text('Bon pour Accord et Signature Client', 20, finalY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('(précédé de la mention manuscrite "Lu et Approuvé")', 17, finalY + 4);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Cachet Commercial UGS DISTRIBUTION', 125, finalY);
  } else {
    doc.text('Cachet et Signature du Client', 25, finalY);
    doc.text('Direction Financière & Comptabilité', 130, finalY);
  }

  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.roundedRect(14, finalY + 6, 82, 18, 2, 2);
  doc.roundedRect(114, finalY + 6, 82, 18, 2, 2);

  applyPdfFooters(doc, `${docType} N° ${vente.numero}`);
  doc.save(`${docType.replace(/\s+/g, '_')}_${vente.numero}.pdf`);
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
    doc.addImage('/logo.png', 'PNG', 155, 3, 40, 40);
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
