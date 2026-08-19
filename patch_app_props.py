import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Pass currentUser to Sidebar
content = content.replace("<Sidebar ", "<Sidebar currentUser={currentUser} ")

# Pass currentUser to components where needed. Let's just update Articles for now
content = content.replace("<Articles articles={articles}", "<Articles currentUser={currentUser} articles={articles}")

with open('src/App.tsx', 'w') as f:
    f.write(content)
