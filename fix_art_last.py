import re

with open('src/components/Articles.tsx', 'r') as f:
    c = f.read()

c = c.replace('article.stockMinimums', 'a.stockMinimums')
c = c.replace('formDatarticle.stockMinimums', 'formData.stockMinimums')

with open('src/components/Articles.tsx', 'w') as f:
    f.write(c)
