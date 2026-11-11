// Capture callback errors before the auth client consumes the URL fragment.
(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const callbackError = fragment.has('error') || query.has('error');
    const updating = query.get('mode') === 'update' || fragment.get('type') === 'recovery';

    document.addEventListener('app:init', async () => {
        const requestForm = document.getElementById('request-form');
        const updateForm = document.getElementById('update-form');
        const errorMessage = document.getElementById('reset-error');
        const successMessage = document.getElementById('reset-success');
        const description = document.getElementById('reset-description');
        const showError = (message) => {
            errorMessage.textContent = message;
            errorMessage.hidden = false;
        };
        const clearMessages = () => {
            errorMessage.hidden = true;
            successMessage.hidden = true;
        };
        const run = async (form, action) => {
            const button = form.querySelector('button');
            if (button.disabled) return;
            clearMessages();
            button.disabled = true;
            form.setAttribute('aria-busy', 'true');
            try {
                await action();
            } catch (error) {
                const networkFailure = error.name === 'AuthRetryableFetchError' ||
                    /failed to fetch|networkerror|load failed|network request failed/i.test(error.message || '');
                showError(networkFailure
                    ? 'Unable to reach the sign-in service. Check your connection and try again. If this continues, ask your administrator to check the Supabase project status and API URL.'
                    : error.message || 'Unable to connect. Please try again.');
            } finally {
                button.disabled = false;
                form.removeAttribute('aria-busy');
            }
        };

        if (!supabaseClient) {
            requestForm.hidden = true;
            showError('Password reset is unavailable. Please reload and try again.');
            return;
        }

        requestForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!requestForm.reportValidity()) return;
            run(requestForm, async () => {
                const redirectTo = new URL('reset-password.html?mode=update', window.location.href).href;
                const { error } = await supabaseClient.auth.resetPasswordForEmail(
                    document.getElementById('reset-email').value.trim(), { redirectTo }
                );
                if (error) throw error;
                successMessage.textContent = 'If an account exists for this email, you’ll receive a reset link. Check your inbox and spam folder.';
                successMessage.hidden = false;
            });
        });

        updateForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!updateForm.reportValidity()) return;
            run(updateForm, async () => {
                const password = document.getElementById('new-password').value;
                if (password !== document.getElementById('confirm-password').value) {
                    throw new Error('Passwords do not match. Please try again.');
                }
                const { error } = await supabaseClient.auth.updateUser({ password });
                if (error) throw error;
                updateForm.reset();
                updateForm.hidden = true;
                description.textContent = 'Your password has been updated.';
                successMessage.textContent = 'You can now continue to the CRM.';
                successMessage.hidden = false;
                const link = document.querySelector('a[href="login.html"]');
                link.href = 'index.html';
                link.textContent = 'Continue to CRM';
            });
        });

        if (updating || callbackError) {
            requestForm.hidden = true;
            description.textContent = 'Checking your reset link…';
            try {
                const { data, error } = await supabaseClient.auth.getSession();
                // Remove tokens and errors from the address bar after auth initialization.
                window.history.replaceState(null, '', 'reset-password.html?mode=update');
                if (callbackError || error || !data.session) {
                    throw new Error('This reset link is invalid or has expired. Request a new link below.');
                }
                document.getElementById('reset-title').textContent = 'Choose a new password';
                description.textContent = 'Enter and confirm your new password.';
                updateForm.hidden = false;
                document.getElementById('new-password').focus();
            } catch (error) {
                description.textContent = 'Enter your email to request a new reset link.';
                requestForm.hidden = false;
                showError(error.message || 'Unable to verify your reset link. Please try again.');
            }
        }
    }, { once: true });
})();
