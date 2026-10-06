import glob
import re
import os

html_files = glob.glob('/Users/officeassistant/CRM/*.html')
js_files = glob.glob('/Users/officeassistant/CRM/*.js')

# 1. Update HTML files
turbo_script = '<script type="module" src="https://cdn.skypack.dev/@hotwired/turbo"></script>'

for filepath in html_files:
    with open(filepath, 'r') as f:
        content = f.read()

    if 'hotwired/turbo' not in content:
        # Insert before </head>
        content = content.replace('</head>', f'    {turbo_script}\n</head>')
        
    # Replace onclick="window.location.href='xxx'" with Turbo.visit
    content = re.sub(
        r'onclick="window\.location\.href=\'([^\']+)\'"',
        r'onclick="window.Turbo ? window.Turbo.visit(\'\1\') : window.location.href=\'\1\'"',
        content
    )
    # Also handle history.length > 1 ? history.back() : window.location.href='index.html'
    content = content.replace(
        "history.length > 1 ? history.back() : window.location.href='index.html'",
        "history.length > 1 ? history.back() : (window.Turbo ? window.Turbo.visit('index.html') : window.location.href='index.html')"
    )

    with open(filepath, 'w') as f:
        f.write(content)

# 2. Update JS files
for filepath in js_files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace DOMContentLoaded with turbo:load
    content = content.replace("addEventListener('DOMContentLoaded'", "addEventListener('turbo:load'")
    
    # Replace manual window.location.href assignments
    content = re.sub(
        r'window\.location\.href\s*=\s*[\'"]([^\'"]+)[\'"]',
        r"window.Turbo ? window.Turbo.visit('\1') : window.location.href = '\1'",
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)

print("Turbo applied successfully!")
