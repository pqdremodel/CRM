// Push Notifications Logic

const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE'; // We will replace this later

async function registerServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered with scope:', registration.scope);
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return null;
        }
    }
    return null;
}

async function requestNotificationPermission() {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        console.log('Notification permission granted.');
        return true;
    } else {
        console.warn('Notification permission denied.');
        return false;
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeUserToPush() {
    const registration = await registerServiceWorker();
    if (!registration) return null;

    try {
        const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        };

        const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
        console.log('Received PushSubscription:', JSON.stringify(pushSubscription));
        
        // Here we would save the pushSubscription to Supabase profiles/subscriptions table
        // e.g. await supabaseClient.from('push_subscriptions').insert([{ user_id: currentUser.id, subscription: pushSubscription }]);
        
        return pushSubscription;
    } catch (error) {
        console.error('Failed to subscribe the user:', error);
        return null;
    }
}

// Auto-register service worker on load
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
});
