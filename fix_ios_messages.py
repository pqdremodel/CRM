import re

with open('/Users/officeassistant/CRM/style.css', 'r') as f:
    css = f.read()

ios_css = """
/* iOS Messages Style Overrides */
.contact-item {
    border-bottom: none !important;
    padding: 12px 16px !important;
    gap: 14px !important;
}

.contact-avatar img {
    width: 56px !important;
    height: 56px !important;
    border-radius: 50% !important;
}

.contact-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.contact-name-row h4 {
    font-size: 17px !important;
    font-weight: 600 !important;
    color: #000 !important;
    margin: 0 !important;
}

.unread-badge {
    background-color: #ff3b30 !important;
    color: white !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    padding: 2px 7px !important;
    border-radius: 12px !important;
    min-width: unset !important;
    height: unset !important;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
}

.contact-top .time {
    font-size: 13px !important;
    color: #8e8e93 !important;
    font-weight: 400 !important;
}

.contact-bottom p {
    font-size: 15px !important;
    color: #8e8e93 !important;
    margin: 0 !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 240px; /* Give it a max width to force ellipsis */
}

.chat-sidebar-header {
    background: transparent !important;
    border-bottom: none !important;
    padding-top: 12px !important;
}

.chat-sidebar-header h2 {
    font-size: 32px !important;
    font-weight: 700 !important;
    letter-spacing: -0.5px !important;
}

.status-dot {
    display: none !important;
}
"""

if "iOS Messages Style Overrides" not in css:
    css += ios_css
    
    with open('/Users/officeassistant/CRM/style.css', 'w') as f:
        f.write(css)

# Also let's check messages.html to make the header look like the screenshot "Messages"
with open('/Users/officeassistant/CRM/messages.html', 'r') as f:
    html = f.read()

# Replace the chat sidebar header to match the screenshot
old_header = """<div class="chat-sidebar-header">
                        <h2>Messages</h2>
                        <button class="btn btn-primary btn-sm" id="new-msg-btn"><i class="fa-solid fa-pen-to-square"></i></button>
                    </div>"""
new_header = """<div class="chat-sidebar-header" style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 10px;">
                        <h2 style="font-size: 34px; font-weight: 700; letter-spacing: -1px; margin: 0;">Messages</h2>
                        <div style="display: flex; gap: 16px;">
                            <button class="btn" style="background:none; border:none; padding:0; font-size: 20px; color: #000;"><i class="fa-solid fa-camera"></i></button>
                            <button class="btn" id="new-msg-btn" style="background:none; border:none; padding:0; font-size: 20px; color: #000;"><i class="fa-solid fa-circle-plus"></i></button>
                        </div>
                    </div>"""

if 'class="chat-sidebar-header"' in html:
    # Use simple replace if it matches exactly, otherwise regex
    html = re.sub(r'<div class="chat-sidebar-header">.*?</div>', new_header, html, flags=re.DOTALL)
    with open('/Users/officeassistant/CRM/messages.html', 'w') as f:
        f.write(html)
