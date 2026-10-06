let leads = [];
let currentLeadPage = 1;
const itemsPerPage = 10;

// Auth Setup
let currentUser = null;
document.addEventListener('turbo:load', async () => {
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

const tbody = document.getElementById('leads-body');

async function fetchLeads() {
    const { data, error } = await supabaseClient
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (!error && data) {
        leads = data;
        renderLeads();
    } else {
        console.error("Error fetching leads:", error);
    }
}

function renderLeads() {
    tbody.innerHTML = '';
    
    const startIndex = (currentLeadPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLeads = leads.slice(startIndex, endIndex);
    
    paginatedLeads.forEach((lead) => {
        const tr = document.createElement('tr');
        
        let statusClass = 'status-ongoing';
        if (lead.status === 'New') statusClass = 'status-ongoing';
        else if (lead.status === 'Contacted') statusClass = 'status-ongoing';
        else if (lead.status === 'Qualified') statusClass = 'status-complete';
        else if (lead.status === 'Lost') statusClass = 'status-lost'; // assuming custom css or fallback
        
        tr.innerHTML = `
            <td class="col-checkbox"><input type="checkbox"></td>
            <td>
                <div class="client-name" style="cursor: pointer;">
                    <div class="client-icon">
                        <img src="https://ui-avatars.com/api/?name=${lead.name.replace(' ', '+')}&background=random&size=18&font-size=0.4" width="18" height="18">
                    </div>
                    <span>${lead.name}</span>
                </div>
            </td>
            <td style="cursor: pointer;">${lead.service_type || ''}</td>
            <td style="cursor: pointer;">${lead.phone || ''}</td>
            <td style="cursor: pointer;">${lead.email || ''}</td>
            <td style="cursor: pointer;"><span class="status-badge ${statusClass}">${lead.status}</span></td>
            <td class="col-actions"><i class="fa-solid fa-trash more-action delete-btn" data-id="${lead.id}" style="color: #ff4d4f;"></i></td>
        `;
        
        // Add click listener to navigate to lead details page
        tr.querySelectorAll('td:not(.col-checkbox):not(.col-actions)').forEach(td => {
            td.addEventListener('click', () => {
                window.location.href = `lead-details.html?id=${lead.id}`;
            });
        });
        
        tbody.appendChild(tr);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation(); // prevent row click
            const id = this.getAttribute('data-id');
            const { error } = await supabaseClient.from('leads').delete().eq('id', id);
            if (!error) {
                leads = leads.filter(c => c.id !== id);
                renderLeads();
            } else {
                console.error("Delete error:", error);
                alert("Failed to delete lead.");
            }
        });
    });
    
    renderPagination(leads.length, currentLeadPage, itemsPerPage);
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
                currentLeadPage = parseInt(e.target.dataset.page);
                renderLeads();
            });
        });
        
        const prevBtn = controls.querySelector('.page-prev');
        if (prevBtn) prevBtn.addEventListener('click', () => {
            if (currentLeadPage > 1) {
                currentLeadPage--;
                renderLeads();
            }
        });
        
        const nextBtn = controls.querySelector('.page-next');
        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (currentLeadPage < totalPages) {
                currentLeadPage++;
                renderLeads();
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
fetchLeads();

// Modal Logic
const modal = document.getElementById('add-lead-modal');
const btnAddLead = document.getElementById('btn-add-lead');
const btnCloseModal = document.getElementById('close-modal');
const btnCancelModal = document.getElementById('cancel-modal');
const addLeadForm = document.getElementById('add-lead-form');

function openModal() {
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    addLeadForm.reset();
}

btnAddLead.addEventListener('click', openModal);
btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);

// Close on outside click
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Form Submission
addLeadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable button to prevent double submit
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    const newLead = {
        name: document.getElementById('lead-name').value,
        service_type: document.getElementById('lead-service').value,
        phone: document.getElementById('lead-phone').value,
        email: document.getElementById('lead-email').value,
        status: document.getElementById('lead-status').value
    };
    
    const { data, error } = await supabaseClient
        .from('leads')
        .insert([newLead])
        .select();
        
    btn.textContent = originalText;
    btn.disabled = false;
    
    if (!error && data) {
        leads.unshift(data[0]); // Add to the top of the list
        renderLeads();
        closeModal();
    } else {
        console.error("Error adding lead:", error);
        alert("Failed to add lead. Did you create the leads table in Supabase?");
    }
});
