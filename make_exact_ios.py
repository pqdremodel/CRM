import re

with open('/Users/officeassistant/CRM/style.css', 'r') as f:
    css = f.read()

# Replace the previous iOS CSS block with a more exact one
old_ios_css = r'/\* iOS Messages Style Overrides \*/.*?\.status-dot \{\n    display: none !important;\n\}'

new_ios_css = """
/* Exact iOS Messages Style Overrides */
.chat-sidebar {
    background-color: #f2f5f8 !important;
}

.chat-sidebar-header {
    background: transparent !important;
    border-bottom: none !important;
    padding: 32px 24px 16px !important;
}

.chat-sidebar-header h2 {
    font-size: 38px !important;
    font-weight: 700 !important;
    letter-spacing: -1px !important;
    color: #000 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}

.contact-item {
    border-bottom: none !important;
    padding: 14px 24px !important;
    gap: 16px !important;
    background-color: transparent !important;
}

.contact-item:hover, .contact-item.active {
    background-color: transparent !important;
    border-left: none !important;
}

.contact-avatar img {
    width: 60px !important;
    height: 60px !important;
    border-radius: 50% !important;
}

.contact-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.contact-name-row h4 {
    font-size: 18px !important;
    font-weight: 600 !important;
    color: #000 !important;
    margin: 0 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}

.unread-badge {
    background-color: #ff3b30 !important;
    color: white !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    padding: 3px 8px !important;
    border-radius: 12px !important;
    min-width: unset !important;
    height: unset !important;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    line-height: 1 !important;
}

.contact-top .time {
    font-size: 13px !important;
    color: #a0a0a5 !important;
    font-weight: 400 !important;
}

.contact-bottom p {
    font-size: 15px !important;
    color: #8e8e93 !important;
    margin: 4px 0 0 0 !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 260px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}

.status-dot {
    display: none !important;
}
"""

if "/* Exact iOS Messages Style Overrides */" not in css:
    if re.search(old_ios_css, css, re.DOTALL):
        css = re.sub(old_ios_css, new_ios_css.strip(), css, flags=re.DOTALL)
    else:
        css += "\n" + new_ios_css.strip()
        
with open('/Users/officeassistant/CRM/style.css', 'w') as f:
    f.write(css)

# Update messages.html header and bottom nav
with open('/Users/officeassistant/CRM/messages.html', 'r') as f:
    html = f.read()

# Make the header icons more accurate to the screenshot
old_header = r'<div class="chat-sidebar-header" style=".*?">.*?</div>\s*</div>' # match old if needed
new_header = """<div class="chat-sidebar-header" style="display: flex; justify-content: space-between; align-items: center; padding: 24px 24px 16px;">
                        <h2 style="font-size: 38px; font-weight: 700; letter-spacing: -1px; margin: 0; color: #000; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Messages</h2>
                        <div style="display: flex; gap: 16px; align-items: center;">
                            <i class="fa-solid fa-camera" style="font-size: 22px; color: #000;"></i>
                            <i class="fa-solid fa-circle-plus" style="font-size: 22px; color: #000;"></i>
                        </div>
                    </div>"""

html = re.sub(r'<div class="chat-sidebar-header".*?</div>\s*</div>', new_header + "\n                    </div>", html, flags=re.DOTALL)

with open('/Users/officeassistant/CRM/messages.html', 'w') as f:
    f.write(html)
    
