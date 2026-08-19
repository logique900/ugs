with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Let's count and remove duplicate declarations of activeModalTab and formError
lines = content.split('\n')
new_lines = []
seen_active_tab = False
seen_form_error = False

for line in lines:
    if 'activeModalTab' in line:
        if seen_active_tab:
            continue
        seen_active_tab = True
    if 'formError' in line:
        if seen_form_error:
            continue
        seen_form_error = True
    new_lines.append(line)

content = '\n'.join(new_lines)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Cleaned up duplicate declarations")
