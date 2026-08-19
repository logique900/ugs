import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Update Sidebar
content = re.sub(
    r"<Sidebar\s+activeTab",
    "<Sidebar currentUser={currentUser} activeTab",
    content
)

# Replace props for all components that might need it. Let's just do it cleanly.
components_to_update = ['Articles', 'Ventes', 'Caisse', 'Clients', 'Achats', 'Fournisseurs', 'Stock', 'Credits']

for comp in components_to_update:
    content = re.sub(
        rf"<{comp}\s",
        f"<{comp} currentUser={{currentUser}} ",
        content
    )

with open('src/App.tsx', 'w') as f:
    f.write(content)
