import { useAppStore } from './store';
import { requestFCMToken, auth, db } from './services/firebase';
import { onMessage } from 'firebase/messaging';
import { messaging } from './services/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';
import { getMergedEvents } from './db';

// ─── Helper: push to both browser + in-app inbox ────────────────────────────
const pushNotification = (title, options = {}) => {
    // 1. Add to in-app inbox
    useAppStore.getState().addNotification({
        title,
        body: options.body || '',
        type: options.type || 'info',
        tag: options.tag,
        link: options.link || null,
    });

    // 2. Also show native browser notification
    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            ...options
        });
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
};

// Request notification permission
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
};

// Legacy alias kept for backward compat
export const showNotification = (title, options = {}) => pushNotification(title, options);

// ─── Check upcoming deadlines → ONE consolidated digest notification ──────────
export const checkDueNotifications = async (events) => {
    const { preferences } = useAppStore.getState();
    if (!preferences.notificationsEnabled) return;

    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Only fire this digest once per calendar day
    const shownKey  = 'sem_deadline_digest_date';
    const todayKey  = today.toISOString().split('T')[0];
    if (localStorage.getItem(shownKey) === todayKey) return;

    const reminderDays = preferences.deadlineReminderDays || [7, 3, 1, 0];
    const maxWindow    = Math.max(...reminderDays);  // e.g. 7 days

    // Collect all events with a deadline within the window
    const buckets = { today: [], tomorrow: [], week: [] };

    events.forEach(event => {
        if (!event.registrationDeadline) return;
        const deadline  = new Date(event.registrationDeadline);
        const daysLeft  = differenceInDays(deadline, today);

        if (!reminderDays.some(d => d === daysLeft) || daysLeft > maxWindow || daysLeft < 0) return;

        const entry = `• ${event.eventName} (${event.collegeName})`;
        if (daysLeft === 0)      buckets.today.push(entry);
        else if (daysLeft === 1) buckets.tomorrow.push(entry);
        else                     buckets.week.push(`${entry} — ${daysLeft}d left`);
    });

    const hasAny = buckets.today.length + buckets.tomorrow.length + buckets.week.length > 0;
    if (!hasAny) return;

    // ── Build a single notification body ──
    let title = '📅 Event Deadline Digest';
    let type  = 'info';
    const lines = [];

    if (buckets.today.length > 0) {
        title = `🚨 ${buckets.today.length} Deadline${buckets.today.length > 1 ? 's' : ''} Today!`;
        type  = 'critical';
        lines.push('⛔ DUE TODAY:', ...buckets.today);
    }
    if (buckets.tomorrow.length > 0) {
        if (type !== 'critical') { title = `⏰ Deadlines Coming Up`; type = 'warning'; }
        lines.push('', '⚠️ TOMORROW:', ...buckets.tomorrow);
    }
    if (buckets.week.length > 0) {
        lines.push('', '📌 THIS WEEK:', ...buckets.week);
    }

    const body = lines.filter(l => l !== undefined).join('\n').trim();

    pushNotification(title, {
        body,
        tag: `deadline-digest-${todayKey}`,
        type,
        requireInteraction: type === 'critical',
    });

    localStorage.setItem(shownKey, todayKey);
};


// ─── Real-time Firebase listeners ────────────────────────────────────────────
let activeSubscriptions = [];

export const initRealTimeNotifications = () => {
    if (!db || !auth?.currentUser) return;

    activeSubscriptions.forEach(unsub => unsub());
    activeSubscriptions = [];

    const startTime = new Date().toISOString();
    const { userRole } = useAppStore.getState();

    // 1. New global events (all users)
    const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const event = change.doc.data();
                if (event.createdAt > startTime) {
                    pushNotification(`🚀 New Event: ${event.eventName}`, {
                        body: `Posted by ${event.collegeName}. Tap to view.`,
                        tag: `new-event-${change.doc.id}`,
                        type: 'event',
                    });
                }
            }
        });
    });
    activeSubscriptions.push(unsubEvents);

    // 2. Payment requests (admin / event_manager only)
    if (userRole === 'admin' || userRole === 'event_manager') {
        const paymentsQuery = query(collection(db, 'payment_requests'), orderBy('createdAt', 'desc'));
        const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const req = change.doc.data();
                    if (req.createdAt > startTime && req.status === 'pending') {
                        pushNotification(`💳 Payment Request: ${req.userName}`, {
                            body: `Verification pending for ${req.planName}. Action required.`,
                            tag: `new-payment-${change.doc.id}`,
                            type: 'payment',
                            requireInteraction: true,
                        });
                    }
                }
            });
        });
        activeSubscriptions.push(unsubPayments);
    }

    // 3. Team join requests (team leader / admin)
    const teamReqQuery = query(
        collection(db, 'team_requests'),
        where('teamId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
    );
    const unsubTeamReq = onSnapshot(teamReqQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const req = change.doc.data();
                if (req.createdAt > startTime) {
                    pushNotification(`🔰 Join Request: ${req.userName}`, {
                        body: `Wants to join your team. Approval required.`,
                        tag: `team-req-${change.doc.id}`,
                        type: 'team',
                        requireInteraction: true,
                    });
                }
            }
        });
    });
    activeSubscriptions.push(unsubTeamReq);
};

// ─── Main init ───────────────────────────────────────────────────────────────
export const initNotificationSystem = async () => {
    const hasPermission = await requestNotificationPermission();

    if (hasPermission) {
        // Handle FCM foreground messages
        if (messaging) {
            onMessage(messaging, (payload) => {
                pushNotification(payload.notification?.title || 'New Notification', {
                    body: payload.notification?.body || '',
                    type: 'push',
                    tag: payload.data?.tag,
                    ...payload.notification,
                });
            });
        }

        if (auth?.currentUser) {
            await requestFCMToken(auth.currentUser.uid);
            initRealTimeNotifications();
        }

        // Check deadlines immediately on load, then every hour
        const runCheck = () => {
            getMergedEvents().then(events => checkDueNotifications(events));
        };
        runCheck();
        setInterval(runCheck, 60 * 60 * 1000);
    }

    return hasPermission;
};
