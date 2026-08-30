import re

with open('src/components/Sidebar.tsx', 'r') as f:
    c = f.read()

c = c.replace("a.stocks < (a.stockMinimum || a.seuilAlerte || 15)", "getArticleStock(a, selectedProjectId) < ((a.stockMinimums || {})[selectedProjectId === 'all' ? '1' : selectedProjectId] || a.seuilAlerte || 15)")

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(c)
