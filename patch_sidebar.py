import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

# Update getFilteredMenuSections
old_filter = """  // Filtre les sections et items selon le rôle
  const getFilteredMenuSections = () => {
    let sections = [
      {
        title: 'Principal',
        items: [
          { id: 'dashboard', label: 'Tableau de bord', icon: 'space_dashboard' },
          { id: 'projets', label: 'Projets & Chantiers', icon: 'business_center' },
          { id: 'stock', label: 'Gestion des Stocks', icon: 'inventory_2' },
          { id: 'articles', label: 'Référentiel Articles', icon: 'category', badge: lowStockCount > 0 ? lowStockCount.toString() : undefined, badgeColor: 'bg-orange-500' },
        ]
      },
      {
        title: 'Tiers',
        items: [
          { id: 'clients', label: 'Clients & Devis', icon: 'groups' },
          { id: 'fournisseurs', label: 'Fournisseurs', icon: 'local_shipping' },
        ]
      },
      {
        title: 'Finance & Trésorerie',
        items: [
          { id: 'ventes', label: 'Ventes & Factures', icon: 'point_of_sale' },
          { id: 'achats', label: 'Achats & Dépenses', icon: 'shopping_cart' },
          { id: 'caisse', label: 'Caisse & Trésorerie', icon: 'account_balance_wallet' },
          { id: 'credits', label: 'Crédits & Relances', icon: 'credit_score' },
        ]
      }
    ];

    if (currentUser.role === 'admin') {
      sections.push({
        title: 'Administration',
        items: [
          { id: 'admin-overview', label: 'Vue d\\'ensemble', icon: 'admin_panel_settings' },
          { id: 'admin-users', label: 'Utilisateurs & Accès', icon: 'manage_accounts' },
        ]
      });
    }

    return sections;
  };"""

new_filter = """  // Filtre les sections et items selon le rôle
  const getFilteredMenuSections = () => {
    const role = currentUser.role;
    let sections = [];

    if (role === 'admin') {
      sections = [
        {
          title: 'Principal',
          items: [
            { id: 'dashboard', label: 'Tableau de bord', icon: 'space_dashboard' },
            { id: 'projets', label: 'Boutiques & Projets', icon: 'storefront' },
            { id: 'stock', label: 'Gestion des Stocks', icon: 'inventory_2' },
            { id: 'articles', label: 'Référentiel Articles', icon: 'category', badge: lowStockCount > 0 ? lowStockCount.toString() : undefined, badgeColor: 'bg-orange-500' },
          ]
        },
        {
          title: 'Tiers',
          items: [
            { id: 'clients', label: 'Clients & Devis', icon: 'groups' },
            { id: 'fournisseurs', label: 'Fournisseurs', icon: 'local_shipping' },
          ]
        },
        {
          title: 'Finance & Trésorerie',
          items: [
            { id: 'ventes', label: 'Ventes & Factures', icon: 'point_of_sale' },
            { id: 'achats', label: 'Achats & Dépenses', icon: 'shopping_cart' },
            { id: 'caisse', label: 'Caisse & Trésorerie', icon: 'account_balance_wallet' },
            { id: 'credits', label: 'Crédits & Relances', icon: 'credit_score' },
          ]
        },
        {
          title: 'Administration',
          items: [
            { id: 'admin-overview', label: 'Vue d\\'ensemble', icon: 'admin_panel_settings' },
            { id: 'admin-users', label: 'Utilisateurs & Accès', icon: 'manage_accounts' },
          ]
        }
      ];
    } else if (role === 'comptable') {
      sections = [
        {
          title: 'Finance & Trésorerie',
          items: [
            { id: 'dashboard', label: 'Tableau de bord', icon: 'space_dashboard' },
            { id: 'ventes', label: 'Ventes & Factures', icon: 'point_of_sale' },
            { id: 'achats', label: 'Achats & Dépenses', icon: 'shopping_cart' },
            { id: 'caisse', label: 'Caisse & Trésorerie', icon: 'account_balance_wallet' },
            { id: 'credits', label: 'Crédits & Relances', icon: 'credit_score' },
          ]
        },
        {
          title: 'Tiers & Référentiel',
          items: [
            { id: 'clients', label: 'Clients & Devis', icon: 'groups' },
            { id: 'fournisseurs', label: 'Fournisseurs', icon: 'local_shipping' },
            { id: 'articles', label: 'Référentiel Articles', icon: 'category' },
          ]
        }
      ];
    } else if (role === 'caissier') {
      sections = [
        {
          title: 'Point de Vente',
          items: [
            { id: 'ventes', label: 'Ventes & Factures', icon: 'point_of_sale' },
            { id: 'caisse', label: 'Ma Caisse', icon: 'account_balance_wallet' },
            { id: 'articles', label: 'Consultation Articles', icon: 'category' },
            { id: 'clients', label: 'Consultation Clients', icon: 'groups' },
          ]
        }
      ];
    }

    return sections;
  };"""

content = content.replace(old_filter, new_filter)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
