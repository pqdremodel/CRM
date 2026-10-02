// Load Supabase from CDN
const SUPABASE_URL = 'https://xgnhxdrjcuhnvrmpsxef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnbmh4ZHJqY3VobnZybXBzeGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4ODQ3NDksImV4cCI6MjEwNjQ2MDc0OX0.1yxQCg1cuqZqIbYcwJkMYTIqbnADGnG62W6yL307_Rs';

let supabaseClient = null;

try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("Supabase CDN not loaded properly.");
    }
} catch (e) {
    console.error("Failed to initialize Supabase client. Your API key might be invalid:", e);
    // Force a redirect or show an alert if initialization fails
    alert("Supabase Error: The provided API key is invalid. Please check your Supabase Anon Key.");
}

// Auth check function for protected pages
async function requireAuth() {
    try {
        if (!supabaseClient) {
            window.location.href = 'login.html';
            return null;
        }
        
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error || !data.session) {
            // Not logged in, redirect to login page
            window.location.href = 'login.html';
            return null;
        }
        if (!window.notificationsSetup) {
            setupGlobalNotifications(data.session.user);
            window.notificationsSetup = true;
        }
        
        return data.session.user;
    } catch (err) {
        console.error("Auth error:", err);
        window.location.href = 'login.html';
        return null;
    }
}

function setupGlobalNotifications(currentUser) {
    // Add toast container to DOM if it doesn't exist
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    supabaseClient
        .channel('global-notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
            const msg = payload.new;
            
            // Only notify if we are the receiver
            if (msg.receiver_id === currentUser.id) {
                // Fetch sender info
                const { data: sender } = await supabaseClient
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', msg.sender_id)
                    .single();
                    
                const senderName = sender?.full_name || sender?.email || 'A team member';
                
                // Show Toast Notification
                showToast(senderName, msg.content);
            }
        })
        .subscribe();
}

function showToast(title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fa-regular fa-message"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title} sent a message</div>
            <p class="toast-desc">${message}</p>
        </div>
    `;
    
    // Clicking the toast navigates to messages
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', () => {
        window.location.href = 'messages.html';
    });
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Wait for transition
    }, 5000);
}
