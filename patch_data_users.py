import re

with open('src/data.ts', 'r') as f:
    content = f.read()

new_users = """export const mockUsers: Utilisateur[] = [
  { id: 'u1', nom: 'Super Admin', email: 'admin@entreprise.com', motDePasse: 'admin123', role: 'admin', statut: 'Actif', projetsAffectes: ['1', '2', '3'] },
  { id: 'u2', nom: 'Comptable Central', email: 'comptable@entreprise.com', motDePasse: 'comptable123', role: 'comptable', statut: 'Actif', projetsAffectes: ['1', '2'] },
  { id: 'u3', nom: 'Caissier A', email: 'caissier.a@entreprise.com', motDePasse: 'caissier123', role: 'caissier', statut: 'Actif', projetId: '1', projetsAffectes: ['1'] },
  { id: 'u4', nom: 'Caissier B', email: 'caissier.b@entreprise.com', motDePasse: 'caissier123', role: 'caissier', statut: 'Actif', projetId: '2', projetsAffectes: ['2'] },
];"""

content = re.sub(
    r"export const mockUsers: Utilisateur\[\] = \[\n(?:.*\n)*?\];",
    new_users,
    content
)

new_projets = """export const mockProjets: Projet[] = [
  { id: '1', nom: 'Boutique A - Centre Ville', statut: 'Actif', description: 'Boutique principale', dateCreation: '2023-01-15', responsable: 'Caissier A' },
  { id: '2', nom: 'Boutique B - Centre Commercial', statut: 'Actif', description: 'Succursale Nord', dateCreation: '2023-06-20', responsable: 'Caissier B' },
  { id: '3', nom: 'Boutique C - En ligne', statut: 'Archivé', description: 'E-commerce', dateCreation: '2022-11-05', responsable: 'Super Admin' },
];"""

content = re.sub(
    r"export const mockProjets: Projet\[\] = \[\n(?:.*\n)*?\];",
    new_projets,
    content
)

with open('src/data.ts', 'w') as f:
    f.write(content)
