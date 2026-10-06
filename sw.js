self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const title = data.title || 'PQD CRM';
            const options = {
                body: data.body || 'You have a new notification.',
                icon: data.icon || 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Flame_icon.svg',
                badge: data.badge || 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Flame_icon.svg',
                data: data.url || '/'
            };
            event.waitUntil(self.registration.showNotification(title, options));
            if ('setAppBadge' in navigator) {
                navigator.setAppBadge(1);
            }
        } catch(e) {
            event.waitUntil(self.registration.showNotification('PQD CRM', {
                body: event.data.text()
            }));
            if ('setAppBadge' in navigator) {
                navigator.setAppBadge(1);
            }
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge();
    }
    if (event.notification.data) {
        event.waitUntil(
            clients.openWindow(event.notification.data)
        );
    }
});
