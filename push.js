// Push Notifications Logic

const VAPID_PUBLIC_KEY = 'BAsf0VKYVggPo_y-p8IR1GAV_qL4X-1-YDMyIxwCVs54U4c_6nKzaFCudxS4liBjB94SjCRGxcfsAJ9MbwBI8Pg';

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
        
        // Save the pushSubscription to Supabase
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const { error } = await supabaseClient
                .from('push_subscriptions')
                .insert([{ user_id: user.id, subscription: pushSubscription }]);
                
            if (error) {
                console.error('Error saving push subscription:', error);
            } else {
                console.log('Push subscription saved to database!');
            }
        }
        
        return pushSubscription;
    } catch (error) {
        console.error('Failed to subscribe the user:', error);
        return null;
    }
}

// Auto-register service worker on load
document.addEventListener('turbo:load', () => {
    registerServiceWorker();
    
    // Clear the home screen app badge when the user opens the app
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(console.error);
    }
});
