import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

replacements = [
    ('>Projets<', '>Boutiques<'),
    ('Espaces de Travail & Projets', 'Espaces de Travail & Boutiques'),
    ('Sélectionnez un projet pour', 'Sélectionnez une boutique pour'),
    ('Ouvrir Projet', 'Ouvrir Boutique'),
    ('Nouveau Projet', 'Nouvelle Boutique'),
    ('Fiche Projet', 'Fiche Boutique'),
    ('Description du Projet', 'Description de la boutique'),
    ('Factures du Projet', 'Factures de la Boutique'),
    ('ce projet.', 'cette boutique.'),
    ("Espace Projet Complet", "Espace Boutique Complet"),
    ("Modifier le Projet", "Modifier la Boutique"),
    ("Nom du Projet", "Nom de la Boutique"),
    ("Projet Construction Alpha", "Boutique Centre-Ville"),
    ("Description détaillée du projet...", "Description détaillée de la boutique..."),
]

for old, new in replacements:
    content = content.replace(old, new)

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)
