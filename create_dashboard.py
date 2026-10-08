import glob
import os
import shutil

# 1. Rename index.html to clients.html
if os.path.exists('/Users/officeassistant/CRM/index.html'):
    shutil.copy('/Users/officeassistant/CRM/index.html', '/Users/officeassistant/CRM/clients.html')

html_files = glob.glob('/Users/officeassistant/CRM/*.html')

# 2. In all files, change navigation references to 'index.html' (when it meant Clients) to 'clients.html'
for filepath in html_files:
    if filepath == '/Users/officeassistant/CRM/index.html':
        continue # We will overwrite index.html entirely later
        
    with open(filepath, 'r') as f:
        content = f.read()

    # The sidebar link
    content = content.replace("window.Turbo.visit('index.html')", "window.Turbo.visit('clients.html')")
    content = content.replace("window.location.href='index.html'", "window.location.href='clients.html'")
    
    # But wait! The Home button in bottom-nav SHOULD point to index.html!
    # Let's fix the bottom-nav Home button back to index.html!
    # Actually, we made it open the sidebar in a previous step!
    # The user asked: "instead of opening the the menu place the menu options on the home page"
    # So the Home button should point to index.html!
    
    home_btn_broken = """<a href="#" class="nav-item" onclick="event.preventDefault(); event.stopPropagation(); document.querySelector('.sidebar').classList.add('mobile-open');">
            <i class="fa-solid fa-house"></i>
        </a>"""
        
    home_btn_fixed = """<a href="index.html" class="nav-item" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('index.html') : window.location.href='index.html'">
            <i class="fa-solid fa-house"></i>
        </a>"""
        
    content = content.replace(home_btn_broken, home_btn_fixed)

    with open(filepath, 'w') as f:
        f.write(content)

# 3. Create a brand new index.html (App Dashboard)
new_index_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="PQD CRM">
    <title>PQD Remodels - Home</title>
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="style.css?v=10">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script type="module" src="https://cdn.skypack.dev/@hotwired/turbo"></script>
    <style>
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 16px;
            padding: 24px;
        }
        .dash-card {
            background: white;
            border-radius: 24px;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            text-decoration: none;
            color: #000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            transition: all 0.2s ease;
            text-align: center;
            border: 1px solid #f0f0f0;
        }
        .dash-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .dash-card i {
            font-size: 32px;
            color: #000;
        }
        .dash-card span {
            font-weight: 600;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="dashboard-container" style="flex-direction: column; overflow-y: auto;">
        
        <div class="app-title-mobile" style="padding: 24px 24px 0; display: block; text-align: center;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Flame_icon.svg" alt="Flame" width="48" height="48" style="filter: invert(65%) sepia(85%) saturate(1915%) hue-rotate(345deg) brightness(102%) contrast(105%); margin-bottom: 16px;">
            <div style="font-size: 32px; font-weight: 800; letter-spacing: -1px;">PQD Remodels</div>
            <div style="font-size: 14px; color: #888; font-weight: 400; margin-top: 4px;">Welcome back to your workspace.</div>
        </div>

        <div class="dashboard-grid">
            <a href="clients.html" class="dash-card" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('clients.html') : window.location.href='clients.html'">
                <i class="fa-solid fa-building"></i>
                <span>Clients</span>
            </a>
            <a href="leads.html" class="dash-card" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('leads.html') : window.location.href='leads.html'">
                <i class="fa-solid fa-user-plus"></i>
                <span>Leads</span>
            </a>
            <a href="calendar.html" class="dash-card" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('calendar.html') : window.location.href='calendar.html'">
                <i class="fa-regular fa-calendar"></i>
                <span>Calendar</span>
            </a>
            <a href="messages.html" class="dash-card" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('messages.html') : window.location.href='messages.html'">
                <i class="fa-regular fa-message"></i>
                <span>Messages</span>
            </a>
            <a href="settings.html" class="dash-card" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('settings.html') : window.location.href='settings.html'">
                <i class="fa-solid fa-gear"></i>
                <span>Settings</span>
            </a>
        </div>
    </div>

    <!-- Bottom Navigation (Mobile Only) -->
    <nav class="bottom-nav">
        <a href="index.html" class="nav-item active" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('index.html') : window.location.href='index.html'">
            <i class="fa-solid fa-house"></i>
        </a>
        <a href="messages.html" class="nav-item new-chat-btn" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('messages.html') : window.location.href='messages.html'">
            <i class="fa-solid fa-plus"></i> New Chat
        </a>
        <a href="settings.html" class="nav-item" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('settings.html') : window.location.href='settings.html'">
            <i class="fa-regular fa-user"></i>
        </a>
    </nav>
    
    <!-- Bottom Nav Modal -->
    <div id="new-chat-modal" class="bottom-sheet-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:2000; flex-direction:column; justify-content:flex-end;">
        <div class="bottom-sheet-content" style="background:transparent; padding:16px; border-radius:24px 24px 0 0; animation: slideUp 0.3s ease-out; margin-bottom: 24px;">
            <div style="background:white; border-radius:24px; padding:8px 0; margin-bottom:16px;">
                <div class="sheet-action" style="display:flex; align-items:center; gap:16px; padding:16px 24px; border-bottom:1px solid #f0f0f0;">
                    <i class="fa-regular fa-message" style="font-size:20px; color:#333;"></i>
                    <div>
                        <div style="font-weight:600; color:#000; font-size:16px;">New Chat</div>
                        <div style="font-size:12px; color:#888;">Send a message to your contact</div>
                    </div>
                </div>
            </div>
            <button id="close-modal-btn" style="width:100%; background:white; border:none; padding:16px; border-radius:30px; font-size:16px; font-weight:600; color:#000;">Cancel</button>
        </div>
    </div>

    <!-- Core Scripts -->
    <script src="supabase.js"></script>
    <script src="push.js"></script>
    <script>
        document.addEventListener('app:init', () => {
            const newChatBtns = document.querySelectorAll('.new-chat-btn');
            const modal = document.getElementById('new-chat-modal');
            const closeBtn = document.getElementById('close-modal-btn');
            
            if (modal) {
                newChatBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        modal.style.display = 'flex';
                    });
                });
                
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        modal.style.display = 'none';
                    });
                }
                
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            }
        });
        document.dispatchEvent(new Event('app:init'));
    </script>
</body>
</html>
"""

with open('/Users/officeassistant/CRM/index.html', 'w') as f:
    f.write(new_index_html)

print("Created Central Dashboard at index.html and moved Clients to clients.html")
