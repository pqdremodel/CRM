import glob

html_files = glob.glob('/Users/officeassistant/CRM/*.html')

old_mobile_btn = '<button id="mobile-menu-btn"'
new_mobile_btn = """<div style="display: flex; gap: 20px; align-items: center;">
                <i class="fa-regular fa-bell" style="font-size: 22px; color: var(--primary-color);"></i>
                <button id="mobile-menu-btn" """

for filepath in html_files:
    with open(filepath, 'r') as f:
        content = f.read()

    if '<i class="fa-regular fa-bell"' not in content.split('<!-- Sidebar -->')[0]:
        content = content.replace(old_mobile_btn, new_mobile_btn, 1)
        # Also need to close the div! The button looks like:
        # <button id="mobile-menu-btn" style="..."><i class="fa-solid fa-bars"></i></button>
        # We need to append </div> after it.
        # Let's find the closing tag of that button.
        btn_end = content.find('</button>', content.find('id="mobile-menu-btn"')) + 9
        content = content[:btn_end] + '\n            </div>' + content[btn_end:]

    with open(filepath, 'w') as f:
        f.write(content)

# Now fix style.css
with open('/Users/officeassistant/CRM/style.css', 'r') as f:
    css = f.read()

old_css = """    .sidebar-nav, .sidebar-footer {
        flex: unset;
        display: block;
        padding: 0;
        margin: 0;
        border: none;
    }"""

new_css = """    .sidebar-nav {
        flex: 1;
        display: block;
        padding: 0;
        margin: 0;
        border: none;
        overflow-y: auto;
    }
    .sidebar-footer {
        flex: unset;
        display: block;
        padding: 0;
        margin: 0;
        border: none;
        padding-bottom: env(safe-area-inset-bottom);
    }
    .footer-nav {
        display: none !important;
    }"""

if old_css in css:
    css = css.replace(old_css, new_css)
else:
    print("Could not find old_css block")

with open('/Users/officeassistant/CRM/style.css', 'w') as f:
    f.write(css)

print("Updated mobile nav!")
