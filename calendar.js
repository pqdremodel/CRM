// Auth Setup
let currentUser = null;
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await requireAuth();
    if (currentUser) {
        document.getElementById('profile-email').textContent = currentUser.getDisplayName();
        document.getElementById('profile-avatar').src = currentUser.getAvatarUrl();
    }

    // Logout handling
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });

    // Initialize FullCalendar
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        themeSystem: 'standard',
        events: async function(info, successCallback, failureCallback) {
            // Here you can fetch tasks/appointments from Supabase
            // Example stub returning static data:
            successCallback([
                {
                    title: 'Client Meeting - Kim & Alex',
                    start: new Date().toISOString().split('T')[0] + 'T10:00:00',
                    color: '#ff914d'
                },
                {
                    title: 'Site Visit',
                    start: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T14:00:00',
                    color: '#4caf50'
                }
            ]);
        }
    });
    calendar.render();
});
