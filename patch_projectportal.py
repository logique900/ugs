import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

replacements = [
    ("Portail Projets", "Portail Boutiques"),
    ("Gestion des Projets", "Gestion des Boutiques"),
    ("Projets & Chantiers", "Boutiques & Succursales"),
    ("Multi-Projets", "Multi-Boutiques"),
    ("projets existants", "boutiques existantes"),
    ("ce projet", "cette boutique"),
    ("Ce projet", "Cette boutique"),
    ("Projets", "Boutiques"),
    ("projet", "boutique"),
    ("Projet", "Boutique"),
]

for old, new in replacements:
    content = content.replace(old, new)

# Undo case where we messed up imports or variables if needed
# Wait, "Projet" is replaced to "Boutique" - that will break the type `Projet`
# I should just wipe specific UI text.
