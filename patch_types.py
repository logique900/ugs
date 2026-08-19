import re

with open('src/types.ts', 'r') as f:
    content = f.read()

old_role = "export type Role = 'admin' | 'comptable' | 'caissier';"
new_role = "export type Role = 'admin' | 'comptable' | 'caissier' | 'agent' | 'chef_projet' | 'directeur';"

if old_role in content:
    content = content.replace(old_role, new_role)

with open('src/types.ts', 'w') as f:
    f.write(content)

