import glob

html_files = glob.glob('/Users/officeassistant/CRM/*.html')
js_files = glob.glob('/Users/officeassistant/CRM/*.js')

for filepath in html_files + js_files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Change the listener to our custom event
    content = content.replace("addEventListener('turbo:load'", "addEventListener('app:init'")

    with open(filepath, 'w') as f:
        f.write(content)

# Now inject the trigger at the end of every HTML body
for filepath in html_files:
    with open(filepath, 'r') as f:
        content = f.read()
        
    trigger_script = "<script>document.dispatchEvent(new Event('app:init'));</script>\n</body>"
    if "Event('app:init')" not in content:
        content = content.replace('</body>', trigger_script)
        
    with open(filepath, 'w') as f:
        f.write(content)

print("Fixed event timings!")
