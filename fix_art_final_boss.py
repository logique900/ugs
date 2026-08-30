with open('src/components/Articles.tsx', 'r') as f:
    c = f.read()

c = c.replace('formDatarticle', 'formData')
c = c.replace('article.stockMinimums', 'a.stockMinimums')

with open('src/components/Articles.tsx', 'w') as f:
    f.write(c)

