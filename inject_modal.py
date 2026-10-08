import glob
import os

html_files = glob.glob('/Users/officeassistant/CRM/*.html')

modal_html = """
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
                <div class="sheet-action" style="display:flex; align-items:center; gap:16px; padding:16px 24px; border-bottom:1px solid #f0f0f0;">
                    <i class="fa-solid fa-address-book" style="font-size:20px; color:#333;"></i>
                    <div>
                        <div style="font-weight:600; color:#000; font-size:16px;">New Contact</div>
                        <div style="font-size:12px; color:#888;">Add a contact to be able to send messages</div>
                    </div>
                </div>
                <div class="sheet-action" style="display:flex; align-items:center; gap:16px; padding:16px 24px;">
                    <i class="fa-solid fa-user-group" style="font-size:20px; color:#333;"></i>
                    <div>
                        <div style="font-weight:600; color:#000; font-size:16px;">New Community</div>
                        <div style="font-size:12px; color:#888;">Join the community around you</div>
                    </div>
                </div>
            </div>
            
            <button id="close-modal-btn" style="width:100%; background:white; border:none; padding:16px; border-radius:30px; font-size:16px; font-weight:600; color:#000;">Cancel</button>
        </div>
    </div>
    
    <style>
        @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
    </style>
    
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
    </script>
"""

for filepath in html_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    if '<div id="new-chat-modal"' not in content:
        content = content.replace('</body>', modal_html + '\n</body>')
        with open(filepath, 'w') as f:
            f.write(content)

print("Modal added!")
