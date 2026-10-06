let currentUser = null;

document.addEventListener('turbo:load', async () => {
    currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-avatar').src = currentUser.getAvatarUrl();
        
        document.getElementById('settings-email').value = currentUser.email;
        document.getElementById('settings-avatar-preview').src = currentUser.getAvatarUrl();
        
        if (currentUser.profile) {
            document.getElementById('settings-first-name').value = currentUser.profile.first_name || '';
            document.getElementById('settings-last-name').value = currentUser.profile.last_name || '';
        } else {
            // Fallback for older profiles that only had full_name
            const parts = (currentUser.profile?.full_name || '').split(' ');
            document.getElementById('settings-first-name').value = parts[0] || '';
            document.getElementById('settings-last-name').value = parts.slice(1).join(' ') || '';
        }
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.Turbo ? window.Turbo.visit('login.html') : window.location.href = 'login.html';
    });
    
    // Check Notification Status
    if (Notification.permission === 'granted') {
        document.getElementById('push-status-text').textContent = 'Enabled';
        document.getElementById('enable-push-btn').textContent = 'Enabled';
        document.getElementById('enable-push-btn').disabled = true;
    }
});

// Avatar Upload Preview
const avatarContainer = document.getElementById('avatar-container');
const avatarInput = document.getElementById('settings-avatar-input');
const avatarPreview = document.getElementById('settings-avatar-preview');
let selectedAvatarFile = null;

avatarContainer.addEventListener('click', () => {
    avatarInput.click();
});

avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedAvatarFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Save Settings
const settingsForm = document.getElementById('settings-form');
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('settings-save-btn');
    const firstName = document.getElementById('settings-first-name').value.trim();
    const lastName = document.getElementById('settings-last-name').value.trim();
    
    if (!firstName) return;
    
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    try {
        let avatarUrl = currentUser.profile?.avatar_url;
        
        // Handle avatar upload if a new file was selected
        if (selectedAvatarFile) {
            const fileExt = selectedAvatarFile.name.split('.').pop();
            const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabaseClient.storage
                .from('avatars')
                .upload(fileName, selectedAvatarFile, { upsert: true });
                
            if (uploadError) {
                console.error("Storage Error:", uploadError);
                throw new Error("Storage Error: " + uploadError.message);
            }
            
            const { data: { publicUrl } } = supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);
                
            avatarUrl = publicUrl;
        }
    
        // Update profile in DB
        const { error } = await supabaseClient
            .from('profiles')
            .update({ 
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`.trim(),
                avatar_url: avatarUrl
            })
            .eq('id', currentUser.id);
            
        if (error) {
            console.error("DB Error:", error);
            throw new Error("Database Error: " + error.message);
        }
        
        alert("Settings saved successfully!");
        
        // Update local session
        if (!currentUser.profile) currentUser.profile = {};
        currentUser.profile.first_name = firstName;
        currentUser.profile.last_name = lastName;
        currentUser.profile.full_name = `${firstName} ${lastName}`.trim();
        currentUser.profile.avatar_url = avatarUrl;
        
        // Update global UI
        document.getElementById('profile-avatar').src = currentUser.getAvatarUrl();
        selectedAvatarFile = null;
        
    } catch (error) {
        console.error("Error updating profile:", error);
        alert(`Failed to save settings: ${error.message}.`);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// Push Notifications Enable
document.getElementById('enable-push-btn').addEventListener('click', async () => {
    if (typeof requestNotificationPermission === 'function') {
        const granted = await requestNotificationPermission();
        if (granted) {
            document.getElementById('push-status-text').textContent = 'Enabled';
            document.getElementById('enable-push-btn').textContent = 'Enabled';
            document.getElementById('enable-push-btn').disabled = true;
            
            // Subscribes user if granted
            if (typeof subscribeUserToPush === 'function') {
                await subscribeUserToPush();
                alert('Push notifications configured for this device!');
            }
        } else {
            alert('Notification permission was denied. You may need to enable it in your browser settings.');
        }
    } else {
        alert('Push notifications script not loaded.');
    }
});
