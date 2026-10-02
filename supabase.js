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
        
        return data.session.user;
    } catch (err) {
        console.error("Auth error:", err);
        window.location.href = 'login.html';
        return null;
    }
}
