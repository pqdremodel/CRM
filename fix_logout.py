import glob

html_files = glob.glob('/Users/officeassistant/CRM/*.html')
js_files = glob.glob('/Users/officeassistant/CRM/*.js')

logout_block = """    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.Turbo ? window.Turbo.visit('login.html') : window.location.href = 'login.html';
    });"""

for filepath in js_files:
    if 'login.js' in filepath or 'supabase.js' in filepath:
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = content.replace(logout_block, "")
    
    with open(filepath, 'w') as f:
        f.write(content)

# Update HTML files
old_icon = '<i class="fa-solid fa-arrow-right-from-bracket more-opts" id="logout-btn" title="Sign Out"></i>'
new_icon = '<i class="fa-solid fa-gear more-opts" id="sidebar-settings-btn" title="Settings" onclick="window.Turbo ? window.Turbo.visit(\'settings.html\') : window.location.href=\'settings.html\'"></i>'

for filepath in html_files:
    if 'login.html' in filepath:
        continue
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace(old_icon, new_icon)

    # Add Logout section to settings.html
    if 'settings.html' in filepath:
        logout_section = """
                <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-top: 24px;">
                    <h2 style="margin-bottom: 8px; font-size: 18px; color: var(--text-main);">Account Management</h2>
                    <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px;">Sign out of your account on this device.</p>
                    
                    <button class="btn btn-outline" id="settings-logout-btn" style="color: #ef4444; border-color: #ef4444;">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                    </button>
                </div>
"""
        if "Account Management" not in content:
            content = content.replace('<!-- Auth Check & Core Scripts -->', logout_section + '\n    <!-- Auth Check & Core Scripts -->')
            
    with open(filepath, 'w') as f:
        f.write(content)

