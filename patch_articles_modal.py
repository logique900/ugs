import re

with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Add activeModalTab state if not present
if 'activeModalTab' not in content:
    content = content.replace(
        "const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);",
        "const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);\n  const [activeModalTab, setActiveModalTab] = useState<'ident' | 'tarifs' | 'stock'>('ident');"
    )

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Added activeModalTab state")
