import glob

html_files = glob.glob('/Users/officeassistant/CRM/*.html')

old_home_btn = """<a href="index.html" class="nav-item" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('index.html') : window.location.href='index.html'">
            <i class="fa-solid fa-house"></i>
        </a>"""

new_home_btn = """<a href="#" class="nav-item" onclick="event.preventDefault(); event.stopPropagation(); document.querySelector('.sidebar').classList.add('mobile-open');">
            <i class="fa-solid fa-house"></i>
        </a>"""

for filepath in html_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    if old_home_btn in content:
        content = content.replace(old_home_btn, new_home_btn)
    else:
        # Fallback if there are small whitespace differences
        import re
        content = re.sub(
            r'<a href="index\.html" class="nav-item" onclick="event\.preventDefault\(\); window\.Turbo \? window\.Turbo\.visit\(\'index\.html\'\) : window\.location\.href=\'index\.html\'">\s*<i class="fa-solid fa-house"></i>\s*</a>',
            new_home_btn,
            content
        )
        
    with open(filepath, 'w') as f:
        f.write(content)

print("Updated Home button behavior in HTML files")
