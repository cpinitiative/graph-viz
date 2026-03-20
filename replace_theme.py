import os
import re

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # App.jsx wrapper bg
    content = content.replace("bg-[#0b1220]", "bg-surface font-inter text-on-surface")
    
    # Outer level backgrounds: bg-[#0f172a] -> bg-surface-container-low
    content = content.replace('bg-[#0f172a]', 'bg-surface-container-low')
    
    # Inner level backgrounds: bg-[#1e293b] -> bg-surface-container
    content = content.replace('bg-[#1e293b]', 'bg-surface-container')
    
    # Hover states
    content = content.replace('hover:bg-slate-800', 'hover:bg-surface-container-high')
    content = content.replace('hover:bg-slate-700', 'hover:bg-surface-container-high')
    content = content.replace('hover:bg-slate-600', 'hover:bg-surface-container-high')

    # Deepest hover / active
    content = content.replace('bg-blue-600', 'bg-primary text-on-primary')
    
    # Text colors
    content = content.replace('text-slate-100', 'text-on-surface')
    content = content.replace('text-slate-200', 'text-on-surface')
    content = content.replace('text-slate-300', 'text-on-surface')
    content = content.replace('text-slate-400', 'text-on-surface')
    
    # Remove text-white if we also replaced bg-blue-600, or let text-on-primary take over
    content = content.replace('text-white', '')

    # Specific borders for floating / inputs: focus:border-blue-500 -> focus:border-primary
    content = content.replace('focus:border-blue-500', 'focus:border-primary')

    # Borders: "No Line Rule"
    content = re.sub(r'\s*border-[t|b|l|r]\s+border-\[#[a-fA-F0-9]+\]', '', content)
    content = re.sub(r'\s*border\s+border-\[#[a-fA-F0-9]+\]', '', content)
    content = re.sub(r'\s*border-\[#[a-fA-F0-9]+\]', '', content)
    content = re.sub(r'\s*border\s+border-slate-[0-9]+(/[0-9]+)?', '', content)
    content = re.sub(r'\s*border-[t|b|l|r]\s+border-slate-[0-9]+(/[0-9]+)?', '', content)
    content = re.sub(r'\s*border-slate-[0-9]+', '', content)
    content = re.sub(r'\s*border\s+', ' ', content)
    
    # Clean up multiple spaces
    content = re.sub(r'\s{2,}', ' ', content).replace('className=" ', 'className="')
    
    # Remove floating shadows and replace with ambient
    content = content.replace('shadow-2xl', 'shadow-ambient-lg')
    content = content.replace('shadow-[0_0_0_1px_rgba(59,130,246,0.5)]', 'shadow-ambient border-primary border')
    content = content.replace('shadow-sm', '')
    
    # Buttons corner radius: md (0.375rem)
    content = content.replace('rounded-lg', 'rounded-md')
    content = content.replace('rounded-xl', 'rounded-md')
    
    # Text sizes -> Headings should use manrope
    # Right now they use text-xs font-semibold uppercase... we will keep text sizing but add manrope where there's headers
    content = content.replace('uppercase tracking-wider', 'uppercase tracking-wider font-manrope font-semibold')
    
    # Red buttons or standard buttons
    content = content.replace('bg-red-500/10', 'bg-surface-container-high')
    content = content.replace('hover:bg-red-500/20', 'hover:bg-surface-container-highest text-primary')
    content = content.replace('text-red-400', 'text-primary')

    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('/Users/davidzhou/graph/export/graph-editor-animator/src'):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            replace_in_file(os.path.join(root, file))

