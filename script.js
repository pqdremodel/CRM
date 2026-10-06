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
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.Turbo ? window.Turbo.visit('login.html') : window.location.href = 'login.html';
    });
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
    }
}

function renderClients() {
    tbody.innerHTML = '';
    
    const startIndex = (currentClientPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClients = clients.slice(startIndex, endIndex);
    
    paginatedClients.forEach((client) => {
        const tr = document.createElement('tr');
        
        const statusClass = client.status.toLowerCase() === 'ongoing' ? 'status-ongoing' : 'status-complete';
        
        tr.innerHTML = `
            <td class="col-checkbox"><input type="checkbox"></td>
            <td>
                <div class="client-name" style="cursor: pointer;">
                    <div class="client-icon">
                        <img src="https://ui-avatars.com/api/?name=${client.name.replace(' ', '+')}&background=random&size=18&font-size=0.4" width="18" height="18">
                    </div>
                    <span>${client.name}</span>
                </div>
            </td>
            <td style="cursor: pointer;">${client.type}</td>
            <td style="cursor: pointer;">${client.location}</td>
            <td style="cursor: pointer;">${client.price}</td>
            <td style="cursor: pointer;"><span class="status-badge ${statusClass}">${client.status}</span></td>
            <td class="col-actions"><i class="fa-solid fa-trash more-action delete-btn" data-id="${client.id}" style="color: #ff4d4f;"></i></td>
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
                alert("Failed to delete client.");
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

// Initial fetch
fetchClients();

// Modal Logic
const modal = document.getElementById('add-client-modal');
const btnAddClient = document.getElementById('btn-add-client');
const btnCloseModal = document.getElementById('close-modal');
const btnCancelModal = document.getElementById('cancel-modal');
const addClientForm = document.getElementById('add-client-form');

function openModal() {
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    addClientForm.reset();
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

// Form Submission
addClientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable button to prevent double submit
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    const newClient = {
        name: document.getElementById('client-name').value,
        type: document.getElementById('project-type').value,
        location: document.getElementById('client-location').value,
        price: document.getElementById('project-price').value,
        status: document.getElementById('project-status').value
    };
    
    const { data, error } = await supabaseClient
        .from('clients')
        .insert([newClient])
        .select();
        
    btn.textContent = originalText;
    btn.disabled = false;
    
    if (!error && data) {
        clients.unshift(data[0]); // Add to the top of the list
        renderClients();
        closeModal();
    } else {
        console.error("Error adding client:", error);
        alert("Failed to add client. Did you create the clients table?");
    }
});
