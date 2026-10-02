// Load Supabase from CDN
const SUPABASE_URL = 'https://xgnhxdrjcuhnvrmpsxef.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KimGSP4LWeYvWXuaE37CgQ_Q9zadBRt';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth check function for protected pages
async function requireAuth() {
    const { data, error } = await supabase.auth.getSession();
    
    if (!data.session) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return null;
    }
    
    return data.session.user;
}
