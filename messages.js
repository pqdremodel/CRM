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
    const contactList = document.getElementById('contact-list');
    const chatHistory = document.getElementById('chat-history');
    let activeUser = null;

    async function loadRealUsers() {
        // Fetch real users from Supabase profiles table
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .neq('id', currentUser.id); // Don't show yourself in the list

        if (error) {
            console.error("Error fetching profiles:", error);
            contactList.innerHTML = '<div style="padding:24px; text-align:center; color:#ef4444; font-size:14px;">Error loading users. Please ensure the profiles table exists.</div>';
            return;
        }

        renderContacts(profiles || []);
    }

    function renderContacts(users) {
        contactList.innerHTML = '';
        
        if (users.length === 0) {
            contactList.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:14px;">No other users found in the system yet.</div>';
            return;
        }

        users.forEach((user) => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            
            // Assume offline by default since we haven't built presence yet
            const isOnline = false;
            const statusClass = 'offline';
            
            // Use their email as their name if they haven't set a name
            const displayName = user.full_name || user.email || 'Unknown User';
            
            item.innerHTML = `
                <div class="contact-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff" alt="${displayName}">
                    <div class="status-dot ${statusClass}"></div>
                </div>
                <div class="contact-info">
                    <div class="contact-top">
                        <h4>${displayName}</h4>
                        <span class="time"></span>
                    </div>
                    <div class="contact-bottom">
                        <p>Team Member</p>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                setActiveChat(user, displayName, isOnline);
            });
            
            contactList.appendChild(item);
        });
    }

    function setActiveChat(user, displayName, isOnline) {
        activeUser = user;
        document.getElementById('active-chat-name').textContent = displayName;
        document.getElementById('active-chat-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;
        document.getElementById('active-chat-status').textContent = isOnline ? 'Online' : 'Offline';
        document.getElementById('active-chat-status').style.color = isOnline ? '#4caf50' : '#9e9e9e';
        
        chatHistory.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-muted);">
                Start your conversation with ${displayName}...
            </div>
        `;
    }

    // Call the function to load users
    loadRealUsers();



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
