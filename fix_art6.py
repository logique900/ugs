with open('src/components/Articles.tsx', 'r') as f:
    lines = f.readlines()

out = []
skip = False
for line in lines:
    if "const currentDepots = a.stocks ? [...a.stocks] :" in line:
        skip = True
        out.append("                      let updated = updateArticleStock(a, transferFromBoutique, -transferQuantity);\n")
        out.append("                      updated = updateArticleStock(updated, transferToBoutique, transferQuantity);\n")
        out.append("                      return updated;\n")
        continue
    if skip and "return { ...a, stocks: newDepots };" in line:
        skip = False
        continue
    if not skip:
        out.append(line)

with open('src/components/Articles.tsx', 'w') as f:
    f.writelines(out)
