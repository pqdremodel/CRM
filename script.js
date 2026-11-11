const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
let clients = [];
let currentClientPage = 1;
const itemsPerPage = 10;

// Auth Setup
let currentUser = null;
document.addEventListener('app:init', async () => {
    currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.getDisplayName();
        document.getElementById('profile-avatar').src = currentUser.getAvatarUrl();
        await fetchClients();
    }


});

const tbody = document.getElementById('clients-body');

async function fetchClients() {
    const { data, error } = await supabaseClient
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (!error && data) {
        clients = data;
        renderClients();
    } else {
        console.error("Error fetching clients:", error);
        const empty = document.getElementById('clients-empty');
        empty.hidden = false;
        empty.textContent = 'Projects could not be loaded. Please refresh to try again.';
    }
}

function renderClients() {
    tbody.innerHTML = '';
    document.getElementById('clients-empty').hidden = clients.length > 0;
    
    const startIndex = (currentClientPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClients = clients.slice(startIndex, endIndex);
    
    paginatedClients.forEach((client) => {
        const tr = document.createElement('tr');
        
        const statusClass = (client.status || 'Ongoing').toLowerCase() === 'ongoing' ? 'status-ongoing' : 'status-complete';
        
        tr.innerHTML = `
            <td class="col-checkbox"><input type="checkbox" aria-label="Select project"></td>
            <td class="client-card-name">
                <div class="client-name" style="cursor: pointer;">
                    <div class="client-icon">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(client.project_name || client.name || 'Project')}&background=edf7fc&color=46819c&size=64&font-size=0.4" width="44" height="44" alt="">
                    </div>
                    <span>${escapeHTML(client.project_name || client.name)}</span>
                </div>
            </td>
            <td class="client-card-type" data-label="Client" style="cursor: pointer;">${escapeHTML(client.client_name || client.name)}</td>
            <td class="client-card-location" data-label="Address" style="cursor: pointer;">${escapeHTML(client.location)}</td>
            <td class="client-card-price" data-label="Project value" style="cursor: pointer;">${escapeHTML(client.price || 'Not set')}</td>
            <td class="client-card-status" style="cursor: pointer;"><span class="status-badge ${statusClass}">${escapeHTML(client.status)}</span></td>
            <td class="col-actions"><button type="button" class="client-delete delete-btn" data-id="${client.id}" aria-label="Delete project"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button></td>
        `;
        
        // Add click listener to row cells except checkbox and actions
        tr.querySelectorAll('td:not(.col-checkbox):not(.col-actions)').forEach(td => {
            td.addEventListener('click', () => {
                window.location.href = `project.html?id=${client.id}`;
            });
        });
        
        tbody.appendChild(tr);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation(); // prevent row click
            const id = this.getAttribute('data-id');
            const { error } = await supabaseClient.from('clients').delete().eq('id', id);
            if (!error) {
                clients = clients.filter(c => c.id !== id);
                renderClients();
            } else {
                console.error("Delete error:", error);
                alert("Failed to delete project.");
            }
        });
    });
    
    renderPagination(clients.length, currentClientPage, itemsPerPage);
}

function renderPagination(totalItems, currentPage, perPage) {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(totalItems / perPage);
    
    if (totalItems === 0 || totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    const controls = paginationContainer.querySelector('.page-controls');
    const info = paginationContainer.querySelector('.entries-info');
    
    if (controls) {
        let html = '';
        html += `<button class="page-prev" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<button class="page-num ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                html += `<span>...</span>`;
            }
        }
        
        html += `<button class="page-next" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
        controls.innerHTML = html;
        
        controls.querySelectorAll('.page-num').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentClientPage = parseInt(e.target.dataset.page);
                renderClients();
            });
        });
        
        const prevBtn = controls.querySelector('.page-prev');
        if (prevBtn) prevBtn.addEventListener('click', () => {
            if (currentClientPage > 1) {
                currentClientPage--;
                renderClients();
            }
        });
        
        const nextBtn = controls.querySelector('.page-next');
        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (currentClientPage < totalPages) {
                currentClientPage++;
                renderClients();
            }
        });
    }
    
    if (info) {
        const start = (currentPage - 1) * perPage + 1;
        const end = Math.min(currentPage * perPage, totalItems);
        info.innerHTML = `
            Showing ${start}-${end} of ${totalItems} entries 
            <span class="show-dropdown">Show ${perPage} <i class="fa-solid fa-chevron-up"></i></span>
        `;
    }
}

