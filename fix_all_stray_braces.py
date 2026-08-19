with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

while '              )}\n              )}' in content:
    content = content.replace('              )}\n              )}', '              )}')

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Removed all duplicate closing braces")
