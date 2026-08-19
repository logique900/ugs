with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

content = content.replace("              )}\n              )}\n              {/* TAB 2: TARIFICATION */}", "              )}\n\n              {/* TAB 2: TARIFICATION */}")
content = content.replace("              )}\n              )}\n              {/* TAB 3: STOCKS & SEUILS */}", "              )}\n\n              {/* TAB 3: STOCKS & SEUILS */}")
content = content.replace("              )}\n              )}\n              {/* Modal Footer Actions */}", "              )}\n\n              {/* Modal Footer Actions */}")

# Also replace any remaining double `              )}\n              )}`
while "              )}\n              )}" in content:
    content = content.replace("              )}\n              )}", "              )}")

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Removed exact stray braces")