// Load projects after the authenticated session is available.

// Modal Logic
const modal = document.getElementById('add-client-modal');
const btnAddClient = document.getElementById('btn-add-client');
const btnCloseModal = document.getElementById('close-modal');
const btnCancelModal = document.getElementById('cancel-modal');
const addClientForm = document.getElementById('add-client-form');

function openModal() {
    modal.classList.add('active');
    loadClientChoices();
    document.getElementById('project-name').focus();
}

function closeModal() {
    modal.classList.remove('active');
    addClientForm.reset();
    document.getElementById('project-additional').open = false;
    toggleNewClient();
    formError.hidden = true;
}

btnAddClient.addEventListener('click', openModal);
btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);

// Close on outside click
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

const clientChoice = document.getElementById('client-choice');
const newClientFields = document.getElementById('new-client-fields');
const formError = document.getElementById('project-form-error');
let contactsReady = false;
function toggleNewClient() {
    const creating = clientChoice.value === 'new';
    newClientFields.hidden = !creating;
    newClientFields.querySelectorAll('input').forEach(field => field.disabled = !creating);
    document.getElementById('client-name').required = creating;
}
clientChoice.addEventListener('change', toggleNewClient);
async function loadClientChoices() {
    contactsReady = false;
    clientChoice.disabled = true;
    formError.hidden = true;
    const { data, error } = await supabaseClient.from('client_contacts').select('*').order('name', { ascending: true });
    clientChoice.disabled = false;
    if (error) {
        formError.textContent = 'Clients could not be loaded. Close this form and try again.';
        formError.hidden = false;
        return;
    }
    clientChoice.replaceChildren(new Option(data.length ? 'Choose an existing client' : 'No clients yet — create one below', ''), new Option('+ Create new client', 'new'));
    data.forEach(contact => clientChoice.append(new Option(contact.name + (contact.email ? ` — ${contact.email}` : ''), contact.id)));
    contactsReady = true;
    toggleNewClient();
}

addClientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!contactsReady || !addClientForm.reportValidity()) return;
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn.disabled) return;
    const originalText = btn.textContent;
    formError.hidden = true;
    const name = document.getElementById('project-name').value.trim();
    const address = Object.fromEntries(['street', 'unit', 'city', 'state', 'zip'].map(part => [part, document.getElementById(`project-address-${part}`).value.trim()]));
    const clientName = document.getElementById('client-name').value.trim();
    if (!name || ['street', 'city', 'state', 'zip'].some(part => !address[part]) || (clientChoice.value === 'new' && !clientName)) {
        formError.textContent = 'Enter a project name, address, and client name.';
        formError.hidden = false;
        return;
    }
    btn.textContent = 'Saving...'; btn.disabled = true;
    // A new client and its first project are committed together by the local adapter.
    const project = {
        name, project_name: name,
        type: document.getElementById('project-type').value,
        location: [address.street, address.unit, address.city, `${address.state} ${address.zip}`].filter(Boolean).join(', '),
        address: JSON.stringify(address),
        price: document.getElementById('project-price').value === '' ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(document.getElementById('project-price').value)),
        status: document.getElementById('project-status').value,
        ...(clientChoice.value === 'new' ? { new_client: {
            name: clientName,
            email: document.getElementById('client-email').value.trim(),
            phone: document.getElementById('client-phone').value.trim()
        } } : { client_id: clientChoice.value })
    };
    try {
        const { data, error } = window.crmLocal
            ? await supabaseClient.from('clients').insert([project]).select()
            : await supabaseClient.rpc('crm_create_project', { project });
        if (error || !data?.length) throw new Error(error?.message || 'The project could not be saved.');
        clients.unshift(data[0]); currentClientPage = 1;
        renderClients(); closeModal();
    } catch (error) {
        formError.textContent = 'Could not save the project. ' + error.message;
        formError.hidden = false;
    } finally { btn.textContent = originalText; btn.disabled = false; }
});

// Reveal an optional field if its entered value needs correction.
addClientForm.addEventListener('invalid', event => {
    if (event.target.closest('#project-additional')) document.getElementById('project-additional').open = true;
}, true);
