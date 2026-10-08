with open('/Users/officeassistant/CRM/messages.html', 'r') as f:
    content = f.read()

# Replace the chat-sidebar content
start_idx = content.find('<div class="chat-sidebar">') + len('<div class="chat-sidebar">')
end_idx = content.find('</div>\n            \n            <!-- Chat Window -->')

new_sidebar_html = """
                <!-- Mobile specific App Header -->
                <div class="app-title-mobile" style="padding: 16px 24px 0;">
                    Mengobrol
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                
                <!-- Stories Container -->
                <div class="stories-container" style="padding: 0 24px;">
                    <div class="story-item">
                        <div class="story-add">
                            <i class="fa-solid fa-plus"></i>
                        </div>
                        <div class="story-name">Add story</div>
                    </div>
                    <!-- Mock stories, can be dynamic later -->
                    <div class="story-item">
                        <img src="https://ui-avatars.com/api/?name=Tom&background=random&color=fff" class="story-avatar">
                        <div class="story-name">Tom</div>
                    </div>
                    <div class="story-item">
                        <img src="https://ui-avatars.com/api/?name=Jennifer&background=random&color=fff" class="story-avatar">
                        <div class="story-name">Jennifer</div>
                    </div>
                    <div class="story-item">
                        <img src="https://ui-avatars.com/api/?name=David&background=random&color=fff" class="story-avatar">
                        <div class="story-name">David</div>
                    </div>
                    <div class="story-item">
                        <img src="https://ui-avatars.com/api/?name=John&background=random&color=fff" class="story-avatar">
                        <div class="story-name">John</div>
                    </div>
                </div>

                <div class="section-header-mobile" style="padding: 0 24px;">
                    Chats
                    <i class="fa-solid fa-ellipsis"></i>
                </div>

                <div class="contact-list" id="contact-list" style="padding: 0 24px;">
                    <!-- Dynamic contacts will be populated here -->
                </div>
"""

content = content[:start_idx] + new_sidebar_html + content[end_idx:]

with open('/Users/officeassistant/CRM/messages.html', 'w') as f:
    f.write(content)

print("Rewrote messages.html")
