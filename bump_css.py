import glob

files = glob.glob('/Users/officeassistant/CRM/*.html')
for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    if 'style.css?v=6' in content:
        content = content.replace('style.css?v=6', 'style.css?v=7')
    elif 'style.css?v=5' in content:
        content = content.replace('style.css?v=5', 'style.css?v=7')
    elif 'style.css' in content and '?' not in content.split('style.css')[1][:3]:
        content = content.replace('style.css', 'style.css?v=7')
        
    with open(f, 'w') as file:
        file.write(content)
