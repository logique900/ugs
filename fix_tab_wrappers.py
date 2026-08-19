with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "              {/* TAB 1: IDENTIFICATION */}",
    "              {/* TAB 1: IDENTIFICATION */}\n              {activeModalTab === 'ident' && ("
)

content = content.replace(
    "              {/* TAB 2: TARIFICATION */}",
    "              )}\n\n              {/* TAB 2: TARIFICATION */}\n              {activeModalTab === 'tarifs' && ("
)

content = content.replace(
    "              {/* TAB 3: STOCKS & SEUILS */}",
    "              )}\n\n              {/* TAB 3: STOCKS & SEUILS */}\n              {activeModalTab === 'stock' && ("
)

# And add closing parenthesis before modal footer
content = content.replace(
    "              {/* Modal Footer Actions */}",
    "              )}\n\n              {/* Modal Footer Actions */}"
)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Wrapped tabs correctly")
