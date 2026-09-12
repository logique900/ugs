const fs = require('fs');
let code = fs.readFileSync('src/components/BonsDAchat.tsx', 'utf8');

code = code.replace(/statut === 'Réceptionné'/g, "statut === 'RÉCEPTIONNÉ'");
code = code.replace(/statut === 'En Attente'/g, "statut === 'EN ATTENTE'");
code = code.replace(/statut === 'Partiellement Reçu'/g, "statut === 'RÉCEPTION PARTIELLE'");

fs.writeFileSync('src/components/BonsDAchat.tsx', code);
