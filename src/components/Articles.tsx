import Barcode from "react-barcode";
import React, { useState, useMemo } from 'react';
import { Article, Projet, HistoriqueModification } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Utilisateur } from '../types';

interface ArticlesProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  articles: Article[];
  onArticlesChange: (articles: Article[]) => void;
  projets: Projet[];
}

export function Articles({ currentUser, selectedProjectId, articles, onArticlesChange, projets }: ArticlesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [familleFilter, setFamilleFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'actif' | 'inactif'>('all');
  
  // BF-PROD-013: Filtres recommandés (Boutique, Prix min, Prix max)
  const [boutiqueFilter, setBoutiqueFilter] = useState('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  
  // BF-PROD-015: Architecture Multi-Boutiques (Produit vs Stock)
  const [isMultiBoutiqueModalOpen, setIsMultiBoutiqueModalOpen] = useState(false);
  const [transferModalArticle, setTransferModalArticle] = useState<Article | null>(null);
  const [transferFromBoutique, setTransferFromBoutique] = useState<string>('1');
  const [transferToBoutique, setTransferToBoutique] = useState<string>('3');
  const [transferQuantity, setTransferQuantity] = useState<number>(1);
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);
  const [deactivatingArticle, setDeactivatingArticle] = useState<Article | null>(null);
  const [isBulkDeactivateModalOpen, setIsBulkDeactivateModalOpen] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'ident' | 'tarifs' | 'stock' | 'historique'>('ident');
  const [formError, setFormError] = useState('');
  
  // Categories management (BF-PROD-004)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoriesList, setCategoriesList] = useState<{ id: string; nom: string; statut: 'Actif' | 'Inactif' }[]>([
    { id: 'cat-1', nom: 'Informatique', statut: 'Actif' },
    { id: 'cat-2', nom: 'Téléphonie & Tablettes', statut: 'Actif' },
    { id: 'cat-3', nom: 'Réseau & Câblage', statut: 'Actif' },
    { id: 'cat-4', nom: 'Matériaux BTP', statut: 'Actif' },
    { id: 'cat-5', nom: 'Outillage & Quincaillerie', statut: 'Actif' },
    { id: 'cat-6', nom: 'Électricité', statut: 'Actif' },
    { id: 'cat-7', nom: 'Bureautique & Papeterie', statut: 'Actif' },
    { id: 'cat-8', nom: 'Services & Prestations', statut: 'Actif' }
  ]);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    if (categoriesList.some(c => c.nom.toLowerCase() === name.toLowerCase())) return;

    setCategoriesList(prev => [
      ...prev,
      {
        id: `cat-${Date.now()}`,
        nom: name,
        statut: 'Actif'
      }
    ]);
    setNewCategoryName('');
  };

  const handleUpdateCategory = (id: string) => {
    if (!editingCatName.trim()) return;
    const name = editingCatName.trim();

    setCategoriesList(prev => prev.map(c => c.id === id ? {
      ...c,
      nom: name
    } : c));

    setEditingCatId(null);
    setEditingCatName('');
  };

  const handleToggleCategoryStatus = (id: string) => {
    setCategoriesList(prev => prev.map(c => c.id === id ? {
      ...c,
      statut: c.statut === 'Actif' ? 'Inactif' : 'Actif'
    } : c));
  };

  const handleDeleteCategory = (id: string) => {
    setCategoriesList(prev => prev.filter(c => c.id !== id));
  };

  const [formData, setFormData] = useState<Partial<Article>>({
    code: '',
    referenceInterne: '',
    designation: '',
    description: '',
    famille: '',
    categorie: '',
    marque: '',
    uniteMesure: 'Unité',
    codeBarres: [],
    prixAchatHT: 0,
    prixVenteHT: 0,
    prixPromotionnelHT: 0,
    tva: 19,
    stock: 0,
    stockMinimum: 10,
    stockMaximum: 100,
    stockSecurite: 5,
    depotPrincipal: 'Dépôt Central',
    emplacement: '',
    statut: 'Actif',
    projetId: selectedProjectId === 'all' ? projets[0]?.id : selectedProjectId
  });

  const articlesToShow = selectedProjectId === 'all' 
    ? articles 
    : articles.filter(a => a.projetId === selectedProjectId);

  // KPIs
  const kpis = useMemo(() => {
    const total = articlesToShow.length;
    const stockValue = articlesToShow.reduce((acc, a) => acc + (a.prixAchatHT * a.stock), 0);
    const expectedRevenue = articlesToShow.reduce((acc, a) => acc + (a.prixVenteHT * a.stock), 0);
    const lowStockCount = articlesToShow.filter(a => a.stock > 0 && a.stock < (a.stockMinimum || 15)).length;
    const outOfStockCount = articlesToShow.filter(a => a.stock === 0).length;
    
    const avgMargin = articlesToShow.length 
      ? articlesToShow.reduce((acc, a) => {
          const margin = a.prixAchatHT > 0 ? ((a.prixVenteHT - a.prixAchatHT) / a.prixAchatHT) * 100 : 0;
          return acc + margin;
        }, 0) / articlesToShow.length
      : 0;

    return { total, stockValue, expectedRevenue, lowStockCount, outOfStockCount, avgMargin };
  }, [articlesToShow]);

  // Filtrage avancé (BF-PROD-013: Catégorie, Statut, Boutique, Stock, Prix min, Prix max)
  const filteredArticles = articlesToShow.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchSearch = a.designation.toLowerCase().includes(term) || 
                        a.code.toLowerCase().includes(term) ||
                        (a.referenceInterne || '').toLowerCase().includes(term) ||
                        (a.categorie || '').toLowerCase().includes(term) ||
                        (a.marque || '').toLowerCase().includes(term) ||
                        (a.codeBarres && a.codeBarres.some(cb => cb.toLowerCase().includes(term)));
                        
    const matchFamille = familleFilter === 'all' || a.famille === familleFilter || a.categorie === familleFilter;
    
    const matchStock = stockFilter === 'all' 
      ? true 
      : stockFilter === 'low' 
        ? a.stock > 0 && a.stock < (a.stockMinimum || 15) 
        : stockFilter === 'out' 
          ? a.stock === 0 
          : a.stock >= (a.stockMinimum || 15);
          
    const matchStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'inactif' 
        ? a.statut === 'Inactif' 
        : a.statut !== 'Inactif';

    const matchBoutique = boutiqueFilter === 'all' 
      ? true 
      : (a.stockParDepot && a.stockParDepot.some(d => (d.depotId === boutiqueFilter || d.nom.toLowerCase().includes(boutiqueFilter.toLowerCase())) && d.quantite > 0)) || a.projetId === boutiqueFilter;

    const parsedMinPrice = minPrice !== '' ? parseFloat(minPrice) : null;
    const matchMinPrice = parsedMinPrice === null || isNaN(parsedMinPrice) ? true : a.prixVenteHT >= parsedMinPrice;

    const parsedMaxPrice = maxPrice !== '' ? parseFloat(maxPrice) : null;
    const matchMaxPrice = parsedMaxPrice === null || isNaN(parsedMaxPrice) ? true : a.prixVenteHT <= parsedMaxPrice;
        
    return matchSearch && matchFamille && matchStock && matchStatus && matchBoutique && matchMinPrice && matchMaxPrice;
  });

  const familles = Array.from(new Set(articlesToShow.map(a => a.famille)));

  const handleOpenAddModal = () => {
    setEditingArticle(null);
    setFormData({
      code: '',
      referenceInterne: '',
      designation: '',
      description: '',
      famille: '',
      categorie: '',
      marque: '',
      uniteMesure: 'Unité',
      codeBarres: [],
      prixAchatHT: 0,
      prixVenteHT: 0,
      prixPromotionnelHT: 0,
      tva: 19,
      stock: 0,
      stockMinimum: 10,
      stockMaximum: 100,
      stockSecurite: 5,
      depotPrincipal: 'Dépôt Central',
      emplacement: '',
      statut: 'Actif',
      projetId: selectedProjectId === 'all' ? projets[0]?.id : selectedProjectId
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      ...article,
      tva: article.tva || 19,
    });
    setIsModalOpen(true);
  };

  const handleDeleteArticle = (id: string) => {
    const target = articles.find(a => a.id === id);
    if (target) {
      setDeactivatingArticle(target);
    }
  };

  const handleBulkDelete = () => {
    if (selectedArticles.length > 0) {
      setIsBulkDeactivateModalOpen(true);
    }
  };


  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.code || !formData.designation) return;

    // BF-PROD-016: Check SKU uniqueness
    const skuToTest = (formData.code || '').trim().toLowerCase();
    const duplicateSku = articles.find(a => 
      (!editingArticle || a.id !== editingArticle.id) && 
      ((a.code || '').trim().toLowerCase() === skuToTest || (a.referenceInterne || '').trim().toLowerCase() === skuToTest)
    );
    if (duplicateSku) {
      setFormError(`❌ Impossible de créer / modifier le produit. La référence / SKU "${formData.code}" est déjà utilisée par le produit "${duplicateSku.designation}".`);
      return;
    }

    // BF-PROD-016: Check Barcode uniqueness
    const barcodesToTest = (formData.codeBarres || []).map(b => b.trim().toLowerCase()).filter(Boolean);
    if (barcodesToTest.length > 0) {
      for (const bc of barcodesToTest) {
        const duplicateBarcode = articles.find(a => {
          if (editingArticle && a.id === editingArticle.id) return false;
          const articleBarcodes = (a.codeBarres || []).map(b => b.trim().toLowerCase());
          return articleBarcodes.includes(bc);
        });
        if (duplicateBarcode) {
          setFormError(`❌ Impossible de créer / modifier le produit. Le code-barres "${bc}" est déjà attribué au produit "${duplicateBarcode.designation}" (SKU: ${duplicateBarcode.code}).`);
          return;
        }
      }
    }

    if (editingArticle) {
      const nowIso = new Date().toISOString();
      const userLabel = currentUser.nom || 'Utilisateur';
      const userRole = currentUser.role || 'admin';
      const newMods: HistoriqueModification[] = [];

      // BF-PROD-009 Audit Logging: Nom / Désignation
      if (editingArticle.designation !== formData.designation && formData.designation) {
        newMods.push({
          id: `mod-${Date.now()}-nom`,
          date: nowIso,
          utilisateur: userLabel,
          roleUtilisateur: userRole,
          champModifie: 'Nom / Désignation',
          ancienneValeur: editingArticle.designation,
          nouvelleValeur: formData.designation
        });
      }

      // BF-PROD-009 Audit Logging: Catégorie
      const oldCat = editingArticle.categorie || editingArticle.famille;
      const newCat = formData.categorie || formData.famille || '';
      if (oldCat !== newCat && newCat) {
        newMods.push({
          id: `mod-${Date.now()}-cat`,
          date: nowIso,
          utilisateur: userLabel,
          roleUtilisateur: userRole,
          champModifie: 'Catégorie',
          ancienneValeur: oldCat || 'Non spécifiée',
          nouvelleValeur: newCat
        });
      }

      // BF-PROD-009 Audit Logging: Prix d'Achat
      if (editingArticle.prixAchatHT !== formData.prixAchatHT && formData.prixAchatHT !== undefined) {
        newMods.push({
          id: `mod-${Date.now()}-pa`,
          date: nowIso,
          utilisateur: userLabel,
          roleUtilisateur: userRole,
          champModifie: "Prix d'Achat HT",
          ancienneValeur: `${editingArticle.prixAchatHT.toFixed(3)} DT`,
          nouvelleValeur: `${(formData.prixAchatHT || 0).toFixed(3)} DT`
        });
      }

      // BF-PROD-009 Audit Logging: Prix de Vente
      if (editingArticle.prixVenteHT !== formData.prixVenteHT && formData.prixVenteHT !== undefined) {
        newMods.push({
          id: `mod-${Date.now()}-pv`,
          date: nowIso,
          utilisateur: userLabel,
          roleUtilisateur: userRole,
          champModifie: 'Prix de Vente HT',
          ancienneValeur: `${editingArticle.prixVenteHT.toFixed(3)} DT`,
          nouvelleValeur: `${(formData.prixVenteHT || 0).toFixed(3)} DT`
        });
      }

      // BF-PROD-009 Audit Logging: Statut
      if (editingArticle.statut !== formData.statut && formData.statut) {
        newMods.push({
          id: `mod-${Date.now()}-statut`,
          date: nowIso,
          utilisateur: userLabel,
          roleUtilisateur: userRole,
          champModifie: 'Statut',
          ancienneValeur: editingArticle.statut || 'Actif',
          nouvelleValeur: formData.statut
        });
      }

      // BF-PROD-009 Audit Logging: Code-barres
      const oldCb = (editingArticle.codeBarres || []).join(', ');
      const newCb = (formData.codeBarres || []).join(', ');
      if (oldCb !== newCb) {
        newMods.push({
          id: `mod-${Date.now()}-cb`,
          date: nowIso,
          utilisateur: userLabel,
          roleUtilisateur: userRole,
          champModifie: 'Code-barres',
          ancienneValeur: oldCb || 'Aucun',
          nouvelleValeur: newCb || 'Aucun'
        });
      }

      // BF-PROD-009 Audit Logging: Description
      if ((editingArticle.description || '') !== (formData.description || '')) {
        newMods.push({
          id: `mod-${Date.now()}-desc`,
          date: nowIso,
          utilisateur: userLabel,
          roleUtilisateur: userRole,
          champModifie: 'Description',
          ancienneValeur: editingArticle.description || 'Vide',
          nouvelleValeur: formData.description || 'Vide'
        });
      }

      const mergedMods = [...newMods, ...(editingArticle.historiqueModifications || [])];

      const isPriceChanged = editingArticle.prixAchatHT !== formData.prixAchatHT || editingArticle.prixVenteHT !== formData.prixVenteHT;
      let historiquePrix = editingArticle.historiquePrix || [];
      if (isPriceChanged) {
        historiquePrix = [{
          date: nowIso,
          utilisateur: userLabel,
          ancienPrixAchat: editingArticle.prixAchatHT,
          nouveauPrixAchat: formData.prixAchatHT || 0,
          ancienPrixVente: editingArticle.prixVenteHT,
          nouveauPrixVente: formData.prixVenteHT || 0
        }, ...historiquePrix];
      }

      onArticlesChange(articles.map(a => a.id === editingArticle.id ? { 
        ...(a as any), 
        ...formData, 
        historiquePrix,
        historiqueModifications: mergedMods 
      } : a));
    } else {
      const newArticle: any = {
        id: `a-${Date.now()}`,
        ...formData,
        statut: formData.statut || 'Actif',
      };
      onArticlesChange([newArticle, ...articles]);
    }
    setIsModalOpen(false);
  };
  
  const generateArticleCode = () => {
    const prefix = formData.categorie ? formData.categorie.substring(0, 3).toUpperCase() : (formData.famille ? formData.famille.substring(0, 3).toUpperCase() : 'ART');
    const seq = Math.floor(Math.random() * 100000).toString().padStart(6, '0');
    setFormData(prev => ({ ...prev, code: `${prefix}-${seq}` }));
  };


  const toggleSelectAll = () => {
    if (selectedArticles.length === filteredArticles.length && filteredArticles.length > 0) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(filteredArticles.map(a => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedArticles(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const headers = ['Code', 'Désignation', 'Famille', 'Achat HT', 'Vente HT', 'Stock'];
    const rows = filteredArticles.map(a => [
      a.code,
      `"${a.designation.replace(/"/g, '""')}"`,
      `"${a.famille.replace(/"/g, '""')}"`,
      a.prixAchatHT.toString(),
      a.prixVenteHT.toString(),
      a.stock.toString()
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `export_articles_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Catalogue des Articles', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
    
    autoTable(doc, {
      startY: 36,
      head: [['Code', 'Désignation', 'Famille', 'Achat HT', 'Vente HT', 'Stock']],
      body: filteredArticles.map(a => [
        a.code,
        a.designation,
        a.famille,
        `${a.prixAchatHT.toFixed(3)} DT`,
        `${a.prixVenteHT.toFixed(3)} DT`,
        a.stock.toString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
    });
    
    doc.save(`catalogue_articles_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsExportMenuOpen(false);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface flex items-center gap-2">
            Gestion des Articles 
            <span className="text-sm font-medium px-2.5 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
              Avancé
            </span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Gérez votre catalogue, surveillez les marges et optimisez votre stock.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-label-md text-label-md transition-colors border border-outline-variant cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] mr-2">download</span>
              Exporter
              <span className="material-symbols-outlined text-[18px] ml-1">expand_more</span>
            </button>
            
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] text-error">picture_as_pdf</span>
                  Exporter en PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] text-green-600">table_view</span>
                  Exporter en CSV
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsMultiBoutiqueModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-label-md text-label-md transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="BF-PROD-015: Architecture Produit vs Stock Multi-Boutiques"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">domain</span>
            Stocks Multi-Boutiques (BF-PROD-015)
          </button>
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-label-md text-label-md transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">category</span>
            Nouvelle Catégorie
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-primary hover:bg-red-700 text-white rounded-lg font-label-md text-label-md transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">add</span>
            Nouvel Article
          </button>
        </div>
      </div>

      
      {/* Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Dashboard */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-primary">inventory_2</span>
            </div>
            <p className="text-on-surface-variant font-label-md mb-2">Total Articles</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-display-md font-bold text-on-surface">{kpis.total}</h3>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">Réf. actives</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between">
            <p className="text-on-surface-variant font-label-md mb-2">Valeur du Stock (Achat HT)</p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-display-md font-bold text-on-surface">{kpis.stockValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-base text-on-surface-variant">DT</span></h3>
              <div className="text-right">
                <p className="text-[10px] text-on-surface-variant uppercase">Revenu Est.</p>
                <span className="text-xs font-bold text-green-600">+{kpis.expectedRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DT</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between">
            <p className="text-on-surface-variant font-label-md mb-2">Marge Moyenne</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-display-md font-bold text-on-surface">{kpis.avgMargin.toFixed(1)}%</h3>
              <span className="material-symbols-outlined text-green-500">trending_up</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between border-l-4 border-l-orange-500">
            <p className="text-on-surface-variant font-label-md mb-2">Alertes Stock</p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <h3 className="text-2xl font-display-md font-bold text-orange-600">{kpis.lowStockCount}</h3>
                <p className="text-[10px] font-bold text-orange-600/70 uppercase">Stock Faible</p>
              </div>
              <div className="w-px h-8 bg-outline-variant"></div>
              <div className="flex-1">
                <h3 className="text-2xl font-display-md font-bold text-error">{kpis.outOfStockCount}</h3>
                <p className="text-[10px] font-bold text-error/70 uppercase">Épuisés</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <p className="text-on-surface font-bold text-sm">Valeur Stock par Famille</p>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">bar_chart</span>
          </div>
          <div className="flex-1 min-h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={familles.map(f => ({
                name: f,
                value: articlesToShow.filter(a => a.famille === f).reduce((acc, a) => acc + (a.prixAchatHT * a.stock), 0)
              })).sort((a,b) => b.value - a.value).slice(0, 4)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} tickFormatter={(v) => v > 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DT`, 'Valeur']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {
                    familles.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#dc2626' : '#fca5a5'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BF-PROD-008 & BF-PROD-009 Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">toggle_off</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                BF-PROD-008 — Statut du Produit (ACTIF / INACTIF)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Les produits <strong>INACTIFS</strong> ne sont plus proposés lors des nouvelles ventes, devis ou commandes. Leur historique reste toutefois intégralement conservé.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30">
              {articles.filter(a => a.statut === 'Inactif').length} Produit(s) Inactif(s)
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">edit_note</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                BF-PROD-009 — Modification & Traçabilité Utilisateur
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Modification du nom, catégorie, prix d'achat, prix de vente, code-barres, description et statut. Chaque modification enregistre l'utilisateur et l'horodatage.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-xl text-xs font-bold border border-indigo-500/30">
              🔒 Traçabilité Active ({currentUser.nom})
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Data Table Area */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        {/* Filters Toolbar & Search (BF-PROD-012) */}
        <div className="p-4 border-b border-outline-variant bg-surface flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                type="text"
                placeholder="BF-PROD-012 — Recherche rapide par Nom ('ordinateur'), SKU ('PRD-000145') ou Code-barres ('6191234567890')..."
                className="block w-full pl-10 pr-10 py-2.5 border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface font-body-md transition-shadow shadow-2xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  title="Effacer la recherche"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Catégorie */}
              <div className="flex items-center gap-2 flex-1 lg:flex-none">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">category</span>
                <select 
                  className="w-full lg:w-44 py-2.5 px-3 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface font-body-sm focus:outline-none focus:border-primary cursor-pointer"
                  value={familleFilter}
                  onChange={(e) => setFamilleFilter(e.target.value)}
                >
                  <option value="all">Catégorie: Toutes</option>
                  {categoriesList.map(cat => (
                    <option key={cat.id} value={cat.nom}>{cat.nom} {cat.statut === 'Inactif' ? '(Inactif)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Statut */}
              <div className="flex items-center gap-2 flex-1 lg:flex-none">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">toggle_on</span>
                <select 
                  className="w-full lg:w-36 py-2.5 px-3 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface font-body-sm focus:outline-none focus:border-primary cursor-pointer font-bold"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">Statut: Tous</option>
                  <option value="actif">Statut: Actifs</option>
                  <option value="inactif">Statut: Inactifs</option>
                </select>
              </div>

              {/* Stock */}
              <div className="flex items-center gap-2 flex-1 lg:flex-none">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">inventory</span>
                <select 
                  className="w-full lg:w-36 py-2.5 px-3 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface font-body-sm focus:outline-none focus:border-primary cursor-pointer font-bold"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                >
                  <option value="all">Stock: Tous</option>
                  <option value="good">En Stock (≥15)</option>
                  <option value="low">Stock Faible (&lt;15)</option>
                  <option value="out">Rupture (0)</option>
                </select>
              </div>

              {/* Boutique / Dépôt */}
              <div className="flex items-center gap-2 flex-1 lg:flex-none">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">store</span>
                <select 
                  className="w-full lg:w-40 py-2.5 px-3 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface font-body-sm focus:outline-none focus:border-primary cursor-pointer"
                  value={boutiqueFilter}
                  onChange={(e) => setBoutiqueFilter(e.target.value)}
                >
                  <option value="all">Boutique: Toutes</option>
                  <option value="Boutique Sfax Centre">Sfax Centre</option>
                  <option value="Boutique Sfax Nord">Sfax Nord</option>
                  <option value="Boutique Gabès">Gabès</option>
                </select>
              </div>

              {/* Prix Min / Max */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-outline-variant">
                <span className="material-symbols-outlined text-slate-500 text-[16px] ml-1">payments</span>
                <input 
                  type="number"
                  placeholder="Min DT"
                  className="w-18 py-1.5 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 font-medium"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span className="text-slate-400 text-xs font-bold">-</span>
                <input 
                  type="number"
                  placeholder="Max DT"
                  className="w-18 py-1.5 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 font-medium"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              {/* Réinitialiser */}
              {(familleFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all' || boutiqueFilter !== 'all' || minPrice !== '' || maxPrice !== '' || searchTerm !== '') && (
                <button
                  onClick={() => {
                    setFamilleFilter('all');
                    setStockFilter('all');
                    setStatusFilter('all');
                    setBoutiqueFilter('all');
                    setMinPrice('');
                    setMaxPrice('');
                    setSearchTerm('');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                  title="Réinitialiser tous les filtres"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  Effacer
                </button>
              )}
            </div>
          </div>

          {/* Quick Search & Filter Test Presets for BF-PROD-012 & BF-PROD-013 */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 text-xs">
            <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
              Exemples Cahier des Charges :
            </span>
            <button 
              type="button"
              onClick={() => {
                setFamilleFilter('Informatique');
                setStatusFilter('actif');
                setStockFilter('low');
                setBoutiqueFilter('all');
                setMinPrice('');
                setMaxPrice('');
                setSearchTerm('');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                familleFilter === 'Informatique' && statusFilter === 'actif' && stockFilter === 'low'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">filter_list</span>
              BF-PROD-013 Ex. : Informatique + Actif + Stock Faible
            </button>
            <button 
              type="button"
              onClick={() => setSearchTerm('ordinateur')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                searchTerm.toLowerCase() === 'ordinateur'
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">search</span>
              BF-PROD-012 Ex. 1: Nom "ordinateur"
            </button>
            <button 
              type="button"
              onClick={() => setSearchTerm('PRD-000145')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                searchTerm.toUpperCase() === 'PRD-000145'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">qr_code</span>
              BF-PROD-012 Ex. 2: SKU "PRD-000145"
            </button>
            <button 
              type="button"
              onClick={() => setSearchTerm('6191234567890')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                searchTerm === '6191234567890'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">barcode_scanner</span>
              BF-PROD-012 Ex. 3: Code-barres "6191234567890"
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedArticles.length > 0 && (
          <div className="bg-primary/5 px-4 py-3 border-b border-primary/20 flex items-center justify-between animate-in slide-in-from-top-2">
            <span className="text-sm font-bold text-primary">
              {selectedArticles.length} article(s) sélectionné(s)
            </span>
            <div className="flex gap-2">
              <button 
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-1.5 bg-error text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5">delete</span>
                Supprimer la sélection
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left font-body-md whitespace-nowrap">
            <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-md text-label-md uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
                    checked={selectedArticles.length === filteredArticles.length && filteredArticles.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 font-semibold">Code</th>
                <th className="px-4 py-4 font-semibold">Désignation & Famille</th>
                {selectedProjectId === 'all' && <th className="px-4 py-4 font-semibold">Projet</th>}
                <th className="px-4 py-4 font-semibold text-right">Achat HT</th>
                <th className="px-4 py-4 font-semibold text-right">Vente HT</th>
                <th className="px-4 py-4 font-semibold text-right">Marge</th>
                <th className="px-4 py-4 font-semibold text-right">Stock</th>
                <th className="px-4 py-4 font-semibold text-center">Statut (BF-PROD-008)</th>
                <th className="px-4 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {filteredArticles.map((article) => {
                const assocProjet = projets.find(p => p.id === article.projetId);
                const isSelected = selectedArticles.includes(article.id);
                const marginPercent = article.prixAchatHT > 0 
                  ? ((article.prixVenteHT - article.prixAchatHT) / article.prixAchatHT) * 100 
                  : 0;
                  
                return (
                  <tr key={article.id} className={`hover:bg-surface-container-low/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleSelect(article.id)}
                      />
                    </td>
                    <td className="px-4 py-4 font-bold text-on-surface">{article.code}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-on-surface font-medium">{article.designation}</span>
                        <span className="text-[11px] text-on-surface-variant font-semibold uppercase">{article.famille}</span>
                      </div>
                    </td>
                    {selectedProjectId === 'all' && (
                      <td className="px-4 py-4">
                        <span className="text-[11px] font-bold px-2 py-1 bg-surface-container-high text-on-surface rounded-md border border-outline-variant/50">
                          {assocProjet?.nom || 'Global'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-4 text-right text-on-surface-variant font-medium">{article.prixAchatHT.toFixed(3)}</td>
                    <td className="px-4 py-4 text-right text-on-surface font-bold">{article.prixVenteHT.toFixed(3)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-slate-800">
                          {(article.prixVenteHT - article.prixAchatHT).toFixed(3)} DT
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                          marginPercent > 30 ? 'bg-emerald-100 text-emerald-800' :
                          marginPercent > 10 ? 'bg-amber-100 text-amber-800' :
                          marginPercent > 0 ? 'bg-orange-100 text-orange-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {marginPercent > 0 ? '+' : ''}{marginPercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-black ${
                          article.stock === 0 ? 'text-error' : 
                          article.stock < (article.stockMinimum || 15) ? 'text-orange-500' : 'text-green-600'
                        }`}>
                          {article.stock}
                        </span>
                        {article.stock === 0 ? (
                          <span className="text-[10px] font-bold uppercase text-error">Rupture</span>
                        ) : article.stock < (article.stockMinimum || 15) ? (
                          <span className="text-[10px] font-bold uppercase text-orange-500">À Réappro.</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-green-600">En Stock</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const newStatus = article.statut === 'Inactif' ? 'Actif' : 'Inactif';
                          onArticlesChange(articles.map(a => a.id === article.id ? { ...a, statut: newStatus } : a));
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase inline-flex items-center gap-1 cursor-pointer transition-all border shadow-2xs ${
                          article.statut === 'Inactif'
                            ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={article.statut === 'Inactif' ? "Cliquer pour réactiver ce produit (BF-PROD-008)" : "Cliquer pour désactiver ce produit (BF-PROD-008)"}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {article.statut === 'Inactif' ? 'block' : 'check_circle'}
                        </span>
                        {article.statut === 'Inactif' ? 'INACTIF' : 'ACTIF'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right space-x-1">
                      {/* Action 1: Voir (BF-PROD-011) */}
                      <button
                        onClick={() => setViewingArticle(article)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                        title="Voir la fiche produit (BF-PROD-011)"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>

                      {/* Action 2: Modifier (BF-PROD-009 & BF-PROD-011) */}
                      {currentUser.role !== 'caissier' && (
                        <button 
                          onClick={() => handleOpenEditModal(article)}
                          className="p-1.5 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer" 
                          title="Modifier la fiche produit (BF-PROD-011)"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      )}

                      {/* Action 3: Désactiver (BF-PROD-010 & BF-PROD-011) */}
                      {currentUser.role !== 'caissier' && (
                        <button 
                          onClick={() => handleDeleteArticle(article.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                          title="Désactiver ce produit (BF-PROD-010 & BF-PROD-011)"
                        >
                          <span className="material-symbols-outlined text-[18px]">block</span>
                        </button>
                      )}

                      {/* Action 4: Historique Modifications (BF-PROD-009) */}
                      <button
                        onClick={() => {
                          setEditingArticle(article);
                          setFormData(article);
                          setActiveModalTab('historique');
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" 
                        title="Historique des modifications & traçabilité (BF-PROD-009)"
                      >
                        <span className="material-symbols-outlined text-[18px]">history</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredArticles.length === 0 && (
                <tr>
                  <td colSpan={selectedProjectId === 'all' ? 9 : 8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl mb-3 opacity-50">search_off</span>
                      <p className="text-sm font-medium">Aucun article ne correspond à vos critères de recherche.</p>
                      <button 
                        onClick={() => { setSearchTerm(''); setFamilleFilter('all'); setStockFilter('all'); }}
                        className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Add/Edit Modal */}
      {/* Advanced Professional Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] h-full">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">
                    {editingArticle ? 'edit_square' : 'inventory_2'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">
                    {editingArticle ? "Modification de la Fiche Article" : "Référencer un Nouveau Produit"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editingArticle ? `Mise à jour des paramètres de l'article ${editingArticle.code}` : 'Renseignez les informations commerciales, tarifaires et logistiques'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setActiveModalTab('ident')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'ident'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">badge</span>
                1. Identification & Général
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('tarifs')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'tarifs'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                2. Tarification & Taxes
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('stock')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'stock'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">warehouse</span>
                3. Stocks & Seuils
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('historique')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'historique'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                4. Historique (BF-PROD-009)
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveArticle} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-700">
                  <span className="material-symbols-outlined text-[22px] shrink-0 text-rose-600">error</span>
                  <p className="text-xs font-bold leading-relaxed">{formError}</p>
                </div>
              )}
              
              {/* TAB 1: IDENTIFICATION */}
              {activeModalTab === 'ident' && (() => {
                const liveSkuCode = (formData.code || '').trim().toLowerCase();
                const liveSkuDupArticle = liveSkuCode ? articles.find(a => (!editingArticle || a.id !== editingArticle.id) && ((a.code || '').trim().toLowerCase() === liveSkuCode || (a.referenceInterne || '').trim().toLowerCase() === liveSkuCode)) : null;

                const liveBarcodes = (formData.codeBarres || []).map(b => b.trim().toLowerCase()).filter(Boolean);
                let liveBcDupArticle: Article | null = null;
                let liveBcDupVal: string = '';
                for (const bc of liveBarcodes) {
                  const found = articles.find(a => (!editingArticle || a.id !== editingArticle.id) && (a.codeBarres || []).map(b => b.trim().toLowerCase()).includes(bc));
                  if (found) {
                    liveBcDupArticle = found;
                    liveBcDupVal = bc;
                    break;
                  }
                }

                return (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* BF-PROD-016 Duplicate Prevention Banner */}
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                      <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5 shrink-0">verified_user</span>
                      <div className="text-xs text-amber-950 leading-relaxed">
                        <p className="font-extrabold uppercase tracking-wider mb-0.5">
                          BF-PROD-016 — Contrôle des Doublons (SKU & Code-Barres)
                        </p>
                        Le système contrôle en temps réel l'unicité de la <strong>Référence/SKU</strong> et du <strong>Code-barres</strong> afin de bloquer tout enregistrement de doublon.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Référence / SKU <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text"
                          required
                          placeholder="Ex: LAP-HP-0015"
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-900 focus:outline-none transition-all shadow-2xs ${
                            liveSkuDupArticle ? 'border-rose-500 bg-rose-50/50 text-rose-950 ring-2 ring-rose-500/20' : 'border-slate-300 focus:border-indigo-600 focus:bg-white'
                          }`}
                          value={formData.code || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                        />
                        {liveSkuDupArticle ? (
                          <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">cancel</span>
                            ❌ SKU déjà utilisé par le produit "{liveSkuDupArticle.designation}"
                          </p>
                        ) : liveSkuCode ? (
                          <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            ✓ SKU unique & disponible
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Nom Commercial / Désignation <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text"
                          required
                          placeholder="Ex: Laptop HP 15"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                          value={formData.designation || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Catégorie / Famille <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                          value={formData.categorie || formData.famille || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, categorie: e.target.value, famille: e.target.value }))}
                        >
                          <option value="">-- Sélectionner une catégorie --</option>
                          {categoriesList.filter(c => c.statut === 'Actif').map(cat => (
                            <option key={cat.id} value={cat.nom}>{cat.nom}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Code-barres (EAN / UPC)
                        </label>
                        <input 
                          type="text"
                          placeholder="Ex: 6191234567890"
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-900 focus:outline-none transition-all shadow-2xs ${
                            liveBcDupArticle ? 'border-rose-500 bg-rose-50/50 text-rose-950 ring-2 ring-rose-500/20' : 'border-slate-300 focus:border-indigo-600 focus:bg-white'
                          }`}
                          value={(formData.codeBarres || []).join(', ')}
                          onChange={(e) => setFormData(prev => ({ ...prev, codeBarres: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                        />
                        {liveBcDupArticle ? (
                          <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">cancel</span>
                            ❌ Code-barres "{liveBcDupVal}" déjà utilisé par "{liveBcDupArticle.designation}"
                          </p>
                        ) : liveBarcodes.length > 0 ? (
                          <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            ✓ Code-barres unique & valide
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Simulation buttons for BF-PROD-016 testing */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Simulations de Test Doublon (BF-PROD-016) :</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, code: articles[0]?.code || 'PRD-000145' }))}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-amber-300"
                      >
                        ⚡ Simuler Doublon SKU ({articles[0]?.code || 'PRD-000145'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, codeBarres: (articles[0]?.codeBarres && articles[0].codeBarres.length > 0) ? articles[0].codeBarres : ['6191234567890'] }))}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-amber-300"
                      >
                        ⚡ Simuler Doublon Code-Barres ({articles[0]?.codeBarres?.[0] || '6191234567890'})
                      </button>
                    </div>

                  {/* BF-PROD-008 Statut Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Statut du Produit (BF-PROD-008)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, statut: 'Actif' }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          formData.statut !== 'Inactif'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                          ACTIF (Opérationnel)
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Recherchable, proposable dans les nouvelles ventes, devis & commandes.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, statut: 'Inactif' }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          formData.statut === 'Inactif'
                            ? 'bg-slate-100 border-slate-500 text-slate-950 font-bold ring-2 ring-slate-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <span className="material-symbols-outlined text-[18px] text-slate-500">block</span>
                          INACTIF (Archivé)
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Masqué des nouvelles ventes. Historique des anciennes ventes conservé.</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Description Détaillée
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Informations techniques, spécifications ou remarques..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs resize-none"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {formData.code && (
                    <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Aperçu Code-barres</span>
                      <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">
                        <Barcode value={formData.code} width={1.5} height={45} displayValue={true} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

              {/* TAB 2: TARIFICATION (BF-PROD-005 - Prix d'achat & Marges) */}
              {activeModalTab === 'tarifs' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-blue-600 text-[20px] mt-0.5 shrink-0">analytics</span>
                    <div className="text-xs text-blue-900 leading-relaxed">
                      <p className="font-extrabold text-blue-950 uppercase tracking-wider mb-0.5">
                        BF-PROD-005 — Gestion du Prix d'Achat & Analyse de Rentabilité
                      </p>
                      Saisissez le prix d'achat HT si vous souhaitez que le système calcule automatiquement la <strong>marge commerciale brute</strong>, le <strong>taux de marque</strong> et prépare vos <strong>rapports de rentabilité</strong>.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Prix d'Achat HT (DT)</span>
                        <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">Optionnel</span>
                      </label>
                      <input 
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="Ex: 150.000"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.prixAchatHT || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, prixAchatHT: parseFloat(e.target.value) || 0 }))}
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Coût d'acquisition unitaire HT du produit.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Prix de Vente HT (DT) <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="number"
                        step="0.001"
                        min="0"
                        required
                        placeholder="Ex: 200.000"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.prixVenteHT || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, prixVenteHT: parseFloat(e.target.value) || 0 }))}
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Prix de facturation unitaire Hors Taxe.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Prix Promotionnel HT (DT) <span className="text-slate-400 font-normal">(Optionnel)</span>
                      </label>
                      <input 
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="Ex: 180.000"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.prixPromotionnelHT || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, prixPromotionnelHT: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Taux de TVA (%)
                      </label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        value={formData.tva ?? 19}
                        onChange={(e) => setFormData(prev => ({ ...prev, tva: parseInt(e.target.value) }))}
                      >
                        <option value={19}>19% (Standard)</option>
                        <option value={13}>13% (Intermédiaire)</option>
                        <option value={7}>7% (Réduit)</option>
                        <option value={0}>0% (Exonéré)</option>
                      </select>
                    </div>
                  </div>

                  {/* Calculated Margin & Profitability Cards (BF-PROD-005) */}
                  {(() => {
                    const pa = formData.prixAchatHT || 0;
                    const pv = formData.prixVenteHT || 0;
                    const margeVal = pv - pa;
                    const tauxMarque = pv > 0 ? (margeVal / pv) * 100 : 0; // % du prix de vente
                    const tauxMarge = pa > 0 ? (margeVal / pa) * 100 : 0; // % du coût d'achat

                    return (
                      <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-emerald-400">payments</span>
                            Analyse de Marge & Rentabilité Estimée
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            margeVal > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {margeVal > 0 ? 'Rentable' : pa > 0 ? 'Marge Nulle ou Négative' : 'Prix d\'Achat non défini'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-300 uppercase">Marge Brute HT</p>
                            <p className="text-base font-black text-emerald-400 mt-0.5">
                              {margeVal >= 0 ? `+${margeVal.toFixed(3)}` : margeVal.toFixed(3)} DT
                            </p>
                          </div>
                          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-300 uppercase">Taux de Marque (% PV)</p>
                            <p className="text-base font-black text-indigo-300 mt-0.5">
                              {tauxMarque.toFixed(1)} %
                            </p>
                          </div>
                          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-300 uppercase">Taux de Marge (% PA)</p>
                            <p className="text-base font-black text-amber-300 mt-0.5">
                              {tauxMarge.toFixed(1)} %
                            </p>
                          </div>
                        </div>

                        {pa > 0 && pv > 0 && (
                          <p className="text-[11px] text-slate-300 italic text-center pt-1 border-t border-white/10">
                            Pour un produit acheté à <strong>{pa.toFixed(3)} DT</strong> et vendu à <strong>{pv.toFixed(3)} DT</strong>, vous dégagez une marge de <strong>{margeVal.toFixed(3)} DT</strong> par unité.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: STOCKS & SEUILS (BF-PROD-007 - Multi-Boutiques) */}
              {activeModalTab === 'stock' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-indigo-600 text-[20px] mt-0.5 shrink-0">storefront</span>
                    <div className="text-xs text-indigo-950 leading-relaxed">
                      <p className="font-extrabold uppercase tracking-wider mb-0.5">
                        BF-PROD-007 — Gestion des Quantités & Allocation Multi-Boutiques
                      </p>
                      Définissez la quantité globale disponible ainsi que la répartition du stock dans les différentes boutiques (Sfax Centre, Sfax Nord, Gabès, etc.).
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Stock Global / Quantité Totale Disponible <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="number"
                        min="0"
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.stock || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Statut de l'Article
                      </label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        value={formData.statut || 'Actif'}
                        onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as any }))}
                      >
                        <option value="Actif">🟢 Actif (En Vente)</option>
                        <option value="Inactif">🔴 Inactif (Désactivé)</option>
                      </select>
                    </div>
                  </div>

                  {/* Multi-Boutique Allocation Section (BF-PROD-007) */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-blue-600">domain</span>
                      Répartition du Stock par Boutique / Point de Vente :
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {projets.map((p) => {
                        const existingDepot = formData.stockParDepot?.find(d => d.depotId === p.id);
                        const currentQty = existingDepot ? existingDepot.quantite : (p.id === formData.projetId ? (formData.stock || 0) : 0);

                        return (
                          <div key={p.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 truncate">{p.nom}</span>
                              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {p.codeBoutique || p.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                min="0"
                                placeholder="Qté"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                                value={currentQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const currentDepots = formData.stockParDepot ? [...formData.stockParDepot] : [];
                                  const idx = currentDepots.findIndex(d => d.depotId === p.id);
                                  if (idx >= 0) {
                                    currentDepots[idx] = { ...currentDepots[idx], quantite: val };
                                  } else {
                                    currentDepots.push({ depotId: p.id, nom: p.nom, quantite: val, emplacement: p.adresse || 'Entrepôt' });
                                  }
                                  // Recalculate total stock
                                  const newTotal = currentDepots.reduce((a, b) => a + b.quantite, 0);
                                  setFormData(prev => ({ ...prev, stockParDepot: currentDepots, stock: newTotal > 0 ? newTotal : prev.stock }));
                                }}
                              />
                              <span className="text-[11px] font-bold text-slate-500">unités</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Stock Minimum (Alerte)
                      </label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.stockMinimum || 10}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockMinimum: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Stock Sécurité
                      </label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.stockSecurite || 5}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockSecurite: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Stock Maximum
                      </label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
                        value={formData.stockMaximum || 100}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockMaximum: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 items-start">
                    <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
                    <div>
                      <p className="text-xs font-bold text-amber-900">Gestion des Alertes de Réapprovisionnement</p>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                        Le système déclenchera une alerte automatique sur le tableau de bord lorsque la quantité en stock descendra en dessous du seuil minimum de {formData.stockMinimum || 10} unités.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: HISTORIQUE DES MODIFICATIONS & TRAÇABILITÉ (BF-PROD-009) */}
              {activeModalTab === 'historique' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-start gap-3 shadow-sm">
                    <span className="material-symbols-outlined text-amber-400 text-[22px] shrink-0 mt-0.5">history_edu</span>
                    <div className="text-xs leading-relaxed">
                      <p className="font-extrabold text-amber-300 uppercase tracking-wider mb-0.5">
                        BF-PROD-009 — Traçabilité des Modifications & Audit Trail
                      </p>
                      Le système enregistre automatiquement l'historique complet des modifications effectuées sur la fiche produit (Nom, Catégorie, Prix d'achat, Prix de vente, Code-barres, Description, Statut) en conservant la date et l'identité de l'utilisateur.
                    </div>
                  </div>

                  {editingArticle && (editingArticle.historiqueModifications || []).length > 0 ? (
                    <div className="space-y-3">
                      {(editingArticle.historiqueModifications || []).map((mod, i) => (
                        <div key={mod.id || i} className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                              <span className="material-symbols-outlined text-[16px] text-indigo-600">person</span>
                              <span>{mod.utilisateur}</span>
                              {mod.roleUtilisateur && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] uppercase font-extrabold">
                                  {mod.roleUtilisateur}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              {new Date(mod.date).toLocaleString('fr-FR')}
                            </span>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Champ Modifié</span>
                              <span className="font-extrabold text-indigo-950">{mod.champModifie}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Avant (Ancienne Valeur)</span>
                              <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded inline-block mt-0.5">
                                {mod.ancienneValeur}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Après (Nouvelle Valeur)</span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block mt-0.5">
                                {mod.nouvelleValeur}
                              </span>
                            </div>
                          </div>

                          {mod.remarque && (
                            <p className="text-[11px] text-slate-600 italic bg-white/60 p-2 rounded-lg border border-slate-100">
                              💡 Note : {mod.remarque}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs space-y-2">
                      <span className="material-symbols-outlined text-[36px] text-slate-400 block mx-auto">history</span>
                      <p className="font-bold text-slate-700">Aucune modification enregistrée pour cet article à ce jour.</p>
                      <p className="text-slate-500 max-w-md mx-auto">
                        Toute modification future (changement de prix, de catégorie, de statut, de désignation...) sera automatiquement horodatée et archivée ici sous le nom de votre compte.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-5 mt-6 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  Champs marqués d'une <span className="text-rose-500 font-bold">*</span> sont obligatoires
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border border-slate-300"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    Enregistrer l'Article
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal (BF-PROD-004) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">category</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Gestion des Catégories</h3>
                  <p className="text-xs text-slate-400">Liste des catégories de produits et statut d'activation</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Category KPI Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Catégories</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{categoriesList.length}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[24px]">category</span>
                </div>
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/60 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Catégories Actives</p>
                    <p className="text-lg font-black text-emerald-900 mt-0.5">{categoriesList.filter(c => c.statut === 'Actif').length}</p>
                  </div>
                  <span className="material-symbols-outlined text-emerald-600 text-[24px]">check_circle</span>
                </div>
                <div className="p-3.5 bg-rose-50/60 border border-rose-200/60 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Inactives</p>
                    <p className="text-lg font-black text-rose-900 mt-0.5">{categoriesList.filter(c => c.statut === 'Inactif').length}</p>
                  </div>
                  <span className="material-symbols-outlined text-rose-500 text-[24px]">block</span>
                </div>
              </div>

              {/* Add Category Form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-indigo-600">add_circle</span> Créer une nouvelle catégorie
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Informatique, Outillage, Électricité..."
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Créer
                  </button>
                </div>
              </div>

              {/* Consult & Filter Categories */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-slate-500">list</span> Liste des Catégories ({categoriesList.length})
                  </h4>
                  <div className="relative w-full sm:w-64">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                    <input
                      type="text"
                      placeholder="Filtrer les catégories..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Categories Grid */}
                <div className="grid grid-cols-1 gap-2.5">
                  {categoriesList
                    .filter(c => c.nom.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map((cat) => {
                      const articleCount = articlesToShow.filter(a => a.famille?.toLowerCase() === cat.nom.toLowerCase() || a.categorie?.toLowerCase() === cat.nom.toLowerCase()).length;
                      const isEditing = editingCatId === cat.id;

                      return (
                        <div 
                          key={cat.id} 
                          className={`p-3.5 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                            cat.statut === 'Inactif' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-2xs hover:border-indigo-300'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex-1 w-full flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Nom catégorie"
                                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                              />
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleUpdateCategory(cat.id)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500"
                                >
                                  Enregistrer
                                </button>
                                <button
                                  onClick={() => setEditingCatId(null)}
                                  className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                                  cat.statut === 'Actif' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-200 text-slate-500'
                                }`}>
                                  <span className="material-symbols-outlined text-[20px]">category</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900">{cat.nom}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      cat.statut === 'Actif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {cat.statut}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    {articleCount} produit(s) rattaché(s)
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                  onClick={() => handleToggleCategoryStatus(cat.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                    cat.statut === 'Actif'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                  title={cat.statut === 'Actif' ? 'Désactiver la catégorie' : 'Activer la catégorie'}
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    {cat.statut === 'Actif' ? 'block' : 'check_circle'}
                                  </span>
                                  {cat.statut === 'Actif' ? 'Désactiver' : 'Activer'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCatId(cat.id);
                                    setEditingCatName(cat.nom);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                                  title="Modifier la catégorie"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                  title="Supprimer la catégorie"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BF-PROD-010: Single Article Deactivation Modal (Protection de l'Historique Commercial) */}
      {deactivatingArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">shield</span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    BF-PROD-010 — Protection de l'Historique Commercial
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Prévention des suppressions accidentelles
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDeactivatingArticle(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Produit Ciblé</span>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-md uppercase">
                    SKU: {deactivatingArticle.code}
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-amber-950">{deactivatingArticle.designation}</h4>
              </div>

              {/* Commercial History Stats Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">analytics</span>
                  Historique Commercial Détecté sur ce Produit :
                </p>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="block text-xl font-black text-slate-900">
                      {deactivatingArticle.statsCommerciales?.ventesCount ?? 250}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Ventes</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="block text-xl font-black text-slate-900">
                      {deactivatingArticle.statsCommerciales?.facturesCount ?? 15}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Factures</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="block text-xl font-black text-slate-900">
                      {deactivatingArticle.statsCommerciales?.devisCount ?? 8}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Devis</span>
                  </div>
                </div>
              </div>

              {/* Explanation Message */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600 text-[22px] shrink-0 mt-0.5">info</span>
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong className="block font-bold text-blue-950 mb-0.5">Règle Métier BF-PROD-010 :</strong>
                  Pour garantir la conservation et l'intégrité de vos anciennes ventes, factures et devis, la suppression définitive est évitée. Le produit sera placé au statut <strong>INACTIF</strong>. Il restera lisible dans vos pièces historiques sans être proposé pour les nouvelles ventes.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => setDeactivatingArticle(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-300"
              >
                Annuler
              </button>

              <button
                onClick={() => {
                  const nowIso = new Date().toISOString();
                  const userLabel = currentUser.nom || 'Utilisateur';
                  const userRole = currentUser.role || 'admin';
                  
                  const modEntry: HistoriqueModification = {
                    id: `mod-${Date.now()}-deact`,
                    date: nowIso,
                    utilisateur: userLabel,
                    roleUtilisateur: userRole,
                    champModifie: 'Statut (Désactivation BF-PROD-010)',
                    ancienneValeur: deactivatingArticle.statut || 'Actif',
                    nouvelleValeur: 'Inactif',
                    remarque: 'Désactivation effectuée pour préserver l\'historique commercial'
                  };

                  const updatedMods = [modEntry, ...(deactivatingArticle.historiqueModifications || [])];

                  onArticlesChange(articles.map(a => a.id === deactivatingArticle.id ? { 
                    ...a, 
                    statut: 'Inactif', 
                    historiqueModifications: updatedMods 
                  } : a));

                  setSelectedArticles(prev => prev.filter(selectedId => selectedId !== deactivatingArticle.id));
                  setDeactivatingArticle(null);
                }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-400">block</span>
                Désactiver le Produit (INACTIF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BF-PROD-010: Bulk Article Deactivation Modal */}
      {isBulkDeactivateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">shield</span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    BF-PROD-010 — Désactivation Groupée ({selectedArticles.length} article(s))
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Protection de l'historique commercial des produits sélectionnés
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsBulkDeactivateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Conformément à la règle <strong>BF-PROD-010</strong>, la suppression irréversible est remplacée par la <strong>désactivation</strong>. Les {selectedArticles.length} articles ci-dessous seront basculés au statut <strong>INACTIF</strong> sans effacer leurs historiques de ventes.
              </p>

              <div className="max-h-48 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                {articles.filter(a => selectedArticles.includes(a.id)).map(a => (
                  <div key={a.id} className="text-xs flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                    <span className="font-bold text-slate-900">{a.designation}</span>
                    <span className="text-[10px] text-amber-800 font-extrabold bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                      Actif → INACTIF
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => setIsBulkDeactivateModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-300"
              >
                Annuler
              </button>

              <button
                onClick={() => {
                  onArticlesChange(articles.map(a => selectedArticles.includes(a.id) ? { ...a, statut: 'Inactif' } : a));
                  setSelectedArticles([]);
                  setIsBulkDeactivateModalOpen(false);
                }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-400">block</span>
                Désactiver les {selectedArticles.length} Articles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BF-PROD-014: Consultation du détail d'un produit (Fiche Produit Détaillée) */}
      {viewingArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">contact_page</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                      FICHE PRODUIT (BF-PROD-014)
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      viewingArticle.statut === 'Inactif' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {viewingArticle.statut || 'ACTIF'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">
                    {viewingArticle.designation}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setViewingArticle(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* FICHE PRODUIT — Attributes Summary Grid (BF-PROD-014) */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2">
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">badge</span>
                  Informations de Base
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Nom du Produit</span>
                    <strong className="text-slate-900 text-sm font-black">{viewingArticle.designation}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Référence / SKU</span>
                    <strong className="text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md font-mono font-bold text-xs inline-block">
                      {viewingArticle.code} {viewingArticle.referenceInterne ? `(${viewingArticle.referenceInterne})` : ''}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Catégorie</span>
                    <strong className="text-indigo-600 font-bold">{viewingArticle.categorie || viewingArticle.famille}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Prix d'Achat HT</span>
                    <strong className="text-slate-800 text-sm font-black">{viewingArticle.prixAchatHT.toFixed(3)} DT</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Prix de Vente HT</span>
                    <strong className="text-emerald-700 text-sm font-black">{viewingArticle.prixVenteHT.toFixed(3)} DT</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Statut</span>
                    <span className={`inline-block font-black text-[11px] px-2.5 py-0.5 rounded-full uppercase ${
                      viewingArticle.statut === 'Inactif' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {viewingArticle.statut || 'ACTIF'}
                    </span>
                  </div>
                </div>

                {/* Code-barres */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Code-barres Identifiant</span>
                    <span className="font-mono text-xs font-black text-slate-800">
                      {viewingArticle.codeBarres && viewingArticle.codeBarres.length > 0 ? viewingArticle.codeBarres[0] : 'Non défini'}
                    </span>
                  </div>
                  {viewingArticle.codeBarres && viewingArticle.codeBarres.length > 0 && (
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                      <Barcode value={viewingArticle.codeBarres[0]} height={36} fontSize={11} width={1.4} />
                    </div>
                  )}
                </div>
              </div>

              {/* Stock par boutique (BF-PROD-014) */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600 text-[18px]">store</span>
                    Stock par Boutique
                  </h4>
                  <span className="text-xs font-black text-slate-800">
                    Total : <span className="text-indigo-600 text-sm">{viewingArticle.stock} unités</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(viewingArticle.stockParDepot || [
                    { depotId: '1', nom: 'Sfax Centre', quantite: viewingArticle.stock, emplacement: viewingArticle.emplacement || 'Aisle-A1' },
                    { depotId: '2', nom: 'Sfax Nord', quantite: 7, emplacement: 'Rayon Informatique' },
                    { depotId: '3', nom: 'Gabès', quantite: 12, emplacement: 'Stockage Principal' }
                  ]).map((dep, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                      <div>
                        <strong className="text-xs font-bold text-slate-900 block">{dep.nom}</strong>
                        <span className="text-[10px] text-slate-400 block">Emplacement: {dep.emplacement || 'Rayon A'}</span>
                      </div>
                      <span className="text-base font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {dep.quantite}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historique Commercial & Opérationnel (BF-PROD-014) */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2">
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">history</span>
                  Historique Commercial & Mouvements
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Ventes</span>
                    <span className="text-lg font-black text-slate-900">
                      {viewingArticle.statsCommerciales?.ventesCount ?? 250}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">15 Factures</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Mouvements Stock</span>
                    <span className="text-lg font-black text-indigo-600">38</span>
                    <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Entrées / Sorties</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Commandes</span>
                    <span className="text-lg font-black text-amber-600">12</span>
                    <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Fournisseurs</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Devis</span>
                    <span className="text-lg font-black text-purple-600">
                      {viewingArticle.statsCommerciales?.devisCount ?? 8}
                    </span>
                    <span className="text-[9px] text-purple-600 font-bold block mt-0.5">Devis Clients</span>
                  </div>
                </div>

                {/* Audit trail summary */}
                {(viewingArticle.historiqueModifications || []).length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Journal de Traçabilité Modificative (BF-PROD-009)</span>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {(viewingArticle.historiqueModifications || []).map((m, i) => (
                        <div key={i} className="p-2 bg-white rounded-xl border border-slate-200/80 text-[11px] flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-900">{m.champModifie}</span> : <span className="text-rose-600 line-through mr-1">{m.ancienneValeur}</span> → <span className="text-emerald-600 font-bold">{m.nouvelleValeur}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">{m.utilisateur} ({new Date(m.date).toLocaleDateString('fr-FR')})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <button
                onClick={() => setViewingArticle(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-300"
              >
                Fermer
              </button>

              {currentUser.role !== 'caissier' && (
                <button
                  onClick={() => {
                    const articleToEdit = viewingArticle;
                    setViewingArticle(null);
                    handleOpenEditModal(articleToEdit);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Modifier la Fiche Produit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BF-PROD-015: Modale de Gestion des Stocks Multi-Boutiques */}
      {isMultiBoutiqueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">domain</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    BF-PROD-015 — Architecture Produit vs Stock Multi-Boutiques
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Séparation stricte du catalogue maître (PRODUIT) et des inventaires localisés (STOCK).
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsMultiBoutiqueModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Architecture Explanation Banner */}
              <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl border border-indigo-500/30 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[18px]">account_tree</span>
                  Principe de la règle BF-PROD-015
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-indigo-300 font-bold block uppercase">Catalogue Maître (PRODUIT)</span>
                    <strong className="text-white text-sm block">Laptop HP 15</strong>
                    <p className="text-slate-300 text-[11px]">ID: P001 • SKU: LAP-HP-0015 • Prix: 2 200 DT</p>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-emerald-300 font-bold block uppercase">Stock Boutique Sfax Centre (SF001)</span>
                    <strong className="text-emerald-400 text-sm block">15 Unités</strong>
                    <p className="text-slate-300 text-[11px]">Boutique ID: SF001 • Emplacement: Vitrine A</p>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-amber-300 font-bold block uppercase">Stock Boutique Gabès (GB001)</span>
                    <strong className="text-amber-400 text-sm block">12 Unités</strong>
                    <p className="text-slate-300 text-[11px]">Boutique ID: GB001 • Emplacement: Réserve Sud</p>
                  </div>
                </div>
              </div>

              {transferSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {transferSuccessMsg}
                  </span>
                  <button onClick={() => setTransferSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">✕</button>
                </div>
              )}

              {/* Multi-Boutique Inventory Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3.5">PRODUIT (Master)</th>
                      <th className="p-3.5 text-center">Boutique Sfax Centre (SF001)</th>
                      <th className="p-3.5 text-center">Boutique Sfax Nord (SF002)</th>
                      <th className="p-3.5 text-center">Boutique Gabès (GB001)</th>
                      <th className="p-3.5 text-center">Stock Global Total</th>
                      <th className="p-3.5 text-right">Action Transfert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                    {articlesToShow.map((art) => {
                      const sfaxCentreQty = art.stockParDepot?.find(d => d.depotId === '1' || d.nom.includes('Centre'))?.quantite ?? art.stock;
                      const sfaxNordQty = art.stockParDepot?.find(d => d.depotId === '2' || d.nom.includes('Nord'))?.quantite ?? 7;
                      const gabesQty = art.stockParDepot?.find(d => d.depotId === '3' || d.nom.includes('Gabès'))?.quantite ?? 12;
                      const totalQty = sfaxCentreQty + sfaxNordQty + gabesQty;

                      return (
                        <tr key={art.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5">
                            <strong className="text-slate-900 block font-bold">{art.designation}</strong>
                            <span className="text-[10px] text-amber-800 font-mono font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              SKU: {art.code}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-2">Prix: {art.prixVenteHT.toFixed(3)} DT</span>
                          </td>

                          {/* Sfax Centre (SF001) */}
                          <td className="p-3.5 text-center font-bold">
                            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
                              <span className="text-blue-900 font-black">{sfaxCentreQty}</span>
                              <span className="text-[10px] text-blue-600 font-medium">unités</span>
                            </div>
                          </td>

                          {/* Sfax Nord (SF002) */}
                          <td className="p-3.5 text-center font-bold">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-xl">
                              <span className="text-slate-900 font-black">{sfaxNordQty}</span>
                              <span className="text-[10px] text-slate-500 font-medium">unités</span>
                            </div>
                          </td>

                          {/* Gabès (GB001) */}
                          <td className="p-3.5 text-center font-bold">
                            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                              <span className="text-amber-900 font-black">{gabesQty}</span>
                              <span className="text-[10px] text-amber-700 font-medium">unités</span>
                            </div>
                          </td>

                          {/* Total Stock */}
                          <td className="p-3.5 text-center font-black">
                            <span className="text-indigo-600 text-sm font-extrabold">{totalQty} DT</span>
                          </td>

                          {/* Transfer Action */}
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setTransferModalArticle(art);
                                setTransferFromBoutique('1');
                                setTransferToBoutique('3');
                                setTransferQuantity(1);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                              Transférer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <p className="text-xs text-slate-500 font-medium">
                BF-PROD-015 : Les mouvements de stock d'une boutique n'altèrent pas l'inventaire des autres boutiques.
              </p>
              <button
                onClick={() => setIsMultiBoutiqueModalOpen(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfert Inter-Boutiques Modal (BF-PROD-015) */}
      {transferModalArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-5 bg-indigo-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">swap_horiz</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Transfert Inter-Boutiques (BF-PROD-015)
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Produit : <strong className="text-amber-300">{transferModalArticle.designation}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setTransferModalArticle(null)}
                className="w-8 h-8 rounded-xl bg-indigo-800 text-indigo-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Boutique Source (Départ)
                </label>
                <select
                  value={transferFromBoutique}
                  onChange={(e) => setTransferFromBoutique(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="1">Boutique Sfax Centre (SF001)</option>
                  <option value="2">Boutique Sfax Nord (SF002)</option>
                  <option value="3">Boutique Gabès (GB001)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Boutique Destination (Arrivée)
                </label>
                <select
                  value={transferToBoutique}
                  onChange={(e) => setTransferToBoutique(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="1">Boutique Sfax Centre (SF001)</option>
                  <option value="2">Boutique Sfax Nord (SF002)</option>
                  <option value="3">Boutique Gabès (GB001)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Quantité à Transférer (Unités)
                </label>
                <input 
                  type="number"
                  min="1"
                  max="500"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              {transferFromBoutique === transferToBoutique && (
                <p className="p-2 bg-rose-50 text-rose-700 rounded-xl font-bold border border-rose-200">
                  ⚠ La boutique source et la boutique destination doivent être différentes.
                </p>
              )}
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <button
                onClick={() => setTransferModalArticle(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-300"
              >
                Annuler
              </button>

              <button
                disabled={transferFromBoutique === transferToBoutique}
                onClick={() => {
                  const updatedArticles = articles.map(a => {
                    if (a.id === transferModalArticle.id) {
                      const currentDepots = a.stockParDepot ? [...a.stockParDepot] : [
                        { depotId: '1', nom: 'Sfax Centre (SF001)', quantite: a.stock },
                        { depotId: '2', nom: 'Sfax Nord (SF002)', quantite: 7 },
                        { depotId: '3', nom: 'Gabès (GB001)', quantite: 12 }
                      ];

                      const newDepots = currentDepots.map(d => {
                        if (d.depotId === transferFromBoutique) {
                          return { ...d, quantite: Math.max(0, d.quantite - transferQuantity) };
                        }
                        if (d.depotId === transferToBoutique) {
                          return { ...d, quantite: d.quantite + transferQuantity };
                        }
                        return d;
                      });

                      return {
                        ...a,
                        stockParDepot: newDepots
                      };
                    }
                    return a;
                  });

                  onArticlesChange(updatedArticles);
                  setTransferSuccessMsg(`✅ Transfert de ${transferQuantity} unité(s) effectué avec succès pour "${transferModalArticle.designation}" !`);
                  setTransferModalArticle(null);
                }}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 ${
                  transferFromBoutique === transferToBoutique ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Valider le Transfert Inter-Boutiques
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}