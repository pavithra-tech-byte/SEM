/**
 * 🚀 MAIN APPLICATION ENTRY POINT
 * 
 * This file orchestrates the entire application:
 * 1. Routing (Pages)
 * 2. Theme Management (Light/Dark)
 * 3. Firebase Initialization & Real-time Sync
 * 4. Background Maintenance (Notifications & Status checks)
 */

import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { db, updateAllEventStatuses, bulkImportEvents, bulkImportTeamEventData } from './db';
import { useAppStore } from './store';
import { initNotificationSystem } from './notifications';
import { initFirebase, getUserData, subscribeToUserData, subscribeToGlobalEvents, subscribeToTeamEventData } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { cn } from './utils';
import { initSupabase } from './services/supabase';
import { fetchBackupEvents, fetchBackupTeamEventData, bulkSyncEventsToSupabase } from './services/databaseRouter';

// --- EAGERLY LOADED COMPONENTS (Essential for fast first paint) ---
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Login from './components/Login';
import SplashScreen from './components/SplashScreen';
import ConsentModal from './components/ConsentModal'; // Must be eager — shown before auth
import Dashboard from './components/Dashboard'; // Eagerly loaded for instant access

// --- LAZY LOADED COMPONENTS (Loaded only when needed to save bandwidth) ---
const EventList = lazy(() => import('./components/EventList'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const Analytics = lazy(() => import('./components/Analytics'));
const Settings = lazy(() => import('./components/Settings'));
const Discovery = lazy(() => import('./components/Discovery'));
const AddEventModal = lazy(() => import('./components/AddEventModal'));
const ImportCSVModal = lazy(() => import('./components/ImportCSVModal'));
const EventDetailsModal = lazy(() => import('./components/EventDetailsModal'));
const EditEventModal = lazy(() => import('./components/EditEventModal'));
const PaymentModal = lazy(() => import('./components/PaymentModal'));
const TeamInviteModal = lazy(() => import('./components/TeamInviteModal'));
const JoinTeam = lazy(() => import('./components/JoinTeam'));
const FeedbackModal = lazy(() => import('./components/FeedbackModal'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const LegalModal = lazy(() => import('./components/LegalModal'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const UserGuide = lazy(() => import('./components/UserGuide'));

/**
 * 🔄 Animated Routes Container
 * Handles page transitions with Framer Motion.
 */

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', background: '#ffebee', color: '#c62828', fontFamily: 'monospace' }}>
                    <h2>Something went wrong.</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

function AnimatedRoutes({ user }) {
    const location = useLocation();

    // If not logged in, only allow the /invite route
    if (!user) {
        return (
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/invite/:teamId" element={<Suspense fallback={null}><JoinTeam /></Suspense>} />
                    <Route path="*" element={null} />
                </Routes>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/events" element={<Suspense fallback={null}><EventList /></Suspense>} />
                <Route path="/calendar" element={<Suspense fallback={null}><CalendarView /></Suspense>} />
                <Route path="/analytics" element={<Suspense fallback={null}><Analytics /></Suspense>} />
                <Route path="/settings" element={<Suspense fallback={null}><Settings /></Suspense>} />
                <Route path="/discovery" element={<Suspense fallback={null}><Discovery /></Suspense>} />
                <Route path="/admin" element={<Suspense fallback={null}><AdminPanel /></Suspense>} />
                <Route path="/invite/:teamId" element={<Suspense fallback={null}><JoinTeam /></Suspense>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AnimatePresence>
    );
}

function App() {
    // Hooks to access the Store (Global State)
    const theme = useAppStore((state) => state.theme);
    const user = useAppStore((state) => state.user);
    const setUser = useAppStore((state) => state.setUser);
    const firebaseConfig = useAppStore((state) => state.firebaseConfig);
    const supabaseConfig = useAppStore((state) => state.supabaseConfig);
    const cloudProvider = useAppStore((state) => state.cloudProvider);
    const userRole = useAppStore((state) => state.userRole);
    const teamId = useAppStore((state) => state.teamId);
    const hasAcceptedTerms = useAppStore((state) => state.hasAcceptedTerms);
    const hasSeenTutorial = useAppStore((state) => state.hasSeenTutorial);
    const setHasSeenTutorial = useAppStore((state) => state.setHasSeenTutorial);
    const openModal = useAppStore((state) => state.openModal);

    // Local loading states
    const [isLoading, setIsLoading] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const hasInitialSupabaseSyncRun = React.useRef(false);

    /**
     * EFFECT: Safety Timeout
     * Prevents the app from being stuck on a blank screen if Firebase hangs.
     */
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                console.warn('[System] Loading took too long. Forcing start...');
                setIsLoading(false);
            }
        }, 3000); // Reduced timeout to 3s for faster fallback
        return () => clearTimeout(timer);
    }, [isLoading]);

    /**
     * EFFECT: Apply Theme
     * Runs whenever the user toggles Light/Dark mode.
     */
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    /**
     * EFFECT: Initialize Supabase client
     */
    useEffect(() => {
        if (supabaseConfig && supabaseConfig.supabaseUrl) {
            initSupabase(supabaseConfig);
        }
    }, [supabaseConfig]);

    /**
     * EFFECT: Initialize Firebase & Listen for Auth Changes
     * This is the "Engine Room" of the application connectivity.
     */
    useEffect(() => {
        // Step 1: Initialize Firebase with the saved config
        let unsubscribeAuth = () => { };
        let unsubscribeUserData = () => { };

        // Fail-safe: Force stop loading after 10 seconds to prevent stuck splash screen
        const loadingTimeout = setTimeout(() => {
            if (isLoading) {
                console.warn('[System] Loading timeout reached. Force releasing UI.');
                setIsLoading(false);
            }
        }, 10000);

        try {
            console.log('[System] Initializing Firebase Engine...');
            const firebaseData = initFirebase(firebaseConfig);

            // Step 2: Listen for User Login / Logout changes
            if (firebaseData?.auth) {
                unsubscribeAuth = onAuthStateChanged(firebaseData.auth, async (firebaseUser) => {
                    console.log('[Auth] State resolved. User:', firebaseUser?.email || 'None');
                    clearTimeout(loadingTimeout); // Auth resolved, we can clear the timeout
                    setUser(firebaseUser);
                    unsubscribeUserData();

                    if (firebaseUser) {
                        try {
                            unsubscribeUserData = subscribeToUserData(firebaseUser.uid, (userData) => {
                                useAppStore.getState().setUserRole(userData.role);
                                useAppStore.getState().setTeamId(userData.teamId);
                                useAppStore.getState().setUserProfile(userData);
                                useAppStore.getState().setIsRoleVerified(true);
                                setIsLoading(false);
                            });
                        } catch (err) {
                            console.error('[Auth] Profile sync failed:', err);
                            useAppStore.getState().setIsRoleVerified(false);
                            setIsLoading(false);
                        }
                    } else {
                        useAppStore.getState().setIsRoleVerified(false);
                        setIsLoading(false);
                    }
                });
            } else {
                console.error('[System] Firebase Auth unavailable (Invalid Config).');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('[Auth] Boot crash:', error);
            setIsLoading(false);
        }

        return () => {
            clearTimeout(loadingTimeout);
            unsubscribeAuth();
            unsubscribeUserData();
        };
    }, [firebaseConfig, setUser]);

    /**
     * EFFECT: Real-time Data Sync
     * Only starts AFTER auth is confirmed (isLoading === false) and user is logged in.
     */
    useEffect(() => {
        if (isLoading || !user || cloudProvider !== 'firestore') return;

        let unsubscribeGlobal = () => { };
        let unsubscribeTeamStats = () => { };

        console.log('[Sync] Starting dual-channel real-time sync...');

        // 1. Sync Shared Events Catalog
        unsubscribeGlobal = subscribeToGlobalEvents(
            async (remoteEvents) => {
                await bulkImportEvents(remoteEvents, true);
                if (!hasInitialSupabaseSyncRun.current && remoteEvents.length > 0) {
                    hasInitialSupabaseSyncRun.current = true;
                    bulkSyncEventsToSupabase(remoteEvents).catch(err => {
                        console.error('[Supabase Auto-Sync Failed]:', err);
                    });
                }
            },
            async (error) => {
                console.warn('[Sync Fail] Global events sync failed, loading from Supabase fallback...', error);
                try {
                    const backupEvents = await fetchBackupEvents();
                    await bulkImportEvents(backupEvents, true);
                } catch (e) {
                    console.error('[Sync Fail] Supabase fallback events read failed too:', e);
                }
            }
        );

        // 2. Sync Private Team Performance Data
        if (teamId) {
            unsubscribeTeamStats = subscribeToTeamEventData(
                teamId,
                async (statsMap) => {
                    await bulkImportTeamEventData(statsMap, teamId);
                },
                async (error) => {
                    console.warn('[Sync Fail] Team stats sync failed, loading from Supabase fallback...', error);
                    try {
                        const backupStats = await fetchBackupTeamEventData(teamId);
                        await bulkImportTeamEventData(backupStats, teamId);
                    } catch (e) {
                        console.error('[Sync Fail] Supabase fallback team stats failed too:', e);
                    }
                }
            );
        }

        return () => {
            unsubscribeGlobal();
            unsubscribeTeamStats();
        };
    }, [isLoading, user, cloudProvider, firebaseConfig, teamId, userRole]);

    /**
     * EFFECT: Push Notifications & Background Listeners
     */
    useEffect(() => {
        if (!isLoading && user) {
            try {
                initNotificationSystem();
            } catch (err) {
                console.error('[Push] System Init Failed:', err);
            }
        }
    }, [isLoading, user]);

    /**
     * EFFECT: System Maintenance
     * Runs periodic tasks like status updates and notification checks.
     */
    useEffect(() => {
        try {
            updateAllEventStatuses();
        } catch (error) {
            console.error('[System] Maintenance crash:', error);
        }

        const interval = setInterval(() => {
            try {
                updateAllEventStatuses();
            } catch (e) {
                console.error('[System] Periodic update failed:', e);
            }
        }, 6 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <ErrorBoundary>
            {/* Privacy Policy & Terms Consent Gate (highest priority – shown to new users) */}
            <ConsentModal />

            {/* Splash Screen */}
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

            {/* Main Application Content */}
            <div className="contents">
                <Router>
                    <RoutesWrapper 
                        user={user} 
                        isLoading={isLoading}
                    />
                </Router>
            </div>
        </ErrorBoundary>
    );
}

/**
 * 🛰️ ROUTES WRAPPER
 * This component is inside the Router and can use useLocation.
 */
const RoutesWrapper = React.memo(function RoutesWrapper({ user, isLoading }) {
    const location = useLocation();
    const isInviteUrl = location.pathname.startsWith('/invite/');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/invite/:teamId" element={<Suspense fallback={null}><JoinTeam /></Suspense>} />
                    <Route path="*" element={<Login />} />
                </Routes>
            </AnimatePresence>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors duration-500 pb-24 lg:pb-0">
            <div className="sticky top-0 z-[60]">
                <Header />
            </div>

            <BottomNav />

            {/* Shared Modals */}
            <Suspense fallback={null}>
                <AddEventModal />
                <ImportCSVModal />
                <EventDetailsModal />
                <EditEventModal />
                <PaymentModal />
                <TeamInviteModal />
                <ProfileModal />
                <FeedbackModal />
                <LegalModal />
                <UserGuide />
            </Suspense>

            <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
                <AnimatedRoutes user={user} />
            </main>
        </div>
    );
});

export default App;
