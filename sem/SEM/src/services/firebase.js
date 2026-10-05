/**
 * 🔥 FIREBASE SERVICE COLLABORATION MODULE
 * 
 * This module handles all direct interactions with Firebase:
 * 1. App Initialization
 * 2. Authentication (Login/Register/Logout)
 * 3. Firestore Real-time Database Operations
 */

import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    writeBatch,
    onSnapshot,
    query,
    orderBy,
    deleteDoc,
    getDoc,
    updateDoc,
    where
} from "firebase/firestore";

import {
    getMessaging,
    getToken,
    onMessage
} from "firebase/messaging";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";
import { showNotification } from '../notifications';
import { 
    syncEventToSupabase, 
    deleteEventFromSupabase, 
    syncTeamEventDataToSupabase, 
    syncProfileToSupabase 
} from './databaseRouter';

// These variables will hold our active instances once initialized
export let db = null;   // Firestore instance
export let auth = null; // Auth instance
export let app = null;  // Firebase App instance
export let messaging = null; // Messaging instance

/**
 * Initializes Firebase with user-provided configuration.
 * @param {Object} config - The JSON config from Firebase Console.
 */
export const initFirebase = (config) => {
    try {
        // Prevent crashes if config is empty
        if (!config || !config.apiKey) return null;

        // Only initialize once to prevent "duplicate app" errors
        if (!app) {
            app = initializeApp(config);
            
            // 🛡️ APP CHECK: Anti-DDoS & Bot Protection
            if (typeof window !== 'undefined') {
                try {
                    const siteKey = config.appCheckSiteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY;
                    if (siteKey) {
                        initializeAppCheck(app, {
                            provider: new ReCaptchaV3Provider(siteKey),
                            isTokenAutoRefreshEnabled: true
                        });
                        console.log("🛡️ App Check activated. Identity verification in progress.");
                    } else {
                        console.warn("🛡️ App Check skipped: No Site Key provided.");
                    }
                } catch (checkErr) {
                    console.error("🛡️ App Check fail:", checkErr);
                }
            }

            db = getFirestore(app);
            auth = getAuth(app);
            
            // Background notifications require Messaging initialization
            try {
                messaging = getMessaging(app);
                console.log("🔔 Messaging Engine ready for Push Protocol.");
            } catch (err) {
                console.log("⚠️ Messaging initialization skipped (likely local dev or unsupported browser)");
            }

            console.log("✅ Firebase Engine ignited successfully.");
        }
        return { db, auth, messaging };
    } catch (error) {
        console.error("❌ Firebase Init Error:", error);
        return null;
    }
};

/**
 * MESSAGING: Requests a token for the current device and saves it to user profile.
 */
export const requestFCMToken = async (uid) => {
    if (!messaging || !db) return null;

    try {
        // VAPID Key from Firebase Console -> Settings -> Cloud Messaging -> Web Push certificates
        // User will need to provide this for background notifications when app is closed.
        const vapidKey = import.meta.env.VITE_VAPID_KEY;
        const tokenOptions = vapidKey ? { vapidKey } : {};
        const token = await getToken(messaging, tokenOptions);

        if (token) {
            console.log("📍 FCM Token received:", token);
            // Store token in user's profile to target them later
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const data = userSnap.data();
                const tokens = data.fcmTokens || [];
                if (!tokens.includes(token)) {
                    await updateDoc(userRef, {
                        fcmTokens: [...tokens, token],
                        lastTokenSync: new Date().toISOString()
                    });
                }
            }
            return token;
        } else {
            console.warn("❌ No FCM registration token available. Request permission to generate one.");
            return null;
        }
    } catch (error) {
        console.error("❌ Error retrieving FCM token:", error);
        return null;
    }
};

/**
 * AUTH: Logs in an existing team member.
 */
export const loginUser = async (email, password) => {
    if (!auth) throw new Error("Firebase Auth not initialized. Check your config in Settings.");
    return signInWithEmailAndPassword(auth, email, password);
};

/**
 * AUTH: Logs in / registers using Google OAuth.
 */
