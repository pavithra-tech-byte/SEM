/**
 * 🏪 ZUSTAND GLOBAL STORE
 * 
 * Think of this as the "Brain" of the application.
 * It manages the app state (theme, user identity, configurations) and 
 * ensures that when one part of the app changes, the rest stays in sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
    persist( // This middleware automatically saves our store to LocalStorage!
        (set, get) => ({
            // --- UI & APPEARANCE ---
            theme: 'light',
            toggleTheme: () => set((state) => ({
                theme: state.theme === 'light' ? 'dark' : 'light'
            })),

            viewMode: 'cards', // Choices: 'cards', 'list', 'calendar'
            setViewMode: (mode) => set({ viewMode: mode }),

            // --- FILTERING LOGIC ---
            filters: {
                status: 'all',
                eventType: 'all',
                search: '',
                dateRange: 'all',
                prizeRange: 'all',
                showShortlisted: false,
                dateFrom: '',
                dateTo: ''
            },
            setFilters: (filters) => set((state) => ({
                filters: { ...state.filters, ...filters }
            })),
            resetFilters: () => set({
                filters: {
                    status: 'all',
                    eventType: 'all',
                    search: '',
                    dateRange: 'all',
                    prizeRange: 'all',
                    showShortlisted: false,
                    dateFrom: '',
                    dateTo: ''
                }
            }),

            // --- SORTING & SELECTION ---
            sortBy: 'priorityScore', // Choices: 'priorityScore', 'deadline', 'startDate', 'prizeAmount'
            sortOrder: 'desc',      // Choices: 'asc', 'desc'
            setSorting: (field, order) => set({ sortBy: field, sortOrder: order }),

            selectedEvent: null,    // Stores the ID of the event currently being viewed/edited
            setSelectedEvent: (id) => set({ selectedEvent: id }),

            // --- IN-APP NOTIFICATION INBOX ---
            notifications: [],   // { id, title, body, type, timestamp, read, tag }
            addNotification: (notif) => set((state) => {
                // Prevent duplicates by tag
                if (notif.tag && state.notifications.some(n => n.tag === notif.tag)) return {};
                const newNotif = {
                    id: Date.now() + Math.random(),
                    timestamp: new Date().toISOString(),
                    read: false,
                    ...notif
                };
                return { notifications: [newNotif, ...state.notifications].slice(0, 50) };
            }),
            markAllRead: () => set((state) => ({
                notifications: state.notifications.map(n => ({ ...n, read: true }))
            })),
            clearNotifications: () => set({ notifications: [] }),
            markNotificationRead: (id) => set((state) => ({
                notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
            })),

            // --- AUTH & TEAM IDENTITY ---
            // Stores the current Firebase User object
            user: JSON.parse(localStorage.getItem('sem_user') || 'null'),
            userRole: localStorage.getItem('sem_user_role') || 'public', // 'admin', 'event_manager', 'member', 'public'
            teamId: localStorage.getItem('sem_team_id') || null,
            userProfile: JSON.parse(localStorage.getItem('sem_user_profile') || 'null'),
            
            // SECURITY FLAG: NOT SAVED IN LOCALSTORAGE. Only true if Firebase actively verifies the token.
            isRoleVerified: false,
            setIsRoleVerified: (status) => set({ isRoleVerified: status }),

            setUser: (user) => {
                set({ 
                    user, 
                    userRole: user ? get().userRole : null, 
                    teamId: user ? (get().teamId || user.uid) : null, 
                    userProfile: user ? get().userProfile : null 
                });
            },

            setUserProfile: (profile) => {
                set({ userProfile: profile });
            },

            setUserRole: (role) => {
                set({ userRole: role });
            },

            setTeamId: (teamId) => {
                set({ teamId });
            },

            // --- FIREBASE INFRASTRUCTURE ---
            // This is the project ID and API key the user provides in Settings
            firebaseConfig: (() => {
                const stored = localStorage.getItem('firebase_config');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (parsed && parsed.apiKey) return parsed;
                    } catch (e) {}
                }
                return {
                    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                    appId: import.meta.env.VITE_FIREBASE_APP_ID
                };
            })(),
            setFirebaseConfig: (config) => {
                localStorage.setItem('firebase_config', JSON.stringify(config));
                set({ firebaseConfig: config });
            },

            // --- SUPABASE INFRASTRUCTURE ---
            supabaseConfig: (() => {
                const stored = localStorage.getItem('supabase_config');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (parsed && parsed.supabaseUrl) return parsed;
                    } catch (e) {}
                }
                return {
                    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
                    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
                };
            })(),
            setSupabaseConfig: (config) => {
                localStorage.setItem('supabase_config', JSON.stringify(config));
                set({ supabaseConfig: config });
            },

            // Keeps track of whether we are syncing with Firebase or just working locally
            cloudProvider: localStorage.getItem('cloud_provider') || 'firestore',
            setCloudProvider: (provider) => {
                localStorage.setItem('cloud_provider', provider);
                set({ cloudProvider: provider });
            },

            // --- CONSENT & ONBOARDING ---
            hasAcceptedTerms: false,
            setHasAcceptedTerms: (val) => set({ hasAcceptedTerms: val }),

            hasSeenTutorial: false,
            setHasSeenTutorial: (val) => set({ hasSeenTutorial: val }),

            // --- MODAL CONTROLLERS ---
            modals: {
                addEvent: false,
                editEvent: false,
                importCSV: false,
                eventDetails: false,
                settings: false,
                payment: false,
                teamInvite: false,
                feedback: false,
                legal: false,
                profile: false,
                userGuide: false,
                notifications: false
            },
            openModal: (modalName) => set((state) => ({
                modals: { ...state.modals, [modalName]: true }
            })),
            closeModal: (modalName) => set((state) => ({
                modals: { ...state.modals, [modalName]: false }
            })),

            // --- PREFERENCES ---
            preferences: {
                notificationsEnabled: true,
                autoSync: true,
                compactView: false,
                isDeleteLocked: false,
                pinnedEvents: [],
                expandedCards: true,
                deadlineReminderDays: [7, 3, 1, 0],
                eventReminderDays: [1]
            },
            updatePreferences: (prefs) => set((state) => ({
                preferences: { ...state.preferences, ...prefs }
            })),

            togglePinnedEvent: (id) => set((state) => {
                const pinned = state.preferences.pinnedEvents || [];
                const newPinned = pinned.includes(id)
                    ? pinned.filter(p => p !== id)
                    : [...pinned, id];
                return { preferences: { ...state.preferences, pinnedEvents: newPinned } };
            }),
        }),
        {
            // The unique name of our storage in the browser's local memory
            name: 'colleage-event-manager-storage',
            // We only persist these specific fields (we don't want to persist everything)
            partialize: (state) => ({
                theme: state.theme,
                preferences: state.preferences,
                firebaseConfig: state.firebaseConfig,
                supabaseConfig: state.supabaseConfig,
                cloudProvider: state.cloudProvider,
                sortBy: state.sortBy,
                sortOrder: state.sortOrder,
                filters: state.filters,
                viewMode: state.viewMode,
                hasAcceptedTerms: state.hasAcceptedTerms,
                hasSeenTutorial: state.hasSeenTutorial,
            })
        }
    )
);
