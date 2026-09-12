import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vente, Projet, Article, Client, Fournisseur, BonDeLivraison, SessionCaisse, Reglement, Utilisateur } from '../types';
import { getArticleStock } from './stockUtils';

// Palette institutionnelle SOCIETE UNIVERS GSM DE SUD
const COLOR_PRIMARY = [30, 27, 75] as const;   // Indigo 950 (#1e1b4b)
const COLOR_ACCENT = [79, 70, 229] as const;   // Indigo 600 (#4f46e5)
const COLOR_EMERALD = [16, 185, 129] as const; // Emerald 500
const COLOR_MUTED = [100, 116, 139] as const;  // Slate 500
const COLOR_BORDER = [226, 232, 240] as const; // Slate 200

const fmtDT = (num?: number) => {
  const n = num || 0;
  const parts = n.toFixed(3).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${integerPart},${parts[1]} DT`;
};

const fmtDT2 = (num?: number) => {
  const n = num || 0;
  const parts = n.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${integerPart},${parts[1]} DT`;
};

/**
 * Entête officiel SOCIETE UNIVERS GSM DE SUD avec Logo et coordonnées
 */
function drawOfficialHeader(
  doc: jsPDF,
  titreRapport: string,
  sousTitre: string,
  projetSelectionneNom: string,
  periodeLabel: string,
  accentColor: readonly [number, number, number] = COLOR_PRIMARY
) {
  const pageWidth = doc.internal.pageSize.width;

  // Bandeau supérieur élégant
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Liseré accent
  doc.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  // Logo ou badge UGS
  try {
    doc.addImage('/logo.png', 'PNG', 14, 4, 20, 20);
  } catch (e) {
    // Si logo indisponible, afficher monogramme
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 4, 20, 20, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text('UGS', 24, 16, { align: 'center' });
  }

  // Informations Légales Entreprise
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SOCIETE UNIVERS GSM DE SUD', 38, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('112, OMAR IBN KHATAB ZRIG, GABES S3  •  M.F : 1532846 G/A/M/000', 38, 17);
  doc.text('RIB : 04 705 012 0051487155 82 (Attijari Bank)  •  Tél : +216 75 655 555', 38, 23);

  // Titre du Rapport & Période (à droite)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(titreRapport.toUpperCase(), pageWidth - 14, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(sousTitre, pageWidth - 14, 17, { align: 'right' });
  doc.setFontSize(7.5);
  doc.text(`Périmètre : ${projetSelectionneNom}  |  Période : ${periodeLabel}`, pageWidth - 14, 23, { align: 'right' });
}

/**
 * Pied de page avec pagination et horodatage certifié
 */
