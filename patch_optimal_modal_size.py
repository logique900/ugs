import re

with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# Adjust to a well-balanced, professional size: max-w-4xl, h-[82vh] (or max-h-[85vh])
content = content.replace(
    'className="bg-white border border-slate-200 rounded-3xl w-[95vw] md:w-[90vw] max-w-6xl overflow-hidden shadow-2xl flex flex-col h-[92vh]"',
    'className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] h-full"'
)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)

print("Adjusted modal size to well-balanced max-w-4xl and max-h-[85vh]")
