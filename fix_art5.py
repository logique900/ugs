import re

with open('src/components/Articles.tsx', 'r') as f:
    c = f.read()

pattern = r"const currentDepots = a\.stocks \? \[\.\.\.a\.stocks\] : \[.*?\n\s+return \{ \.\.\.a, stocks: newDepots \};\s+\}"
replacement = """let updated = updateArticleStock(a, transferFromBoutique, -transferQuantity);
                      updated = updateArticleStock(updated, transferToBoutique, transferQuantity);
                      return updated;
                    }"""
c = re.sub(pattern, replacement, c, flags=re.DOTALL)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(c)
