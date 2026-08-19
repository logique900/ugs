import re

with open('src/components/Projets.tsx', 'r') as f:
    content = f.read()

replacements = [
    ("Nom du Projet", "Nom de la boutique"),
    ("Projet Construction Alpha", "Boutique Centre-Ville"),
    ("Description détaillée du projet...", "Description détaillée de la boutique..."),
]

for old, new in replacements:
    content = content.replace(old, new)

with open('src/components/Projets.tsx', 'w') as f:
    f.write(content)
