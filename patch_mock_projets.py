import re

with open('src/data.ts', 'r') as f:
    content = f.read()

old_mocks = """export const mockProjets: Projet[] = [
  { id: '1', nom: 'Boutique Sfax Centre', statut: 'Actif', description: 'Boutique principale - Centre ville', dateCreation: '2023-01-15', responsable: 'Caissier A' },
  { id: '2', nom: 'Boutique Sfax Nord', statut: 'Actif', description: 'Succursale Sfax Nord', dateCreation: '2023-06-20', responsable: 'Caissier B' },
  { id: '3', nom: 'Boutique Gabès', statut: 'Actif', description: 'Succursale Sud', dateCreation: '2022-11-05', responsable: 'Caissier C' },
];"""

new_mocks = """export const mockProjets: Projet[] = [
  { id: '1', nom: 'Boutique Sfax Centre', codeBoutique: 'SF-CENTRE-001', adresse: 'Avenue Habib Bourguiba', ville: 'Sfax', gouvernorat: 'Sfax', telephone: '74 000 001', email: 'contact@sfaxtcentre.tn', statut: 'Active', description: 'Boutique principale - Centre ville', dateCreation: '2023-01-15', responsable: 'Mohamed Ali' },
  { id: '2', nom: 'Boutique Sfax Nord', codeBoutique: 'SF-NORD-002', adresse: 'Route de Tunis km 5', ville: 'Sfax', gouvernorat: 'Sfax', telephone: '74 000 002', email: 'nord@ugs.tn', statut: 'Active', description: 'Succursale Sfax Nord', dateCreation: '2023-06-20', responsable: 'Sami Ben Ali' },
  { id: '3', nom: 'Boutique Gabès', codeBoutique: 'GB-SUD-001', adresse: 'Avenue de la République', ville: 'Gabès', gouvernorat: 'Gabès', telephone: '75 000 001', email: 'gabes@ugs.tn', statut: 'Inactive', description: 'Succursale Sud', dateCreation: '2022-11-05', responsable: 'Fatma Zahra' },
];"""

content = content.replace(old_mocks, new_mocks)

with open('src/data.ts', 'w') as f:
    f.write(content)
