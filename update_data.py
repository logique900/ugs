import re

with open('src/data.ts', 'r') as f:
    content = f.read()

new_projets = """export const mockProjets: Projet[] = [
  { id: '1', nom: 'Boutique Sfax Centre', statut: 'Actif', description: 'Boutique principale - Centre ville', dateCreation: '2023-01-15', responsable: 'Caissier A' },
  { id: '2', nom: 'Boutique Sfax Nord', statut: 'Actif', description: 'Succursale Sfax Nord', dateCreation: '2023-06-20', responsable: 'Caissier B' },
  { id: '3', nom: 'Boutique Gabès', statut: 'Actif', description: 'Succursale Sud', dateCreation: '2022-11-05', responsable: 'Caissier C' },
];"""

content = re.sub(
    r"export const mockProjets: Projet\[\] = \[\n(?:.*\n)*?\];",
    new_projets,
    content
)

with open('src/data.ts', 'w') as f:
    f.write(content)
