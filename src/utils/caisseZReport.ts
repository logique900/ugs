import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SessionCaisse, Projet, Vente, Reglement, Utilisateur } from '../types';

export function generateZReportPdf({
  session,
  projet,
  caissier,
  ventesSession,
  reglementsSession,
  soldeFinalCalcule
}: {
  session: SessionCaisse;
  projet?: Projet | null;
  caissier: Utilisateur;
  ventesSession: Vente[];
  reglementsSession: Reglement[];
  soldeFinalCalcule: number;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [148, 210] }); // Format A5 professionnel

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 148, 28, 'F');
  doc.setFillColor(147, 51, 234); // Purple accent
  doc.rect(0, 28, 148, 1.5, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PROCÈS-VERBAL DE CLÔTURE DE CAISSE (TICKET Z)', 10, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('SOCIETE UNIVERS GSM DE SUD • M.F: 1532846 G/A/M/000', 10, 18);
  doc.text(`112, OMAR IBN KHATAB ZRIG, GABES S3 • Session N° ${session.id.slice(-8).toUpperCase()}`, 10, 24);

  // Logo text or image
  try {
    doc.addImage('/logo.png', 'PNG', 115, 4, 24, 20);
  } catch {
    // ignore
  }

  let y = 35;

  // Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, 128, 24, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('INFORMATIONS DE LA SESSION :', 14, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Boutique / Point de Vente : ${projet?.nom || 'Point de vente'} (${projet?.codeBoutique || 'BOUTIQUE'})`, 14, y + 12);
  doc.text(`Caissier(ère) : ${caissier.nom} (${caissier.email})`, 14, y + 17);
  doc.text(`Ouverture : ${new Date(session.dateOuverture).toLocaleString('fr-FR')}`, 14, y + 22);

  const dateFermetureStr = session.dateFermeture 
    ? new Date(session.dateFermeture).toLocaleString('fr-FR')
    : new Date().toLocaleString('fr-FR');
  doc.text(`Clôture : ${dateFermetureStr}`, 80, y + 22);

  y += 28;

  // Sales and payments breakdown
  const salesEspeces = ventesSession.filter(v => v.modePaiement === 'Espèces' || !v.modePaiement);
  const totalEspeces = salesEspeces.reduce((s, v) => s + (v.montantPaye ?? v.montantTTC ?? 0), 0);

  const salesCheques = ventesSession.filter(v => v.modePaiement === 'Chèque');
  const totalCheques = salesCheques.reduce((s, v) => s + (v.montantPaye ?? v.montantTTC ?? 0), 0);

  const salesAutres = ventesSession.filter(v => v.modePaiement !== 'Espèces' && v.modePaiement !== 'Chèque' && v.modePaiement);
  const totalAutres = salesAutres.reduce((s, v) => s + (v.montantPaye ?? v.montantTTC ?? 0), 0);

  const totalVentes = ventesSession.reduce((s, v) => s + (v.montantPaye ?? v.montantTTC ?? 0), 0);

  // Miscellaneous cash movements
  const listManualCash = reglementsSession.filter(r => 
    r.modePaiement === 'Espèces' && !r.documentRef?.startsWith('FAC-') && !r.documentRef?.startsWith('DEV-')
  );
  const manualEntrees = listManualCash.filter(r => r.type === 'Encaissement').reduce((s, r) => s + r.montant, 0);
  const manualSorties = listManualCash.filter(r => r.type === 'Décaissement').reduce((s, r) => s + r.montant, 0);

  const rows = [
    ['Fond de caisse initial (Ouverture)', '1', `${session.soldeInitial.toFixed(3)} DT`],
    ['(+) Encaissements Ventes en Espèces', `${salesEspeces.length}`, `+ ${totalEspeces.toFixed(3)} DT`],
    ['(+) Entrées de caisse manuelles diverses', `${listManualCash.filter(r => r.type === 'Encaissement').length}`, `+ ${manualEntrees.toFixed(3)} DT`],
    ['(-) Décaissements / Dépenses espèces', `${listManualCash.filter(r => r.type === 'Décaissement').length}`, `- ${manualSorties.toFixed(3)} DT`],
    ['MONTANT FINAL TIROIR-CAISSE (ESPÈCES)', '-', `${soldeFinalCalcule.toFixed(3)} DT`],
    ['Ventes par Chèque (hors tiroir-caisse)', `${salesCheques.length}`, `${totalCheques.toFixed(3)} DT`],
    ['Ventes Cartes / Virements / Autres', `${salesAutres.length}`, `${totalAutres.toFixed(3)} DT`],
    ['CHIFFRE D\'AFFAIRES TOTAL DE LA SESSION', `${ventesSession.length} ventes`, `${totalVentes.toFixed(3)} DT`]
  ];

  autoTable(doc, {
    startY: y,
    head: [['Désignation / Flux Financier', 'Opérations', 'Montant (DT)']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 78 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [243, 232, 255]; // Purple light
        data.cell.styles.textColor = [107, 33, 168];
        data.cell.styles.fontStyle = 'bold';
      } else if (data.row.index === 7) {
        data.cell.styles.fillColor = [236, 253, 245]; // Emerald light
        data.cell.styles.textColor = [6, 95, 70];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // @ts-ignore
  const nextY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 60;

  // Certified Block
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(10, nextY, 128, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text('CERTIFICATION DE CLÔTURE AUTOMATIQUE :', 14, nextY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(21, 128, 61);
  doc.text('Le montant final en caisse a été calculé et certifié automatiquement par le système.', 14, nextY + 10);

  // Signatures box
  const sigY = nextY + 18;
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, sigY, 60, 24, 2, 2);
  doc.roundedRect(78, sigY, 60, 24, 2, 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Signature du Caissier', 14, sigY + 5);
  doc.text('Visa de la Direction / Gérance', 82, sigY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Nom : ${caissier.nom}`, 14, sigY + 20);
  doc.text('Société Univers GSM de Sud', 82, sigY + 20);

  // Footers
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Document généré le ${new Date().toLocaleString('fr-FR')} • Système ERP Management UGS`, 10, 205);
  doc.text('Page 1/1', 138, 205, { align: 'right' });

  const fileName = `Cloture_Caisse_Z_${session.id.slice(-6)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
