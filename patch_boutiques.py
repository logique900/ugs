import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

replacements_projets = [
    ("Gestion des Projets & Chantiers", "Gestion des Boutiques"),
    ("Gérez vos chantiers", "Gérez vos succursales et points de vente"),
    ("Nouvel Espace Projet", "Nouvelle Boutique"),
    ("Nouveau Projet", "Nouvelle Boutique"),
    ("Nom du projet", "Nom de la boutique"),
    ("Projet Alpha", "Boutique Sfax Centre"),
    ("Ce projet", "Cette boutique"),
    ("projet a été", "boutique a été"),
    ("le projet", "la boutique"),
    ("du projet", "de la boutique"),
    ("Chef de projet", "Responsable boutique"),
    ("Projets Actifs", "Boutiques Actives"),
    ("Chantier", "Boutique"),
    ("Projet", "Boutique"),
    ("projet", "boutique")
]

replace_in_file('src/components/Projets.tsx', [
    ('Projets & Chantiers', 'Boutiques'),
    ('Créer un Nouveau Projet', 'Créer une Nouvelle Boutique'),
    ('Modifier le Projet', 'Modifier la Boutique'),
    ('Nom du projet', 'Nom de la boutique'),
    ('Description du projet', 'Description de la boutique'),
    ('Supprimer le projet', 'Supprimer la boutique'),
    ('Détails du projet', 'Détails de la boutique'),
    ('Gestion des Projets', 'Gestion des Boutiques'),
    ('Nouveau Projet', 'Nouvelle Boutique'),
    ('Aucun projet', 'Aucune boutique'),
    ('ce projet', 'cette boutique'),
    ('Le projet', 'La boutique'),
    ('le projet', 'la boutique'),
    ('Chef de projet', 'Gérant / Responsable'),
    ('Gérez vos projets', 'Gérez vos succursales'),
])

replace_in_file('src/components/Sidebar.tsx', [
    ("{ id: 'projets', label: 'Boutiques & Projets', icon: 'storefront' }", "{ id: 'projets', label: 'Boutiques', icon: 'storefront' }"),
])

replace_in_file('src/data.ts', [
    ("Boutique A - Centre Ville", "Boutique Sfax Centre"),
    ("Boutique B - Centre Commercial", "Boutique Sfax Nord"),
    ("Boutique C - En ligne", "Boutique Gabès"),
])

print("Patched UI texts")
