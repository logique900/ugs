import re

with open('src/data.ts', 'r') as f:
    c = f.read()

# Just remove all `stockParDepot: [...],` arrays
c = re.sub(r'stockParDepot:\s*\[\s*(?:\{[^}]*\},\s*)*\{[^}]*\}\s*\],?', '', c)

with open('src/data.ts', 'w') as f:
    f.write(c)

