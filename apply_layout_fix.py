import re
import sys

filepath = r'd:\perobaan\17\neurodent-main\src\components\medical-record\MedicalRecordForm.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove activeTab state
content = re.sub(r'const\s+\[activeTab,\s*setActiveTab\]\s*=\s*useState\([^)]+\);\n?', '', content)

# 2. Modify Patient Info Card (remove lg:hidden print:block)
content = content.replace(
    '<div className="glass-panel relative overflow-hidden p-6 mb-6 lg:hidden print:block">',
    '<div className="glass-panel relative overflow-hidden p-6 mb-6">'
)

# 3. Remove the entire aside block (from <aside ...> to </aside>)
# We find the start of aside
aside_start = content.find('<aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-6 no-print lg:block hidden">')
if aside_start != -1:
    aside_end = content.find('</aside>', aside_start) + len('</aside>')
    if aside_end > len('</aside>'):
        content = content[:aside_start] + content[aside_end:]

# 4. Remove Sub-tab Navigation controls
tab_nav_start = content.find('<div className="flex border border-gray-200/50')
if tab_nav_start != -1:
    # Need to find the end of this div. It's a bit tricky, but it ends with </div> after the map
    # We can just use a regex to match the whole block since it's known
    tab_nav_pattern = r'\{\/\*\s*Sub-tab Navigation controls\s*\*\/\}.*?</div>'
    # Actually, the div closes after the map.
    # Let's use a robust approach:
    match = re.search(r'\{\/\*\s*Sub-tab Navigation controls\s*\*\/\}.*?</div>\s*</div>', content, flags=re.DOTALL)
    if match:
        content = content[:match.start()] + content[match.end():]

# 5. Remove grid layout wrappers
content = content.replace(
    '<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">',
    '{/* Linear Workflow Layout */}'
)

content = content.replace(
    '<div className="lg:col-span-9 space-y-6 w-full">',
    '<div className="space-y-6 w-full">'
)

# 6. Replace the tab content wrappers
content = content.replace(
    '<div className={activeTab === \'anamnesis\' ? \'space-y-6 block print:block\' : \'space-y-6 hidden print:block\'}>',
    '<div className="space-y-6">'
)
content = content.replace(
    '<div className={activeTab === \'odontogram\' ? \'space-y-6 block print:block\' : \'space-y-6 hidden print:block\'}>',
    '<div className="space-y-6">'
)
content = content.replace(
    '<div className={activeTab === \'media\' ? \'space-y-6 block print:block\' : \'space-y-6 hidden print:block\'}>',
    '<div className="space-y-6">'
)

# 7. Remove one of the closing </div> at the end of the right col (since we removed the grid wrapper)
# We look for the two closing divs before Sticky Bottom Actions Bar
end_divs_pattern = r'(</div>\s*</div>\s*)(?=\{\/\*\s*Pinned action wrapper)'
match = re.search(end_divs_pattern, content)
if match:
    # replace </div> </div> with just </div>
    content = content[:match.start()] + '</div>\n      ' + content[match.end():]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied layout fixes to MedicalRecordForm.jsx")