export const loginWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized. Check your config in Settings.");
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Auto-provision profile on registration
    if (db) {
        const userRef = doc(db, "users", result.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            const role = result.user.email === 'jagadish2k2006@gmail.com' ? 'admin' : 'public';
            const profilePayload = {
                email: result.user.email,
                displayName: result.user.displayName || 'Anonymous Unit',
                role: role,
                mobile: '',
                college: '',
                department: '',
                year: '',
                section: '',
                dob: '',
                regNo: '',
                locality: '',
                professionalDetails: '',
                photoURL: result.user.photoURL || '',
                createdAt: new Date().toISOString()
            };
            await setDoc(userRef, profilePayload);
            // Sync to Supabase Backup
            await syncProfileToSupabase(result.user.uid, profilePayload);
        }
    }
    return result;
};

/**
 * AUTH: Creates a new team account and sets their display name.
 */
export const registerUser = async (email, password, displayName, extras = {}) => {
    if (!auth) throw new Error("Firebase Auth not initialized. Check your config in Settings.");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
        await updateProfile(userCredential.user, { displayName, photoURL: extras.photoURL || '' });
    }

    // Create user document with default role "public"
    if (db) {
        const role = email === 'jagadish2k2006@gmail.com' ? 'admin' : 'public';
        const profilePayload = {
            email: email,
            displayName: displayName,
            role: role,
            mobile: extras.mobile || '',
            college: extras.college || '',
            department: extras.department || '',
            year: extras.year || '',
            section: extras.section || '',
            dob: extras.dob || '',
            regNo: extras.regNo || '',
            locality: extras.locality || '',
            professionalDetails: extras.professionalDetails || '',
            photoURL: extras.photoURL || '',
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", userCredential.user.uid), profilePayload);
        // Sync to Supabase Backup
        await syncProfileToSupabase(userCredential.user.uid, profilePayload);
    }

    return userCredential;
};

/**
 * AUTH: Ends the current session.
 */
export const logoutUser = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    return signOut(auth);
};

/**
 * FIRESTORE: Get user data (role and teamId)
 */
export const getUserData = async (uid) => {
    if (!db) return { role: 'public', teamId: null, hasSubscription: false, position: 'Explorer' };
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                ...data,
                role: data.role || "public",
                teamId: data.teamId || uid,
                hasSubscription: !!data.hasSubscription,
                position: data.position || 'Explorer'
            };
        }
        return { role: "public", teamId: uid, hasSubscription: false, position: 'Explorer' };
    } catch (error) {
        console.error("Error fetching user data:", error);
        return { role: "public", teamId: uid, hasSubscription: false, position: 'Explorer' };
    }
};

/**
 * FIRESTORE: Live subscribe to user data changes.
 */
export const subscribeToUserData = (uid, callback) => {
    if (!db) return null;
    return onSnapshot(doc(db, "users", uid), (userDoc) => {
        if (userDoc.exists()) {
            const data = userDoc.data();
            callback({
                ...data,
                role: data.role || "public",
                teamId: data.teamId || uid,
                hasSubscription: !!data.hasSubscription,
                position: data.position || 'Explorer'
            });
        }
    });
};

/**
 * FIRESTORE: Get all members of a team
 */
