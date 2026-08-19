import re

with open('src/data.ts', 'r') as f:
    content = f.read()

target = "export const mockArticles: Article[] = ["
replacement = """export const mockArticles: Article[] = [
  { id: 'laptop-15', projetId: '1', code: 'LAP-HP-0015', designation: 'Laptop HP 15', famille: 'Ordinateurs portables', codeBarres: ['6191234567890'], prixAchatHT: 1850, prixVenteHT: 2200, stock: 15, statut: 'Actif', description: 'Ordinateur portable HP 15 pouces haute performance' },"""

if 'LAP-HP-0015' not in content:
    content = content.replace(target, replacement)
    with open('src/data.ts', 'w') as f:
        f.write(content)
    print("Added Laptop HP 15 to mockArticles in src/data.ts")
else:
    print("Laptop HP 15 already present")
