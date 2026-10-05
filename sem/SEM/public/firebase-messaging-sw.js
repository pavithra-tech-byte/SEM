// Firebase Messaging Service Worker
// Config is loaded dynamically from the main app via postMessage for security.
// Fallback to hardcoded config if dynamic config not received.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

let isInitialized = false;

const defaultConfig = {
  apiKey: "AIzaSyB0aNosXLTCmX3s4M-0Doh4lRPPMX2TRmU",
  authDomain: "eventmasterapp-2693e.firebaseapp.com",
  projectId: "eventmasterapp-2693e",
  storageBucket: "eventmasterapp-2693e.firebasestorage.app",
  messagingSenderId: "854191003395",
  appId: "1:854191003395:web:a878d82ba5c3b369437b36"
};

function initializeFirebase(config) {
    if (isInitialized) return;
    try {
        firebase.initializeApp(config);
        const messaging = firebase.messaging();

        // Background message handler
        messaging.onBackgroundMessage((payload) => {
            console.log('[firebase-messaging-sw.js] Background message received:', payload);

            const notificationTitle = payload.notification?.title || 'SEM Notification';
            const notificationOptions = {
                body: payload.notification?.body || '',
                icon: '/icon.svg',
                badge: '/icon.svg',
                data: payload.data,
                tag: payload.data?.tag || 'firebase-push-notification',
                vibrate: [200, 100, 200]
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });

        isInitialized = true;
        console.log('[SW] Firebase initialized successfully');
    } catch (e) {
        console.error('[SW] Firebase init error:', e);
    }
}

// Listen for config from the main app
self.addEventListener('message', (event) => {
    if (event.data?.type === 'FIREBASE_CONFIG') {
        initializeFirebase(event.data.config);
    }
});

// Initialize with default config as fallback
initializeFirebase(defaultConfig);

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});