import re

with open('src/components/Dashboard.tsx', 'r') as f:
    content = f.read()

old_interface = """  onTabChange?: (tab: TabType,
  Utilisateur) => void;"""

new_interface = """  onTabChange?: (tab: TabType) => void;"""

if old_interface in content:
    content = content.replace(old_interface, new_interface)

with open('src/components/Dashboard.tsx', 'w') as f:
    f.write(content)