export const getTeamMembers = async (teamId) => {
    if (!db || !teamId) return [];
    try {
        const q = query(collection(db, "users"), where("teamId", "==", teamId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching team members:", error);
        return [];
    }
};

/**
 * FIRESTORE: Live subscribe to team members.
 */
export const subscribeToTeamMembers = (teamId, callback) => {
    if (!db || !teamId) return null;
    const q = query(collection(db, "users"), where("teamId", "==", teamId));
    return onSnapshot(q, (snapshot) => {
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(members);
    });
};

/**
 * FIRESTORE: Update profile data
 */
export const updateUserProfile = async (uid, data) => {
    if (!db) throw new Error("Firestore not initialized");
    try {
        await setDoc(doc(db, "users", uid), data, { merge: true });
    } catch (e) {
        console.error('[Sync Fail] Firestore updateUserProfile failed, falling back to Supabase:', e);
        await syncProfileToSupabase(uid, data);
        throw e;
    }
    await syncProfileToSupabase(uid, data);
};

/**
 * FIRESTORE: Delete user data (soft-delete to avoid Firestore rules blocking deleteDoc)
 */
export const deleteUserData = async (uid) => {
    if (!db) throw new Error("Firestore not initialized");
    const userRef = doc(db, "users", uid);
    // Soft-delete: mark user as deleted and downgrade role
    await updateDoc(userRef, { 
        deleted: true, 
        role: 'deleted',
        deletedAt: new Date().toISOString()
    });
};

/**
 * FIRESTORE: Get all users (excludes soft-deleted)
 */
export const getAllUsers = async () => {
    if (!db) return [];
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        return querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => !user.deleted);
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
};

export const updateUserRole = async (uid, role) => {
    if (!db) throw new Error("Firestore not initialized");

    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) throw new Error("User not found");
    const userData = userDocSnap.data();

    // 1. Strict Master Admin Lock
    if (role === 'admin' && userData.email !== 'jagadish2k2006@gmail.com') {
        throw new Error("Action Denied: Only jagadish2k2006@gmail.com can be an Admin.");
    }
    if (userData.email === 'jagadish2k2006@gmail.com' && role !== 'admin') {
        throw new Error("Action Denied: Master Admin role cannot be modified or removed.");
    }

    // 2. Single Event Manager Lock
    if (role === 'event_manager') {
        const managersQuery = query(collection(db, "users"), where("role", "==", "event_manager"));
        const snapshot = await getDocs(managersQuery);
        const existingManagers = snapshot.docs.filter(d => d.id !== uid);
        if (existingManagers.length >= 1) {
            throw new Error("Action Denied: There can only be ONE Event Manager. Please demote the current manager first.");
        }
    }

    await setDoc(userDocRef, { role }, { merge: true });
};

/**
 * FIRESTORE: Update a user's position/designation within a team
 */
export const updateMemberPosition = async (uid, position) => {
    if (!db) throw new Error("Firestore not initialized");
    await setDoc(doc(db, "users", uid), { position }, { merge: true });
};

/**
 * FIRESTORE: Create a manual payment request for admin verification.
 */
export const createPaymentRequest = async (requestData) => {
    if (!db) {
        console.error("Firestore not initialized when calling createPaymentRequest");
        throw new Error("Firestore is not initialized. Please check your Firebase configuration in Settings.");
    }

    // Use a secure random generator for IDs
    const generateSecureId = () => {
        if (typeof crypto !== 'undefined') {
            if (crypto.randomUUID) return crypto.randomUUID();
            if (crypto.getRandomValues) {
                return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                );
            }
        }
        return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    };

    const requestId = generateSecureId();

    const requestRef = doc(db, "payment_requests", requestId);

    try {
        await setDoc(requestRef, {
            ...requestData,
            requestId,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        return requestId;
    } catch (error) {
        console.error("Firestore Error in createPaymentRequest:", error);
        throw error; // Re-throw to be caught by the UI
    }
};

/**
 * FIRESTORE: Sets up a real-time listener for ALL global events.
 * This is the shared catalog of events created by Admins.
 */
export const subscribeToGlobalEvents = (callback, onError) => {
    if (!db) return null;
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, orderBy("createdAt", "desc"));

    return onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(doc => ({
            ...doc.data(),
            serverId: doc.id
        }));
        console.log(`[Firebase] Global Events Updated: ${events.length}`);
        callback(events);

        // Detect newly added events for Global Notifications
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const newEvent = change.doc.data();
                // Only notify if event was created in the last 2 minutes
                // (Prevents spamming notifications on initial load of all historical events)
                if (newEvent.createdAt) {
                    const ageInMs = new Date() - new Date(newEvent.createdAt);
                    if (ageInMs < 2 * 60 * 1000) {
                        try {
                            showNotification(`New Event Alert: ${newEvent.eventName}`, {
                                body: `A new event is available at ${newEvent.collegeName}`,
                                tag: `global-event-${change.doc.id}`
                            });
                        } catch (err) {
                            console.error("Notification trigger fail:", err);
                        }
                    }
                }
            }
        });
    }, (error) => {
        console.error('[Firebase] Global Events Listener failed:', error);
        if (onError) onError(error);
    });
};

/**
 * FIRESTORE: Sets up a real-time listener for current team's private event stats (Status/Prize).
 */
