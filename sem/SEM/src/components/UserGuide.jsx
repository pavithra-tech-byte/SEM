/**
 * 📖 USER GUIDE MODAL
 *
 * Comprehensive guide to all SEM features.
 * Opened via the "?" button in the Header.
 * Uses the same tabbed panel design language as LegalModal.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, BookOpen, Zap, Users, BarChart2, Calendar, Settings,
    Shield, Plus, Upload, Search, Bell, Star, Download,
    Smartphone, LogIn, FileText, Eye, Edit, Trash2, ArrowRight,
    CheckCircle2, Hash, Globe, Phone
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../utils';

const Section = ({ title, children }) => (
    <div className="mb-8">
        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-indigo-600 rounded-full inline-block shrink-0" />
            {title}
        </h3>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {children}
        </div>
    </div>
);

const Step = ({ icon: Icon, label, desc }) => (
    <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
            <Icon size={16} />
        </div>
        <div>
            <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
        </div>
    </div>
);

const Badge = ({ children, color = 'indigo' }) => {
    const colors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
        amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
        rose: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800',
    };
    return (
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest", colors[color])}>
            {children}
        </span>
    );
};

const tabs = [
    { id: 'start',     label: 'Getting Started', icon: Zap },
    { id: 'events',    label: 'Events',           icon: Plus },
    { id: 'team',      label: 'Teams',            icon: Users },
    { id: 'views',     label: 'Views & Stats',    icon: BarChart2 },
    { id: 'admin',     label: 'Admin Panel',      icon: Shield },
    { id: 'settings',  label: 'Settings & Sync',  icon: Settings },
];

const content = {
    start: (
        <div>
            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Welcome to SEM 🚀</h1>
            <p className="text-slate-500 mb-8 font-medium">Student Event Manager — your command centre for college events.</p>

            <Section title="Login">
                <Step icon={LogIn} label="Sign In with Google" desc="Tap 'Sign In with Google' on the login screen. A Google account is required." />
                <Step icon={Zap} label="First Launch" desc="You will be asked to agree to the Privacy Policy & Terms of Service once before accessing the app." />
                <Step icon={Globe} label="Firebase Required" desc="The app requires a Firebase project configured in Settings → Advanced. Ask your admin for the credentials." />
            </Section>

            <Section title="Navigation">
                <p>Use the <strong>bottom navigation bar</strong> (mobile) or top header links (desktop) to switch between:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                    <Badge>Dashboard</Badge>
                    <Badge>Events</Badge>
                    <Badge>Calendar</Badge>
                    <Badge color="emerald">Analytics</Badge>
                    <Badge color="amber">Discovery</Badge>
                    <Badge color="rose">Settings</Badge>
                </div>
            </Section>

            <Section title="Roles">
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { role: 'Public', color: 'rose', desc: 'Can browse events. Contact info is masked.' },
                        { role: 'Subscriber', color: 'indigo', desc: 'Can view all details and track statuses.' },
                        { role: 'Event Manager', color: 'amber', desc: 'Can add, edit, and delete events.' },
                        { role: 'Admin', color: 'emerald', desc: 'Full control — users, payments, roles.' },
                    ].map(r => (
                        <div key={r.role} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <Badge color={r.color}>{r.role}</Badge>
                            <p className="text-[11px] mt-1.5 text-slate-500">{r.desc}</p>
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    ),

    events: (
        <div>
            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Managing Events</h1>
            <p className="text-slate-500 mb-8 font-medium">Add, edit, track and export college events.</p>

            <Section title="Adding an Event">
                <Step icon={Plus} label="Add Event Button" desc="Tap the '+' button in the header or Admin panel. Only Event Managers and Admins can add events." />
                <Step icon={FileText} label="Fill in Details" desc="Enter event name, college, dates, prize, contact info, and upload a poster image." />
                <Step icon={Smartphone} label="AI/OCR Scan" desc="Switch to the 'AI Assistant' tab and scan an event poster image. Tesseract OCR will auto-fill the form fields." />
                <Step icon={CheckCircle2} label="Submit" desc="Click 'Launch Event' to save. The event is stored locally and synced to Firebase." />
            </Section>

            <Section title="Event Statuses">
                <div className="flex flex-wrap gap-2">
                    {['Upcoming', 'Open', 'Registered', 'Attended', 'Won', 'Closed', 'Completed', 'Shortlisted', 'Blocked'].map(s => (
                        <Badge key={s}>{s}</Badge>
                    ))}
                </div>
                <p className="mt-3">Open any event → tap the status buttons at the bottom to update your team's participation status.</p>
            </Section>

            <Section title="Importing Events">
                <Step icon={Upload} label="CSV Import" desc="Go to Header → Import CSV. Download the template, fill it out, and re-import. Bulk-adds events to IndexedDB." />
                <Step icon={Download} label="Export CSV" desc="Go to Events page → Export button. Downloads all events as a CSV file." />
            </Section>

            <Section title="Searching & Filtering">
                <Step icon={Search} label="Search Bar" desc="Type in the search box on the Events page to filter by name, college, or location." />
                <Step icon={Star} label="Shortlist" desc="Tap the heart ♥ icon on any event to add it to your shortlist. Filter by shortlisted events using the filter panel." />
            </Section>
        </div>
    ),

    team: (
        <div>
            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Team Features</h1>
            <p className="text-slate-500 mb-8 font-medium">Collaborate with your squad in real-time.</p>

            <Section title="Creating a Team">
                <p>Your team is automatically created when you first sign in. Your <strong>User ID is your Team ID</strong>. Share your invite link with teammates.</p>
            </Section>

            <Section title="Inviting Members">
                <Step icon={Hash} label="Get Invite Link" desc="Go to Dashboard → Team section. Tap 'Invite' to copy your team's invite link." />
                <Step icon={ArrowRight} label="Share Link" desc="Send the link to teammates. They open it in a browser, log in, and click 'Accept Command' to join." />
                <Step icon={CheckCircle2} label="Approve Request" desc="As Team Leader, go to Dashboard → Pending Requests and approve join requests." />
            </Section>

            <Section title="Team Chat">
                <Step icon={Users} label="Real-time Chat" desc="Click the chat bubble (💬) on the Dashboard to open team chat. Messages sync in real-time via Firestore." />
                <Step icon={Bell} label="Notifications" desc="You receive a push notification when a teammate sends a message and the chat is closed." />
            </Section>

            <Section title="Team Event Tracking">
                <p>Each team tracks their own event statuses (Registered, Won, Attended) separately from the global catalog. Open any event → set your team status.</p>
            </Section>
        </div>
    ),

    views: (
        <div>
            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Views & Statistics</h1>
            <p className="text-slate-500 mb-8 font-medium">Understand your event performance at a glance.</p>

            <Section title="Dashboard">
                <Step icon={BarChart2} label="Stats Cards" desc="Shows total events, upcoming count, total prize pool, and win count." />
                <Step icon={Zap} label="Critical Deadlines" desc="Lists events with deadlines within the next 7 days, sorted by urgency." />
                <Step icon={Star} label="Priority Events" desc="Events with a priority score ≥ 70 appear here. Score is computed from prize, deadline proximity, and team size." />
            </Section>

            <Section title="Calendar View">
                <Step icon={Calendar} label="Month Grid" desc="Navigate to /calendar to see all events plotted on a month calendar." />
                <Step icon={Eye} label="Click an Event" desc="Click any event dot on the calendar to open its details modal." />
            </Section>

            <Section title="Analytics Page">
                <Step icon={BarChart2} label="Charts" desc="Visual breakdowns of events by type, status, and prize range." />
                <Step icon={Download} label="Export" desc="Export the current dataset as CSV from the Analytics page." />
            </Section>

            <Section title="Discovery Page">
                <Step icon={Search} label="Discover Events" desc="Browse publicly synced events from all teams. Use filters to find events by type, location, or date." />
            </Section>
        </div>
    ),

    admin: (
        <div>
            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Admin Panel</h1>
            <p className="text-slate-500 mb-8 font-medium">Only visible to Admins and Event Managers.</p>

            <Section title="Accessing Admin Panel">
                <p>Navigate to <Badge>Settings</Badge> → Admin Panel, or go to <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">/admin</code>. Only verified Admins and Event Managers can enter.</p>
            </Section>

            <Section title="Matrix Control (Events Tab)">
                <Step icon={Plus} label="Inject Global Event" desc="Add an event that is visible to ALL users across all teams." />
                <Step icon={Edit} label="Edit Event" desc="Modify any event's details." />
                <Step icon={Trash2} label="Delete Event" desc="Permanently removes the event from local DB and Firestore." />
            </Section>

            <Section title="Unit Directory (Users Tab)">
                <Step icon={Users} label="View All Users" desc="List all registered users with their role, team, and XP stats." />
                <Step icon={Shield} label="Change Role" desc="Use the dropdown next to each user to change their role (Public, Subscriber, Event Manager, Admin)." />
                <Step icon={Trash2} label="Delete User" desc="Removes all user data from Firestore. Irreversible." />
            </Section>

            <Section title="Financial Grid (Payments Tab)">
                <Step icon={CheckCircle2} label="Approve Payment" desc="When a user requests a subscription upgrade, their payment proof appears here. Click Approve to grant access." />
                <Step icon={X} label="Reject Payment" desc="Reject and the user remains on their current plan." />
            </Section>
        </div>
    ),

    settings: (
        <div>
            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Settings & Sync</h1>
            <p className="text-slate-500 mb-8 font-medium">Configure Firebase, notifications, and preferences.</p>

            <Section title="Firebase Configuration">
                <Step icon={Settings} label="Enter Config" desc="Go to Settings → Advanced → Firebase Config. Paste your Firebase project credentials (apiKey, projectId, etc.)." />
                <Step icon={Globe} label="Test Connection" desc="After saving, the app reconnects. Check the status indicator in the header." />
            </Section>

            <Section title="Notifications">
                <Step icon={Bell} label="Enable Push" desc="Allow browser notifications when prompted. Notifications fire for: new team messages, deadline reminders, and event day alerts." />
                <Step icon={Smartphone} label="PWA Install" desc="Install SEM as a PWA on your device for native-like push notifications and offline access." />
            </Section>

            <Section title="Data Management">
                <Step icon={Download} label="Export CSV" desc="Export all your events to a CSV file from Settings or the Events page." />
                <Step icon={Upload} label="Import CSV" desc="Import events in bulk via the CSV importer. Template available in the import modal." />
                <Step icon={Trash2} label="Clear Data" desc="Settings → Advanced → Clear All Data. Wipes local IndexedDB. Firebase data is unaffected." />
            </Section>

            <Section title="Preferences">
                <div className="space-y-2">
                    {[
                        { label: 'Dark Mode', desc: 'Toggle light/dark theme.' },
                        { label: 'Compact View', desc: 'Show more events on screen with smaller cards.' },
                        { label: 'Delete Lock', desc: 'Enable PIN (2026) required before deleting events.' },
                        { label: 'Auto Sync', desc: 'Automatically sync events with Firestore when online.' },
                    ].map(p => (
                        <div key={p.label} className="flex gap-3 items-start">
                            <CheckCircle2 size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                            <p><strong>{p.label}</strong> — {p.desc}</p>
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    ),
};

const UserGuide = () => {
    const isOpen = useAppStore((state) => state.modals.userGuide);
    const closeModal = useAppStore((state) => state.closeModal);
    const [activeTab, setActiveTab] = useState('start');

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-left">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => closeModal('userGuide')}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[640px]"
                    >
                        {/* Sidebar */}
                        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-100 dark:border-slate-800 flex flex-col pt-6 shrink-0">
                            <div className="px-6 mb-6 flex items-center gap-3">
                                <BookOpen size={20} className="text-indigo-600" />
                                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">User Guide</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible custom-scrollbar">
                                {tabs.map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap min-w-max md:min-w-0 md:w-full",
                                                activeTab === tab.id
                                                    ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/20"
                                                    : "font-bold text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                                            )}
                                        >
                                            <Icon size={16} />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col min-w-0 relative">
                            <button
                                onClick={() => closeModal('userGuide')}
                                className="absolute top-4 right-4 p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors z-10"
                            >
                                <X size={20} />
                            </button>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar"
                                >
                                    {content[activeTab]}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UserGuide;
