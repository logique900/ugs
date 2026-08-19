import re

with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"',
    'className="bg-white border border-slate-200 rounded-3xl w-[95vw] md:w-[90vw] max-w-6xl overflow-hidden shadow-2xl flex flex-col h-[92vh]"'
)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Updated modal container size to almost fullscreen")
