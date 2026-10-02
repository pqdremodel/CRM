let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.email)}&background=e0e0e0&color=333`;
        
        document.getElementById('settings-email').value = currentUser.email;
        
        // Fetch profile
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
        if (profile && profile.full_name) {
            document.getElementById('settings-name').value = profile.full_name;
            document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=e0e0e0&color=333`;
        }
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
});

const settingsForm = document.getElementById('settings-form');
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('settings-save-btn');
    const newName = document.getElementById('settings-name').value.trim();
    
    if (!newName) return;
    
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    const { error } = await supabaseClient
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', currentUser.id);
        
    btn.textContent = originalText;
    btn.disabled = false;
    
    if (error) {
        console.error("Error updating profile:", error);
        alert("Failed to save settings. Please try again.");
    } else {
        alert("Settings saved successfully!");
        // Update avatar globally
        document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=e0e0e0&color=333`;
    }
});
