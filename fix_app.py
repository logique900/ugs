import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("<Articles currentUser={currentUser} currentUser={currentUser} articles={articles}", "<Articles currentUser={currentUser} articles={articles}")
content = content.replace("currentUser={currentUser} activeTab", "activeTab")
# Wait, for Sidebar, let's just make sure there are no duplicate `currentUser={currentUser}` lines.
# Actually, I'll just use a regex to replace multiple `currentUser={currentUser}` with a single one.

content = re.sub(r'(currentUser={currentUser}\s*)+', 'currentUser={currentUser} ', content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
