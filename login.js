document.addEventListener('DOMContentLoaded', async () => {
    // Check if already logged in
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        window.location.href = 'index.html';
        return;
    }

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

        const { data, error } = await supabase.auth.signInWithPassword({
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

        const { data, error } = await supabase.auth.signUp({
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
