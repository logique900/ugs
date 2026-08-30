import re

with open('src/components/Articles.tsx', 'r') as f:
    c = f.read()

c = re.sub(r'\ba\.stockMinimums\b', 'article.stockMinimums', c)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(c)

