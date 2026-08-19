with open('src/components/Articles.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip_next = False
for i in range(len(lines)):
    if skip_next:
        skip_next = False
        continue
    if i < len(lines) - 1 and lines[i].strip() == ')}' and lines[i+1].strip() == ')}':
        # keep only one
        new_lines.append(lines[i])
        skip_next = True
    else:
        new_lines.append(lines[i])

with open('src/components/Articles.tsx', 'w') as f:
    f.writelines(new_lines)

print("Cleaned up double closing braces via line iteration")
