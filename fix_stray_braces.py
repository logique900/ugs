with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Remove stray duplicate `)}`
content = content.replace("              )}\n              )}", "              )}")

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Cleaned up stray closing braces")
