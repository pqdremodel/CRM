document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.getDisplayName();
        document.getElementById('profile-avatar').src = currentUser.getAvatarUrl();
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
    
    // Get lead UUID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const leadId = urlParams.get('id');

    if (leadId) {
        // Fetch lead from Supabase
        const { data: lead, error } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (lead && !error) {
            // Update the DOM with lead data
            document.getElementById('lead-name-display').textContent = lead.name;
            document.getElementById('lead-type-display').textContent = lead.service_type || 'No Service Specified';
            document.getElementById('lead-status-display').textContent = lead.status;
            
            let statusClass = 'status-ongoing';
            if (lead.status === 'Qualified') statusClass = 'status-complete';
            if (lead.status === 'Lost') statusClass = 'status-lost';
            document.getElementById('lead-status-display').className = `status-badge ${statusClass}`;
            
            document.getElementById('lead-email-display').textContent = lead.email || 'No email';
            document.getElementById('lead-phone-display').textContent = lead.phone || 'No phone';
            
            // Populate Address and Notes
            document.getElementById('lead-address').value = lead.address || '';
            document.getElementById('lead-notes').value = lead.notes || '';

            document.title = `${lead.name} - Lead Details`;
        } else {
            console.error("Error fetching lead details:", error);
            document.getElementById('lead-name-display').textContent = "Lead Not Found";
        }

        // Save changes button logic
        document.getElementById('btn-save-lead').addEventListener('click', async (e) => {
            const btn = e.target;
            btn.textContent = "Saving...";
            btn.disabled = true;

            const updatedAddress = document.getElementById('lead-address').value;
            const updatedNotes = document.getElementById('lead-notes').value;

            const { error: updateError } = await supabaseClient
                .from('leads')
                .update({ address: updatedAddress, notes: updatedNotes })
                .eq('id', leadId);
                
            if (!updateError) {
                btn.textContent = "Saved!";
                setTimeout(() => {
                    btn.textContent = "Save Changes";
                    btn.disabled = false;
                }, 2000);
            } else {
                console.error("Error updating lead:", updateError);
                btn.textContent = "Error";
                alert("Failed to save changes. Did you add 'address' and 'notes' columns to the 'leads' table?");
                btn.disabled = false;
            }
        });
    }
});