export const subscribeToTeamEventData = (teamId, callback, onError) => {
    if (!db || !teamId) return null;
    const teamEventRef = collection(db, "teamEventData");
    const q = query(teamEventRef, where("teamId", "==", teamId));

    return onSnapshot(q, (snapshot) => {
        const stats = snapshot.docs.reduce((acc, doc) => {
            const data = doc.data();
            acc[data.eventId] = data;
            return acc;
        }, {});
        console.log(`[Firebase] Team Stats Updated: ${Object.keys(stats).length} entries.`);
        callback(stats);
    }, (error) => {
        console.error('[Firebase] Team Stats Listener failed:', error);
        if (onError) onError(error);
    });
};

/**
 * FIRESTORE: Saves a team-specific status/prize update for an event.
 */
export const saveTeamEventData = async (teamId, eventId, data) => {
    if (!db) throw new Error("Firestore not initialized");
    const docId = `${teamId}_${eventId}`;
    const docRef = doc(db, "teamEventData", docId);
    
    const payload = {
        ...data,
        teamId,
        eventId,
        updatedAt: new Date().toISOString()
    };
    try {
        await setDoc(docRef, payload, { merge: true });
    } catch (e) {
        console.error('[Sync Fail] Firestore saveTeamEventData failed, falling back to Supabase:', e);
        await syncTeamEventDataToSupabase(teamId, eventId, data);
        throw e;
    }
    await syncTeamEventDataToSupabase(teamId, eventId, data);
};

/**
 * FIRESTORE: Saves a single event to the cloud.
 */
export const saveEventToFirestore = async (event) => {
    if (!db) throw new Error("Firestore not initialized");

    // We use serverId as the document ID for global uniqueness
    if (!event.serverId) {
        // Fallback if missing (should be set by createEvent)
        event.serverId = crypto.randomUUID();
    }
    const eventRef = doc(db, "events", event.serverId);

    // Prepare data for cloud storage
    const cleanEvent = {
        ...event,
        teamId: event.teamId || null,
        createdBy: event.createdBy || auth?.currentUser?.uid || 'unknown'
    };
    delete cleanEvent.posterBlob;
    delete cleanEvent.id; // NEVER save the local ID to the cloud

    // Firestore works best with ISO strings for dates
    ['registrationDeadline', 'startDate', 'endDate', 'createdAt', 'updatedAt'].forEach(key => {
        if (cleanEvent[key] instanceof Date) {
            cleanEvent[key] = cleanEvent[key].toISOString();
        }
    });

    try {
        await setDoc(eventRef, cleanEvent);
    } catch (e) {
        console.error('[Sync Fail] Firestore setDoc failed, falling back to Supabase:', e);
        await syncEventToSupabase(event);
        throw e;
    }
    await syncEventToSupabase(event);
};

/**
 * FIRESTORE: Deletes an event from the cloud.
 */
export const deleteEventFromFirestore = async (id) => {
    if (!db) throw new Error("Firestore not initialized");
    try {
        await deleteDoc(doc(db, "events", id.toString()));
    } catch (e) {
        console.error('[Sync Fail] Firestore deleteDoc failed, falling back to Supabase:', e);
        await deleteEventFromSupabase(id);
        throw e;
    }
    await deleteEventFromSupabase(id);
};

/**
 * FIRESTORE: Uploads multiple events at once (used for initial sync).
 */
export const bulkSyncToFirestore = async (events) => {
    if (!db) throw new Error("Firestore not initialized");
    const batch = writeBatch(db); // use a Batch to make it atomic (all or nothing)
    const eventsRef = collection(db, "events");

    events.forEach((event) => {
        const sid = event.serverId || crypto.randomUUID();
        const eventDoc = doc(eventsRef, sid);
        const cleanEvent = { ...event, serverId: sid };
        delete cleanEvent.posterBlob;
        delete cleanEvent.id;

        ['registrationDeadline', 'startDate', 'endDate', 'createdAt', 'updatedAt'].forEach(key => {
            if (cleanEvent[key] instanceof Date) {
                cleanEvent[key] = cleanEvent[key].toISOString();
            }
        });

        batch.set(eventDoc, cleanEvent);
    });

    await batch.commit(); // Execute all operations at once
};
/**
 * FIRESTORE: Fetches all payment requests (Admin only)
 */
