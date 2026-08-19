import os
import re

components = ['Caisse', 'Clients', 'Achats', 'Fournisseurs', 'Stock', 'Credits']

for comp in components:
    path = f'src/components/{comp}.tsx'
    if not os.path.exists(path):
        continue
    
    with open(path, 'r') as f:
        content = f.read()
    
    if "import { Utilisateur" not in content:
        content = re.sub(r"import \{([^}]+)\}", r"import { \1, Utilisateur }", content, count=1)
    
    if f"interface {comp}Props {{" in content:
        content = content.replace(f"interface {comp}Props {{", f"interface {comp}Props {{\n  currentUser: Utilisateur;")
    
    content = content.replace(f"export function {comp}({{ ", f"export function {comp}({{ currentUser, ")
    
    with open(path, 'w') as f:
        f.write(content)
