with open('/Users/officeassistant/CRM/style.css', 'r') as f:
    css = f.read()

fix_css = """
/* FINAL MOBILE OVERFLOW FIXES */
@media (max-width: 768px) {
    body, html {
        overflow-x: hidden !important;
        max-width: 100vw !important;
    }
    .dashboard-container {
        width: 100vw !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
    }
    .main-content {
        min-width: 0 !important;
        max-width: 100vw !important;
        width: 100% !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
    }
    .table-container {
        width: 100% !important;
        max-width: 100vw !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        display: block !important;
    }
}
"""

if "FINAL MOBILE OVERFLOW FIXES" not in css:
    with open('/Users/officeassistant/CRM/style.css', 'w') as f:
        f.write(css + "\n" + fix_css)
    print("Fixes applied.")
else:
    print("Fixes already present.")
