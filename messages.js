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
        
        // Fetch unread counts per sender
        const { data: unreadData } = await supabaseClient
            .from('messages')
            .select('sender_id')
            .eq('receiver_id', currentUser.id)
            .eq('is_read', false);
            
        // Count unread messages grouped by sender_id
        const unreadCounts = {};
        if (unreadData) {
            unreadData.forEach(msg => {
                unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
            });
        }
        
        // Merge unread count into profiles
        const profilesWithUnread = profiles.map(p => ({
            ...p,
            unreadCount: unreadCounts[p.id] || 0
        }));

        renderContacts(profilesWithUnread || []);
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
            
            const badgeHtml = user.unreadCount > 0 
                ? `<span class="unread-badge">${user.unreadCount}</span>` 
                : '';
            
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
                        ${badgeHtml}
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                
                // Optimistically remove badge
                const badge = item.querySelector('.unread-badge');
                if (badge) badge.remove();
                
                setActiveChat(user, displayName, isOnline);
            });
            
            contactList.appendChild(item);
        });
    }

    async function setActiveChat(user, displayName, isOnline) {
        activeUser = user;
        document.getElementById('active-chat-name').textContent = displayName;
        document.getElementById('active-chat-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;
        document.getElementById('active-chat-status').textContent = isOnline ? 'Online' : 'Offline';
        document.getElementById('active-chat-status').style.color = isOnline ? '#4caf50' : '#9e9e9e';
        
        chatHistory.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-muted);">
                Loading messages...
            </div>
        `;
        
        await loadMessages(user.id);
    }

    async function loadMessages(otherUserId) {
        // Mark messages as read
        await supabaseClient
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', otherUserId)
            .eq('receiver_id', currentUser.id)
            .eq('is_read', false);
            
        // Update global counter in sidebar
        if (typeof updateGlobalUnreadCount === 'function') {
            updateGlobalUnreadCount(currentUser.id);
        }

        // Fetch messages between currentUser and otherUserId
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });
            
        if (error) {
            console.error("Error loading messages:", error);
            chatHistory.innerHTML = '<div style="text-align:center; color:#ef4444;">Error loading messages. Did you create the messages table?</div>';
            return;
        }

        chatHistory.innerHTML = '';
        
        if (messages.length === 0) {
            chatHistory.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-muted);">
                    Start your conversation with ${document.getElementById('active-chat-name').textContent}...
                </div>
            `;
            return;
        }

        messages.forEach(msg => appendMessageToUI(msg));
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    function appendMessageToUI(msg) {
        // Remove empty state message if it exists
        const emptyState = chatHistory.querySelector('div[style*="height:100%"]');
        if (emptyState) emptyState.remove();

        const isSent = msg.sender_id === currentUser.id;
        const row = document.createElement('div');
        row.className = `message-row ${isSent ? 'sent' : 'received'}`;
        
        const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isSent) {
            row.innerHTML = `
                <div class="message-bubble">
                    <p>${msg.content}</p>
                    <span class="message-time">${timeStr}</span>
                </div>
            `;
        } else {
            const activeName = document.getElementById('active-chat-name').textContent;
            row.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(activeName)}&background=random&color=fff" class="message-avatar">
                <div class="message-bubble">
                    <p>${msg.content}</p>
                    <span class="message-time">${timeStr}</span>
                </div>
            `;
        }
        chatHistory.appendChild(row);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Call the function to load users
    loadRealUsers();



    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    async function sendMessage() {
        if (!activeUser) {
            alert('Please select a team member to message first.');
            return;
        }
        
        const text = messageInput.value.trim();
        if (!text) return;

        // Clear input immediately for better UX
        messageInput.value = '';

        // Save to database
        const { data, error } = await supabaseClient
            .from('messages')
            .insert([
                { 
                    sender_id: currentUser.id, 
                    receiver_id: activeUser.id, 
                    content: text 
                }
            ]);
            
        if (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message. Please ensure the messages table exists.");
            messageInput.value = text; // restore text
        }
    }
    
    // Set up Realtime listener for incoming messages
    supabaseClient
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new;
            // Only append if it belongs to the active chat
            if (activeUser && (
                (newMsg.sender_id === currentUser.id && newMsg.receiver_id === activeUser.id) ||
                (newMsg.sender_id === activeUser.id && newMsg.receiver_id === currentUser.id)
            )) {
                appendMessageToUI(newMsg);
                
                // If it's a received message in the active chat, instantly mark it as read
                if (newMsg.receiver_id === currentUser.id) {
                    supabaseClient
                        .from('messages')
                        .update({ is_read: true })
                        .eq('id', newMsg.id)
                        .then(() => {
                            if (typeof updateGlobalUnreadCount === 'function') {
                                updateGlobalUnreadCount(currentUser.id);
                            }
                        });
                }
            } else if (newMsg.receiver_id === currentUser.id) {
                // Not the active chat, refresh contact list to show badge
                loadRealUsers();
            }
        })
        .subscribe();

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
