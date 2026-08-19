import os

replacements = [
    ("Tous les projets", "Toutes les boutiques"),
    ("projetNom", "boutiqueNom"), # Assuming we don't change field names in mockAuditLogs... let's just stick to UI texts.
    ("sur tous les projets", "sur toutes les boutiques"),
    ("projets actifs", "boutiques actives"),
    ("un projet", "une boutique"),
    ("son espace", "son espace"),
    ("Chef de Projet", "Chef de Boutique"),
    ("rôle, projet", "rôle, boutique"),
    ("aux projets", "aux boutiques"),
    ("par projet", "par boutique"),
]

files = [
    'src/components/AdminAuditLogs.tsx',
    'src/components/AdminOverview.tsx',
    'src/components/AdminStatistics.tsx',
    'src/components/AdminUsers.tsx'
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(file, 'w') as f:
        f.write(content)
