import glob
import re

html_files = glob.glob('/Users/officeassistant/CRM/*.html')

bottom_nav_html = """
    <!-- Bottom Navigation (Mobile Only) -->
    <nav class="bottom-nav">
        <a href="index.html" class="nav-item" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('index.html') : window.location.href='index.html'">
            <i class="fa-solid fa-house"></i>
        </a>
        <a href="messages.html" class="nav-item new-chat-btn" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('messages.html') : window.location.href='messages.html'">
            <i class="fa-solid fa-plus"></i> New Chat
        </a>
        <a href="settings.html" class="nav-item" onclick="event.preventDefault(); window.Turbo ? window.Turbo.visit('settings.html') : window.location.href='settings.html'">
            <i class="fa-regular fa-user"></i>
        </a>
    </nav>
"""

for filepath in html_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    if '<nav class="bottom-nav">' not in content:
        content = content.replace('</body>', bottom_nav_html + '\n</body>')
    
    with open(filepath, 'w') as f:
        f.write(content)

with open('/Users/officeassistant/CRM/style.css', 'r') as f:
    css = f.read()

new_css = """
/* Bottom Navigation */
.bottom-nav {
    display: none;
}

@media (max-width: 768px) {
    .sidebar { display: none !important; }
    .mobile-header { display: none !important; }
    
    .dashboard-container {
        padding-bottom: 80px; /* Space for bottom nav */
    }

    .main-content {
        height: calc(100dvh - 80px);
        padding: 16px !important;
        background: #f9f9f9 !important;
    }

    .bottom-nav {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 80px;
        background: white;
        border-top: 1px solid #f0f0f0;
        justify-content: space-around;
        align-items: center;
        padding-bottom: env(safe-area-inset-bottom);
        z-index: 1000;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -4px 12px rgba(0,0,0,0.03);
    }
    
    .bottom-nav .nav-item {
        color: #999;
        font-size: 24px;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
        border-radius: 50%;
    }
    
    .bottom-nav .nav-item.active {
        color: #000;
    }
    
    .bottom-nav .new-chat-btn {
        background: #000;
        color: #fff !important;
        font-size: 14px;
        font-weight: 600;
        border-radius: 30px;
        width: auto;
        padding: 0 20px;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    /* Specific overrides for Mengobrol UI */
    .app-title-mobile {
        font-size: 28px;
        font-weight: 700;
        color: #000;
        margin-bottom: 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .app-title-mobile i {
        font-size: 22px;
        color: #666;
        font-weight: normal;
    }
    
    .stories-container {
        display: flex;
        overflow-x: auto;
        gap: 16px;
        padding-bottom: 16px;
        margin-bottom: 16px;
    }
    
    .stories-container::-webkit-scrollbar { display: none; }
    
    .story-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        min-width: 60px;
    }
    
    .story-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        object-fit: cover;
    }
    
    .story-add {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 1px dashed #ccc;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: #999;
    }
    
    .story-name {
        font-size: 12px;
        color: #333;
        font-weight: 500;
        white-space: nowrap;
    }
    
    .section-header-mobile {
        font-size: 20px;
        font-weight: 700;
        color: #000;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .section-header-mobile i {
        color: #999;
    }
    
    /* Contact List Refinements */
    .contact-item {
        background: transparent !important;
        border: none !important;
        padding: 12px 0 !important;
        margin-bottom: 0 !important;
    }
    
    .contact-avatar img {
        width: 50px !important;
        height: 50px !important;
        border-radius: 50% !important;
    }
    
    .contact-top h4 {
        font-size: 16px !important;
        font-weight: 600 !important;
        color: #000 !important;
    }
    
    .contact-top .time {
        font-size: 12px !important;
        color: #aaa !important;
    }
    
    .contact-bottom p {
        font-size: 14px !important;
        color: #888 !important;
    }
    
    .unread-badge {
        background: #fbbf24 !important; /* Yellow badge */
        color: #fff !important;
        width: 20px;
        height: 20px;
        border-radius: 50% !important;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px !important;
        padding: 0 !important;
    }
}
"""

if "Bottom Navigation" not in css:
    css += "\n" + new_css

with open('/Users/officeassistant/CRM/style.css', 'w') as f:
    f.write(css)

print("Added mobile layout structures!")
