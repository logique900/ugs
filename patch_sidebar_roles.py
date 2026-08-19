import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

old_roles = """    if (currentUser?.role === 'agent') {
      sections = [
        {
          title: 'ESPACE AGENT',
          items: [
            { id: 'dashboard' as TabType, label: 'Tableau de bord', icon: 'dashboard' },
            { id: 'articles' as TabType, label: 'Catalogue', icon: 'inventory_2' },
            { id: 'stock' as TabType, label: 'Stocks', icon: 'warehouse' },
            { id: 'clients' as TabType, label: 'Clients', icon: 'groups' },
            { id: 'ventes' as TabType, label: 'Ventes', icon: 'receipt_long' }
          ]
        }
      ];
    } else if (currentUser?.role === 'comptable') {"""

new_roles = """    if (currentUser?.role === 'agent' || currentUser?.role === 'caissier') {
      sections = [
        {
          title: 'ESPACE CAISSE & VENTES',
          items: [
            { id: 'articles' as TabType, label: 'Produits', icon: 'inventory_2' },
            { id: 'stock' as TabType, label: 'Stock', icon: 'warehouse' },
            { id: 'caisse' as TabType, label: 'Caisse', icon: 'account_balance_wallet' },
            { id: 'ventes' as TabType, label: 'Ventes', icon: 'receipt_long' },
            { id: 'clients' as TabType, label: 'Clients', icon: 'groups' }
          ]
        }
      ];
    } else if (currentUser?.role === 'comptable') {"""

content = content.replace(old_roles, new_roles)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)

