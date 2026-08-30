import re

with open('src/components/Articles.tsx', 'r') as f:
    c = f.read()

c = c.replace('a.stockMinimums?.[selectedProjectId]', 'article.stockMinimums?.[selectedProjectId]')

with open('src/components/Articles.tsx', 'w') as f:
    f.write(c)

