document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${currentUser.email}&background=e0e0e0&color=333`;
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
    
    // Get client index from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');

    if (clientId !== null) {
        // Load clients from localStorage
        const clients = JSON.parse(localStorage.getItem('crm_clients')) || [];
        const client = clients[parseInt(clientId)];

        if (client) {
            // Update the DOM with client data
            document.getElementById('client-name-display').textContent = client.name;
            document.getElementById('client-type-display').textContent = `Project Type: ${client.type}`;
            
            const statusDisplay = document.getElementById('client-status-display');
            statusDisplay.innerHTML = client.status.toLowerCase() === 'ongoing' 
                ? '<i class="fa-solid fa-fire"></i> ' + client.status
                : '<i class="fa-solid fa-check"></i> ' + client.status;
                
            if (client.status.toLowerCase() !== 'ongoing') {
                statusDisplay.className = 'tag tag-match'; // Change style for complete
            }

            document.getElementById('client-location-display').textContent = client.location;
            document.getElementById('client-price-display').textContent = client.price;
            
            // Set current date string
            const today = new Date();
            const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            document.getElementById('current-date-display').textContent = dateStr;
            
            document.title = `${client.name} - CRM Dashboard`;
        }
    }
});
