import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

old_import = "import { mockVentes, mockArticles, mockClients, mockFournisseurs, mockAchats } from '../data';"
new_import = "import { mockVentes, mockArticles, mockClients, mockFournisseurs, mockAchats, mockUsers } from '../data';\nimport { AdminProjectDetails } from './AdminProjectDetails';"

if old_import in content:
    content = content.replace(old_import, new_import)

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)

