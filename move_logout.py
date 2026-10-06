import glob
import re

html_files = glob.glob('/Users/officeassistant/CRM/*.html')
js_files = glob.glob('/Users/officeassistant/CRM/*.js')

# 1. Update JS files to remove the logout-btn listener
for filepath in js_files:
    if 'login.js' in filepath or 'supabase.js' in filepath:
        continue
    with open(filepath, 'r') as f:
        content = f.read()

    # The logout listener is typically:
    #     // Logout handling
    #     document.getElementById('logout-btn').addEventListener('click', async () => {
    #         await supabaseClient.auth.signOut();
    #         window.Turbo ? window.Turbo.visit('login.html') : window.location.href = 'login.html';
    #     });
    # Let's use a regex to carefully remove it if it exists.
    content = re.sub(r'// Logout handling\s*(const logoutBtn = document\.getElementById\(\'logout-btn\'\);)?\s*document\.getElementById\(\'logout-btn\'\)\.addEventListener.*?\}\);', '', content, flags=re.DOTALL)
    
    # Also handle if it was stored in a variable:
    content = re.sub(r'const logoutBtn = document\.getElementById\(\'logout-btn\'\);\s*if \(logoutBtn\) \{.*?\}\)', '', content, flags=re.DOTALL)
    # And handle any possible null checks
    content = re.sub(r'const logoutBtn = document\.getElementById\(\'logout-btn\'\);\s*if \(logoutBtn\) \{.*?\}\s*\});', '', content, flags=re.DOTALL)
    
    with open(filepath, 'w') as f:
        f.write(content)

# 2. Update HTML files to replace logout-btn with settings gear
for filepath in html_files:
    if 'login.html' in filepath:
        continue
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace the logout icon
    old_icon = '<i class="fa-solid fa-arrow-right-from-bracket more-opts" id="logout-btn" title="Sign Out"></i>'
    new_icon = '<i class="fa-solid fa-gear more-opts" id="sidebar-settings-btn" title="Settings" onclick="window.Turbo ? window.Turbo.visit(\'settings.html\') : window.location.href=\'settings.html\'"></i>'
    content = content.replace(old_icon, new_icon)

    # If it's settings.html, add a Logout section
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

# 3. Add the logout logic to settings.js
with open('/Users/officeassistant/CRM/settings.js', 'r') as f:
    settings_js = f.read()

if 'settings-logout-btn' not in settings_js:
    logout_logic = """
    // Logout handling
    const logoutBtn = document.getElementById('settings-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.Turbo ? window.Turbo.visit('login.html') : window.location.href = 'login.html';
        });
    }
"""
    # Insert it before the end of the turbo:load block (or app:init)
    settings_js = settings_js.replace("    // Handle avatar upload", logout_logic + "\n    // Handle avatar upload")
    with open('/Users/officeassistant/CRM/settings.js', 'w') as f:
        f.write(settings_js)

print("Moved logout logic successfully!")
