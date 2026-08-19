import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateFunctionalRequirementsPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [180, 20, 30]; // Crimson/red accent (#B4141E)
  const darkTextColor = [30, 41, 59]; // Slate 800
  const lightGrayColor = [241, 245, 249]; // Slate 100
  const headerGray = [71, 85, 105]; // Slate 600

  // Header Banner Page 1
  doc.setFillColor(153, 27, 27); // Dark red header
  doc.rect(0, 0, 210, 38, 'F');

  // Title in Banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('UGS DISTRIBUTION - SYSTÈME CENTRAL ERP', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Cahier des Charges & Spécifications des Besoins Fonctionnels', 14, 25);

  doc.setFontSize(8);
  doc.text(`Document généré le : ${new Date().toLocaleDateString('fr-FR')} | Version 2.4 - Validation Complète`, 14, 32);

  let currentY = 46;

  // Introduction Section
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. PRÉSENTATION ET ARCHITECTURE DU SYSTÈME', 14, currentY);
  
  currentY += 2;
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.6);
  doc.line(14, currentY, 196, currentY);

  currentY += 6;
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  const introText = [
    "Le système ERP UGS Distribution est conçu selon un modèle d'architecture centralisée garantissant",
    "une isolation absolue et stricte entre les différents espaces de travail (projets d'entreprise).",
    "Chaque projet dispose d'une étanchéité complète de ses données, de son stock, de sa gestion financière",
    "et de ses tiers (clients et fournisseurs), sous le contrôle d'un Portail d'Administration Central."
  ];
  introText.forEach(line => {
    doc.text(line, 14, currentY);
    currentY += 5;
  });

  currentY += 4;

  // Table of Principles
  autoTable(doc, {
    startY: currentY,
    head: [['Axe Fonctionnel', 'Règle de Gestion & Principe Opérationnel']],
    body: [
      ['Isolation des Projets', 'Chaque projet constitue une instance fonctionnelle étanche. Aucune donnée d\'un Projet A n\'apparaît dans le Projet B.'],
      ['Portail Central', 'Permet à l\'administrateur de suivre la santé globale, le chiffre d\'affaires consolidé et de basculer d\'un projet à un autre.'],
      ['Context Switching', 'Basculement instantané qui réinitialise complètement le contexte métier et charge exclusivement les données du projet ciblé.'],
      ['Accès & Rôles', 'Gestion granulaire des permissions (Administrateur Central vs Responsable de Projet dédié).']
    ],
    theme: 'grid',
    headStyles: { fillColor: [180, 20, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 137 } }
  });

  // @ts-ignore
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Functional Requirements Detail Section
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('2. EXIGENCES ET BESOINS FONCTIONNELS DÉTAILLÉS', 14, currentY);

  currentY += 2;
  doc.setDrawColor(220, 38, 38);
  doc.line(14, currentY, 196, currentY);
  currentY += 6;

  const functionalModules = [
    [
      'MOD-01',
      'Tableau de Bord & Métriques',
      'Calcul en temps réel du Chiffre d\'Affaires, Achats cumulés, Marge Nette et Solde de Caisse. Graphiques interactifs d\'évolution mensuelle et fil d\'actualité des opérations du projet actif.'
    ],
    [
      'MOD-02',
      'Gestion des Articles & Catalogues',
      'Répertoire structuré des articles avec codification unique, désignation, famille, prix d\'achat HT, prix de vente HT, calcul automatique des marges et filtrage multicritère.'
    ],
    [
      'MOD-03',
      'Gestion des Stocks & Mouvements',
      'Suivi en temps réel des quantités théoriques en réserve, historique traçable des mouvements (entrées/sorties/ajustements) et alertes automatiques sur seuils de réapprovisionnement.'
    ],
    [
      'MOD-04',
      'Gestion des Clients (Tiers)',
      'Carnet d\'adresses dédié par projet. Enregistrement des coordonnées (email, téléphone, adresse), suivi du chiffre d\'affaires par client et traçabilité des factures associées.'
    ],
    [
      'MOD-05',
      'Gestion des Fournisseurs',
      'Base de données des partenaires d\'approvisionnement par espace projet. Historique des commandes d\'achat et des encours fournisseurs.'
    ],
    [
      'MOD-06',
      'Ventes & Facturation',
      'Émission, modification et suivi des Devis, Bons de Livraison et Factures. Calcul automatique du montant HT, TVA et TTC avec gestion des statuts de paiement (Payée, En attente, Devis).'
    ],
    [
      'MOD-07',
      'Achats & Approvisionnements',
      'Saisie et validation des bons de commande d\'achat et factures fournisseurs. Comptabilisation des charges d\'approvisionnement directes au niveau du projet.'
    ],
    [
      'MOD-08',
      'Caisse & Mouvements Financiers',
      'Journal de caisse chronologique comptabilisant les encaissements (ventes encaissées) et décaissements (achats réglés). Solde net calculé automatiquement.'
    ],
    [
      'MOD-09',
      'Rapports & Statistiques',
      'Génération de rapports financiers consolidés ou par projet, export des bilans d\'activité et analyse comparative de rentabilité.'
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Réf', 'Module Fonctionnel', 'Description des Spécifications et Fonctionnalités Clés']],
    body: functionalModules,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' }, 1: { cellWidth: 45, fontStyle: 'bold' }, 2: { cellWidth: 117 } }
  });

  // Page 2 - Architecture Rules & Security Matrix
  doc.addPage();

  // Page 2 Header Banner
  doc.setFillColor(153, 27, 27);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('UGS DISTRIBUTION ERP - RÈGLES D\'ISOLATION ET DE SÉCURITÉ (SUITE)', 14, 13);

  currentY = 30;

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('3. MATRICE DE CONFIDENTIALITÉ ET RÈGLES STRICTES D\'ISOLATION', 14, currentY);

  currentY += 2;
  doc.setDrawColor(220, 38, 38);
  doc.line(14, currentY, 196, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    head: [['Entité de Données', 'Règle d\'Isolation Projet A vs Projet B', 'Niveau de Sécurité']],
    body: [
      ['Articles & Produits', 'Isolés. Les références créées dans le Projet A ne sont pas visibles dans le Projet B.', 'Strict / Étanche'],
      ['Clients & Tiers', 'Isolés. Les carnets d\'adresses clients sont attribués exclusivement au projet d\'origine.', 'Strict / Étanche'],
      ['Fournisseurs', 'Isolés. Les accords et partenaires fournisseurs restent spécifiques à chaque espace.', 'Strict / Étanche'],
      ['Commandes & Factures', 'Isolées. La numérotation, les montants et les états sont strictement cloisonnés.', 'Strict / Étanche'],
      ['Mouvements de Caisse', 'Isolés. Les flux financiers d\'encaissement/décaissement restent internes au projet.', 'Strict / Étanche'],
      ['Statistiques & CA', 'Calculés uniquement sur le sous-ensemble de données du projet sélectionné.', 'Dynamique / Cloisonné']
    ],
    theme: 'grid',
    headStyles: { fillColor: [180, 20, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 100 }, 2: { cellWidth: 37, fontStyle: 'bold' } }
  });

  // @ts-ignore
  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Validation / Sign-off Block
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, 182, 45, 3, 3, 'FD');

  doc.setTextColor(153, 27, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VALIDATION ET CAPACITÉS SYSTÈME (SIGNATURES)', 20, currentY + 8);

  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Ce document atteste que l\'application ERP respecte l\'intégralité des spécifications requises.', 20, currentY + 15);
  doc.text('Chaque projet fonctionne de manière complètement indépendante avec zéro fuite de données inter-projets.', 20, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Direction Générale UGS Distribution :', 20, currentY + 32);
  doc.text('Chef de Projet Informatique & ERP :', 110, currentY + 32);

  doc.setFont('helvetica', 'italic');
  doc.text('Approuvé & Validé - [Signé électronique]', 20, currentY + 38);
  doc.text('Conforme aux spécifications - [Validé]', 110, currentY + 38);

  // Footer on both pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`UGS Distribution ERP - Cahier des Besoins Fonctionnels | Page ${i} sur ${pageCount}`, 14, 287);
    doc.text('Document Officiel Référentiel', 160, 287);
  }

  // Save the generated PDF file
  doc.save('Besoins_Fonctionnels_UGS_Distribution_ERP.pdf');
}