export const getPaymentRequests = async () => {
    if (!db) return [];
    try {
        const querySnapshot = await getDocs(
            query(collection(db, "payment_requests"), orderBy("createdAt", "desc"))
        );
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching payment requests:", error);
        return [];
    }
};

/**
 * FIRESTORE: Live subscribe to all payment requests.
 */
export const subscribeToPaymentRequests = (callback) => {
    if (!db) return null;
    const q = query(collection(db, "payment_requests"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(reqs);

        // Detect newly submitted payment requests for Admin Notifications
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const req = change.doc.data();
                // Check if request is recent (last 2 minutes)
                if (req.createdAt) {
                    const ageInMs = new Date() - new Date(req.createdAt);
                    if (ageInMs < 2 * 60 * 1000) {
                        try {
                            showNotification(`New Access Request: ${req.userName}`, {
                                body: `${req.userName} has submitted a payment for Verification.`,
                                tag: `payment-req-${change.doc.id}`
                            });
                        } catch (err) {
                            console.error("Notification trigger fail:", err);
                        }
                    }
                }
            }
        });
    });
};

/**
 * FIRESTORE: Approves a payment request and upgrades user role.
 */
export const approvePaymentRequest = async (requestId, userId, planRole) => {
    if (!db) throw new Error("Firestore not initialized");

    const userSnap = await getDoc(doc(db, "users", userId));
    const userData = userSnap.exists() ? userSnap.data() : {};
    
    // If the user is currently operating in someone else's team, assign 'member'. Otherwise 'subscriber'.
    const isInTeam = userData.teamId && userData.teamId !== userId;
    
    // SAFETY: Never allow payment approval to set admin role
    const safeRole = (!planRole || planRole === 'admin' || planRole === 'event_manager') 
        ? (isInTeam ? 'member' : 'subscriber') 
        : planRole;

    const batch = writeBatch(db);

    // 1. Update request status
    const requestRef = doc(db, "payment_requests", requestId);
    batch.update(requestRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        assignedRole: safeRole
    });

    // 2. Update user role
    const userRef = doc(db, "users", userId);
    batch.update(userRef, { role: safeRole });

    await batch.commit();
};

/**
 * FIRESTORE: Rejects or reverts a payment request.
 */
export const rejectPaymentRequest = async (requestId, userId) => {
    if (!db) throw new Error("Firestore not initialized");

    const batch = writeBatch(db);

    const requestRef = doc(db, "payment_requests", requestId);
    batch.update(requestRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
    });

    // Also downgrade user role back to public to revert the approval
    if (userId) {
        const userRef = doc(db, "users", userId);
        batch.update(userRef, { role: 'public' });
    }

    await batch.commit();
};

/**
 * FIRESTORE: Disbands a team (Leader action). Resets all members.
 */
export const disbandTeam = async (leaderId) => {
    if (!db) throw new Error("Firestore not initialized");
    
    // 1. Find all members of this team
    const members = await getTeamMembers(leaderId);
    
    const batch = writeBatch(db);
    
    members.forEach(member => {
        const memberRef = doc(db, "users", member.id);
        const preservedRole = (member.role === 'admin' || member.role === 'event_manager' || member.role === 'subscriber') 
            ? member.role 
            : 'public';

        batch.update(memberRef, {
            teamId: member.id, // return to their own ID
            position: 'Explorer',
            role: preservedRole
        });
    });

    // 2. Clear leader's invite code if any
    const leaderRef = doc(db, "users", leaderId);
    batch.update(leaderRef, { inviteCode: null });

    await batch.commit();
};

/**
 * FIRESTORE: Request to join a team (Induction request)
 */
export const requestJoinTeam = async (userId, userName, teamId) => {
    if (!db) throw new Error("Firestore not initialized");
    
    const requestId = `${userId}_to_${teamId}`;
    const requestRef = doc(db, "team_requests", requestId);
    
    await setDoc(requestRef, {
        requestId,
        userId,
        userName,
        teamId,
        status: 'pending',
        createdAt: new Date().toISOString()
    });

    return requestId;
};

/**
 * FIRESTORE: Approve a team join request
 */
