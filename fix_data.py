import re

with open('src/data.ts', 'r') as f:
    c = f.read()

# Replace any remaining `stock: x` with `stocks: { "1": x }` in data.ts
c = re.sub(r'\bstock\s*:\s*(\d+)', r'stocks: { "1": \1 }', c)

with open('src/data.ts', 'w') as f:
    f.write(c)

