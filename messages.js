document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.getDisplayName();
        document.getElementById('profile-avatar').src = currentUser.getAvatarUrl();
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
    
    // Mobile Contacts Toggle
    const contactsToggle = document.getElementById('mobile-contacts-toggle');
    const contactsWrapper = document.getElementById('mobile-contacts-wrapper');
    const chevron = document.getElementById('mobile-contacts-chevron');
    if (contactsToggle && contactsWrapper) {
        contactsToggle.addEventListener('click', (e) => {
            if (e.target.closest('button')) return; // ignore pen button click
            if (contactsWrapper.classList.contains('mobile-contacts-collapsed')) {
                contactsWrapper.classList.remove('mobile-contacts-collapsed');
                contactsWrapper.classList.add('mobile-contacts-expanded');
                if (chevron) chevron.style.transform = 'rotate(180deg)';
            } else {
                contactsWrapper.classList.add('mobile-contacts-collapsed');
                contactsWrapper.classList.remove('mobile-contacts-expanded');
                if (chevron) chevron.style.transform = 'rotate(0deg)';
            }
        });
    }
    
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
        
        let attachmentHtml = '';
        if (msg.attachment_url) {
            const fileName = (msg.attachment_name || '').toLowerCase();
            const isImage = fileName.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) != null;
            const isVideo = fileName.match(/\.(mp4|webm|ogg|mov)$/) != null;
            
            if (isImage) {
                attachmentHtml = `
                    <div style="margin-top: 8px; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.02); padding: 4px;">
                        <a href="${msg.attachment_url}" target="_blank">
                            <img src="${msg.attachment_url}" alt="${msg.attachment_name}" style="max-width: 100%; max-height: 250px; display: block; border-radius: 6px; object-fit: contain;">
                        </a>
                    </div>
                `;
            } else if (isVideo) {
                attachmentHtml = `
                    <div style="margin-top: 8px; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.02); padding: 4px;">
                        <video controls style="max-width: 100%; max-height: 250px; display: block; border-radius: 6px; background: #000;">
                            <source src="${msg.attachment_url}">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                `;
            } else {
                attachmentHtml = `
                    <div style="margin-top: 8px; padding: 12px; background: rgba(0,0,0,0.05); border-radius: 8px; display: flex; align-items: center; gap: 12px;">
                        <i class="fa-solid fa-file" style="font-size: 24px; color: var(--primary-color);"></i>
                        <div style="flex: 1; overflow: hidden;">
                            <div style="font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main);">${msg.attachment_name || 'Attachment'}</div>
                        </div>
                        <a href="${msg.attachment_url}" target="_blank" style="color: var(--primary-color); text-decoration: none; padding: 8px; border-radius: 50%; background: white;"><i class="fa-solid fa-download"></i></a>
                    </div>
                `;
            }
        }

        if (isSent) {
            row.innerHTML = `
                <div class="message-bubble">
                    <p>${msg.content}</p>
                    ${attachmentHtml}
                    <span class="message-time">${timeStr}</span>
                </div>
            `;
        } else {
            const activeName = document.getElementById('active-chat-name').textContent;
            row.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(activeName)}&background=random&color=fff" class="message-avatar">
                <div class="message-bubble">
                    <p>${msg.content}</p>
                    ${attachmentHtml}
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
    
    // File Upload Logic
    const attachBtn = document.getElementById('attach-btn');
    const fileUploadInput = document.getElementById('file-upload-input');
    
    attachBtn.addEventListener('click', () => {
        if (!activeUser) {
            alert('Please select a team member to message first.');
            return;
        }
        fileUploadInput.click();
    });
    
    fileUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !activeUser) return;
        
        // Show loading state on button
        const originalHtml = attachBtn.innerHTML;
        attachBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        attachBtn.disabled = true;
        
        try {
            // Create a unique file path
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `${currentUser.id}/${fileName}`;
            
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('message_attachments')
                .upload(filePath, file);
                
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: { publicUrl } } = supabaseClient.storage
                .from('message_attachments')
                .getPublicUrl(filePath);
                
            // Send message with attachment
            const { error: msgError } = await supabaseClient
                .from('messages')
                .insert([
                    { 
                        sender_id: currentUser.id, 
                        receiver_id: activeUser.id, 
                        content: "Sent an attachment",
                        attachment_url: publicUrl,
                        attachment_name: file.name
                    }
                ]);
                
            if (msgError) throw msgError;
            
        } catch (err) {
            console.error("File upload error:", err);
            alert("Failed to upload file. Did you create the message_attachments storage bucket?");
        } finally {
            // Reset button
            attachBtn.innerHTML = originalHtml;
            attachBtn.disabled = false;
            fileUploadInput.value = ''; // clear input
        }
    });
    
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

    // Emoji & GIF Picker Logic
    const pickerContainer = document.getElementById('picker-container');
    const emojiBtn = document.getElementById('emoji-btn');
    const tabEmoji = document.getElementById('tab-emoji');
    const tabGif = document.getElementById('tab-gif');
    const emojiView = document.getElementById('emoji-view');
    const gifView = document.getElementById('gif-view');
    const gifSearch = document.getElementById('gif-search');
    const gifResults = document.getElementById('gif-results');
    
    if (emojiBtn && pickerContainer) {
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pickerContainer.style.display = pickerContainer.style.display === 'none' ? 'flex' : 'none';
            if (pickerContainer.style.display === 'flex' && gifResults.innerHTML === '') {
                loadGifs('trending');
            }
        });
        
        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!pickerContainer.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
                pickerContainer.style.display = 'none';
            }
        });
        
        // Tabs
        tabEmoji.addEventListener('click', () => {
            tabEmoji.style.borderBottomColor = 'var(--primary-color)';
            tabEmoji.style.color = 'var(--primary-color)';
            tabGif.style.borderBottomColor = 'transparent';
            tabGif.style.color = 'var(--text-muted)';
            emojiView.style.display = 'flex';
            gifView.style.display = 'none';
        });
        
        tabGif.addEventListener('click', () => {
            tabGif.style.borderBottomColor = 'var(--primary-color)';
            tabGif.style.color = 'var(--primary-color)';
            tabEmoji.style.borderBottomColor = 'transparent';
            tabEmoji.style.color = 'var(--text-muted)';
            gifView.style.display = 'flex';
            emojiView.style.display = 'none';
        });
        
        // Emoji click
        document.querySelector('emoji-picker').addEventListener('emoji-click', event => {
            messageInput.value += event.detail.unicode;
            messageInput.focus();
        });
        
        // GIF search
        let gifTimeout = null;
        gifSearch.addEventListener('input', (e) => {
            clearTimeout(gifTimeout);
            gifTimeout = setTimeout(() => {
                loadGifs(e.target.value.trim() || 'trending');
            }, 500);
        });
        
        const MOCK_GIFS = [
            "https://media.tenor.com/2RoqGkQ0h94AAAAC/thumbs-up.gif",
            "https://media.tenor.com/Z4cR2kO5Q00AAAAC/hello-wave.gif",
            "https://media.tenor.com/tZ2Xd8LqO4UAAAAC/congratulations-congrats.gif",
            "https://media.tenor.com/O1nK39YqHBEAAAAC/dog-typing.gif",
            "https://media.tenor.com/Y1cQ7mF1AIEAAAAC/mind-blown-explosion.gif",
            "https://media.tenor.com/rMhAWeG_R4AAAAAC/ok-okay.gif",
            "https://media.tenor.com/6ZielNo08pwAAAAC/laughing-ryan-gosling.gif",
            "https://media.tenor.com/5V3o5E1UaKcAAAAC/surprised-cat.gif",
            "https://media.tenor.com/1GqO8mXUvjUAAAAC/thank-you-thanks.gif",
            "https://media.tenor.com/8-1z8QeT6cEAAAAC/typing-cat.gif"
        ];

        async function loadGifs(query) {
            gifResults.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i></div>';
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 300));
            
            gifResults.innerHTML = '';
            
            if (query && query !== 'trending' && query.length > 0) {
                // If they search, just show a subset or a funny message
                gifResults.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">Advanced GIF Search requires a premium API key. Here are some favorites!</div>';
            }
            
            MOCK_GIFS.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.style.width = '100%';
                img.style.height = '100px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                img.style.cursor = 'pointer';
                img.onclick = () => sendGif(url);
                gifResults.appendChild(img);
            });
        }
        
        async function sendGif(url) {
            if (!activeUser) {
                alert('Please select a team member to message first.');
                return;
            }
            pickerContainer.style.display = 'none';
            
            const { error } = await supabaseClient
                .from('messages')
                .insert([
                    { 
                        sender_id: currentUser.id, 
                        receiver_id: activeUser.id, 
                        content: "", // No text for pure gif messages
                        attachment_url: url,
                        attachment_name: "gif.gif"
                    }
                ]);
                
            if (error) {
                console.error("Error sending GIF:", error);
                alert("Failed to send GIF.");
            }
        }
    }
});
