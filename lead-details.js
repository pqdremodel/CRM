document.addEventListener('app:init', async () => {
    const currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.getDisplayName();
        document.getElementById('profile-avatar').src = currentUser.getAvatarUrl();
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.Turbo ? window.Turbo.visit('login.html') : window.location.href = 'login.html';
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
            try {
                const addrObj = JSON.parse(lead.address || "{}");
                const parsedStreet = addrObj.street || lead.address || '';
                
                document.getElementById('lead-address-street').value = parsedStreet;
                document.getElementById('lead-address-city').value = addrObj.city || '';
                document.getElementById('lead-address-state').value = addrObj.state || '';
                document.getElementById('lead-address-zip').value = addrObj.zip || '';
                
                // Populate main card inputs
                const mCard = document.getElementById('main-address-card');
                if (mCard) {
                    if (parsedStreet.trim().length > 0) {
                        mCard.style.display = 'none';
                    } else {
                        mCard.style.display = 'block';
                        document.getElementById('main-address-street').value = parsedStreet;
                        document.getElementById('main-address-city').value = addrObj.city || '';
                        document.getElementById('main-address-state').value = addrObj.state || '';
                        document.getElementById('main-address-zip').value = addrObj.zip || '';
                    }
                }
            } catch(e) {
                const parsedStreet = lead.address || '';
                document.getElementById('lead-address-street').value = parsedStreet;
                const mCard = document.getElementById('main-address-card');
                if (mCard) {
                    if (parsedStreet.trim().length > 0) {
                        mCard.style.display = 'none';
                    } else {
                        mCard.style.display = 'block';
                        document.getElementById('main-address-street').value = parsedStreet;
                    }
                }
            }
            document.getElementById('lead-notes').value = lead.notes || '';
            
            function updateHeaderAddressDisplay() {
                const street = document.getElementById('lead-address-street').value.trim();
                const city = document.getElementById('lead-address-city').value.trim();
                const state = document.getElementById('lead-address-state').value.trim();
                const zip = document.getElementById('lead-address-zip').value.trim();
                
                const full = [street, city, state, zip].filter(Boolean).join(', ');
                const displayEl = document.getElementById('lead-address-display');
                if (displayEl) {
                    displayEl.textContent = full || 'No Address';
                }
            }
            updateHeaderAddressDisplay();

            document.title = `${lead.name} - Lead Details`;
            
            // Edit Modal Logic
            const btnEdit = document.getElementById('btn-edit-lead');
            const editModal = document.getElementById('edit-lead-modal');
            const btnCloseEdit = document.getElementById('btn-close-edit-modal');
            const btnSaveEdit = document.getElementById('btn-save-lead-info');
            
            if (btnEdit && editModal) {
                btnEdit.addEventListener('click', () => {
                    document.getElementById('edit-lead-name').value = document.getElementById('lead-name-display').textContent;
                    const em = document.getElementById('lead-email-display').textContent;
                    document.getElementById('edit-lead-email').value = em === 'No email' ? '' : em;
                    const ph = document.getElementById('lead-phone-display').textContent;
                    document.getElementById('edit-lead-phone').value = ph === 'No phone' ? '' : ph;
                    document.getElementById('edit-lead-status').value = lead.status;
                    
                    editModal.style.display = 'flex';
                });
                
                btnCloseEdit.addEventListener('click', () => {
                    editModal.style.display = 'none';
                });
                
                btnSaveEdit.addEventListener('click', async () => {
                    const newName = document.getElementById('edit-lead-name').value.trim();
                    const newEmail = document.getElementById('edit-lead-email').value.trim();
                    const newPhone = document.getElementById('edit-lead-phone').value.trim();
                    const newStatus = document.getElementById('edit-lead-status').value;
                    const newAddressJSON = JSON.stringify({
                        street: document.getElementById('lead-address-street').value.trim(),
                        city: document.getElementById('lead-address-city').value.trim(),
                        state: document.getElementById('lead-address-state').value.trim(),
                        zip: document.getElementById('lead-address-zip').value.trim()
                    });
                    
                    if (!newName) { alert('Name is required'); return; }
                    
                    btnSaveEdit.textContent = 'Saving...';
                    btnSaveEdit.disabled = true;
                    
                    const { error: editErr } = await supabaseClient
                        .from('leads')
                        .update({ name: newName, email: newEmail, phone: newPhone, status: newStatus, address: newAddressJSON })
                        .eq('id', leadId);
                        
                    btnSaveEdit.textContent = 'Save Changes';
                    btnSaveEdit.disabled = false;
                    
                    if (!editErr) {
                        lead.name = newName;
                        lead.email = newEmail;
                        lead.phone = newPhone;
                        lead.status = newStatus;
                        lead.address = newAddressJSON;
                        
                        document.getElementById('lead-name-display').textContent = newName;
                        document.getElementById('lead-email-display').textContent = newEmail || 'No email';
                        document.getElementById('lead-phone-display').textContent = newPhone || 'No phone';
                        document.getElementById('lead-status-display').textContent = newStatus;
                        
                        let sClass = 'status-ongoing';
                        if (newStatus === 'Qualified') sClass = 'status-complete';
                        if (newStatus === 'Lost') sClass = 'status-lost';
                        document.getElementById('lead-status-display').className = `status-badge ${sClass}`;
                        
                        document.title = `${newName} - Lead Details`;
                        updateHeaderAddressDisplay();
                        editModal.style.display = 'none';
                    } else {
                        alert('Error saving lead info');
                    }
                });
            }
        } else {
            console.error("Error fetching lead details:", error);
            document.getElementById('lead-name-display').textContent = "Lead Not Found";
        }

        // Fetch Scheduled Consultation
        let currentEventId = null;
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('*')
            .eq('lead_id', leadId)
            .order('start_time', { ascending: true })
            .limit(1);
            
        if (events && events.length > 0) {
            const evt = events[0];
            currentEventId = evt.id;
            const evtDate = new Date(evt.start_time);
            document.getElementById('scheduled-event-display').style.display = 'block';
            document.getElementById('schedule-form-container').style.display = 'none';
            document.getElementById('scheduled-datetime-text').textContent = evtDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        const btnReschedule = document.getElementById('btn-show-reschedule');
        if (btnReschedule) {
            btnReschedule.addEventListener('click', () => {
                btnReschedule.style.display = 'none';
                document.getElementById('schedule-form-container').style.display = 'block';
                document.getElementById('btn-schedule').innerHTML = '<i class="fa-regular fa-calendar"></i> Update Calendar';
            });
        }

        // Auto-save logic with debounce
        let saveTimeout = null;
        const saveIndicator = document.getElementById('save-indicator');

        async function saveChanges() {
            saveIndicator.textContent = "Saving...";
            saveIndicator.style.opacity = "1";

            const updatedNotes = document.getElementById('lead-notes').value;

            const { error: updateError } = await supabaseClient
                .from('leads')
                .update({ notes: updatedNotes })
                .eq('id', leadId);
                
            if (!updateError) {
                saveIndicator.textContent = "Saved";
                setTimeout(() => {
                    saveIndicator.style.opacity = "0";
                }, 2000);
            } else {
                console.error("Error updating lead:", updateError);
                saveIndicator.textContent = "Error saving";
            }
        }

        function handleInput() {
            saveIndicator.textContent = "Unsaved changes...";
            saveIndicator.style.opacity = "1";
            
            // Sync header display for address
            let street = document.getElementById('lead-address-street').value.trim();
            let city = document.getElementById('lead-address-city').value.trim();
            let state = document.getElementById('lead-address-state').value.trim();
            let zip = document.getElementById('lead-address-zip').value.trim();
            
            // If main card is visible and actively being typed in, use its values
            const mCard = document.getElementById('main-address-card');
            if (mCard && mCard.style.display !== 'none') {
                street = document.getElementById('main-address-street').value.trim();
                city = document.getElementById('main-address-city').value.trim();
                state = document.getElementById('main-address-state').value.trim();
                zip = document.getElementById('main-address-zip').value.trim();
                
                // Sync values to modal so it saves correctly
                document.getElementById('lead-address-street').value = street;
                document.getElementById('lead-address-city').value = city;
                document.getElementById('lead-address-state').value = state;
                document.getElementById('lead-address-zip').value = zip;
            }
            
            const full = [street, city, state, zip].filter(Boolean).join(', ');
            const displayEl = document.getElementById('lead-address-display');
            if (displayEl) {
                displayEl.textContent = full || 'No Address';
            }
            
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveChanges, 1000); // 1s debounce
        }
        
        function handleMainAddressInput() {
            handleInput(); // Sync to header and show unsaved (but don't auto-save to DB for address here)
        }
        
        const mAddrStreetEl = document.getElementById('main-address-street');
        const mAddrCityEl = document.getElementById('main-address-city');
        const mAddrStateEl = document.getElementById('main-address-state');
        const mAddrZipEl = document.getElementById('main-address-zip');
        
        if (mAddrStreetEl) mAddrStreetEl.addEventListener('input', handleMainAddressInput);
        if (mAddrCityEl) mAddrCityEl.addEventListener('input', handleMainAddressInput);
        if (mAddrStateEl) mAddrStateEl.addEventListener('input', handleMainAddressInput);
        if (mAddrZipEl) mAddrZipEl.addEventListener('input', handleMainAddressInput);
        
        const btnAddMainAddress = document.getElementById('btn-add-main-address');
        if (btnAddMainAddress) {
            btnAddMainAddress.addEventListener('click', async () => {
                btnAddMainAddress.disabled = true;
                btnAddMainAddress.textContent = 'Saving...';
                
                const mStreet = mAddrStreetEl.value.trim();
                const mCity = mAddrCityEl.value.trim();
                const mState = mAddrStateEl.value.trim();
                const mZip = mAddrZipEl.value.trim();
                
                const newAddressJSON = JSON.stringify({
                    street: mStreet, city: mCity, state: mState, zip: mZip
                });
                
                const { error: updateError } = await supabaseClient
                    .from('leads')
                    .update({ address: newAddressJSON })
                    .eq('id', leadId);
                    
                if (!updateError) {
                    lead.address = newAddressJSON;
                    document.getElementById('main-address-card').style.display = 'none';
                    saveIndicator.textContent = "Saved";
                    setTimeout(() => { saveIndicator.style.opacity = "0"; }, 2000);
                } else {
                    alert("Error saving address");
                    btnAddMainAddress.disabled = false;
                    btnAddMainAddress.innerHTML = '<i class="fa-solid fa-location-arrow" style="margin-right: 6px;"></i> Add Address';
                }
            });
        }

        const addrStreetEl = document.getElementById('lead-address-street');
        const addrCityEl = document.getElementById('lead-address-city');
        const addrStateEl = document.getElementById('lead-address-state');
        const addrZipEl = document.getElementById('lead-address-zip');
        const notesEl = document.getElementById('lead-notes');
        
        const displayEl = document.getElementById('lead-address-display');
        if (displayEl) {
            displayEl.style.cursor = 'pointer';
            displayEl.addEventListener('click', () => {
                const txt = displayEl.textContent;
                if (txt && txt !== 'No Address') {
                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(txt)}`;
                    window.open(url, '_blank');
                }
            });
        }
        
        let autocompleteTimeout = null;
        if (addrStreetEl) {
            addrStreetEl.addEventListener('input', (e) => {
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
        
        let mAutocompleteTimeout = null;
        if (mAddrStreetEl) {
            mAddrStreetEl.addEventListener('input', (e) => {
                const val = e.target.value;
                const suggestionsBox = document.getElementById('main-address-suggestions');
                if (val.length < 3) {
                    suggestionsBox.style.display = 'none';
                    return;
                }
                
                if (mAutocompleteTimeout) clearTimeout(mAutocompleteTimeout);
                mAutocompleteTimeout = setTimeout(async () => {
                    try {
                        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=15&bbox=-124.8,42.0,-116.4,49.0`);
                        const data = await res.json();
                        
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
                                    mAddrStreetEl.value = street || '';
                                    if (mAddrCityEl) mAddrCityEl.value = city;
                                    if (mAddrStateEl) mAddrStateEl.value = state;
                                    if (mAddrZipEl) mAddrZipEl.value = zip;
                                    suggestionsBox.style.display = 'none';
                                    handleMainAddressInput();
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
                if (e.target !== mAddrStreetEl && document.getElementById('main-address-suggestions') && !document.getElementById('main-address-suggestions').contains(e.target)) {
                    document.getElementById('main-address-suggestions').style.display = 'none';
                }
            });
        }

        if (notesEl) notesEl.addEventListener('input', handleInput);

        // Schedule consultation button logic
        const btnSchedule = document.getElementById('btn-schedule');
        if (btnSchedule) {
            btnSchedule.addEventListener('click', async (e) => {
                const dateVal = document.getElementById('consultation-date').value;
                const timeVal = document.getElementById('consultation-time').value;

                if (!dateVal || !timeVal) {
                    alert("Please select both a date and time for the consultation.");
                    return;
                }

                const startDateTime = `${dateVal}T${timeVal}:00`;
                const leadName = document.getElementById('lead-name-display').textContent;

                const newEvent = {
                    title: `Consultation: ${leadName}`,
                    start_time: startDateTime,
                    color: '#2196f3',
                    lead_id: leadId
                };

                btnSchedule.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scheduling...';
                btnSchedule.disabled = true;

                let scheduleError;
                if (currentEventId) {
                    const { error } = await supabaseClient
                        .from('events')
                        .update(newEvent)
                        .eq('id', currentEventId);
                    scheduleError = error;
                } else {
                    const { data: inserted, error } = await supabaseClient
                        .from('events')
                        .insert([newEvent])
                        .select();
                    scheduleError = error;
                    if (inserted && inserted.length > 0) currentEventId = inserted[0].id;
                }

                if (!scheduleError) {
                    btnSchedule.innerHTML = '<i class="fa-regular fa-calendar-check"></i> Scheduled!';
                    btnSchedule.style.backgroundColor = '#4caf50';
                    btnSchedule.style.color = '#fff';
                    btnSchedule.style.borderColor = '#4caf50';
                    
                    setTimeout(() => {
                        btnSchedule.style.backgroundColor = '';
                        btnSchedule.style.color = '';
                        btnSchedule.style.borderColor = '';
                        btnSchedule.disabled = false;
                        document.getElementById('schedule-form-container').style.display = 'none';
                        if (btnReschedule) btnReschedule.style.display = 'inline-block';
                    }, 1500);

                    // Show in UI
                    const evtDate = new Date(startDateTime);
                    document.getElementById('scheduled-event-display').style.display = 'block';
                    document.getElementById('scheduled-datetime-text').textContent = evtDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                } else {
                    console.error("Error scheduling consultation:", scheduleError);
                    alert("Failed to schedule. Did you create the 'events' table?");
                    btnSchedule.innerHTML = '<i class="fa-regular fa-calendar"></i> Add to Calendar';
                    btnSchedule.disabled = false;
                }
            });
        }
    }
});
