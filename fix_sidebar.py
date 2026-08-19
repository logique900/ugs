import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

# Fix Projets Actifs
content = content.replace('Projets Actifs', 'Boutiques Actives')

# Add Boutiques to admin menu
old_admin_menu = """      {
        title: 'PILOTAGE & STRATÉGIE',
        items: [
          { id: 'dashboard' as TabType, label: 'Tableau de bord', icon: 'dashboard', badge: 'Vue 360' }
        ]
      },
      {
        title: 'RÉFÉRENTIEL & LOGISTIQUE',
        items: [
          { id: 'articles' as TabType, label: 'Articles & Catalogue', icon: 'inventory_2' },
          { id: 'stock' as TabType, label: 'Gestion des Stocks', icon: 'warehouse', badge: lowStockCount > 0 ? `${lowStockCount} alertes` : undefined },
          { id: 'clients' as TabType, label: 'Clients & Tiers', icon: 'groups' },
          { id: 'fournisseurs' as TabType, label: 'Fournisseurs', icon: 'local_shipping' }
        ]
      },"""

new_admin_menu = """      {
        title: 'PILOTAGE & STRATÉGIE',
        items: [
          { id: 'dashboard' as TabType, label: 'Tableau de bord', icon: 'dashboard', badge: 'Vue 360' },
          { id: 'projets' as TabType, label: 'Gestion des Boutiques', icon: 'storefront' }
        ]
      },
      {
        title: 'RÉFÉRENTIEL & LOGISTIQUE',
        items: [
          { id: 'articles' as TabType, label: 'Articles & Catalogue', icon: 'inventory_2' },
          { id: 'stock' as TabType, label: 'Gestion des Stocks', icon: 'warehouse', badge: lowStockCount > 0 ? `${lowStockCount} alertes` : undefined },
          { id: 'clients' as TabType, label: 'Clients & Tiers', icon: 'groups' },
          { id: 'fournisseurs' as TabType, label: 'Fournisseurs', icon: 'local_shipping' }
        ]
      },"""

if old_admin_menu in content:
    content = content.replace(old_admin_menu, new_admin_menu)
else:
    print("Warning: Could not find admin menu to patch")

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
