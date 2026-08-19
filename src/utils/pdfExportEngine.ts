import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vente, Achat, Client, Fournisseur, Article, MouvementStock, Projet, Reglement, CreditEcheance } from '../types';

// Helper colors
const COLOR_PRIMARY = [180, 20, 30] as const; // Dark crimson / Bordeaux (#B4141E)
const COLOR_SECONDARY = [30, 41, 59] as const; // Slate 800
const COLOR_MUTED = [100, 116, 139] as const; // Slate 500
const COLOR_BG_LIGHT = [248, 250, 252] as const; // Slate 50

// Helper to format currency cleanly for jsPDF
const fmt = (num?: number) => {
  const n = num || 0;
  const parts = n.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${integerPart},${parts[1]} DT`;
};

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
  const isDevis = vente.statut === 'Devis';
  const docType = isDevis ? 'DEVIS COMMERCIAL' : 'FACTURE DE VENTE';

  const cName = projet?.entrepriseNom || 'UGS DISTRIBUTION - ERP CENTRAL';
  const cMF = projet?.matriculeFiscal || '1234567/A/M/000';
  const cAddress = projet?.adresse || 'Zone Industrielle Voie 12, Tunis';
  const cPhone = projet?.telephone || '+216 71 000 111';
  const cEmail = projet?.email || 'facturation@ugs-distribution.com';
  const cBank = projet?.banque || 'BIAT';
  const cRib = projet?.rib || '08 001 0001234567890 45';

  // Header Banner
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(0, 0, 210, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(cName.toUpperCase(), 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Matricule Fiscal : ${cMF} • Tél : ${cPhone}`, 14, 21);
  doc.text(`Espace Chantier / Projet : ${projet?.nom || 'Projet Principal'} • Email : ${cEmail}`, 14, 27);

  // Document Title & Number (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(docType, 196, 13, { align: 'right' });
  doc.setFontSize(11);
  doc.text(`N° ${vente.numero}`, 196, 21, { align: 'right' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date : ${new Date(vente.date).toLocaleDateString('fr-FR')}`, 196, 27, { align: 'right' });

  let currentY = 40;

  // Box Issuer Info (Left)
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, currentY, 88, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('ÉMETTEUR (FOURNISSEUR / SOCIÉTÉ)', 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(cName, 18, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(cAddress, 18, currentY + 16);
  doc.text(`Matricule Fiscal : ${cMF}`, 18, currentY + 21);
  doc.text(`Email : ${cEmail} | Tél : ${cPhone}`, 18, currentY + 26);
  doc.text(`Banque : ${cBank} • RIB : ${cRib}`, 18, currentY + 31);

  // Box Client Info (Right)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(108, currentY, 88, 36, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('CLIENT / FACTURÉ À', 112, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(client?.nom || 'Client Particulier', 112, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Code Client : ${client?.code || 'CLI-00' + vente.clientId}`, 112, currentY + 16);
  doc.text(`Adresse : ${client?.adresse || 'Non renseignée'}, ${client?.ville || ''}`, 112, currentY + 21);
  doc.text(`Matricule Fiscal / CIN : ${client?.matriculeFiscal || 'Non spécifié'}`, 112, currentY + 26);
  doc.text(`Téléphone : ${client?.telephone || 'Non renseigné'}`, 112, currentY + 31);

  currentY += 44;

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
        ['1', 'ART-01', 'Prestation / Marchandises selon commande', '1', fmt(vente.montantHT), '0%', '19%', fmt(vente.montantHT), fmt(vente.montantTTC)]
      ];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Code', 'Désignation des Articles & Prestations', 'Qté', 'P.U HT', 'Rem.', 'TVA', 'Total HT', 'Total TTC']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [180, 20, 30],
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
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, finalY, 182, 10, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('Arrêtée la présente facture à la somme de :', 17, finalY + 6);
  doc.setFont('helvetica', 'italic');
  doc.text(numberToWords(vente.montantTTC), 75, finalY + 6);

  finalY += 13;

  // Conditions & Notes box (Left)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, finalY, 105, 42, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('MODALITÉS ET CONDITIONS DE RÈGLEMENT', 17, finalY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(`• Mode de règlement : ${vente.modePaiement || 'Virement Bancaire'}`, 17, finalY + 12);
  doc.text(`• Date d'échéance : ${vente.dateEcheance ? new Date(vente.dateEcheance).toLocaleDateString('fr-FR') : 'À réception'}`, 17, finalY + 17);
  doc.text(`• Statut du document : ${vente.statut.toUpperCase()}`, 17, finalY + 22);
  doc.text(`• Observations : ${vente.notes || 'Paiement sans escompte. Tout retard entraîne pénalités.'}`, 17, finalY + 27, { maxWidth: 98 });
  doc.text(`• Coordonnées Bancaires (RIB) : ${cBank} - ${cRib}`, 17, finalY + 36);

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

  doc.setDrawColor(180, 20, 30);
  doc.line(126, finalY + 22, 193, finalY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('NET À PAYER TTC :', 126, finalY + 27);
  doc.text(fmt(vente.montantTTC), 193, finalY + 27, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text('Montant Réglé :', 126, finalY + 33);
  doc.text(fmt(montantPaye), 193, finalY + 33, { align: 'right' });

  doc.setTextColor(soldeRestant > 0 ? 220 : 71, soldeRestant > 0 ? 38 : 85, soldeRestant > 0 ? 38 : 105);
  doc.text('SOLDE RESTANT DÛ :', 126, finalY + 39);
  doc.text(fmt(soldeRestant), 193, finalY + 39, { align: 'right' });

  // Signatures Footer
  finalY += 48;
  if (finalY > 245) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('Cachet et Signature du Client', 25, finalY);
  doc.text('Direction Financière & Comptabilité', 130, finalY);

  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, finalY + 4, 82, 18, 2, 2);
  doc.roundedRect(114, finalY + 4, 82, 18, 2, 2);

  // Bottom Notice
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(`${cName} • MF : ${cMF} • RIB : ${cRib} • Document conforme aux normes comptables et fiscales en vigueur`, 105, 288, { align: 'center' });

  doc.save(`${docType.replace(/\s+/g, '_')}_${vente.numero}.pdf`);
}