function drawOfficialFooters(doc: jsPDF, titreRapport: string) {
  const totalPages = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const dateGeneration = new Date().toLocaleString('fr-FR');

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(`SOCIETE UNIVERS GSM DE SUD  •  ${titreRapport}  •  Généré le ${dateGeneration} par Super-Admin`, 14, pageHeight - 7);
    doc.text(`Page ${i} sur ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

// ============================================================================
// 1. RAPPORT FINANCIER & PERFORMANCE GLOBALE DU RÉSEAU
// ============================================================================
export function generateSuperAdminFinancialReportPdf(
  ventes: Vente[],
  projets: Projet[],
  articles: Article[],
  periodeLabel: string,
  selectedProjectNom: string = 'Toutes les Boutiques (Réseau Global)'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  drawOfficialHeader(
    doc,
    'Rapport Financier Consolidé',
    'Chiffre d\'Affaires, Marges Brutes & Performance Réseau',
    selectedProjectNom,
    periodeLabel,
    [30, 27, 75]
  );

  // Calculs financiers
  const validVentes = ventes.filter(v => v.statut !== 'Annulée' && v.statut !== 'Devis');
  const totalTTC = validVentes.reduce((s, v) => s + (v.montantTTC || 0), 0);
  const totalHT = validVentes.reduce((s, v) => s + (v.montantHT || 0), 0);
  const totalPaye = validVentes.reduce((s, v) => s + (v.montantPaye || 0), 0);
  const totalCreance = Math.max(0, totalTTC - totalPaye);

  // Estimation du Coût d'Achat HT et Marge Brute
  let totalCoutAchat = 0;
  validVentes.forEach(v => {
    (v.lignes || []).forEach(l => {
      const art = articles.find(a => a.id === l.articleId || a.code === l.code);
      const prixAchat = art ? art.prixAchatHT : (l.prixUnitaireHT * 0.7);
      totalCoutAchat += prixAchat * l.quantite;
    });
  });
  const margeBrute = totalHT - totalCoutAchat;
  const tauxMarge = totalHT > 0 ? ((margeBrute / totalHT) * 100) : 0;

  // Blocs KPI (35mm sous l'entête)
  const kpiY = 34;
  const kpiW = (pageWidth - 28 - 12) / 5;

  const kpis = [
    { label: 'Chiffre d\'Affaires TTC', val: fmtDT(totalTTC), sub: `${validVentes.length} transactions` },
    { label: 'Chiffre d\'Affaires HT', val: fmtDT(totalHT), sub: 'Hors taxes' },
    { label: 'Marge Brute Réalisée', val: fmtDT(margeBrute), sub: `Taux : ${tauxMarge.toFixed(1)}%` },
    { label: 'Règlements Encaissés', val: fmtDT(totalPaye), sub: 'Encaissé réel' },
    { label: 'Encours / Crédits Clients', val: fmtDT(totalCreance), sub: 'À recouvrer' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(x, kpiY, kpiW, 17, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(kpi.label.toUpperCase(), x + 3, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 27, 75);
    doc.text(kpi.val, x + 3, kpiY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
    doc.text(kpi.sub, x + 3, kpiY + 15);
  });

  // Tableau Répartition par Boutique / Point de Vente
  const tableDataBoutiques = projets.map(p => {
    const pVentes = validVentes.filter(v => v.projetId === p.id);
    const pCA = pVentes.reduce((s, v) => s + v.montantTTC, 0);
    const pHT = pVentes.reduce((s, v) => s + v.montantHT, 0);
    const pEnc = pVentes.reduce((s, v) => s + (v.montantPaye || 0), 0);
    const pSolde = Math.max(0, pCA - pEnc);
    const part = totalTTC > 0 ? ((pCA / totalTTC) * 100) : 0;

    return [
      p.nom,
      p.codeBoutique || p.id,
      p.responsable || 'Non assigné',
      pVentes.length.toString(),
      fmtDT(pHT),
      fmtDT(pCA),
      `${part.toFixed(1)}%`,
      fmtDT(pEnc),
      fmtDT(pSolde)
    ];
  });

  autoTable(doc, {
    startY: 55,
    head: [['Boutique / Point de Vente', 'Code', 'Responsable', 'Ventes', 'Total HT', 'Total TTC', 'Part CA', 'Encaissé', 'Crédit / Reste']],
    body: tableDataBoutiques,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 27, 75],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      3: { halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'center', textColor: [79, 70, 229] },
      7: { halign: 'right' },
      8: { halign: 'right', textColor: [225, 29, 72] }
    },
    foot: [[
      'TOTAL CONSOLIDÉ DU GROUPE',
      '',
      '',
      validVentes.length.toString(),
      fmtDT(totalHT),
      fmtDT(totalTTC),
      '100%',
      fmtDT(totalPaye),
      fmtDT(totalCreance)
    ]],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 27, 75],
      fontStyle: 'bold',
      fontSize: 8
    }
  });

  drawOfficialFooters(doc, 'Rapport Financier Consolidé');
  doc.save(`Rapport_Financier_UGS_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================================
// 2. ÉTAT D'INVENTAIRE & VALORISATION DU STOCK RÉSEAU
// ============================================================================
export function generateSuperAdminInventoryValuationPdf(
  articles: Article[],
  projets: Projet[],
  selectedProjectId: string = 'all',
  selectedProjectNom: string = 'Toutes les Boutiques (Réseau Global)'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  drawOfficialHeader(
    doc,
    'Inventaire & Valorisation des Stocks',
    'Quantités Physiques, Valeur Achat HT & Valeur Marchande',
    selectedProjectNom,
    `Arrêté au ${new Date().toLocaleDateString('fr-FR')}`,
    [15, 23, 42] // Slate 900
  );

  // Filtrage articles
  const filteredArticles = selectedProjectId === 'all' 
    ? articles 
    : articles.filter(a => a.projetId === selectedProjectId || (a.stocks && a.stocks[selectedProjectId] !== undefined));

  let totalQteGlobale = 0;
  let totalValeurAchat = 0;
  let totalValeurVente = 0;
  let articlesEnRupture = 0;
  let articlesEnAlerte = 0;

  const tableBody = filteredArticles.map(art => {
    const stockTotal = getArticleStock(art, selectedProjectId);
    const minStock = (art.stockMinimums && selectedProjectId !== 'all' ? art.stockMinimums[selectedProjectId] : null) || art.stockMinimum || 15;
    const valAchat = stockTotal * (art.prixAchatHT || 0);
    const valVente = stockTotal * (art.prixVenteHT || 0);
    const margeEstimee = valVente - valAchat;

    totalQteGlobale += stockTotal;
    totalValeurAchat += valAchat;
    totalValeurVente += valVente;

    if (stockTotal <= 0) articlesEnRupture++;
    else if (stockTotal < minStock) articlesEnAlerte++;

    const statutStock = stockTotal <= 0 ? 'RUPTURE' : stockTotal < minStock ? 'FAIBLE' : 'OPTIMAL';

    return [
      art.code,
      art.designation,
      art.famille || art.categorie || 'Standard',
      stockTotal.toString(),
      minStock.toString(),
      fmtDT2(art.prixAchatHT),
      fmtDT2(art.prixVenteHT),
      fmtDT2(valAchat),
      fmtDT2(valVente),
      fmtDT2(margeEstimee),
      statutStock
    ];
  });

  // KPI Row
  const kpiY = 34;
  const kpiW = (pageWidth - 28 - 12) / 5;
  const kpis = [
    { label: 'Articles au Catalogue', val: filteredArticles.length.toString(), sub: `${articlesEnRupture} en rupture` },
    { label: 'Unités Physiques en Stock', val: totalQteGlobale.toLocaleString('fr-FR'), sub: 'Toutes références' },
    { label: 'Valorisation Achat HT', val: fmtDT(totalValeurAchat), sub: 'Capital immobilisé' },
    { label: 'Valorisation Marchande Vente', val: fmtDT(totalValeurVente), sub: 'Prix public HT' },
    { label: 'Potentiel Marge Brute', val: fmtDT(totalValeurVente - totalValeurAchat), sub: 'Marge prévisionnelle' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(x, kpiY, kpiW, 17, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(kpi.label.toUpperCase(), x + 3, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 3, kpiY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
    doc.text(kpi.sub, x + 3, kpiY + 15);
  });

  autoTable(doc, {
    startY: 55,
    head: [['Réf', 'Désignation Article', 'Catégorie', 'Stock', 'Alerte', 'P. Achat HT', 'P. Vente HT', 'Total Achat', 'Total Vente', 'Marge', 'Statut']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22 },
      1: { cellWidth: 55 },
      3: { halign: 'center', fontStyle: 'bold' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'right', fontStyle: 'bold' },
      9: { halign: 'right', textColor: [16, 185, 129] },
      10: { halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 10) {
        if (data.cell.raw === 'RUPTURE') {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'FAIBLE') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [16, 185, 129];
        }
      }
    },
    foot: [[
      'VALORISATION TOTALE DU PARC',
      '',
      '',
      totalQteGlobale.toString(),
      '',
      '',
      '',
      fmtDT(totalValeurAchat),
      fmtDT(totalValeurVente),
      fmtDT(totalValeurVente - totalValeurAchat),
      ''
    ]],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5
    }
  });

  drawOfficialFooters(doc, 'Inventaire & Valorisation du Stock');
  doc.save(`Inventaire_Valorisation_Stock_UGS_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================================
// 3. BALANCE ÂGÉE & ENCOURS CRÉDITS CLIENTS (RECOUVREMENT)
// ============================================================================
export function generateSuperAdminCreditAgingReportPdf(
  clients: Client[],
  ventes: Vente[],
  projets: Projet[],
  selectedProjectNom: string = 'Toutes les Boutiques'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  drawOfficialHeader(
    doc,
    'Balance Âgée & Recouvrement',
    'Encours Crédits, Risques d\'Impayés & Délais de Règlement',
    selectedProjectNom,
    `Arrêté au ${new Date().toLocaleDateString('fr-FR')}`,
    [159, 18, 57] // Rose 900
  );

  const now = new Date();
  let totalGlobalDue = 0;
  let totalMoins30j = 0;
  let total30a60j = 0;
  let total60a90j = 0;
  let totalPlus90j = 0;

  // Calcul du solde dû par client
  const clientsData = clients.map(client => {
    const clientVentes = ventes.filter(v => v.clientId === client.id && v.statut !== 'Annulée' && v.statut !== 'Devis');
    
    let due0_30 = 0;
    let due30_60 = 0;
    let due60_90 = 0;
    let due90plus = 0;
    let totalClientDu = 0;

    clientVentes.forEach(v => {
      const reste = Math.max(0, v.montantTTC - (v.montantPaye || 0));
      if (reste > 0) {
        totalClientDu += reste;
        const dateEcheance = v.dateEcheance ? new Date(v.dateEcheance) : new Date(v.date);
        const diffDays = Math.floor((now.getTime() - dateEcheance.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 30) due0_30 += reste;
        else if (diffDays <= 60) due30_60 += reste;
        else if (diffDays <= 90) due60_90 += reste;
        else due90plus += reste;
      }
    });

    totalGlobalDue += totalClientDu;
    totalMoins30j += due0_30;
    total30a60j += due30_60;
    total60a90j += due60_90;
    totalPlus90j += due90plus;

    const bName = projets.find(p => p.id === client.projetId)?.nom || 'Dépôt Central UGS';

    return {
      nom: client.nom,
      telephone: client.telephone || '-',
      boutique: bName,
      plafond: client.plafondCredit || 0,
      totalDu: totalClientDu,
      due0_30,
      due30_60,
      due60_90,
      due90plus
    };
  }).filter(c => c.totalDu > 0).sort((a, b) => b.totalDu - a.totalDu);

  // KPIs
  const kpiY = 34;
  const kpiW = (pageWidth - 28 - 9) / 4;
  const kpis = [
    { label: 'Total Crédit Client', val: fmtDT(totalGlobalDue), sub: `${clientsData.length} comptes débiteurs` },
    { label: 'Échéance ≤ 30 jours', val: fmtDT(totalMoins30j), sub: 'Risque normal' },
    { label: 'Retard 30 à 90 jours', val: fmtDT(total30a60j + total60a90j), sub: 'Relance requise' },
    { label: 'Contentieux > 90 jours', val: fmtDT(totalPlus90j), sub: 'Alerte impayé' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(x, kpiY, kpiW, 17, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(kpi.label.toUpperCase(), x + 3, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(159, 18, 57);
    doc.text(kpi.val, x + 3, kpiY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(kpi.sub, x + 3, kpiY + 15);
  });

  const tableBody = clientsData.map(c => [
    c.nom,
    c.telephone,
    fmtDT2(c.plafond),
    fmtDT(c.totalDu),
    fmtDT2(c.due0_30),
    fmtDT2(c.due30_60),
    fmtDT2(c.due60_90),
    fmtDT2(c.due90plus)
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['Client Débiteur', 'Téléphone', 'Plafond', 'Total Dû', '≤ 30j', '31-60j', '61-90j', '> 90j (Critique)']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [159, 18, 57],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 24 },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold', textColor: [159, 18, 57] },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', textColor: [225, 29, 72], fontStyle: 'bold' }
    },
    foot: [[
      'TOTAL CRÉANCES CLIENTS',
      '',
      '',
      fmtDT(totalGlobalDue),
      fmtDT(totalMoins30j),
      fmtDT(total30a60j),
      fmtDT(total60a90j),
      fmtDT(totalPlus90j)
    ]],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [159, 18, 57],
      fontStyle: 'bold',
      fontSize: 7.5
    }
  });

  drawOfficialFooters(doc, 'Balance Âgée & Crédits Clients');
  doc.save(`Balance_Agee_Credits_UGS_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================================
// 4. RAPPORT CONSOLIDÉ DES SESSIONS DE CAISSE (AUDIT CAISSE)
// ============================================================================
export function generateSuperAdminCashSessionsReportPdf(
  sessions: SessionCaisse[],
  projets: Projet[],
  periodeLabel: string,
  selectedProjectNom: string = 'Toutes les Boutiques'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  drawOfficialHeader(
    doc,
    'Audit & Clôtures des Caisses',
    'Soldes Déclarés, Ventes Encaissées & Écarts de Caisse Réseau',
    selectedProjectNom,
    periodeLabel,
    [88, 28, 135] // Purple 900
  );

  let totalVentesCaisse = 0;
  let totalEcartPositif = 0;
  let totalEcartNegatif = 0;

  const tableBody = sessions.map(s => {
    const pNom = projets.find(p => p.id === s.projetId)?.nom || 'Boutique';
    const ecart = s.ecart || 0;
    if (ecart > 0) totalEcartPositif += ecart;
    else if (ecart < 0) totalEcartNegatif += Math.abs(ecart);

    const ventesTotales = (s.soldeFinalTheorique || 0) - (s.soldeInitial || 0);
    if (ventesTotales > 0) totalVentesCaisse += ventesTotales;

    return [
      pNom,
      s.utilisateurNom,
      new Date(s.dateOuverture).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
      s.dateFermeture ? new Date(s.dateFermeture).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'EN COURS',
      fmtDT(s.soldeInitial),
      fmtDT(s.soldeFinalTheorique),
      fmtDT(s.soldeFinalReel),
      ecart !== 0 ? (ecart > 0 ? `+${fmtDT(ecart)}` : fmtDT(ecart)) : '0,000 DT',
      s.statut === 'Ouverte' ? 'OUVERTE' : 'CLÔTURÉE'
    ];
  });

  // KPI
  const kpiY = 34;
  const kpiW = (pageWidth - 28 - 9) / 4;
  const kpis = [
    { label: 'Sessions Contrôlées', val: sessions.length.toString(), sub: 'Période analysée' },
    { label: 'Total Encaissé en Caisse', val: fmtDT(totalVentesCaisse), sub: 'Espèces & règlements directs' },
    { label: 'Excédents de Caisse', val: `+${fmtDT(totalEcartPositif)}`, sub: 'Surplus comptabilisé' },
    { label: 'Déficits / Manquants', val: `-${fmtDT(totalEcartNegatif)}`, sub: 'Pertes à justifier' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(x, kpiY, kpiW, 17, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(kpi.label.toUpperCase(), x + 3, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(88, 28, 135);
    doc.text(kpi.val, x + 3, kpiY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
    doc.text(kpi.sub, x + 3, kpiY + 15);
  });

  autoTable(doc, {
    startY: 55,
    head: [['Boutique', 'Caissier / Agent', 'Ouverture', 'Fermeture', 'Solde Initial', 'Théorique', 'Réel Compté', 'Écart', 'Statut']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [88, 28, 135],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 35 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw);
        if (val.startsWith('-')) {
          data.cell.styles.textColor = [225, 29, 72];
        } else if (val.startsWith('+')) {
          data.cell.styles.textColor = [16, 185, 129];
        }
      }
    }
  });

  drawOfficialFooters(doc, 'Audit & Clôtures des Caisses');
  doc.save(`Rapport_Caisses_UGS_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================================
// 5. RAPPORT LOGISTIQUE & FLUX DE MARCHANDISES (BONS DE LIVRAISON)
// ============================================================================
export function generateSuperAdminLogisticsReportPdf(
  bonsDeLivraison: BonDeLivraison[],
  projets: Projet[],
  periodeLabel: string,
  selectedProjectNom: string = 'Toutes les Boutiques'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  drawOfficialHeader(
    doc,
    'Rapport Logistique & Expéditions (BL)',
    'Traçabilité des Livraisons, Convois & Taux de Service Client',
    selectedProjectNom,
    periodeLabel,
    [14, 116, 144] // Cyan 800
  );

  const totalBL = bonsDeLivraison.length;
  const blLivres = bonsDeLivraison.filter(bl => bl.statut === 'Livré').length;
  const blEnCours = bonsDeLivraison.filter(bl => bl.statut === 'Expédié' || bl.statut === 'En préparation' || bl.statut === 'Livraison partielle').length;
  const totalMarchandiseTTC = bonsDeLivraison.reduce((s, bl) => s + (bl.montantTTC || 0), 0);

  const tableBody = bonsDeLivraison.map(bl => {
    const pNom = projets.find(p => p.id === bl.projetId)?.nom || 'Dépôt Central';
    const nbLignes = bl.lignes ? bl.lignes.length : 0;
    const totalQte = (bl.lignes || []).reduce((s, l) => s + (l.qteLivree || l.qteCommandee || 0), 0);

    return [
      bl.numero,
      bl.dateCreation,
      pNom,
      bl.clientNom,
      bl.adresseLivraison || '-',
      `${nbLignes} réf. (${totalQte} u.)`,
      bl.transporteur || 'Interne UGS',
      bl.chauffeur || bl.immatriculation || '-',
      fmtDT(bl.montantTTC),
      bl.statut.toUpperCase()
    ];
  });

  // KPI
  const kpiY = 34;
  const kpiW = (pageWidth - 28 - 9) / 4;
  const kpis = [
    { label: 'Bons de Livraison Émis', val: totalBL.toString(), sub: 'Période analysée' },
    { label: 'Expéditions Livrées avec Succès', val: blLivres.toString(), sub: `Taux : ${totalBL > 0 ? ((blLivres / totalBL) * 100).toFixed(0) : 0}%` },
    { label: 'En Transit / Préparation', val: blEnCours.toString(), sub: 'Flux actifs' },
    { label: 'Valeur Marchandise Expédiée', val: fmtDT(totalMarchandiseTTC), sub: 'Total TTC transporté' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(x, kpiY, kpiW, 17, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(kpi.label.toUpperCase(), x + 3, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(14, 116, 144);
    doc.text(kpi.val, x + 3, kpiY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
    doc.text(kpi.sub, x + 3, kpiY + 15);
  });

  autoTable(doc, {
    startY: 55,
    head: [['N° BL', 'Date', 'Origine Dépôt', 'Client Destinataire', 'Lieu Livraison', 'Colisage', 'Transporteur', 'Chauffeur / Véhicule', 'Montant TTC', 'Statut']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      3: { fontStyle: 'bold', cellWidth: 42 },
      8: { halign: 'right', fontStyle: 'bold' },
      9: { halign: 'center' }
    },
    foot: [[
      'TOTAL FLUX EXPÉDITIONS',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      fmtDT(totalMarchandiseTTC),
      `${totalBL} BL`
    ]],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [14, 116, 144],
      fontStyle: 'bold',
      fontSize: 7.5
    }
  });

  drawOfficialFooters(doc, 'Rapport Logistique & Expéditions (BL)');
  doc.save(`Rapport_Logistique_BL_UGS_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================================
// 6. RAPPORT CONSOLIDÉ DE GOUVERNANCE & AUDIT SÉCURITÉ
// ============================================================================
export function generateSuperAdminSecurityAuditPdf(
  users: Utilisateur[],
  projets: Projet[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  drawOfficialHeader(
    doc,
    'Audit Sécurité & Gouvernance',
    'Cartographie des Accès, Droits Utilisateurs & Affectations',
    'Total Réseau UGS',
    `Établi le ${new Date().toLocaleDateString('fr-FR')}`,
    [30, 41, 59]
  );

  const activeUsers = users.filter(u => (u.statut || 'Actif') === 'Actif').length;
  const superAdminCount = users.filter(u => u.role === 'super_admin').length;
  const caissierCount = users.filter(u => u.role === 'caissier').length;

  // KPI Row
  const kpiY = 34;
  const kpiW = (pageWidth - 28 - 9) / 4;
  const kpis = [
    { label: 'Utilisateurs Enregistrés', val: users.length.toString(), sub: `${activeUsers} comptes actifs` },
    { label: 'Super-Administrateurs', val: superAdminCount.toString(), sub: 'Droits absolus' },
    { label: 'Postes de Caisse / Magasin', val: caissierCount.toString(), sub: 'Accès restreints' },
    { label: 'Boutiques Raccordées', val: projets.length.toString(), sub: 'Points d\'exploitation' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(x, kpiY, kpiW, 17, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(kpi.label.toUpperCase(), x + 3, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(kpi.val, x + 3, kpiY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
    doc.text(kpi.sub, x + 3, kpiY + 15);
  });

  const tableBody = users.map(u => {
    const bNames = u.role === 'super_admin' 
      ? 'TOTAL RÉSEAU (TOUTES)' 
      : (u.projetsAffectes || [u.projetId]).map(pid => projets.find(p => p.id === pid)?.nom || pid).join(', ');

    const perms = [];
    if (u.permissions?.peutAccorderRemise) perms.push('Remise');
    if (u.permissions?.peutModifierPrix) perms.push('Prix');
    if (u.permissions?.peutSupprimerDocuments) perms.push('Suppr. Doc');
    if (u.permissions?.peutVoirMarge) perms.push('Voir Marges');
    if (u.permissions?.peutCloturerCaisse) perms.push('Clôture Caisse');

    return [
      u.nom,
      u.email,
      u.telephone || '-',
      u.role.toUpperCase(),
      bNames,
      perms.join(' • ') || 'Standard',
      u.statut || 'Actif',
      u.derniereConnexion || 'Jamais'
    ];
  });

  autoTable(doc, {
    startY: 55,
    head: [['Collaborateur', 'Identifiant / Email', 'Téléphone', 'Rôle', 'Boutiques Autorisées', 'Droits Spécifiques', 'Statut', 'Dernière Connexion']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 36 },
      3: { fontStyle: 'bold', cellWidth: 20 },
      4: { cellWidth: 30 },
      5: { cellWidth: 32 },
      6: { halign: 'center' },
      7: { halign: 'center' }
    }
  });

  drawOfficialFooters(doc, 'Audit Sécurité & Gouvernance');
  doc.save(`Audit_Gouvernance_Utilisateurs_UGS_${new Date().toISOString().split('T')[0]}.pdf`);
}
