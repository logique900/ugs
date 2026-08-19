import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

# Fix Projets Actifs
content = content.replace('Projets Actifs', 'Boutiques Actives')

old_admin_menu = """        title: 'PILOTAGE & STRATÉGIE',
        items: [
          { id: 'dashboard' as TabType, label: 'Tableau de bord', icon: 'dashboard', badge: 'Vue 360' }
        ]"""

new_admin_menu = """        title: 'PILOTAGE & STRATÉGIE',
        items: [
          { id: 'dashboard' as TabType, label: 'Tableau de bord', icon: 'dashboard', badge: 'Vue 360' },
          { id: 'projets' as TabType, label: 'Gestion des Boutiques', icon: 'storefront' }
        ]"""

content = content.replace(old_admin_menu, new_admin_menu)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
