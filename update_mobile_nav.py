import os
import glob

html_files = glob.glob('/Users/officeassistant/CRM/*.html')

for filepath in html_files:
    with open(filepath, 'r') as f:
        content = f.read()

    # If already added, skip
    if 'mobile-header' in content:
        continue

    # We want to add the mobile header before <aside class="sidebar">
    header_html = """
        <!-- Mobile Header -->
        <div class="mobile-header">
            <div class="logo">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Flame_icon.svg" alt="Flame" class="logo-icon" width="24" height="24" style="filter: invert(65%) sepia(85%) saturate(1915%) hue-rotate(345deg) brightness(102%) contrast(105%);">
                <span class="logo-text" style="color: var(--primary-color);">PQD Remodels</span>
            </div>
            <button id="mobile-menu-btn" style="background: none; border: none; font-size: 24px; color: var(--primary-color); cursor: pointer;"><i class="fa-solid fa-bars"></i></button>
        </div>
    """
    
    # Also add a script to toggle the menu just before </body>
    script_html = """
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const menuBtn = document.getElementById('mobile-menu-btn');
            const sidebar = document.querySelector('.sidebar');
            if (menuBtn && sidebar) {
                menuBtn.addEventListener('click', () => {
                    sidebar.classList.toggle('mobile-open');
                });
                
                // Close sidebar when clicking outside
                document.addEventListener('click', (e) => {
                    if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('mobile-open')) {
                        sidebar.classList.remove('mobile-open');
                    }
                });
            }
        });
    </script>
</body>
"""

    content = content.replace('<!-- Sidebar -->', header_html + '\n        <!-- Sidebar -->')
    content = content.replace('</body>', script_html)

    with open(filepath, 'w') as f:
        f.write(content)

print("Updated HTML files.")
