with open('src/components/Ventes.tsx', 'r') as f:
    c = f.read()
    
# Around line 380 we have handleConvertQuote which uses `quote`
# Let's replace `newSale` back to `quote` inside this specific block.
import re
pattern = r"// Update article stock & register stock movements \(BF-PROD-021\)\n.*?return \{ \.\.\.art, stocks: stockApres \};\n\s*\}\n\s*return art;"
# Actually just string replace around here is fine.
def replacer(match):
    return match.group(0).replace('newSale', 'quote')

c = re.sub(r'// Update article stock & register stock movements \(BF-PROD-021\)(.*?)(return updateArticleStock|return art;)', replacer, c, flags=re.DOTALL)

with open('src/components/Ventes.tsx', 'w') as f:
    f.write(c)

