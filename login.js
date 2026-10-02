document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) {
        document.getElementById('error-message').textContent = 'Invalid Supabase API Key. Please update supabase.js with the correct Anon Key.';
        document.getElementById('error-message').style.display = 'block';
        return;
    }

    // Check if already logged in
    try {
        const { data } = await supabaseClient.auth.getSession();
        if (data.session) {
            window.location.href = 'index.html';
            return;
        }
    } catch(e) {}

    const loginForm = document.getElementById('login-form');
    const signupBtn = document.getElementById('signup-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('error-message');
    const successMsg = document.getElementById('success-message');

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';
        successMsg.style.display = 'none';
        
        const email = emailInput.value;
        const password = passwordInput.value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorMsg.textContent = error.message;
            errorMsg.style.display = 'block';
        } else {
            window.location.href = 'index.html';
        }
    });

    // Handle Signup
    signupBtn.addEventListener('click', async () => {
        errorMsg.style.display = 'none';
        successMsg.style.display = 'none';
        
        const email = emailInput.value;
        const password = passwordInput.value;
        
        if (!email || !password) {
            errorMsg.textContent = 'Please enter an email and password to sign up.';
            errorMsg.style.display = 'block';
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (error) {
            errorMsg.textContent = error.message;
            errorMsg.style.display = 'block';
        } else {
            successMsg.textContent = 'Account created successfully! You can now sign in.';
            successMsg.style.display = 'block';
        }
    });
});
