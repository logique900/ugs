import re
with open('src/components/Ventes.tsx', 'r') as f:
    c = f.read()

# Fix the specific lines 297, 304, 309, 343 which use quote.projetId
c = c.replace('quote.projetId', 'newSale.projetId')
c = c.replace('quote.lignes', 'newSale.lignes')

with open('src/components/Ventes.tsx', 'w') as f:
    f.write(c)

