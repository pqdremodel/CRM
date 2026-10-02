document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${currentUser.email}&background=e0e0e0&color=333`;
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });

    // Mock team members (users)
    const teamMembers = [
        { name: "Sarah Miller", role: "Project Manager", status: "online", lastMessage: "Can you send me the latest blueprints?", time: "10:24 AM" },
        { name: "David Chen", role: "Site Supervisor", status: "offline", lastMessage: "The framing contractor just submitted their invoice.", time: "Yesterday" },
        { name: "Emily Rodriguez", role: "Lead Designer", status: "online", lastMessage: "Client approved the material selection. We are good to go!", time: "Monday" }
    ];
    
    const contactList = document.getElementById('contact-list');
    const chatHistory = document.getElementById('chat-history');
    let activeUser = null;

    function renderContacts() {
        contactList.innerHTML = '';

        teamMembers.forEach((user) => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            
            const isOnline = user.status === 'online';
            const statusClass = isOnline ? 'online' : 'offline';
            
            item.innerHTML = `
                <div class="contact-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff" alt="${user.name}">
                    <div class="status-dot ${statusClass}"></div>
                </div>
                <div class="contact-info">
                    <div class="contact-top">
                        <h4>${user.name}</h4>
                        <span class="time">${user.time}</span>
                    </div>
                    <div class="contact-bottom">
                        <p>${user.lastMessage}</p>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                setActiveChat(user, isOnline);
            });
            
            contactList.appendChild(item);
        });
    }

    function setActiveChat(user, isOnline) {
        activeUser = user;
        document.getElementById('active-chat-name').textContent = user.name;
        document.getElementById('active-chat-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
        document.getElementById('active-chat-status').textContent = isOnline ? 'Online' : 'Offline';
        document.getElementById('active-chat-status').style.color = isOnline ? '#4caf50' : '#9e9e9e';
        
        chatHistory.innerHTML = `
            <div class="message-date"><span>Today</span></div>
            <div class="message-row received">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff" class="message-avatar">
                <div class="message-bubble">
                    <p>${user.lastMessage}</p>
                    <span class="message-time">${user.time}</span>
                </div>
            </div>
        `;
    }

    renderContacts();

    // Mock Chat Functionality
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    function sendMessage() {
        if (!activeUser) {
            alert('Please select a team member to message first.');
            return;
        }
        
        const text = messageInput.value.trim();
        if (!text) return;

        // Create new message row
        const row = document.createElement('div');
        row.className = 'message-row sent';

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        row.innerHTML = `
            <div class="message-bubble">
                <p>${text}</p>
                <span class="message-time">${timeStr} <i class="fa-solid fa-check" style="color: #999;"></i></span>
            </div>
        `;

        chatHistory.appendChild(row);
        
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        // Clear input
        messageInput.value = '';
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
