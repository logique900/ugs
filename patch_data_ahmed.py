import re

with open('src/data.ts', 'r') as f:
    content = f.read()

old_users = """export const mockUsers: Utilisateur[] = [
  { id: 'u1', nom: 'Super Admin', email: 'admin@entreprise.com', motDePasse: 'admin123', role: 'admin', statut: 'Actif', projetsAffectes: ['1', '2', '3'] },
  { id: 'u2', nom: 'Comptable Central', email: 'comptable@entreprise.com', motDePasse: 'comptable123', role: 'comptable', statut: 'Actif', projetsAffectes: ['1', '2'] },
  { id: 'u3', nom: 'Caissier A', email: 'caissier.a@entreprise.com', motDePasse: 'caissier123', role: 'caissier', statut: 'Actif', projetId: '1', projetsAffectes: ['1'] },
  { id: 'u4', nom: 'Caissier B', email: 'caissier.b@entreprise.com', motDePasse: 'caissier123', role: 'caissier', statut: 'Actif', projetId: '2', projetsAffectes: ['2'] },
];"""

new_users = """export const mockUsers: Utilisateur[] = [
  { id: 'u1', nom: 'Super Admin', email: 'admin@entreprise.com', motDePasse: 'admin123', role: 'admin', statut: 'Actif', projetsAffectes: ['1', '2', '3'] },
  { id: 'u2', nom: 'Comptable Central', email: 'comptable@entreprise.com', motDePasse: 'comptable123', role: 'comptable', statut: 'Actif', projetsAffectes: ['1', '2'] },
  { id: 'u3', nom: 'Ahmed (Sfax Centre)', email: 'ahmed@ugs.tn', motDePasse: 'ahmed123', role: 'caissier', statut: 'Actif', projetId: '1', projetsAffectes: ['1'] },
  { id: 'u4', nom: 'Karim (Multi-boutiques)', email: 'karim@ugs.tn', motDePasse: 'karim123', role: 'caissier', statut: 'Actif', projetId: '1', projetsAffectes: ['1', '2'] },
];"""

content = content.replace(old_users, new_users)

with open('src/data.ts', 'w') as f:
    f.write(content)