/**
 * 2. BON DE COMMANDE FOURNISSEUR
 */
export function generatePurchaseOrderPdf(achat: Achat, fournisseur?: Fournisseur, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(15, 23, 42); // Dark Slate header
  doc.rect(0, 0, 210, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('UGS DISTRIBUTION - APPROVISIONNEMENT', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`BON DE COMMANDE ACHAT • Espace Projet : ${projet?.nom || 'Projet Principal'}`, 14, 22);
  doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')} • Service Achats & Chantiers`, 14, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`N° ${achat.numero}`, 145, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date commande : ${new Date(achat.date).toLocaleDateString('fr-FR')}`, 145, 26);

  let currentY = 44;

  // Box Société
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 88, 36, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('COMMANDITAIRE / LIVRAISON', 18, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('UGS Distribution & Travaux SAS', 18, currentY + 12);
  doc.text('Dépôt Central & Réception Matériaux', 18, currentY + 17);
  doc.text(`Projet Affecté : ${projet?.nom || 'Alpha BTP'}`, 18, currentY + 22);
  doc.text('Contact Chantier : +216 71 000 111', 18, currentY + 27);
  doc.text('Email : achats@ugs-distribution.com', 18, currentY + 32);

  // Box Fournisseur
  doc.roundedRect(108, currentY, 88, 36, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('FOURNISSEUR / SOUS-TRAITANT', 112, currentY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(fournisseur?.nom || 'Fournisseur Externe', 112, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Code Fournisseur : ${fournisseur?.code || 'FRN-00' + achat.fournisseurId}`, 112, currentY + 17);
  doc.text(`Adresse : ${fournisseur?.adresse || 'Non spécifiée'}, ${fournisseur?.ville || ''}`, 112, currentY + 22);
  doc.text(`Matricule Fiscal : ${fournisseur?.matriculeFiscal || 'Non spécifié'}`, 112, currentY + 27);
  doc.text(`Contact : ${fournisseur?.contactNom || 'Service Commercial'} (${fournisseur?.telephone || ''})`, 112, currentY + 32);

  currentY += 44;

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
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
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

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RELEVÉ DE COMPTE & SITUATION CLIENT', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`UGS Distribution • ERP Multi-Projets • Édité le ${new Date().toLocaleDateString('fr-FR')}`, 14, 23);

  // Client Details Card
  let currentY = 40;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(client.nom, 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(`Code : ${client.code || 'CLI-00' + client.id} • Catégorie : ${client.categorie || 'PME'} • Solvabilité : ${client.scoreSolvabilite || 80}/100`, 18, currentY + 14);
  doc.text(`Matricule Fiscal / CIN : ${client.matriculeFiscal || 'N/A'} • Tél : ${client.telephone}`, 18, currentY + 20);
  doc.text(`Plafond de Crédit Autorisé : ${fmt(client.plafondCredit || 20000)} • Délai accordé : ${client.delaiPaiement || 30} jours`, 18, currentY + 26);

  currentY += 40;

  // Compute Totals
  const totalFactures = ventes.reduce((acc, v) => acc + v.montantTTC, 0);
  const totalPaye = reglements.filter(r => r.tierId === client.id).reduce((acc, r) => acc + r.montant, 0);
  const soldeDu = totalFactures - totalPaye;

  // KPI Mini Cards
  doc.setFillColor(239, 246, 255); // Blue
  doc.roundedRect(14, currentY, 56, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text('TOTAL FACTURÉ', 18, currentY + 6);
  doc.setFontSize(10);
  doc.text(fmt(totalFactures), 18, currentY + 13);

  doc.setFillColor(240, 253, 244); // Green
  doc.roundedRect(77, currentY, 56, 18, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text('TOTAL ENCAISSÉ', 81, currentY + 6);
  doc.setFontSize(10);
  doc.text(fmt(totalPaye), 81, currentY + 13);

  doc.setFillColor(254, 242, 242); // Red
  doc.roundedRect(140, currentY, 56, 18, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text('SOLDE RESTANT DÛ', 144, currentY + 6);
  doc.setFontSize(10);
  doc.text(fmt(soldeDu), 144, currentY + 13);

  currentY += 26;

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
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8
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

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BALANCE ÂGÉE DES CRÉANCES & ÉCHÉANCIER DE RECOUVREMENT', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Système ERP Central • Multi-Projets • Périmètre : ${projet?.nom || 'Tous les Projets'} • Date d'analyse : ${new Date().toLocaleDateString('fr-FR')}`, 14, 22);

  // Group by client and calculate buckets
  const totalNonEchu = echeances.filter(e => e.joursRetard <= 0).reduce((acc, e) => acc + e.soldeRestant, 0);
  const total1a30 = echeances.filter(e => e.joursRetard > 0 && e.joursRetard <= 30).reduce((acc, e) => acc + e.soldeRestant, 0);
  const total31a60 = echeances.filter(e => e.joursRetard > 30 && e.joursRetard <= 60).reduce((acc, e) => acc + e.soldeRestant, 0);
  const totalPlus60 = echeances.filter(e => e.joursRetard > 60).reduce((acc, e) => acc + e.soldeRestant, 0);
  const totalGlobalDu = totalNonEchu + total1a30 + total31a60 + totalPlus60;

  // Aging Summary Box
  let currentY = 38;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 269, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  doc.text(`Non Échues (< 0j) : ${fmt(totalNonEchu)}`, 20, currentY + 8);
  doc.text(`Retard 1-30j : ${fmt(total1a30)}`, 85, currentY + 8);
  doc.text(`Retard 31-60j : ${fmt(total31a60)}`, 145, currentY + 8);
  doc.text(`Retard > 60j : ${fmt(totalPlus60)}`, 210, currentY + 8);

  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.setFontSize(10);
  doc.text(`TOTAL EN-COURS GLOBAL : ${fmt(totalGlobalDu)}`, 20, currentY + 16);

  currentY += 26;

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
    e.joursRetard <= 0 ? fmt(e.soldeRestant) : '0.00 DT',
    e.joursRetard > 0 && e.joursRetard <= 30 ? fmt(e.soldeRestant) : '0.00 DT',
    e.joursRetard > 30 ? fmt(e.soldeRestant) : '0.00 DT',
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

  doc.save(`Balance_Agee_Creances_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * 5. LETTRE DE RELANCE IMPAYÉ CLIENT (OFFICIELLE)
 */
export function generateDunningLetterPdf(client: Client, facturesEnRetard: Vente[], niveau: 1 | 2 | 3 = 1, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const totalImpaye = facturesEnRetard.reduce((acc, f) => acc + (f.montantTTC - (f.montantPaye || 0)), 0);
  const penaliteForfaitaire = niveau >= 2 ? 40 : 0; // 40 DT de frais de recouvrement légaux
  const totalARegler = totalImpaye + penaliteForfaitaire;

  // Header Banner
  doc.setFillColor(niveau === 3 ? 153 : niveau === 2 ? 180 : 30, niveau === 3 ? 27 : niveau === 2 ? 20 : 41, niveau === 3 ? 27 : niveau === 2 ? 30 : 59);
  doc.rect(0, 0, 210, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titreNiveau = niveau === 3 ? 'MISE EN DEMEURE DE PAYER (NIVEAU 3)' : niveau === 2 ? 'LETTRE DE RELANCE FERME (NIVEAU 2)' : 'RAPPEL D\'ÉCHÉANCE ET RELANCE (NIVEAU 1)';
  doc.text(titreNiveau, 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`UGS Distribution • Service Recouvrement • Réf : REL-${client.id}-${niveau}-${Date.now().toString().slice(-4)}`, 14, 23);
  doc.text(`Date d'envoi : ${new Date().toLocaleDateString('fr-FR')} • Lettre Recommandée / Notification Officielle`, 14, 29);

  let currentY = 44;

  // Client Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(105, currentY, 91, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(client.nom, 110, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`À l'attention de : ${client.contactNom || 'Direction Financière'}`, 110, currentY + 13);
  doc.text(`Adresse : ${client.adresse}, ${client.ville || ''}`, 110, currentY + 19);
  doc.text(`Matricule Fiscal : ${client.matriculeFiscal || 'N/A'}`, 110, currentY + 25);
  doc.text(`Téléphone : ${client.telephone}`, 110, currentY + 30);

  currentY += 42;

  // Objet
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(`OBJET : ${titreNiveau} - FACTURES EN SOUFFRANCE`, 14, currentY);

  currentY += 8;

  // Corps du texte
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);

  const intro = niveau === 1
    ? "Sauf erreur ou omission de notre part, nous constatons que les factures listées ci-dessous sont arrivées à échéance et n'ont pas encore fait l'objet d'un règlement sur nos comptes bancaires."
    : niveau === 2
    ? "Malgré notre premier rappel, nos services comptables constatent que votre compte présente toujours un solde débiteur impayé. Conformément à nos conditions générales de vente, des pénalités de retard sont désormais applicables."
    : "Nous vous mettons formellement EN DEMEURE par la présente de procéder au règlement intégral sous 48 heures ouvrées de votre dette. À défaut, le dossier sera transmis à notre contentieux juridique pour saisie conservatoire.";

  doc.text(intro, 14, currentY, { maxWidth: 182 });

  currentY += 18;

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
      fontSize: 8.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8
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
  doc.roundedRect(14, finalY, 182, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(153, 27, 27);
  doc.text(`TOTAL EXIGIBLE IMMÉDIATEMENT : ${fmt(totalARegler)}`, 20, finalY + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`(Dont ${fmt(totalImpaye)} de principal facturé + ${fmt(penaliteForfaitaire)} d'indemnité forfaitaire de recouvrement)`, 20, finalY + 15);

  finalY += 30;

  // Bank coordinates for payment
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Coordonnées pour virement bancaire immédiat :', 14, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('• Banque : Banque Internationale Arabe de Tunisie (BIAT)', 14, finalY + 6);
  doc.text('• RIB Virement : 08 001 0001234567890 45', 14, finalY + 11);
  doc.text(`• Réf. obligatoire au virement : RELANCE-${client.code || client.id}`, 14, finalY + 16);

  finalY += 28;
  doc.setFont('helvetica', 'bold');
  doc.text('Direction Générale & Pôle Recouvrement ERP', 120, finalY);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(115, finalY + 3, 75, 18, 2, 2);

  doc.save(`Lettre_Relance_Niveau${niveau}_${client.nom.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 6. INVENTAIRE & VALORISATION DU STOCK
 */
export function generateStockInventoryPdf(articles: Article[], mouvements?: MouvementStock[], projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('INVENTAIRE PHYSIQUE & VALORISATION DES STOCKS', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`UGS Distribution • ERP Logistique • Espace Projet : ${projet?.nom || 'Tous les Chantiers'} • Date : ${new Date().toLocaleDateString('fr-FR')}`, 14, 22);

  const valeurAchatTotale = articles.reduce((acc, a) => acc + (a.stock * a.prixAchatHT), 0);
  const valeurVenteTotale = articles.reduce((acc, a) => acc + (a.stock * a.prixVenteHT), 0);
  const margePotentielle = valeurVenteTotale - valeurAchatTotale;

  let currentY = 38;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 269, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Nombre de références : ${articles.length}`, 20, currentY + 7);
  doc.text(`Valorisation Coût Achat (PMP) : ${fmt(valeurAchatTotale)}`, 85, currentY + 7);
  doc.text(`Valeur Marchande Vente HT : ${fmt(valeurVenteTotale)}`, 175, currentY + 7);

  doc.setTextColor(16, 185, 129);
  doc.text(`Marge brute théorique : ${fmt(margePotentielle)}`, 20, currentY + 14);

  currentY += 24;

  const rows = articles.map((a, idx) => [
    (idx + 1).toString(),
    a.code,
    a.designation,
    a.famille,
    a.stock.toString(),
    fmt(a.prixAchatHT),
    fmt(a.prixVenteHT),
    fmt(a.stock * a.prixAchatHT),
    fmt(a.stock * a.prixVenteHT),
    a.stock <= (a.seuilAlerte || 10) ? 'RÉAPPRO' : 'OPTIMAL'
  ]);

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

  doc.save(`Inventaire_Stock_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * 7. REÇU DE PAIEMENT / JUSTIFICATIF DE CAISSE
 */
export function generateReceiptPdf(reglement: Reglement, projet?: Projet | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [148, 210] }); // A5 format for receipt

  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(0, 0, 148, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`REÇU D'${reglement.type.toUpperCase()}`, 10, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`UGS Distribution ERP • Pièce N° ${reglement.numeroPiece}`, 10, 19);

  let currentY = 34;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
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

  currentY += 56;

  // Montant Encart
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(10, currentY, 128, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  doc.text('MONTANT ENCAISSÉ / PAYÉ :', 16, currentY + 11);
  doc.setFontSize(12);
  doc.text(fmt(reglement.montant), 132, currentY + 11, { align: 'right' });

  currentY += 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Signature du Tiers', 20, currentY);
  doc.text('Cachet de la Caisse ERP', 90, currentY);

  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, currentY + 3, 58, 20, 2, 2);
  doc.roundedRect(80, currentY + 3, 58, 20, 2, 2);

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
  doc.rect(0, 0, 210, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CONVENTION D\'OCTROI DE CRÉDIT & ÉCHÉANCIER', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('UGS DISTRIBUTION - CONTRAT DE FACILITÉ DE PAIEMENT CLIENT', 14, 22);
  doc.text(`Projet : ${projet?.nom || 'Projet Central'} • Réf Dossier : ${ref}`, 14, 28);

  let currentY = 42;

  // Box Parties
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.roundedRect(14, currentY, 88, 36, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('ORGANISME PRÊTEUR', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('UGS Distribution & Négoce Pro', 18, currentY + 12);
  doc.text('Matricule Fiscal : 1234567/A/M/000', 18, currentY + 17);
  doc.text('Zone Industrielle Voie 12, Tunis', 18, currentY + 22);
  doc.text('Contact : credit-management@ugs.tn', 18, currentY + 27);

  // Box Client (Right)
  doc.roundedRect(108, currentY, 88, 36, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
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

  currentY += 44;

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

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(fmt(montantTotal), 18, currentY + 16);
  doc.setTextColor(22, 101, 52);
  doc.text(fmt(acompte), 81, currentY + 16);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(fmt(soldeFinancer), 144, currentY + 16);

  currentY += 30;

  // Installments Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
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
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, sigY, 86, 26, 2, 2);
  doc.roundedRect(110, sigY, 86, 26, 2, 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text('Pour UGS Distribution (Accordé)', 20, sigY + 6);
  doc.text(`Pour le Client : ${client.nom}`, 116, sigY + 6);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('Signature & Cachet de la Direction', 20, sigY + 20);
  doc.text('Mention manuscrite "Bon pour accord de paiement"', 116, sigY + 20);

  doc.save(`Convention_Credit_${client.nom.replace(/[^a-zA-Z0-9]/g, '_')}_${ref}.pdf`);
}
