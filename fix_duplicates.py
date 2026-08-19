with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Remove the duplicate line: const [activeModalTab, setActiveModalTab] = useState<'ident' | 'tarifs' | 'stock'>('ident');
content = content.replace("  const [activeModalTab, setActiveModalTab] = useState<'ident' | 'tarifs' | 'stock'>('ident');\n  const [formData, setFormData]", "  const [formData]")

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Removed duplicate declaration")
