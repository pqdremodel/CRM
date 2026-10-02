// Load clients from localStorage or initialize empty array
let clients = JSON.parse(localStorage.getItem('crm_clients')) || [];

// Auth Setup
let currentUser = null;
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${currentUser.email}&background=e0e0e0&color=333`;
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });
});

const tbody = document.getElementById('clients-body');

function renderClients() {
    tbody.innerHTML = '';
    
    clients.forEach((client, index) => {
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
            <td class="col-actions"><i class="fa-solid fa-trash more-action delete-btn" data-index="${index}" style="color: #ff4d4f;"></i></td>
        `;
        
        // Add click listener to row cells except checkbox and actions
        tr.querySelectorAll('td:not(.col-checkbox):not(.col-actions)').forEach(td => {
            td.addEventListener('click', () => {
                window.location.href = `project.html?id=${index}`;
            });
        });
        
        tbody.appendChild(tr);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            clients.splice(index, 1);
            saveClients();
            renderClients();
        });
    });
}

function saveClients() {
    localStorage.setItem('crm_clients', JSON.stringify(clients));
}

// Initial render
renderClients();

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
addClientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newClient = {
        name: document.getElementById('client-name').value,
        type: document.getElementById('project-type').value,
        location: document.getElementById('client-location').value,
        price: document.getElementById('project-price').value,
        status: document.getElementById('project-status').value
    };
    
    clients.unshift(newClient); // Add to the top of the list
    saveClients();
    renderClients();
    closeModal();
});
