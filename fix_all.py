import re
import os

with open('src/components/Articles.tsx', 'r') as f:
    c = f.read()

c = c.replace('article.stockMinimums', 'a.stockMinimums')
c = c.replace('formDatarticle.stockMinimums', 'formData.stockMinimums')
if 'updateArticleStock' not in c and 'getArticleStock' in c:
    c = c.replace("import { getArticleStock } from '../utils/stockUtils';", "import { getArticleStock, updateArticleStock } from '../utils/stockUtils';")

with open('src/components/Articles.tsx', 'w') as f:
    f.write(c)

with open('src/components/Ventes.tsx', 'r') as f:
    c = f.read()
    
# Around line 380-400 we replaced `newSale` with `quote`, but we need to undo it.
c = c.replace('quote.projetId', 'newSale.projetId')
c = c.replace('quote.lignes', 'newSale.lignes')

with open('src/components/Ventes.tsx', 'w') as f:
    f.write(c)

