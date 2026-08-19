import re

with open('src/components/Clients.tsx', 'r') as f:
    content = f.read()

# Define the old modal starting signature
start_marker = "{isFormModalOpen && ("
end_marker = "{/* MODAL : DÉTAIL CLIENT (PANNEAU LATÉRAL)"

# Find the block between start_marker and end_marker
start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find the target block")
    exit(1)

old_modal = content[start_idx:end_idx]

# Let's verify we found it correctly
print("Found block of length:", len(old_modal))
