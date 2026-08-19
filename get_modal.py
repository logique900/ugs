import re

with open('src/components/Clients.tsx', 'r') as f:
    content = f.read()

start_marker = "{/* MODAL : NOUVEAU / MODIFIER CLIENT"
end_marker = "{/* DRAWER / MODAL : FICHE 360° DU CLIENT"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find the target block")
    exit(1)

old_modal = content[start_idx:end_idx]

with open('old_modal.txt', 'w') as f:
    f.write(old_modal)

print("Saved to old_modal.txt")