export const approveJoinTeam = async (requestId, userId, teamId) => {
    if (!db) throw new Error("Firestore not initialized");
    
    const batch = writeBatch(db);
    
    // 1. Update request status
    const requestRef = doc(db, "team_requests", requestId);
    batch.update(requestRef, {
        status: 'approved',
        approvedAt: new Date().toISOString()
    });

    // 2. Update user team
    const userRef = doc(db, "users", userId);
    batch.update(userRef, {
        teamId: teamId,
        role: 'member'
    });

    await batch.commit();
};

/**
 * FIRESTORE: Rejects a team join request
 */
export const rejectJoinTeam = async (requestId) => {
    if (!db) throw new Error("Firestore not initialized");
    await deleteDoc(doc(db, "team_requests", requestId));
};

/**
 * FIRESTORE: Live subscribe to team requests for a leader
 */
export const subscribeToTeamRequests = (teamId, callback) => {
    if (!db || !teamId) return null;
    const q = query(
        collection(db, "team_requests"), 
        where("teamId", "==", teamId),
        where("status", "==", "pending")
    );
    return onSnapshot(q, (snapshot) => {
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(reqs);
    });
};


/**
 * FIRESTORE: Allows a user to leave their current team and return to their personal team.
 */
export const leaveTeam = async (uid) => {
    if (!db) throw new Error("Firestore not initialized");
    const userRef = doc(db, "users", uid);
    // Setting teamId to own uid effectively makes them leave any joined team
    // and return to their own personal team context.
    await updateDoc(userRef, { 
        teamId: uid,
        position: 'Explorer' // Reset position when leaving
    });
};

/**
 * FIRESTORE: Sends a message to the team message board.
 */
export const sendTeamMessage = async (teamId, senderId, senderName, content) => {
    if (!db) throw new Error("Firestore not initialized");
    // Cryptographically secure random ID generator as fallback
    const generateSecureId = () => {
        if (typeof crypto !== 'undefined') {
            if (crypto.randomUUID) return crypto.randomUUID();
            if (crypto.getRandomValues) {
                return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                );
            }
        }
        return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    };

    const messageId = generateSecureId();
    const messageRef = doc(db, "team_messages", messageId);
    
    await setDoc(messageRef, {
        messageId,
        teamId,
        senderId,
        senderName,
        content,
        timestamp: new Date().toISOString()
    });
};

/**
 * FIRESTORE: Live subscribe to team messages.
 * NOTE: We use only `where` (no orderBy) to avoid needing a composite index.
 * Messages are sorted client-side by timestamp.
 */
export const subscribeToTeamMessages = (teamId, callback) => {
    if (!db || !teamId) return null;
    const q = query(
        collection(db, "team_messages"), 
        where("teamId", "==", teamId)
        // NOTE: orderBy removed — requires composite index in Firestore console.
        // Sorting is handled client-side below.
    );
    
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Client-side sort
        callback(messages);
    }, (error) => {
        console.error("[Firebase] Team Messages Listener failed:", error.code, error.message);
    });
};

/**
 * FIRESTORE: Updates persistent stats for a user (or team leader) to fulfill the
 * requirement of explicitly storing individual/team summary data in the database.
 */
export const updateUserStats = async (uid, statsData) => {
    if (!db || !uid) return;
    try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, { 
            persistentStats: statsData,
            lastStatsSync: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error("[Firebase] Failed to sync user stats:", error);
    }
};
/**
 * FIRESTORE: Save a user's personal prize/stat for a specific event.
 * Path: users/{userId}/eventStats/{eventId}
 */
export const saveUserEventStat = async (userId, eventId, data) => {
    if (!db || !userId || !eventId) return;
    try {
        const statRef = doc(db, 'users', userId, 'eventStats', eventId);
        await setDoc(statRef, {
            ...data,
            userId,
            eventId,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error('[Firebase] saveUserEventStat failed:', e);
    }
};

/**
 * FIRESTORE: Subscribe to a user's personal event stats (real-time).
 */
export const subscribeToUserEventStats = (userId, callback) => {
    if (!db || !userId) return () => {};
    const statsRef = collection(db, 'users', userId, 'eventStats');
    return onSnapshot(statsRef, (snapshot) => {
        const stats = {};
        snapshot.docs.forEach(d => { stats[d.id] = d.data(); });
        callback(stats);
    }, (err) => {
        console.error('[Firebase] subscribeToUserEventStats failed:', err);
    });
};
