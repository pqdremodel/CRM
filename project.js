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
    
    // Get client UUID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');

    if (clientId) {
        // Fetch client from Supabase
        const { data: client, error } = await supabaseClient
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (client && !error) {
            // Update the DOM with client data
            document.getElementById('client-name-display').textContent = client.name;
            document.getElementById('client-type-display').textContent = `Project Type: ${client.type}`;
            
            const statusDisplay = document.getElementById('client-status-display');
            if (statusDisplay) {
                statusDisplay.innerHTML = client.status.toLowerCase() === 'ongoing' 
                    ? '<i class="fa-solid fa-fire"></i> ' + client.status
                    : '<i class="fa-solid fa-check"></i> ' + client.status;
                    
                if (client.status.toLowerCase() !== 'ongoing') {
                    statusDisplay.className = 'tag tag-match'; // Change style for complete
                }
            }

            const locationDisplay = document.getElementById('client-location-display');
            if (locationDisplay) locationDisplay.textContent = client.location;
            
            const priceDisplay = document.getElementById('client-price-display');
            if (priceDisplay) priceDisplay.textContent = client.price;
            
            // Set current date string
            const today = new Date();
            const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            document.getElementById('current-date-display').textContent = dateStr;
            
            // Populate Address and Notes
            try {
                const addrObj = JSON.parse(client.address || "{}");
                const streetEl = document.getElementById('client-address-street');
                if (streetEl) streetEl.value = addrObj.street || client.address || '';
                
                const cityEl = document.getElementById('client-address-city');
                if (cityEl) cityEl.value = addrObj.city || '';
                
                const stateEl = document.getElementById('client-address-state');
                if (stateEl) stateEl.value = addrObj.state || '';
                
                const zipEl = document.getElementById('client-address-zip');
                if (zipEl) zipEl.value = addrObj.zip || '';
            } catch(e) {
                const streetEl = document.getElementById('client-address-street');
                if (streetEl) streetEl.value = client.address || '';
            }
            
            const notesInput = document.getElementById('client-notes');
            if (notesInput) notesInput.value = client.notes || '';

            document.title = `${client.name} - CRM Dashboard`;
        } else {
            console.error("Error fetching client details:", error);
            document.getElementById('client-name-display').textContent = "Client Not Found";
        }

        // Auto-save logic with debounce
        let saveTimeout = null;
        const saveIndicator = document.getElementById('save-indicator');

        async function saveChanges() {
            if (!saveIndicator) return;
            saveIndicator.textContent = "Saving...";
            saveIndicator.style.opacity = "1";

            const updatedAddress = JSON.stringify({
                street: document.getElementById('client-address-street') ? document.getElementById('client-address-street').value : '',
                city: document.getElementById('client-address-city') ? document.getElementById('client-address-city').value : '',
                state: document.getElementById('client-address-state') ? document.getElementById('client-address-state').value : '',
                zip: document.getElementById('client-address-zip') ? document.getElementById('client-address-zip').value : ''
            });
            const updatedNotes = document.getElementById('client-notes').value;

            const { error: updateError } = await supabaseClient
                .from('clients')
                .update({ address: updatedAddress, notes: updatedNotes })
                .eq('id', clientId);
                
            if (!updateError) {
                saveIndicator.textContent = "Saved";
                setTimeout(() => {
                    saveIndicator.style.opacity = "0";
                }, 2000);
            } else {
                console.error("Error updating client:", updateError);
                saveIndicator.textContent = "Error saving";
            }
        }

        function handleInput() {
            if (!saveIndicator) return;
            saveIndicator.textContent = "Unsaved changes...";
            saveIndicator.style.opacity = "1";
            
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveChanges, 1000); // 1s debounce
        }

        const addrStreetEl = document.getElementById('client-address-street');
        const addrCityEl = document.getElementById('client-address-city');
        const addrStateEl = document.getElementById('client-address-state');
        const addrZipEl = document.getElementById('client-address-zip');
        const notesEl = document.getElementById('client-notes');
        
        const btnOpenMap = document.getElementById('btn-open-map');
        if (btnOpenMap) {
            btnOpenMap.addEventListener('click', () => {
                const street = addrStreetEl ? addrStreetEl.value.trim() : '';
                const city = addrCityEl ? addrCityEl.value.trim() : '';
                const state = addrStateEl ? addrStateEl.value.trim() : '';
                const zip = addrZipEl ? addrZipEl.value.trim() : '';
                
                const fullAddress = [street, city, state, zip].filter(Boolean).join(', ');
                if (fullAddress) {
                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
                    window.open(url, '_blank');
                } else {
                    alert("Please enter an address first.");
                }
            });
        }
        
        let autocompleteTimeout = null;
        if (addrStreetEl) {
            addrStreetEl.addEventListener('input', (e) => {
                handleInput();
                
                const val = e.target.value;
                const suggestionsBox = document.getElementById('address-suggestions');
                if (val.length < 3) {
                    suggestionsBox.style.display = 'none';
                    return;
                }
                
                if (autocompleteTimeout) clearTimeout(autocompleteTimeout);
                autocompleteTimeout = setTimeout(async () => {
                    try {
                        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=15&bbox=-124.8,42.0,-116.4,49.0`);
                        const data = await res.json();

                        // Filter specifically for Washington and Oregon
                        const validStates = ['Washington', 'Oregon', 'WA', 'OR'];
                        const filteredFeatures = (data.features || []).filter(feat => {
                            return feat.properties.state && validStates.includes(feat.properties.state);
                        }).slice(0, 5);

                        if (filteredFeatures.length > 0) {
                            suggestionsBox.innerHTML = '';
                            filteredFeatures.forEach(feat => {
                                const props = feat.properties;
                                const street = props.street ? `${props.housenumber ? props.housenumber + ' ' : ''}${props.street}` : props.name;
                                const city = props.city || props.town || props.village || '';
                                const state = props.state || '';
                                const zip = props.postcode || '';
                                
                                const fullStr = [street, city, state, zip].filter(Boolean).join(', ');
                                
                                const div = document.createElement('div');
                                div.style.padding = '10px 12px';
                                div.style.cursor = 'pointer';
                                div.style.borderBottom = '1px solid #eee';
                                div.textContent = fullStr;
                                
                                div.addEventListener('mouseover', () => div.style.background = '#f5f5f5');
                                div.addEventListener('mouseout', () => div.style.background = 'white');
                                
                                div.addEventListener('click', () => {
                                    addrStreetEl.value = street || '';
                                    if (addrCityEl) addrCityEl.value = city;
                                    if (addrStateEl) addrStateEl.value = state;
                                    if (addrZipEl) addrZipEl.value = zip;
                                    suggestionsBox.style.display = 'none';
                                    handleInput(); // Trigger save
                                });
                                
                                suggestionsBox.appendChild(div);
                            });
                            suggestionsBox.style.display = 'block';
                        } else {
                            suggestionsBox.style.display = 'none';
                        }
                    } catch (err) {
                        console.error('Autocomplete error:', err);
                    }
                }, 300); // 300ms debounce
            });
            
            // Hide on click outside
            document.addEventListener('click', (e) => {
                if (e.target !== addrStreetEl && !document.getElementById('address-suggestions').contains(e.target)) {
                    document.getElementById('address-suggestions').style.display = 'none';
                }
            });
        }
        
        if (addrCityEl) addrCityEl.addEventListener('input', handleInput);
        if (addrStateEl) addrStateEl.addEventListener('input', handleInput);
        if (addrZipEl) addrZipEl.addEventListener('input', handleInput);
        if (notesEl) notesEl.addEventListener('input', handleInput);
    }
});
