import re

with open('/Users/officeassistant/CRM/messages.js', 'r') as f:
    js = f.read()

# Replace loadRealUsers with an updated version
new_load_real_users = """    async function loadRealUsers() {
        // Fetch real users from Supabase profiles table
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .neq('id', currentUser.id);

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
            
        const unreadCounts = {};
        if (unreadData) {
            unreadData.forEach(msg => {
                unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
            });
        }
        
        // Fetch last message for each profile
        const { data: allMessages } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });
            
        const lastMessages = {};
        if (allMessages) {
            allMessages.forEach(msg => {
                const otherId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
                if (!lastMessages[otherId]) {
                    lastMessages[otherId] = msg;
                }
            });
        }
        
        // Format time helper
        const formatTime = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase();
        };

        // Merge unread count into profiles
        const profilesWithUnread = profiles.map(p => ({
            ...p,
            unreadCount: unreadCounts[p.id] || 0,
            lastMessageText: lastMessages[p.id] ? lastMessages[p.id].content : 'Say hello...',
            lastMessageTime: lastMessages[p.id] ? formatTime(lastMessages[p.id].created_at) : '',
            lastMessageRawTime: lastMessages[p.id] ? new Date(lastMessages[p.id].created_at).getTime() : 0
        })).sort((a, b) => b.lastMessageRawTime - a.lastMessageRawTime);

        renderContacts(profilesWithUnread || []);
    }"""

js = re.sub(r'    async function loadRealUsers\(\) \{.*?(?=    function renderContacts)', new_load_real_users + "\n\n", js, flags=re.DOTALL)

with open('/Users/officeassistant/CRM/messages.js', 'w') as f:
    f.write(js)
