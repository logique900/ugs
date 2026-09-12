import React, { useState, useMemo } from 'react';
import {  Client, Projet, Vente, Reglement , Utilisateur } from '../types';
import { mockVentes, mockReglements } from '../data';
import { generateReceiptPdf, generateCreditAgreementPdf } from '../utils/pdfExportEngine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClientsProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  clients: Client[];
  onClientsChange: (clients: Client[]) => void;
  projets: Projet[];
  ventes?: Vente[];
  onVentesChange?: (ventes: Vente[]) => void;
  reglements?: Reglement[];
  onReglementsChange?: (reglements: Reglement[]) => void;
  onTabChange?: (tab: any) => void;
}

export function Clients({ currentUser, 
  selectedProjectId, 
  clients, 
  onClientsChange, 
  projets,
  ventes = mockVentes,
  onVentesChange,
  reglements = mockReglements,
  onReglementsChange,
  onTabChange
}: ClientsProps) {
  const isGlobal = selectedProjectId === 'all';
  const currentProject = isGlobal ? null : projets.find(p => p.id === selectedProjectId);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterCategorie, setFilterCategorie] = useState<string>('all');
  const [filterSolde, setFilterSolde] = useState<string>('all');
  const [filterProjectLocal, setFilterProjectLocal] = useState<string>(selectedProjectId);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'nom' | 'ca' | 'solde' | 'score'>('nom');

  // Modals & Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // --- BOUTON DE PAIEMENT MODAL STATE ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentClientId, setPaymentClientId] = useState<string>('');
  const [paymentVenteId, setPaymentVenteId] = useState<string>('global');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Virement');
  const [paymentBank, setPaymentBank] = useState<string>('BIAT');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(true);

  // --- BOUTON DE CRÉDIT MODAL STATE ---
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditClientId, setCreditClientId] = useState<string>('');
  const [creditVenteId, setCreditVenteId] = useState<string>('global');
  const [creditDownPayment, setCreditDownPayment] = useState<number>(0);
  const [creditInstallmentsCount, setCreditInstallmentsCount] = useState<number>(3);
  const [creditInterval, setCreditInterval] = useState<'monthly' | 'biweekly' | 'quarterly'>('monthly');
  const [creditFirstDate, setCreditFirstDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newCreditLimit, setNewCreditLimit] = useState<number>(25000);
  const [newPaymentDelay, setNewPaymentDelay] = useState<number>(30);

  // Client Form State
  const initialFormState: Partial<Client> = {
    nom: '',
    code: '',
    typeTier: 'Entreprise',
    matriculeFiscal: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: 'Tunis',
    pays: 'Tunisie',
    contactNom: '',
    contactPoste: '',
    contactTel: '',
    statut: 'Actif',
    categorie: 'PME',
    plafondCredit: 20000,
    delaiPaiement: 30,
    soldeInitial: 0,
    banque: '',
    rib: '',
    scoreSolvabilite: 85,
    notes: '',
    projetId: isGlobal ? (projets[0]?.id || '1') : selectedProjectId
  };

  const [formData, setFormData] = useState<Partial<Client>>(initialFormState);

  // Helper to calculate financial metrics per client
  const getClientFinancials = (clientId: string) => {
    const clientVentes = (ventes || mockVentes).filter(v => v.clientId === clientId && v.statut !== 'Devis' && v.statut !== 'Annulée');
    const totalFacture = clientVentes.reduce((acc, v) => acc + v.montantTTC, 0);
    const totalPaye = clientVentes.reduce((acc, v) => {
      const paye = v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0);
      return acc + paye;
    }, 0);
    const soldeDu = Math.max(0, totalFacture - totalPaye);
    const facturesCount = clientVentes.length;
    const facturesEnAttente = clientVentes.filter(v => {
      const paye = v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0);
      return paye < v.montantTTC;
    }).length;

    return { totalFacture, totalPaye, soldeDu, facturesCount, facturesEnAttente, clientVentes };
  };

  // Base list filtered by project
  const clientsBase = useMemo(() => {
    if (isGlobal) {
      if (filterProjectLocal !== 'all') {
        return clients.filter(c => c.projetId === filterProjectLocal);
      }
      return clients;
    }
    return clients.filter(c => c.projetId === selectedProjectId);
  }, [clients, isGlobal, selectedProjectId, filterProjectLocal]);

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    return clientsBase.filter(client => {
      const { soldeDu } = getClientFinancials(client.id);

      // Search
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        client.nom.toLowerCase().includes(searchLower) ||
        (client.code && client.code.toLowerCase().includes(searchLower)) ||
        client.email.toLowerCase().includes(searchLower) ||
        client.telephone.toLowerCase().includes(searchLower) ||
        (client.matriculeFiscal && client.matriculeFiscal.toLowerCase().includes(searchLower)) ||
        (client.ville && client.ville.toLowerCase().includes(searchLower));

      // Filters
      const matchType = filterType === 'all' || client.typeTier === filterType;
      const matchStatut = filterStatut === 'all' || client.statut === filterStatut;
      const matchCategorie = filterCategorie === 'all' || client.categorie === filterCategorie;
      
      let matchSolde = true;
      if (filterSolde === 'avec_solde') matchSolde = soldeDu > 0;
      if (filterSolde === 'solde') matchSolde = soldeDu === 0;
      if (filterSolde === 'depassement') matchSolde = client.plafondCredit ? soldeDu > client.plafondCredit : false;

      return matchSearch && matchType && matchStatut && matchCategorie && matchSolde;
    }).sort((a, b) => {
      const finA = getClientFinancials(a.id);
      const finB = getClientFinancials(b.id);

      if (sortBy === 'nom') return a.nom.localeCompare(b.nom);
      if (sortBy === 'ca') return finB.totalFacture - finA.totalFacture;
      if (sortBy === 'solde') return finB.soldeDu - finA.soldeDu;
      if (sortBy === 'score') return (b.scoreSolvabilite || 0) - (a.scoreSolvabilite || 0);
      return 0;
    });
  }, [clientsBase, searchTerm, filterType, filterStatut, filterCategorie, filterSolde, sortBy]);

  // Global KPIs for the top summary cards
  const kpis = useMemo(() => {
    let totalCA = 0;
    let totalEncours = 0;
    let totalPlafond = 0;
    let countEntreprises = 0;
    let countParticuliers = 0;
    let countAlertes = 0;

    clientsBase.forEach(client => {
      const fin = getClientFinancials(client.id);
      totalCA += fin.totalFacture;
      totalEncours += fin.soldeDu;
      totalPlafond += client.plafondCredit || 0;
      if (client.typeTier === 'Particulier') countParticuliers++;
      else countEntreprises++;

      if (client.statut === 'Bloqué' || client.statut === 'Contentieux' || (client.plafondCredit && fin.soldeDu > client.plafondCredit)) {
        countAlertes++;
      }
    });

    const tauxUtilisationPlafond = totalPlafond > 0 ? Math.round((totalEncours / totalPlafond) * 100) : 0;

    return {
      totalClients: clientsBase.length,
      countEntreprises,
      countParticuliers,
      totalCA,
      totalEncours,
      totalPlafond,
      tauxUtilisationPlafond,
      countAlertes
    };
  }, [clientsBase]);

  // Open Form for Create
  const handleOpenCreateModal = () => {
    setEditingClient(null);
    const nextNum = clients.length + 1;
    const generatedCode = `CLI-${String(nextNum).padStart(3, '0')}`;
    setFormData({
      ...initialFormState,
      code: generatedCode,
      projetId: isGlobal ? (projets[0]?.id || '1') : selectedProjectId
    });
    setIsFormModalOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({ ...client });
    setIsFormModalOpen(true);
  };

  // Save Client (Create or Update)
  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom) return;

    if (editingClient) {
      // Update
      const updatedList = clients.map(c => 
        c.id === editingClient.id ? ({ ...c, ...formData } as Client) : c
      );
      onClientsChange(updatedList);
    } else {
      // Create
      const newClient: Client = {
        id: String(Date.now()),
        nom: formData.nom || 'Nouveau Client',
        code: formData.code || `CLI-${String(clients.length + 1).padStart(3, '0')}`,
        typeTier: formData.typeTier || 'Entreprise',
        matriculeFiscal: formData.matriculeFiscal || '',
        email: formData.email || '',
        telephone: formData.telephone || '',
        adresse: formData.adresse || '',
        ville: formData.ville || 'Tunis',
        pays: formData.pays || 'Tunisie',
        contactNom: formData.contactNom || '',
        contactPoste: formData.contactPoste || '',
        contactTel: formData.contactTel || '',
        statut: formData.statut || 'Actif',
        categorie: formData.categorie || 'PME',
        plafondCredit: Number(formData.plafondCredit) || 0,
        delaiPaiement: Number(formData.delaiPaiement) || 30,
        soldeInitial: Number(formData.soldeInitial) || 0,
        banque: formData.banque || '',
        rib: formData.rib || '',
        notes: formData.notes || '',
        scoreSolvabilite: Number(formData.scoreSolvabilite) || 80,
        projetId: formData.projetId || (isGlobal ? '1' : selectedProjectId)
      };
      onClientsChange([newClient, ...clients]);
    }

    setIsFormModalOpen(false);
    setEditingClient(null);
  };

  // Delete Client
  const handleDeleteClient = (id: string) => {
    onClientsChange(clients.filter(c => c.id !== id));
    setDeleteConfirmationId(null);
    if (selectedClientDetail?.id === id) {
      setSelectedClientDetail(null);
    }
  };

  // Smart AI Credit Preset Generator
  const applyAiCreditPreset = (categorie: string, typeTier: string) => {
    if (typeTier === 'Particulier') {
      setFormData(prev => ({
        ...prev,
        typeTier: 'Particulier',
        categorie: 'Particulier',
        delaiPaiement: 0,
        plafondCredit: 10000,
        scoreSolvabilite: 90
      }));
    } else if (categorie === 'Grand Compte') {
      setFormData(prev => ({
        ...prev,
        delaiPaiement: 60,
        plafondCredit: 60000,
        scoreSolvabilite: 95
      }));
    } else if (categorie === 'Marché Public') {
      setFormData(prev => ({
        ...prev,
        delaiPaiement: 90,
        plafondCredit: 100000,
        scoreSolvabilite: 80
      }));
    } else {
      // PME standard
      setFormData(prev => ({
        ...prev,
        delaiPaiement: 30,
        plafondCredit: 25000,
        scoreSolvabilite: 85
      }));
    }
  };

  // Export Complete Clients List as PDF
  const handleExportClientsPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Header styling
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 32, 'F');
    doc.setFillColor(225, 29, 72); // Accent line
    doc.rect(0, 32, 210, 1.5, 'F');
    
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("RÉPERTOIRE & BALANCE DES TIERS CLIENTS", 14, 13);
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    const scopeLabel = isGlobal ? 'Tous les Projets (Consolidé)' : currentProject?.nom || 'Projet Actif';
    doc.text(`ERP Management Distribution • Périmètre : ${scopeLabel} • Édité le ${new Date().toLocaleDateString('fr-FR')}`, 14, 21);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 38, 182, 14, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Nombre de clients : ${filteredClients.length}`, 18, 47);
    doc.text(`Chiffre d'Affaires Global : ${kpis.totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`, 65, 47);
    doc.text(`Créances Totales : ${kpis.totalEncours.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`, 135, 47);

    // Table
    autoTable(doc, {
      startY: 57,
      head: [['Code', 'Raison Sociale / Nom', 'Type', 'Téléphone', 'Ville', 'CA Réalisé', 'Solde Dû', 'Statut']],
      body: filteredClients.map(c => {
        const fin = getClientFinancials(c.id);
        return [
          c.code || `CLI-${c.id}`,
          c.nom,
          c.typeTier || 'Entreprise',
          c.telephone,
          c.ville || '-',
          `${fin.totalFacture.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`,
          `${fin.soldeDu.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`,
          c.statut || 'Actif'
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [180, 20, 30], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { cellWidth: 48 },
        2: { cellWidth: 22 },
        3: { halign: 'center', cellWidth: 24 },
        4: { cellWidth: 18 },
        5: { halign: 'right', cellWidth: 22 },
        6: { halign: 'right', cellWidth: 22 },
        7: { halign: 'center', cellWidth: 16 }
      },
      foot: [[
        'TOTAL CONSOLIDÉ', '', '', '', '',
        `${kpis.totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`,
        `${kpis.totalEncours.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`,
        ''
      ]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
    });

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 285, 196, 285);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`ERP Management DISTRIBUTION ERP • Répertoire Général des Tiers Clients`, 14, 290);
      doc.text(`Page ${i} / ${totalPages}`, 196, 290, { align: 'right' });
    }

    doc.save(`Repertoire_Clients_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export Statement of Account (Relevé Individuel Client)
  const handleExportStatementPdf = (client: Client) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fin = getClientFinancials(client.id);

    // Header styling
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setFillColor(225, 29, 72);
    doc.rect(0, 32, 210, 1.5, 'F');
    
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("RELEVÉ DE COMPTE & SITUATION CLIENT", 14, 13);
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Document Comptable Officiel • Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, 14, 21);
    doc.text(`Projet rattaché : ${projets.find(p => p.id === client.projetId)?.nom || 'Projet Principal'}`, 14, 26);

    // Client Info Box (Left) & Account Balance (Right)
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 38, 100, 42, 2.5, 2.5, 'FD');
    
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(client.nom, 18, 46);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Code Client : ${client.code || 'CLI-' + client.id}`, 18, 52);
    doc.text(`Matricule Fiscal / CIN : ${client.matriculeFiscal || 'Non renseigné'}`, 18, 58);
    doc.text(`Adresse : ${client.adresse || '-'}, ${client.ville || ''}`, 18, 64);
    doc.text(`Contact : ${client.contactNom || client.email} (${client.telephone})`, 18, 70);

    // Financial Recap Box (Right)
    doc.roundedRect(120, 38, 76, 42, 2.5, 2.5, 'FD');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("Synthèse des Engagements", 124, 46);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Facturé TTC :`, 124, 54);
    doc.text(`${fin.totalFacture.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`, 190, 54, { align: 'right' });
    doc.text(`Total Règlements Reçus :`, 124, 60);
    doc.text(`${fin.totalPaye.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`, 190, 60, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(fin.soldeDu > 0 ? 185 : 5, fin.soldeDu > 0 ? 28 : 150, fin.soldeDu > 0 ? 28 : 105);
    doc.text(`SOLDE NET RESTANT DÛ :`, 124, 72);
    doc.text(`${fin.soldeDu.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`, 190, 72, { align: 'right' });

    // Invoices list table
    autoTable(doc, {
      startY: 86,
      head: [['N° Pièce / Facture', 'Date', 'Statut', 'Montant HT', 'Montant TTC', 'Reste à Payer']],
      body: fin.clientVentes.length > 0 ? fin.clientVentes.map(v => [
        v.numero,
        new Date(v.date).toLocaleDateString('fr-FR'),
        v.statut,
        `${v.montantHT.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`,
        `${v.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`,
        v.statut === 'Payée' ? '0,000 DT' : `${v.montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`
      ]) : [['Aucune transaction enregistrée', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [180, 20, 30], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 32 },
        1: { halign: 'center', cellWidth: 26 },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'right', cellWidth: 32 },
        4: { halign: 'right', cellWidth: 34 },
        5: { halign: 'right', cellWidth: 34 }
      },
      foot: [[
        'TOTAL GÉNÉRAL', '', '',
        `${fin.clientVentes.reduce((a, v) => a + v.montantHT, 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`,
        `${fin.totalFacture.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`,
        `${fin.soldeDu.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`
      ]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
    });

    // Payment terms & Stamp notes
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Conditions de règlement accordées : ${client.delaiPaiement || 30} jours net • Plafond de crédit : ${(client.plafondCredit || 0).toLocaleString('fr-FR')} DT`, 14, finalY);
    if (client.banque && client.rib) {
      doc.text(`Domiciliation bancaire : ${client.banque} - RIB : ${client.rib}`, 14, finalY + 5);
    }
    doc.text("Document certifié conforme pour valoir ce que de droit.", 14, finalY + 10);

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 285, 196, 285);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`ERP Management DISTRIBUTION ERP • Relevé d'Engagements Client - ${client.nom}`, 14, 290);
      doc.text(`Page ${i} / ${totalPages}`, 196, 290, { align: 'right' });
    }

    doc.save(`Releve_Compte_${client.nom.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Code', 'Nom', 'Type', 'Matricule Fiscal', 'Email', 'Téléphone', 'Ville', 'Statut', 'Plafond Crédit', 'CA Facturé', 'Solde Dû'];
    const rows = filteredClients.map(c => {
      const fin = getClientFinancials(c.id);
      return [
        `"${c.code || ''}"`,
        `"${c.nom}"`,
        `"${c.typeTier || 'Entreprise'}"`,
        `"${c.matriculeFiscal || ''}"`,
        `"${c.email}"`,
        `"${c.telephone}"`,
        `"${c.ville || ''}"`,
        `"${c.statut || 'Actif'}"`,
        c.plafondCredit || 0,
        fin.totalFacture,
        fin.soldeDu
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- BOUTON DE PAIEMENT HANDLERS ---
  const handleOpenPaymentModal = (client?: Client, venteId?: string) => {
    const targetClient = client || filteredClients.find(c => getClientFinancials(c.id).soldeDu > 0) || filteredClients[0];
    if (!targetClient) return;

    setPaymentClientId(targetClient.id);
    const fin = getClientFinancials(targetClient.id);
    const targetVente = venteId ? fin.clientVentes.find(v => v.id === venteId) : fin.clientVentes.find(v => {
      const paye = v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0);
      return paye < v.montantTTC;
    });

    if (targetVente) {
      setPaymentVenteId(targetVente.id);
      const paye = targetVente.montantPaye ?? (targetVente.statut === 'Payée' ? targetVente.montantTTC : 0);
      setPaymentAmount(Math.max(0, targetVente.montantTTC - paye));
      setPaymentRef(`FAC-${targetVente.numero}`);
      setPaymentNotes(`Règlement pour facture ${targetVente.numero} (${targetClient.nom})`);
    } else {
      setPaymentVenteId('global');
      setPaymentAmount(fin.soldeDu > 0 ? fin.soldeDu : 1000);
      setPaymentRef(`REG-${Date.now().toString().slice(-4)}`);
      setPaymentNotes(`Règlement acompte / solde client ${targetClient.nom}`);
    }

    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentClientId || paymentAmount <= 0) return;

    const targetClient = clients.find(c => c.id === paymentClientId);
    if (!targetClient) return;

    const newReg: Reglement = {
      id: `reg-${Date.now()}`,
      projetId: targetClient.projetId || selectedProjectId,
      numeroPiece: `ENC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      type: 'Encaissement',
      tierId: targetClient.id,
      tierNom: targetClient.nom,
      tierType: 'Client',
      documentRef: paymentVenteId !== 'global' ? paymentVenteId : undefined,
      date: new Date().toISOString().split('T')[0],
      montant: paymentAmount,
      modePaiement: paymentMode,
      banque: paymentBank,
      referencePaiement: paymentRef,
      notes: paymentNotes,
      statut: 'Validé'
    };

    // Update Ventes if linked
    if (onVentesChange && paymentVenteId !== 'global') {
      const updatedVentes = (ventes || mockVentes).map(v => {
        if (v.id === paymentVenteId) {
          const currentPaid = v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0);
          const newPaid = currentPaid + paymentAmount;
          return {
            ...v,
            montantPaye: newPaid,
            statut: newPaid >= v.montantTTC ? ('Payée' as const) : ('Facture' as const)
          };
        }
        return v;
      });
      onVentesChange(updatedVentes);
    }

    if (onReglementsChange) {
      onReglementsChange([newReg, ...(reglements || mockReglements)]);
    }

    if (autoPrintReceipt) {
      generateReceiptPdf(newReg, currentProject);
    }

    setIsPaymentModalOpen(false);
  };

  // --- BOUTON DE CRÉDIT HANDLERS ---
  const handleOpenCreditModal = (client?: Client, venteId?: string) => {
    const targetClient = client || filteredClients[0];
    if (!targetClient) return;

    setCreditClientId(targetClient.id);
    setNewCreditLimit(targetClient.plafondCredit || 25000);
    setNewPaymentDelay(targetClient.delaiPaiement || 30);

    const fin = getClientFinancials(targetClient.id);
    const targetVente = venteId ? fin.clientVentes.find(v => v.id === venteId) : fin.clientVentes[0];

    if (targetVente) {
      setCreditVenteId(targetVente.id);
      setCreditDownPayment(targetVente.montantPaye || 0);
    } else {
      setCreditVenteId('global');
      setCreditDownPayment(0);
    }

    setCreditInstallmentsCount(3);
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setCreditFirstDate(due.toISOString().split('T')[0]);

    setIsCreditModalOpen(true);
  };

  // Calculated installments schedule
  const calculatedCreditSchedule = useMemo(() => {
    if (!creditClientId) return [];
    const client = clients.find(c => c.id === creditClientId);
    if (!client) return [];

    let totalMontant = 0;
    if (creditVenteId !== 'global') {
      const vente = (ventes || mockVentes).find(v => v.id === creditVenteId);
      totalMontant = vente ? vente.montantTTC : 0;
    } else {
      const fin = getClientFinancials(client.id);
      totalMontant = fin.soldeDu > 0 ? fin.soldeDu : (client.plafondCredit || 20000);
    }

    const solde = Math.max(0, totalMontant - creditDownPayment);
    const count = Math.max(1, creditInstallmentsCount);
    const amountPerInstallment = solde / count;

    const schedule = [];
    const baseDate = new Date(creditFirstDate || new Date().toISOString().split('T')[0]);

    for (let i = 1; i <= count; i++) {
      const date = new Date(baseDate);
      if (creditInterval === 'monthly') {
        date.setMonth(date.getMonth() + (i - 1));
      } else if (creditInterval === 'biweekly') {
        date.setDate(date.getDate() + (i - 1) * 14);
      } else if (creditInterval === 'quarterly') {
        date.setMonth(date.getMonth() + (i - 1) * 3);
      }

      schedule.push({
        numero: i,
        date: date.toISOString().split('T')[0],
        montant: amountPerInstallment
      });
    }

    return schedule;
  }, [creditClientId, creditVenteId, creditDownPayment, creditInstallmentsCount, creditInterval, creditFirstDate, clients, ventes]);

  // Save Credit modifications & generate Agreement
  const handleConfirmCredit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === creditClientId);
    if (!client) return;

    // Update client credit limits
    const updatedClients = clients.map(c => {
      if (c.id === client.id) {
        return {
          ...c,
          plafondCredit: newCreditLimit,
          delaiPaiement: newPaymentDelay
        };
      }
      return c;
    });
    onClientsChange(updatedClients);

    let totalMontant = 0;
    let docRef = `CRD-${client.code || client.id}`;
    if (creditVenteId !== 'global') {
      const vente = (ventes || mockVentes).find(v => v.id === creditVenteId);
      totalMontant = vente ? vente.montantTTC : 0;
      if (vente) docRef = `FAC-${vente.numero}`;
    } else {
      const fin = getClientFinancials(client.id);
      totalMontant = fin.soldeDu > 0 ? fin.soldeDu : newCreditLimit;
    }

    generateCreditAgreementPdf(
      { ...client, plafondCredit: newCreditLimit, delaiPaiement: newPaymentDelay },
      totalMontant,
      creditDownPayment,
      calculatedCreditSchedule,
      currentProject,
      docRef
    );

    setIsCreditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display-md text-display-md text-on-surface">
              {selectedProjectId === '2' ? 'Parents & Élèves' : 'Clients & Tiers'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              {filteredClients.length} {selectedProjectId === '2' ? 'comptes' : 'tiers'}
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {isGlobal 
              ? "Supervision complète du portefeuille clients, encours et gestion des risques de crédit."
              : selectedProjectId === '2'
                ? `Liste des parents et élèves de la boutique ${currentProject?.nom || ''}.`
                : `Gestion commerciale et suivi des clients du projet ${currentProject?.nom || ''}.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportClientsPdf}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-xl text-sm font-medium transition-colors shadow-xs"
            title="Exporter la balance et le répertoire complet en PDF"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">picture_as_pdf</span>
            <span>Balance PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-xl text-sm font-medium transition-colors shadow-xs"
            title="Exporter la liste sous format CSV / Excel"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">download</span>
            <span>Export CSV</span>
          </button>

          {currentUser.role === 'comptable' ? (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold">
              <span className="material-symbols-outlined text-[18px] text-indigo-600">verified</span>
              <span>Mode Consultation & Contrôle Financier</span>
            </div>
          ) : (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              <span>Nouveau Client</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Portefeuille */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Portefeuille Clients</span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-on-surface">{kpis.totalClients}</p>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
              <span className="font-medium text-emerald-600">{kpis.countEntreprises} B2B</span>
              <span>•</span>
              <span className="font-medium text-blue-600">{kpis.countParticuliers} B2C</span>
            </div>
          </div>
        </div>

        {/* Card 2: CA Facturé */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">CA Facturé Cumulé</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">trending_up</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-on-surface">{kpis.totalCA.toLocaleString('fr-FR')} <span className="text-xs font-medium text-on-surface-variant">DT</span></p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Total TTC facturé au portefeuille</p>
          </div>
        </div>

        {/* Card 3: Encours & Créances */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Créances & En-cours</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpis.totalEncours > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-bold ${kpis.totalEncours > 0 ? 'text-amber-600' : 'text-on-surface'}`}>
              {kpis.totalEncours.toLocaleString('fr-FR')} <span className="text-xs font-medium text-on-surface-variant">DT</span>
            </p>
            <div className="flex items-center justify-between text-xs text-on-surface-variant mt-1">
              <span>Plafond: {kpis.totalPlafond.toLocaleString('fr-FR')} DT</span>
              <span className="font-bold">{kpis.tauxUtilisationPlafond}% utilisé</span>
            </div>
          </div>
        </div>

        {/* Card 4: Risques & Alertes */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Gestion des Risques</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpis.countAlertes > 0 ? 'bg-error/10 text-error' : 'bg-emerald-500/10 text-emerald-600'}`}>
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-on-surface">{kpis.countAlertes === 0 ? '0' : kpis.countAlertes}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${kpis.countAlertes === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {kpis.countAlertes === 0 ? 'Excellente Solvabilité' : 'Tiers à surveiller'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Score moyen portefeuille: <span className="font-bold text-on-surface">88/100</span></p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input
              type="text"
              placeholder="Rechercher par nom, code, matricule fiscal, email, téléphone, ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </button>
            )}
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                title="Vue Fiches Cartes"
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                title="Vue Tableau Détaillé"
              >
                <span className="material-symbols-outlined text-[20px]">table_rows</span>
              </button>
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-on-surface focus:outline-none"
            >
              <option value="nom">Tri : Nom (A-Z)</option>
              <option value="ca">Tri : CA Réalisé</option>
              <option value="solde">Tri : Solde Restant Dû</option>
              <option value="score">Tri : Score Solvabilité</option>
            </select>
          </div>
        </div>

        {/* Filter Badges / Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/60 text-xs">
          {/* Project selector if global */}
          {isGlobal && (
            <select
              value={filterProjectLocal}
              onChange={(e) => setFilterProjectLocal(e.target.value)}
              className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg font-medium text-on-surface"
            >
              <option value="all">Tous les projets</option>
              {projets.map(p => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          )}

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg font-medium text-on-surface"
          >
            <option value="all">Type: Tous</option>
            <option value="Entreprise">Entreprise (B2B)</option>
            <option value="Particulier">Particulier (B2C)</option>
          </select>

          {/* Categorie Filter */}
          <select
            value={filterCategorie}
            onChange={(e) => setFilterCategorie(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg font-medium text-on-surface"
          >
            <option value="all">Catégorie: Toutes</option>
            <option value="Grand Compte">Grand Compte</option>
            <option value="PME">PME</option>
            <option value="Marché Public">Marché Public</option>
            <option value="Particulier">Particulier</option>
          </select>

          {/* Statut Filter */}
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg font-medium text-on-surface"
          >
            <option value="all">Statut: Tous</option>
            <option value="Actif">Actif</option>
            <option value="Prospect">Prospect</option>
            <option value="Bloqué">Bloqué</option>
            <option value="Contentieux">Contentieux</option>
          </select>

          {/* Solde Filter */}
          <select
            value={filterSolde}
            onChange={(e) => setFilterSolde(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg font-medium text-on-surface"
          >
            <option value="all">Solde: Tous</option>
            <option value="avec_solde">Avec Créances Dues (&gt; 0 DT)</option>
            <option value="solde">Comptes Soldés (0 DT)</option>
            <option value="depassement">Dépassement Plafond Crédit</option>
          </select>

          {(filterType !== 'all' || filterStatut !== 'all' || filterCategorie !== 'all' || filterSolde !== 'all' || searchTerm || (isGlobal && filterProjectLocal !== 'all')) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterStatut('all');
                setFilterCategorie('all');
                setFilterSolde('all');
                setFilterProjectLocal('all');
              }}
              className="ml-auto text-primary hover:underline text-xs font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Main List Display */}
      {viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const fin = getClientFinancials(client.id);
            const isExceeded = client.plafondCredit ? fin.soldeDu > client.plafondCredit : false;
            const creditPct = client.plafondCredit ? Math.min(100, Math.round((fin.soldeDu / client.plafondCredit) * 100)) : 0;
            const clientProject = projets.find(p => p.id === client.projetId);

            return (
              <div 
                key={client.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top card accent line */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                  client.statut === 'Bloqué' || client.statut === 'Contentieux' 
                    ? 'bg-error' 
                    : isExceeded 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                }`} />

                <div>
                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center font-bold text-base text-primary shrink-0 border border-outline-variant/60 shadow-xs">
                        {client.typeTier === 'Particulier' ? (
                          <span className="material-symbols-outlined text-[24px] text-blue-600">person</span>
                        ) : (
                          client.nom.charAt(0)
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors" title={client.nom}>
                          {client.nom}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-on-surface-variant">{client.code || `CLI-${client.id}`}</span>
                          <span className="text-on-surface-variant/40">•</span>
                          <span className="text-[11px] font-medium text-on-surface-variant truncate">{client.ville || 'Tunisie'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                      client.statut === 'Actif'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : client.statut === 'Prospect'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-error/10 text-error border-error/20'
                    }`}>
                      {client.statut || 'Actif'}
                    </span>
                  </div>

                  {/* Badges and Category */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className="px-2 py-0.5 bg-surface-container-low rounded-md text-[11px] font-semibold text-on-surface-variant">
                      {client.typeTier || 'Entreprise'}
                    </span>
                    <span className="px-2 py-0.5 bg-surface-container-low rounded-md text-[11px] font-semibold text-on-surface-variant">
                      {client.categorie || 'PME'}
                    </span>
                    {client.scoreSolvabilite && (
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                        client.scoreSolvabilite >= 85 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : client.scoreSolvabilite >= 70 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-error/10 text-error'
                      }`}>
                        <span className="material-symbols-outlined text-[12px]">speed</span>
                        Score {client.scoreSolvabilite}%
                      </span>
                    )}
                    {isGlobal && clientProject && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-semibold truncate max-w-[130px]" title={clientProject.nom}>
                        {clientProject.nom}
                      </span>
                    )}
                  </div>

                  {/* Financial Snapshot */}
                  <div className="bg-surface-container-low/60 rounded-xl p-3 mb-4 space-y-2 border border-outline-variant/40">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">Chiffre d'Affaires</span>
                      <span className="font-bold text-on-surface">{fin.totalFacture.toLocaleString('fr-FR')} DT</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Solde Restant Dû</span>
                      <span className={`font-bold text-sm ${fin.soldeDu > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {fin.soldeDu.toLocaleString('fr-FR')} DT
                      </span>
                    </div>

                    {/* Credit progress bar */}
                    {client.plafondCredit && client.plafondCredit > 0 && (
                      <div className="pt-1">
                        <div className="flex justify-between text-[10px] text-on-surface-variant mb-1 font-medium">
                          <span>Plafond: {client.plafondCredit.toLocaleString('fr-FR')} DT</span>
                          <span className={isExceeded ? 'text-error font-bold' : ''}>{creditPct}% utilisé</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${isExceeded ? 'bg-error' : creditPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, creditPct)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contact Info Compact */}
                  <div className="space-y-1.5 text-xs text-on-surface-variant mb-4">
                    {client.telephone && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">phone</span>
                        <a href={`tel:${client.telephone}`} className="hover:text-primary hover:underline truncate">
                          {client.telephone}
                        </a>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">mail</span>
                        <a href={`mailto:${client.email}`} className="hover:text-primary hover:underline truncate">
                          {client.email}
                        </a>
                      </div>
                    )}
                    {client.contactNom && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">person</span>
                        <span className="truncate">{client.contactNom} {client.contactPoste ? `(${client.contactPoste})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between gap-1.5 flex-wrap">
                  {currentUser.role !== 'comptable' ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenPaymentModal(client)}
                        className="py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 border border-emerald-200 cursor-pointer"
                        title="Encaisser un paiement pour ce client"
                      >
                        <span className="material-symbols-outlined text-[15px]">payments</span>
                        Paiement
                      </button>

                      <button
                        onClick={() => handleOpenCreditModal(client)}
                        className="py-1 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 border border-purple-200 cursor-pointer"
                        title="Échéancier & Convention de Crédit"
                      >
                        <span className="material-symbols-outlined text-[15px]">calendar_month</span>
                        Crédit
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      Audit Client
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedClientDetail(client)}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                      title="Voir la fiche complète & relevé"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>

                    <button
                      onClick={() => handleExportStatementPdf(client)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Télécharger le relevé de compte en PDF"
                    >
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    </button>

                    {currentUser.role !== 'comptable' && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(client)}
                          className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                          title="Modifier ce client"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>

                        <button
                          onClick={() => setDeleteConfirmationId(client.id)}
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer ce client"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Code & Raison Sociale</th>
                  <th className="px-4 py-3.5">Type & Catégorie</th>
                  <th className="px-4 py-3.5">Coordonnées</th>
                  <th className="px-4 py-3.5 text-right">CA Réalisé</th>
                  <th className="px-4 py-3.5 text-right">Solde Dû</th>
                  <th className="px-4 py-3.5 text-right">Plafond Crédit</th>
                  <th className="px-4 py-3.5 text-center">Score</th>
                  <th className="px-4 py-3.5 text-center">Statut</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 font-body-md text-on-surface">
                {filteredClients.map((client) => {
                  const fin = getClientFinancials(client.id);
                  const isExceeded = client.plafondCredit ? fin.soldeDu > client.plafondCredit : false;

                  return (
                    <tr key={client.id} className="hover:bg-surface-container-low/50 transition-colors">
                      {/* Name & Code */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-surface-container text-primary font-bold flex items-center justify-center shrink-0">
                            {client.nom.charAt(0)}
                          </div>
                          <div>
                            <button 
                              onClick={() => setSelectedClientDetail(client)}
                              className="font-bold text-on-surface hover:text-primary text-left truncate max-w-[200px] block"
                            >
                              {client.nom}
                            </button>
                            <span className="text-[11px] font-mono text-on-surface-variant">{client.code || `CLI-${client.id}`}</span>
                          </div>
                        </div>
                      </td>

                      {/* Type & Categorie */}
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-on-surface">{client.typeTier || 'Entreprise'}</p>
                          <p className="text-[11px] text-on-surface-variant">{client.categorie || 'PME'}</p>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-on-surface font-medium">{client.telephone}</p>
                          <p className="text-[11px] text-on-surface-variant truncate max-w-[180px]">{client.email}</p>
                        </div>
                      </td>

                      {/* CA */}
                      <td className="px-4 py-3.5 text-right font-semibold text-on-surface">
                        {fin.totalFacture.toLocaleString('fr-FR')} DT
                      </td>

                      {/* Solde Dû */}
                      <td className={`px-4 py-3.5 text-right font-bold ${fin.soldeDu > 0 ? (isExceeded ? 'text-error' : 'text-amber-600') : 'text-emerald-600'}`}>
                        {fin.soldeDu.toLocaleString('fr-FR')} DT
                      </td>

                      {/* Plafond */}
                      <td className="px-4 py-3.5 text-right text-on-surface-variant">
                        {(client.plafondCredit || 0).toLocaleString('fr-FR')} DT
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          (client.scoreSolvabilite || 0) >= 85 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {client.scoreSolvabilite || 80}%
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          client.statut === 'Actif'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-surface-container-highest text-on-surface-variant border-outline-variant'
                        }`}>
                          {client.statut || 'Actif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {currentUser.role !== 'comptable' && (
                            <>
                              <button
                                onClick={() => handleOpenPaymentModal(client)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer"
                                title="Bouton Paiement (Encaisser)"
                              >
                                <span className="material-symbols-outlined text-[17px]">payments</span>
                              </button>
                              <button
                                onClick={() => handleOpenCreditModal(client)}
                                className="p-1 text-purple-600 hover:bg-purple-50 rounded-lg border border-purple-200 cursor-pointer"
                                title="Bouton Crédit (Convention & Échéancier)"
                              >
                                <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedClientDetail(client)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                            title="Voir la fiche détaillée"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            onClick={() => handleExportStatementPdf(client)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Exporter relevé PDF"
                          >
                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                          </button>
                          {currentUser.role !== 'comptable' && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(client)}
                                className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg cursor-pointer"
                                title="Modifier"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteConfirmationId(client.id)}
                                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg cursor-pointer"
                                title="Supprimer"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-xl bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant mb-4">
            <span className="material-symbols-outlined text-[36px]">person_off</span>
          </div>
          <h3 className="font-bold text-lg text-on-surface">Aucun client trouvé</h3>
          <p className="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
            Aucun client ne correspond à vos critères de recherche ou de filtre actuels.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
              setFilterStatut('all');
              setFilterCategorie('all');
              setFilterSolde('all');
            }}
            className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : NOUVEAU / MODIFIER CLIENT                                         */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-[96vw] max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 my-2">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[28px]">
                    {editingClient ? 'edit_note' : 'person_add'}
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-on-surface">
                    {editingClient ? `Modifier le Client : ${editingClient.nom}` : 'Créer un Nouveau Client'}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium">
                    {editingClient ? 'Mettez à jour les coordonnées et les conditions de crédit.' : 'Renseignez l\'identité, la domiciliation et les modalités financières.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveClient} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto bg-surface p-6">
                
                {/* AI Helper Banner */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[24px]">auto_awesome</span>
                    <div>
                      <span className="text-sm text-on-surface font-bold block">Assistant de pré-configuration</span>
                      <span className="text-xs text-on-surface-variant">Appliquez rapidement des conditions de crédit types.</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyAiCreditPreset('Grand Compte', 'Entreprise')}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-primary/20 hover:bg-primary/10 text-primary transition-colors shadow-sm"
                    >
                      Grand Compte (60j)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiCreditPreset('PME', 'Entreprise')}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-primary/20 hover:bg-primary/10 text-primary transition-colors shadow-sm"
                    >
                      PME (30j)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiCreditPreset('Particulier', 'Particulier')}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-primary/20 hover:bg-primary/10 text-primary transition-colors shadow-sm"
                    >
                      Particulier (Comptant)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Section 1: Identité */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
                      <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
                        <span className="material-symbols-outlined text-[20px]">badge</span>
                        1. Identité & Catégorisation
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Raison Sociale / Nom Complet *</label>
                          <input
                            type="text"
                            required
                            value={formData.nom}
                            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            placeholder="Ex: Société Alpha"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Code Client *</label>
                          <input
                            type="text"
                            required
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder="Ex: CLI-2024-001"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm font-mono bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Type de Client</label>
                          <select
                            value={formData.typeTier}
                            onChange={(e) => setFormData({ ...formData, typeTier: e.target.value as any })}
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          >
                            <option value="Entreprise">Entreprise / B2B</option>
                            <option value="Particulier">Particulier / B2C</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Catégorie</label>
                          <input
                            type="text"
                            value={formData.categorie}
                            onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                            placeholder="Ex: Grossiste, VIP..."
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Matricule Fiscal / CIN</label>
                          <input
                            type="text"
                            value={formData.matriculeFiscal}
                            onChange={(e) => setFormData({ ...formData, matriculeFiscal: e.target.value })}
                            placeholder="Ex: 1234567/X/A/M/000"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Conditions Financières */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
                      <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
                        <span className="material-symbols-outlined text-[20px]">account_balance</span>
                        2. Conditions Financières & Banque
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Plafond de Crédit (DT)</label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={formData.plafondCredit}
                            onChange={(e) => setFormData({ ...formData, plafondCredit: Number(e.target.value) })}
                            placeholder="Ex: 10000"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Délai de Paiement (Jours)</label>
                          <input
                            type="number"
                            min="0"
                            step="15"
                            value={formData.delaiPaiement}
                            onChange={(e) => setFormData({ ...formData, delaiPaiement: Number(e.target.value) })}
                            placeholder="Ex: 30"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Banque Domiciliée</label>
                          <input
                            type="text"
                            value={formData.banque}
                            onChange={(e) => setFormData({ ...formData, banque: e.target.value })}
                            placeholder="Ex: BIAT, Amen Bank, BNP..."
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">RIB / IBAN</label>
                          <input
                            type="text"
                            value={formData.rib}
                            onChange={(e) => setFormData({ ...formData, rib: e.target.value })}
                            placeholder="Ex: 08 001 0001234567890 45"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm font-mono bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Section 3: Coordonnées & Contact */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
                      <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
                        <span className="material-symbols-outlined text-[20px]">contact_mail</span>
                        3. Coordonnées & Contact Principal
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Téléphone Entreprise *</label>
                          <input
                            type="tel"
                            required
                            value={formData.telephone}
                            onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                            placeholder="Ex: +216 71 000 000"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Email Contact / Facturation</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Ex: contact@client.com"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Adresse Complète</label>
                          <input
                            type="text"
                            value={formData.adresse}
                            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                            placeholder="Ex: 14 Rue des Entrepreneurs, Zone Industrielle"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Ville</label>
                          <input
                            type="text"
                            value={formData.ville}
                            onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                            placeholder="Ex: Tunis"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface mb-1.5 block">Pays</label>
                          <input
                            type="text"
                            value={formData.pays}
                            onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                            placeholder="Ex: Tunisie"
                            className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        
                        <div className="sm:col-span-2 border-t border-outline-variant/30 pt-4 mt-2">
                          <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-4">Interlocuteur Référent</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className="text-xs font-bold text-on-surface mb-1.5 block">Nom & Prénom</label>
                              <input
                                type="text"
                                value={formData.contactNom}
                                onChange={(e) => setFormData({ ...formData, contactNom: e.target.value })}
                                placeholder="Ex: M. Jean Dupont"
                                className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-on-surface mb-1.5 block">Poste / Fonction</label>
                              <input
                                type="text"
                                value={formData.contactPoste}
                                onChange={(e) => setFormData({ ...formData, contactPoste: e.target.value })}
                                placeholder="Ex: Directeur Achats"
                                className="w-full p-3 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Notes */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
                      <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
                        <span className="material-symbols-outlined text-[20px]">note_alt</span>
                        4. Observations & Notes Spécifiques
                      </h4>
                      <div>
                        <textarea
                          rows={3}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Instructions particulières de livraison, accords commerciaux spécifiques, horaires de réception..."
                          className="w-full p-4 border border-outline-variant rounded-xl text-sm bg-surface-container-lowest focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-outline-variant bg-surface-container-low flex justify-end gap-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 text-sm font-extrabold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  <span>{editingClient ? 'Enregistrer les Modifications' : 'Créer le Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* DRAWER / MODAL : FICHE 360° DU CLIENT & RELEVÉ DE COMPTE                  */}
      {/* ========================================================================= */}
      {selectedClientDetail && (() => {
        const client = selectedClientDetail;
        const fin = getClientFinancials(client.id);
        const isExceeded = client.plafondCredit ? fin.soldeDu > client.plafondCredit : false;
        const creditPct = client.plafondCredit ? Math.min(100, Math.round((fin.soldeDu / client.plafondCredit) * 100)) : 0;
        const clientProj = projets.find(p => p.id === client.projetId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
              {/* Drawer Header */}
              <div className="p-6 border-b border-outline-variant bg-slate-900 text-white flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-bold text-emerald-400">
                    {client.nom.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-white">{client.nom}</h2>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {client.statut || 'Actif'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {client.code || `CLI-${client.id}`} • {client.matriculeFiscal || 'Matricule non renseigné'} • {clientProj?.nom || 'Projet Principal'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportStatementPdf(client)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    <span>Relevé PDF</span>
                  </button>
                  <button
                    onClick={() => setSelectedClientDetail(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Financial Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-4">
                    <span className="text-xs font-semibold text-on-surface-variant">Chiffre d'Affaires Facturé</span>
                    <p className="text-xl font-bold text-on-surface mt-1">{fin.totalFacture.toLocaleString('fr-FR')} DT</p>
                    <span className="text-[11px] text-on-surface-variant">{fin.facturesCount} factures émises</span>
                  </div>

                  <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-4">
                    <span className="text-xs font-semibold text-on-surface-variant">Total Règlements Reçus</span>
                    <p className="text-xl font-bold text-emerald-600 mt-1">{fin.totalPaye.toLocaleString('fr-FR')} DT</p>
                    <span className="text-[11px] text-emerald-600 font-medium">Encaissé avec succès</span>
                  </div>

                  <div className={`border rounded-xl p-4 ${fin.soldeDu > 0 ? 'bg-amber-500/5 border-amber-500/30' : 'bg-surface-container-low border-outline-variant/60'}`}>
                    <span className="text-xs font-semibold text-on-surface-variant">Solde Restant Dû</span>
                    <p className={`text-xl font-bold mt-1 ${fin.soldeDu > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {fin.soldeDu.toLocaleString('fr-FR')} DT
                    </p>
                    <span className={`text-[11px] font-bold ${isExceeded ? 'text-error' : 'text-on-surface-variant'}`}>
                      {isExceeded ? 'Dépassement de plafond' : `${creditPct}% du plafond utilisé`}
                    </span>
                  </div>
                </div>

                {/* Coordonnées & Conditions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-container-low/40 rounded-xl p-4 border border-outline-variant/60 text-xs">
                  <div className="space-y-2">
                    <h4 className="font-bold text-on-surface uppercase tracking-wider text-[11px] text-primary">Informations & Coordonnées</h4>
                    <p><span className="text-on-surface-variant">Téléphone :</span> <span className="font-semibold text-on-surface">{client.telephone}</span></p>
                    <p><span className="text-on-surface-variant">Email :</span> <span className="font-semibold text-on-surface">{client.email || '-'}</span></p>
                    <p><span className="text-on-surface-variant">Adresse :</span> <span className="font-semibold text-on-surface">{client.adresse || '-'}, {client.ville} ({client.pays})</span></p>
                    <p><span className="text-on-surface-variant">Contact Référent :</span> <span className="font-semibold text-on-surface">{client.contactNom || '-'} {client.contactPoste ? `(${client.contactPoste})` : ''}</span></p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-on-surface uppercase tracking-wider text-[11px] text-primary">Conditions & Domiciliation</h4>
                    <p><span className="text-on-surface-variant">Délai de Paiement :</span> <span className="font-semibold text-on-surface">{client.delaiPaiement || 30} jours net</span></p>
                    <p><span className="text-on-surface-variant">Plafond Autorisé :</span> <span className="font-semibold text-on-surface">{(client.plafondCredit || 0).toLocaleString('fr-FR')} DT</span></p>
                    <p><span className="text-on-surface-variant">Banque :</span> <span className="font-semibold text-on-surface">{client.banque || '-'}</span></p>
                    <p><span className="text-on-surface-variant">RIB / IBAN :</span> <span className="font-mono font-semibold text-on-surface">{client.rib || '-'}</span></p>
                  </div>
                </div>

                {/* Invoices List Table */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      Historique des Factures & Engagements
                    </h4>
                    <span className="text-xs text-on-surface-variant font-medium">
                      {fin.clientVentes.length} document(s)
                    </span>
                  </div>

                  <div className="border border-outline-variant rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-low border-b border-outline-variant font-bold text-on-surface-variant">
                        <tr>
                          <th className="px-3.5 py-2.5">N° Facture</th>
                          <th className="px-3.5 py-2.5">Date</th>
                          <th className="px-3.5 py-2.5">Statut</th>
                          <th className="px-3.5 py-2.5 text-right">Montant HT</th>
                          <th className="px-3.5 py-2.5 text-right">Montant TTC</th>
                          <th className="px-3.5 py-2.5 text-right">Reste Dû</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60">
                        {fin.clientVentes.map(v => (
                          <tr key={v.id} className="hover:bg-surface-container-low/40">
                            <td className="px-3.5 py-2.5 font-bold text-on-surface">{v.numero}</td>
                            <td className="px-3.5 py-2.5 text-on-surface-variant">{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                            <td className="px-3.5 py-2.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                v.statut === 'Payée'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {v.statut}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-medium text-on-surface">{v.montantHT.toLocaleString('fr-FR')} DT</td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-on-surface">{v.montantTTC.toLocaleString('fr-FR')} DT</td>
                            <td className={`px-3.5 py-2.5 text-right font-bold ${v.statut === 'Payée' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {v.statut === 'Payée' ? '0 DT' : `${v.montantTTC.toLocaleString('fr-FR')} DT`}
                            </td>
                          </tr>
                        ))}
                        {fin.clientVentes.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                              Aucune facture enregistrée pour ce client.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes if any */}
                {client.notes && (
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/40 text-xs">
                    <span className="font-bold text-on-surface block mb-1">Notes & Instructions internes :</span>
                    <p className="text-on-surface-variant italic">{client.notes}</p>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-outline-variant bg-surface-container-low flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedClientDetail(null);
                      handleOpenPaymentModal(client);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Bouton Paiement
                  </button>

                  <button
                    onClick={() => {
                      setSelectedClientDetail(null);
                      handleOpenCreditModal(client);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    Bouton Crédit
                  </button>

                  <button
                    onClick={() => {
                      setSelectedClientDetail(null);
                      handleOpenEditModal(client);
                    }}
                    className="px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Modifier
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportStatementPdf(client)}
                    className="px-3.5 py-2 text-xs font-bold text-on-surface bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-high rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">picture_as_pdf</span>
                    Relevé PDF
                  </button>
                  <button
                    onClick={() => setSelectedClientDetail(null)}
                    className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL : BOUTON DE PAIEMENT (ENCAISSEMENT CLIENT)                          */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-emerald-700 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">payments</span>
                </div>
                <div>
                  <h3 className="font-bold text-base">Encaisser un Paiement Client</h3>
                  <p className="text-xs text-emerald-100 font-normal">Saisie d'un règlement direct & émission du reçu de caisse</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmPayment}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
                {/* Client selection */}
                <div>
                  <label className="font-bold text-on-surface mb-1.5 block">Client Bénéficiaire *</label>
                  <select
                    value={paymentClientId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setPaymentClientId(cid);
                      const fin = getClientFinancials(cid);
                      setPaymentVenteId('global');
                      setPaymentAmount(fin.soldeDu > 0 ? fin.soldeDu : 1000);
                    }}
                    className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
                    required
                  >
                    {filteredClients.map(c => {
                      const fin = getClientFinancials(c.id);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.nom} {c.code ? `(${c.code})` : ''} — Solde dû : {fin.soldeDu.toLocaleString('fr-FR')} DT
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Linked Invoice / Balance */}
                {(() => {
                  const fin = getClientFinancials(paymentClientId);
                  return (
                    <div>
                      <label className="font-bold text-on-surface mb-1.5 block">Affectation du Règlement</label>
                      <select
                        value={paymentVenteId}
                        onChange={(e) => {
                          const vid = e.target.value;
                          setPaymentVenteId(vid);
                          if (vid === 'global') {
                            setPaymentAmount(fin.soldeDu > 0 ? fin.soldeDu : 1000);
                          } else {
                            const v = fin.clientVentes.find(item => item.id === vid);
                            if (v) {
                              const paye = v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0);
                              setPaymentAmount(Math.max(0, v.montantTTC - paye));
                              setPaymentRef(`FAC-${v.numero}`);
                            }
                          }
                        }}
                        className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
                      >
                        <option value="global">Règlement Global / Acompte sur Compte (Solde Total : {fin.soldeDu.toLocaleString('fr-FR')} DT)</option>
                        {fin.clientVentes.map(v => {
                          const paye = v.montantPaye ?? (v.statut === 'Payée' ? v.montantTTC : 0);
                          const reste = Math.max(0, v.montantTTC - paye);
                          return (
                            <option key={v.id} value={v.id}>
                              Facture {v.numero} du {new Date(v.date).toLocaleDateString('fr-FR')} — Reste : {reste.toLocaleString('fr-FR')} DT (Total {v.montantTTC.toLocaleString('fr-FR')} DT)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })()}

                {/* Amount with quick shortcuts */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="font-bold text-on-surface">Montant du Paiement (DT) *</label>
                    {(() => {
                      const fin = getClientFinancials(paymentClientId);
                      return fin.soldeDu > 0 ? (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPaymentAmount(fin.soldeDu)}
                            className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold border border-emerald-200"
                          >
                            100% Solde ({fin.soldeDu.toLocaleString('fr-FR')} DT)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentAmount(Math.round(fin.soldeDu / 2))}
                            className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest rounded text-[11px] font-bold"
                          >
                            50% ({Math.round(fin.soldeDu / 2).toLocaleString('fr-FR')} DT)
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    placeholder="0.000"
                    className="w-full p-2.5 border border-outline-variant rounded-xl text-sm font-bold text-on-surface bg-surface-container-lowest focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                </div>

                {/* Payment Mode & Bank */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-on-surface mb-1.5 block">Mode de Paiement *</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
                    >
                      <option value="Espèces">Espèces (Caisse)</option>
                      <option value="Chèque">Chèque Bancaire</option>
                      <option value="Virement">Virement Bancaire</option>
                      <option value="Traite">Traite / Effet de commerce</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1.5 block">Banque Domiciliée</label>
                    <select
                      value={paymentBank}
                      onChange={(e) => setPaymentBank(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
                    >
                      <option value="BIAT">BIAT</option>
                      <option value="Attijari Bank">Attijari Bank</option>
                      <option value="BNA">BNA</option>
                      <option value="STB">STB</option>
                      <option value="Amen Bank">Amen Bank</option>
                      <option value="BH Bank">BH Bank</option>
                      <option value="UIB">UIB</option>
                      <option value="ATB">ATB</option>
                    </select>
                  </div>
                </div>

                {/* Reference & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-on-surface mb-1.5 block">N° Chèque / Réf. Transaction</label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="Ex: CHQ-984214 / VIR-771"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface mb-1.5 block">Observations / Remarques</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Ex: Reçu en main propre"
                      className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                {/* Toggle PDF receipt */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-[20px]">print</span>
                    <span className="font-bold text-emerald-900 text-xs">Générer et télécharger le reçu officiel en PDF</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPrintReceipt}
                    onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Valider l'Encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : BOUTON DE CRÉDIT (ÉCHÉANCIER & CONVENTION)                        */}
      {/* ========================================================================= */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-purple-700 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="font-bold text-base">Convention de Crédit & Accord d'Échéancier</h3>
                  <p className="text-xs text-purple-100 font-normal">Paramétrage du plafond, facilités de paiement et calendrier d'échéances</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreditModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmCredit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
                {/* Client selection */}
                <div>
                  <label className="font-bold text-on-surface mb-1.5 block">Client Concerné *</label>
                  <select
                    value={creditClientId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setCreditClientId(cid);
                      const c = clients.find(item => item.id === cid);
                      if (c) {
                        setNewCreditLimit(c.plafondCredit || 25000);
                        setNewPaymentDelay(c.delaiPaiement || 30);
                      }
                    }}
                    className="w-full p-2.5 border border-outline-variant rounded-xl text-xs bg-surface-container-lowest font-medium focus:ring-2 focus:ring-purple-600 outline-none"
                    required
                  >
                    {filteredClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nom} {c.code ? `(${c.code})` : ''} — Plafond actuel : {(c.plafondCredit || 0).toLocaleString('fr-FR')} DT
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adjust limits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/50 p-3.5 rounded-xl border border-purple-200">
                  <div>
                    <label className="font-bold text-purple-900 mb-1.5 block">Nouveau Plafond de Crédit Autorisé (DT)</label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={newCreditLimit}
                      onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                      className="w-full p-2.5 border border-purple-200 rounded-xl text-xs bg-surface-container-lowest font-bold text-purple-950 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-purple-900 mb-1.5 block">Délai de Paiement Accordé (Jours Net)</label>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={newPaymentDelay}
                      onChange={(e) => setNewPaymentDelay(Number(e.target.value))}
                      className="w-full p-2.5 border border-purple-200 rounded-xl text-xs bg-surface-container-lowest font-bold text-purple-950 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>
                </div>

                {/* Schedule simulation */}
                <div className="border border-outline-variant rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-purple-600">tune</span>
                    Calcul & Amortissement de l'Échéancier
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-on-surface mb-1 block">Acompte Immédiat (DT)</label>
                      <input
                        type="number"
                        min="0"
                        value={creditDownPayment}
                        onChange={(e) => setCreditDownPayment(Number(e.target.value))}
                        className="w-full p-2 border border-outline-variant rounded-lg text-xs bg-surface-container-lowest outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-on-surface mb-1 block">Nombre d'Échéances</label>
                      <select
                        value={creditInstallmentsCount}
                        onChange={(e) => setCreditInstallmentsCount(Number(e.target.value))}
                        className="w-full p-2 border border-outline-variant rounded-lg text-xs bg-surface-container-lowest outline-none"
                      >
                        {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
                          <option key={n} value={n}>{n} versements</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-on-surface mb-1 block">Périodicité</label>
                      <select
                        value={creditInterval}
                        onChange={(e) => setCreditInterval(e.target.value as any)}
                        className="w-full p-2 border border-outline-variant rounded-lg text-xs bg-surface-container-lowest outline-none"
                      >
                        <option value="monthly">Mensuelle (30 jours)</option>
                        <option value="biweekly">Bimensuelle (15 jours)</option>
                        <option value="quarterly">Trimestrielle (90 jours)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-on-surface mb-1 block">1ère Date d'Exigibilité</label>
                    <input
                      type="date"
                      value={creditFirstDate}
                      onChange={(e) => setCreditFirstDate(e.target.value)}
                      className="w-full p-2 border border-outline-variant rounded-lg text-xs bg-surface-container-lowest outline-none"
                    />
                  </div>

                  {/* Schedule preview table */}
                  <div className="mt-3 border border-outline-variant/60 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-low font-bold text-on-surface-variant">
                        <tr>
                          <th className="px-3 py-2">Échéance</th>
                          <th className="px-3 py-2">Date Limite de Paiement</th>
                          <th className="px-3 py-2 text-right">Montant Exigible</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60">
                        {calculatedCreditSchedule.map((ech) => (
                          <tr key={ech.numero} className="hover:bg-surface-container-low/40">
                            <td className="px-3 py-2 font-bold text-purple-700">Versement N° {ech.numero}</td>
                            <td className="px-3 py-2 text-on-surface">{new Date(ech.date).toLocaleDateString('fr-FR')}</td>
                            <td className="px-3 py-2 text-right font-bold text-on-surface">{ech.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsCreditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high rounded-xl"
                >
                  Annuler
                </button>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    Valider & Télécharger Convention PDF
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG : CONFIRMATION DE SUPPRESSION                                      */}
      {/* ========================================================================= */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[28px]">delete_forever</span>
            </div>
            <h3 className="font-bold text-lg text-on-surface">Confirmer la suppression</h3>
            <p className="text-xs text-on-surface-variant mt-2 mb-6">
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible et supprimera le rattachement aux factures associées.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmationId(null)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteClient(deleteConfirmationId)}
                className="px-5 py-2 text-xs font-bold text-white bg-error hover:bg-error/90 rounded-xl shadow-md transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
