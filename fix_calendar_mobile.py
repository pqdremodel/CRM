with open('/Users/officeassistant/CRM/calendar.html', 'r') as f:
    html = f.read()

# Change padding to a responsive class instead of inline style
if 'style="background: white; padding: 24px;"' in html:
    html = html.replace('style="background: white; padding: 24px;"', 'style="background: white;" class="main-content cal-container"')
    with open('/Users/officeassistant/CRM/calendar.html', 'w') as f:
        f.write(html)

with open('/Users/officeassistant/CRM/style.css', 'r') as f:
    css = f.read()

# Add cal-container padding rules
if '.cal-container' not in css:
    css += """
.cal-container {
    padding: 24px;
}
@media (max-width: 768px) {
    .cal-container {
        padding: 0 !important;
    }
    .fc-toolbar {
        padding: 12px 16px;
        flex-direction: row !important;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 8px !important;
    }
    .fc-toolbar-title {
        font-size: 18px !important;
    }
    .fc-toolbar-chunk:first-child {
        order: 2;
    }
    .fc-toolbar-chunk:nth-child(2) {
        order: 1;
        width: 100%;
        margin-bottom: 8px;
    }
    .fc-toolbar-chunk:last-child {
        order: 3;
    }
    .fc-button {
        padding: 4px 8px !important;
        font-size: 12px !important;
        height: 32px !important;
    }
    .fc-view-harness {
        border-radius: 0 !important;
        box-shadow: none !important;
        border-top: 1px solid var(--border-color);
    }
}
"""
    with open('/Users/officeassistant/CRM/style.css', 'w') as f:
        f.write(css)

print("Calendar mobile fixes applied")
