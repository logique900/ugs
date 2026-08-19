import re

with open('src/components/AdminUsers.tsx', 'r') as f:
    content = f.read()

content = content.replace("Accès Global (Toutes Boutiques)", "Accès Global (Toutes Boutiques)")
content = content.replace("Boutique d'Affectation", "Boutique d'Affectation")
content = content.replace("Chef de Projet", "Chef de Boutique")

with open('src/components/AdminUsers.tsx', 'w') as f:
    f.write(content)
