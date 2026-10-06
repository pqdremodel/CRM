with open('/Users/officeassistant/CRM/settings.js', 'r') as f:
    content = f.read()

logout_block = """        // Logout handling
    const logoutBtn = document.getElementById('settings-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.Turbo ? window.Turbo.visit('login.html') : window.location.href = 'login.html';
        });
    }

"""

# Remove it from the incorrect location
content = content.replace(logout_block, "")
content = content.replace("        // Logout handling\n    const logoutBtn = document.getElementById('settings-logout-btn');\n    if (logoutBtn) {\n        logoutBtn.addEventListener('click', async () => {\n            await supabaseClient.auth.signOut();\n            window.Turbo ? window.Turbo.visit('login.html') : window.location.href = 'login.html';\n        });\n    }\n\n", "")

# Add it at the top of the file inside the app:init handler
init_hook = "document.addEventListener('app:init', async () => {"
if init_hook in content:
    content = content.replace(init_hook, init_hook + "\n" + logout_block)

with open('/Users/officeassistant/CRM/settings.js', 'w') as f:
    f.write(content)
