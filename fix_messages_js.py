with open('/Users/officeassistant/CRM/messages.js', 'r') as f:
    js = f.read()

old_html = """            item.innerHTML = `
                <div class="contact-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff" alt="${displayName}">
                    <div class="status-dot ${statusClass}"></div>
                </div>
                <div class="contact-info">
                    <div class="contact-top">
                        <h4>${displayName}</h4>
                        ${badgeHtml}
                        <span class="time"></span>
                    </div>
                    <div class="contact-bottom">
                        <p>Team Member</p>
                    </div>
                </div>
            `;"""

new_html = """            item.innerHTML = `
                <div class="contact-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff" alt="${displayName}">
                    <div class="status-dot ${statusClass}" style="display:none;"></div>
                </div>
                <div class="contact-info" style="flex:1; min-width:0;">
                    <div class="contact-top" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <h4 style="font-size:16px; font-weight:600; color:#000; margin:0;">${displayName}</h4>
                        <span class="time" style="font-size:12px; color:#aaa;">${user.lastMessageTime || '02:11'}</span>
                    </div>
                    <div class="contact-bottom" style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-top:4px;">
                        <p style="font-size:14px; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80%; margin:0;">${user.lastMessageText}</p>
                        ${badgeHtml}
                    </div>
                </div>
            `;"""

if old_html in js:
    js = js.replace(old_html, new_html)
else:
    print("Could not find old_html")

with open('/Users/officeassistant/CRM/messages.js', 'w') as f:
    f.write(js)

print("Updated messages.js")
