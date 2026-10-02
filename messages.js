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

    // Load clients from localStorage
    const clients = JSON.parse(localStorage.getItem('crm_clients')) || [];
    const contactList = document.getElementById('contact-list');
    const chatHistory = document.getElementById('chat-history');
    let activeClient = null;

    function renderContacts() {
        contactList.innerHTML = '';
        
        if (clients.length === 0) {
            contactList.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:14px;">No clients found. Add some clients in the dashboard first.</div>';
            return;
        }

        clients.forEach((client, index) => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            
            // Randomly assign online/offline for mockup purposes
            const isOnline = Math.random() > 0.5;
            const statusClass = isOnline ? 'online' : 'offline';
            
            item.innerHTML = `
                <div class="contact-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=random&color=fff" alt="${client.name}">
                    <div class="status-dot ${statusClass}"></div>
                </div>
                <div class="contact-info">
                    <div class="contact-top">
                        <h4>${client.name}</h4>
                        <span class="time"></span>
                    </div>
                    <div class="contact-bottom">
                        <p>${client.type} · ${client.location}</p>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                setActiveChat(client, isOnline);
            });
            
            contactList.appendChild(item);
        });
    }

    function setActiveChat(client, isOnline) {
        activeClient = client;
        document.getElementById('active-chat-name').textContent = client.name;
        document.getElementById('active-chat-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=random&color=fff`;
        document.getElementById('active-chat-status').textContent = isOnline ? 'Online' : 'Offline';
        document.getElementById('active-chat-status').style.color = isOnline ? '#4caf50' : '#9e9e9e';
        
        chatHistory.innerHTML = `
            <div class="message-date"><span>Today</span></div>
            <div class="message-row received">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=random&color=fff" class="message-avatar">
                <div class="message-bubble">
                    <p>Hi, I am interested in getting a quote for the ${client.type} project.</p>
                    <span class="message-time">8:00 AM</span>
                </div>
            </div>
        `;
    }

    renderContacts();

    // Mock Chat Functionality
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    function sendMessage() {
        if (!activeClient) {
            alert('Please select a client to message first.');
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
