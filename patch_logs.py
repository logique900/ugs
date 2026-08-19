with open('src/data.ts', 'r') as f:
    content = f.read()

old_logs = """export const mockAuditLogs: AuditLog[] = [
  { id: 'log-1', timestamp: '2026-08-12 02:15:30', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@ugs-distribution.com', action: 'Connexion réussie au Portail Central', categorie: 'Sécurité' },
  { id: 'log-2', timestamp: '2026-08-12 02:10:12', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@ugs-distribution.com', projetId: '1', projetNom: 'Projet Alpha', action: 'Context Switching: Basculement vers Projet Alpha', categorie: 'Système' },
  { id: 'log-3', timestamp: '2026-08-11 16:45:00', utilisateurNom: 'Jean Dupont', utilisateurEmail: 'jean.dupont@ugs-distribution.com', projetId: '1', projetNom: 'Projet Alpha', action: 'Création Facture FAC-ALP-001', categorie: 'Financier', nouvelleValeur: '15000 DT TTC' },
  { id: 'log-4', timestamp: '2026-08-11 14:22:18', utilisateurNom: 'Marie Martin', utilisateurEmail: 'marie.martin@ugs-distribution.com', projetId: '2', projetNom: 'Projet Beta', action: 'Mouvement Stock Sortie ART003', categorie: 'Métier', ancienneValeur: 'Stock 95', nouvelleValeur: 'Stock 65' },
  { id: 'log-5', timestamp: '2026-08-10 11:05:40', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@ugs-distribution.com', action: 'Mise à jour permissions utilisateur Marie Martin', categorie: 'Sécurité' }
];"""

new_logs = """export const mockAuditLogs: AuditLog[] = [
  { id: 'log-6', timestamp: '2026-08-18 09:20:00', utilisateurNom: 'Ahmed', utilisateurEmail: 'ahmed@ugs.tn', projetId: '1', projetNom: 'Boutique Sfax Centre', action: 'Vente V-00125', categorie: 'Financier', nouvelleValeur: '+450 DT' },
  { id: 'log-7', timestamp: '2026-08-18 10:15:00', utilisateurNom: 'Admin', utilisateurEmail: 'admin@ugs-distribution.com', projetId: '1', projetNom: 'Boutique Sfax Centre', action: 'Correction stock • Laptop HP', categorie: 'Métier', nouvelleValeur: '-2 unités' },
  { id: 'log-8', timestamp: '2026-08-18 11:30:00', utilisateurNom: 'Admin', utilisateurEmail: 'admin@ugs-distribution.com', projetId: '1', projetNom: 'Boutique Sfax Centre', action: 'Transfert • 5 × Laptop HP Sfax → Gabès', categorie: 'Métier' },
  { id: 'log-1', timestamp: '2026-08-12 02:15:30', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@ugs-distribution.com', action: 'Connexion réussie au Portail Central', categorie: 'Sécurité' },
  { id: 'log-2', timestamp: '2026-08-12 02:10:12', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@ugs-distribution.com', projetId: '1', projetNom: 'Projet Alpha', action: 'Context Switching: Basculement vers Projet Alpha', categorie: 'Système' },
  { id: 'log-3', timestamp: '2026-08-11 16:45:00', utilisateurNom: 'Jean Dupont', utilisateurEmail: 'jean.dupont@ugs-distribution.com', projetId: '1', projetNom: 'Projet Alpha', action: 'Création Facture FAC-ALP-001', categorie: 'Financier', nouvelleValeur: '15000 DT TTC' },
  { id: 'log-4', timestamp: '2026-08-11 14:22:18', utilisateurNom: 'Marie Martin', utilisateurEmail: 'marie.martin@ugs-distribution.com', projetId: '2', projetNom: 'Projet Beta', action: 'Mouvement Stock Sortie ART003', categorie: 'Métier', ancienneValeur: 'Stock 95', nouvelleValeur: 'Stock 65' },
  { id: 'log-5', timestamp: '2026-08-10 11:05:40', utilisateurNom: 'Super Admin', utilisateurEmail: 'admin@ugs-distribution.com', action: 'Mise à jour permissions utilisateur Marie Martin', categorie: 'Sécurité' }
];"""

content = content.replace(old_logs, new_logs)
with open('src/data.ts', 'w') as f:
    f.write(content)
print("Updated mockAuditLogs")
