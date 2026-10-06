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
    const isMobile = window.innerWidth < 768;
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: isMobile ? 'listMonth' : 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: isMobile ? 'today dayGridMonth,timeGridWeek,timeGridDay,listMonth' : 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
            today: 'today',
            month: 'month',
            week: 'week',
            day: 'day',
            list: 'list'
        },
        views: {
            listMonth: { buttonText: 'list' }
        },
        themeSystem: 'standard',
        events: async function(info, successCallback, failureCallback) {
            try {
                const { data, error } = await supabaseClient
                    .from('events')
                    .select('*')
                    .gte('start_time', info.startStr)
                    .lte('start_time', info.endStr);

                if (error) throw error;
                
                const events = data.map(evt => ({
                    id: evt.id,
                    title: evt.title,
                    start: evt.start_time,
                    color: evt.color || '#2196f3',
                    url: evt.lead_id ? `lead-details.html?id=${evt.lead_id}` : ''
                }));
                
                successCallback(events);
            } catch (error) {
                console.error("Error fetching events:", error);
                // Fallback dummy events if table doesn't exist yet
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
        }
    });
    calendar.render();
});
