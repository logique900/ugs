import re

with open('src/components/Articles.tsx', 'r') as f:
    c = f.read()

# Fix `a.` to `article.` in the table rows
c = c.replace('a.stockMinimums?.[selectedProjectId]', 'article.stockMinimums?.[selectedProjectId]')

# `updateArticleStock` is not imported? I added it before but let's check.
if 'updateArticleStock' not in c[:1000]:
    c = c.replace("import { getArticleStock } from '../utils/stockUtils';", "import { getArticleStock, updateArticleStock } from '../utils/stockUtils';")

with open('src/components/Articles.tsx', 'w') as f:
    f.write(c)

