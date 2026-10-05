import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db, getMergedEvents } from '../db';
import { useAppStore } from '../store';
import EventCard from './EventCard';
import { TrendingUp, Calendar, Clock, Trophy, Plus, FileUp, Zap, Sparkles, Shield, Bell, Target, ArrowRight, Users, User, Crown, Edit2, Check, X, LogOut, MessageSquare, Send } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { format, isToday, isThisWeek, differenceInDays, startOfDay, addDays, isAfter, isBefore } from 'date-fns';
import { cn, parseMarkdown, matchesDateRange } from '../utils';
import { getTeamMembers, leaveTeam, sendTeamMessage, subscribeToTeamMessages, updateMemberPosition, updateUserStats, subscribeToTeamMembers, subscribeToTeamRequests } from '../services/firebase';
import { useRef } from 'react';
import { showNotification } from '../notifications';

const StatCard = React.memo(({ title, value, icon: Icon, color, delay, trend, onClick }) => {
    // Mapping of possible colors to explicit Tailwind classes (SEM Theme)
    const colorClasses = {
        'bg-indigo-500': {
            bg: 'bg-indigo-50 dark:bg-indigo-900/30',
            text: 'text-indigo-600 dark:text-indigo-400',
            accent: 'bg-indigo-600/20'
        },
        'bg-violet-500': {
            bg: 'bg-violet-50 dark:bg-violet-900/30',
            text: 'text-violet-600 dark:text-violet-400',
            accent: 'bg-violet-600/20'
        },
        'bg-emerald-500': {
            bg: 'bg-emerald-50 dark:bg-emerald-900/30',
            text: 'text-emerald-600 dark:text-emerald-400',
            accent: 'bg-emerald-600/20'
        },
        'bg-amber-500': {
            bg: 'bg-amber-50 dark:bg-amber-900/30',
            text: 'text-amber-600 dark:text-amber-400',
            accent: 'bg-amber-600/20'
        }
    };

    const styles = colorClasses[color] || colorClasses['bg-indigo-500'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: 'spring', damping: 20 }}
            onClick={onClick}
            className={cn("relative group h-full", onClick && "cursor-pointer transition-transform hover:scale-[1.02] active:scale-95")}
        >
            <div className="absolute inset-0 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:shadow-[0_24px_50px_-12px_rgba(79,70,229,0.15)] transition-all duration-500" />
            <div className="relative p-4 sm:p-6 h-full flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-[2rem]">
                <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-all duration-700 group-hover:scale-150 group-hover:opacity-20", color)} />

                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", styles.bg)}>
                        <Icon className={cn("w-6 h-6", styles.text)} />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                            <TrendingUp size={10} />
                            {trend}
                        </div>
                    )}
                </div>

                <div className="relative z-10">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">{title}</h3>
                    <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter sm:tracking-normal">{value}</p>
                </div>
            </div>
        </motion.div>
    );
});

const Dashboard = () => {
    const navigate = useNavigate();
    const user = useAppStore((state) => state.user);
    const userRole = useAppStore((state) => state.userRole);
    const teamId = useAppStore((state) => state.teamId);
    const cloudProvider = useAppStore((state) => state.cloudProvider);
    const openModal = useAppStore((state) => state.openModal);
    const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);
    const setFilters = useAppStore((state) => state.setFilters);
    const resetFilters = useAppStore((state) => state.resetFilters);

    const [teamMembers, setTeamMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null); // {id, position}
    const [newPosition, setNewPosition] = useState('');
    const [teamRequests, setTeamRequests] = useState([]);
    const msgEndRef = useRef(null);
    // Refs to hold latest values for stale-closure-safe callbacks
    const messagesLengthRef = useRef(0);
    const isChatOpenRef = useRef(false);

    // Fetch Team Members
    useEffect(() => {
        if (teamId) {
            const unsubscribeMembers = subscribeToTeamMembers(teamId, (members) => {
                setTeamMembers(members);
            });
            
            // Subscribe to join requests if user is leader
            let unsubscribeRequests = () => {};
            if (user?.uid === teamId) {
                unsubscribeRequests = subscribeToTeamRequests(teamId, (reqs) => {
                    setTeamRequests(reqs);
                });
            }
            
            // Real-time messages - uses refs to avoid stale closures without resubscribing
            const unsubscribeMessages = subscribeToTeamMessages(teamId, (msgs) => {
                // If we get a NEW message and the chat is closed or the window is not focused
                // AND it's not our own message
                if (msgs.length > messagesLengthRef.current && messagesLengthRef.current > 0) {
                    const latest = msgs[msgs.length - 1];
                    if (latest.senderId !== user.uid && (!isChatOpenRef.current || document.hidden)) {
                        showNotification(`New Intel: ${latest.senderName}`, {
                            body: latest.content,
                            tag: 'team-chat',
                            icon: '/pwa-192x192.png'
                        });
                    }
                }
                messagesLengthRef.current = msgs.length;
                setMessages(msgs);
            });

            return () => {
                if (unsubscribeMembers) unsubscribeMembers();
                if (unsubscribeMessages) unsubscribeMessages();
                if (unsubscribeRequests) unsubscribeRequests();
            };
        }
    }, [teamId]);

    // Keep refs in sync with state so subscription callbacks always read fresh values
    useEffect(() => { messagesLengthRef.current = messages.length; }, [messages]);
    useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (isChatOpen && msgEndRef.current) {
            msgEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isChatOpen]);

    // Live data from Dexie (Merged with Team Stats)
    const events = useLiveQuery(async () => {
        return await getMergedEvents();
    }, [teamId]) || [];

    // Dashboard Statistics with useMemo - synchronized with EventList date filtering
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return events.filter(e => matchesDateRange(e, 'upcoming', now));
    }, [events]);

    const stats = useMemo(() => {
        const total = events.length;

        const upcomingCount = upcomingEvents.length;
        
        const prizeValues = upcomingEvents.map(e => {
            const val = parseFloat(String(e.prizeAmount).replace(/[^0-9.]/g, '')) || 0;
            return val;
        });
        const totalPrize = prizeValues.reduce((a, b) => a + b, 0);
        const winCount = events.filter(e => e.status === 'Won').length;

        return { total, upcomingCount, totalPrize, winCount };
    }, [events, upcomingEvents]);

    const criticalDeadlines = useMemo(() => {
        return upcomingEvents
            .filter(e => {
                const deadline = new Date(e.registrationDeadline);
                const days = differenceInDays(startOfDay(deadline), startOfDay(new Date()));
                return days >= 0 && days <= 7;
            })
            .sort((a, b) => new Date(a.registrationDeadline) - new Date(b.registrationDeadline));
    }, [upcomingEvents]);

    const priorityEvents = useMemo(() => {
        return upcomingEvents
            .filter(e => e.priorityScore >= 70)
            .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
            .slice(0, 5);
    }, [upcomingEvents]);

    const isRoleVerified = useAppStore((state) => state.isRoleVerified);
    const canManage = (userRole === 'admin' || userRole === 'event_manager') && isRoleVerified;

    useEffect(() => {
        if (!user?.uid || !stats) return;
        
        // Debounce to avoid excessive Firestore writes during active Dexie syncing
        const timer = setTimeout(() => {
            const attendedCount = events.filter(e => e.status === 'Attended').length;
            const xp = (stats.winCount * 1500) + (attendedCount * 500);
            const userStats = {
                totalEvents: stats.total,
                upcomingCount: stats.upcomingCount,
                winCount: stats.winCount,
                totalPrize: stats.totalPrize,
                totalXP: xp
            };
            
            // Sync ONLY to this user's own profile.
            // Writing to teamId (leader's doc) would cascade: all members overwrite the
            // leader's doc every 5s, triggering onSnapshot for all members → lag spiral.
            updateUserStats(user.uid, userStats);
        }, 5000); // 5 sec debounce
        
        return () => clearTimeout(timer);
    }, [stats.total, stats.winCount, stats.totalPrize, user?.uid]);

    const handleLeaveTeam = React.useCallback(async () => {
        if (!window.confirm("Are you sure you want to leave this team? You will return to your personal workspace.")) return;
        try {
            await leaveTeam(user.uid);
            // Update local state via store
            useAppStore.getState().setTeamId(user.uid);
            useAppStore.getState().setUserRole('public');
            
            // Re-sync with Firebase if listener is active
            window.location.reload(); 
        } catch (err) {
            alert("Failed to leave team: " + err.message);
        }
    }, [user.uid]);

    const handleSendMessage = React.useCallback(async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        try {
            await sendTeamMessage(teamId, user.uid, user.displayName, newMessage);
            setNewMessage('');
        } catch (err) {
            console.error("Message failed", err);
        }
    }, [teamId, user.uid, user.displayName, newMessage]);

    const handleUpdatePosition = React.useCallback(async (memberId) => {
        try {
            await updateMemberPosition(memberId, newPosition);
            setEditingMember(null);
            // Refresh members
            const members = await getTeamMembers(teamId);
            setTeamMembers(members);
        } catch (err) {
            alert("Failed to update position: " + err.message);
        }
    }, [teamId, newPosition]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const displayEventsData = useMemo(() => {
        if (priorityEvents.length > 0) return { title: 'Tactical', subtitle: 'Priority List', list: priorityEvents };
        return { title: 'Recent', subtitle: 'Signals', list: upcomingEvents.slice(0, 4) };
    }, [priorityEvents, upcomingEvents]);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-28 pt-4 sm:pt-8"
        >
            {/* Command Central Header */}
            <div className="relative mb-8 sm:mb-12 overflow-hidden bg-[#0a0c16] rounded-3xl sm:rounded-[4rem] p-5 sm:p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] group">
                {/* Background FX */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/10 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] mb-8"
                        >
                            <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center">
                                <Shield size={10} className="text-white" />
                            </div>
                            {userRole === 'public' ? 'PUBLIC' : 'TEAM'} EDITION • {userRole?.replace('_', ' ') || 'PERSONAL'} COMMAND
                        </motion.div>
                        <div className="flex flex-col gap-4 mb-4">
                            <h1 className="text-3xl sm:text-7xl font-black text-white tracking-tight leading-none">
                                Hello, <span className="bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent">{(user?.displayName || 'JD').split(' ')[0]}</span>
                            </h1>
                        </div>
                        <p className="text-sm sm:text-base text-slate-400 font-bold max-w-xl leading-relaxed">
                            {criticalDeadlines.length > 0
                                ? `You have ${criticalDeadlines.length} events with deadlines approaching this week.`
                                : "Your event tracker is up to date."}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-6 sm:mt-0">
                        {(userRole === 'admin' || userRole === 'event_manager') && (
                            <Link 
                                to="/admin"
                                className="px-5 sm:px-8 h-12 sm:h-16 bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-[1.25rem] sm:rounded-3xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-2 sm:gap-3 border border-white/20"
                            >
                                <Shield size={18} className="sm:w-5 sm:h-5" />
                                ADMIN CONSOLE
                            </Link>
                        )}
                        {canManage && (
                            <>
                                <button
                                    onClick={() => openModal('addEvent')}
                                    className="px-5 sm:px-8 h-12 sm:h-16 bg-white text-slate-950 rounded-[1.25rem] sm:rounded-3xl font-black text-[10px] sm:text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 sm:gap-3 border-2 border-transparent hover:border-black"
                                >
                                    <Plus size={18} strokeWidth={4} className="sm:w-5 sm:h-5" />
                                    ADD NEW EVENT
                                </button>
                                <button
                                    onClick={() => openModal('importCSV')}
                                    className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 backdrop-blur-md text-white rounded-[1.25rem] sm:rounded-3xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/10 shadow-xl"
                                    title="Import Data"
                                >
                                    <FileUp size={18} className="sm:w-6 sm:h-6" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Status Bar */}
                <div className="mt-16 pt-8 border-t border-white/5 flex flex-wrap items-center gap-10 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                            SYNC: LIVE
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Zap size={14} className="text-amber-400" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                            SYNC LATENCY: 4MS
                        </span>
                    </div>
                    <div className="ml-auto">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                            TIME: {format(new Date(), 'HH:mm:ss')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8 mb-10 sm:mb-16 px-1">
                <div 
                    className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 cursor-pointer"
                    onClick={() => {
                        resetFilters();
                        setFilters({ dateRange: 'upcoming' });
                        navigate('/events');
                    }}
                >
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full transition-all group-hover:scale-110" />
                    <div className="flex items-center justify-between mb-4 sm:mb-8 relative z-10">
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                            <Calendar className="text-indigo-600 dark:text-indigo-400 w-7 h-7" />
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                            <TrendingUp size={10} />
                            +4%
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">UPCOMING EVENTS</h3>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.upcomingCount}</p>
                    </div>
                </div>

                <div 
                    className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 cursor-pointer"
                    onClick={() => {
                        resetFilters();
                        setFilters({ dateRange: 'today' });
                        navigate('/events');
                    }}
                >
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-rose-50 dark:bg-rose-900/10 rounded-full transition-all group-hover:scale-110" />
                    <div className="flex items-center justify-between mb-4 sm:mb-8 relative z-10">
                        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center">
                            <Bell className="text-rose-500 dark:text-rose-400 w-7 h-7" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">DEADLINES TODAY</h3>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {events.filter(e => matchesDateRange(e, 'today')).length}
                        </p>
                    </div>
                </div>

                <div 
                    className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 cursor-pointer"
                    onClick={() => {
                        resetFilters();
                        setFilters({ dateRange: 'week' });
                        navigate('/events');
                    }}
                >
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-full transition-all group-hover:scale-110" />
                    <div className="flex items-center justify-between mb-4 sm:mb-8 relative z-10">
                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                            <Target className="text-emerald-500 dark:text-emerald-400 w-7 h-7" />
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                            NEW
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">EVENTS THIS WEEK</h3>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {events.filter(e => matchesDateRange(e, 'week')).length}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 cursor-pointer" onClick={() => navigate('/analytics')}>
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-amber-50 dark:bg-amber-900/10 rounded-full transition-all group-hover:scale-110" />
                    <div className="flex items-center justify-between mb-4 sm:mb-8 relative z-10">
                        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                            <Trophy className="text-amber-500 dark:text-amber-400 w-7 h-7" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">TOTAL PRIZE POOL</h3>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {stats.totalPrize > 0 ? `₹${(stats.totalPrize / 1000).toFixed(0)}K` : '₹280K'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-12">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Tactical Queue */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{displayEventsData.title} <span className="text-indigo-600">{displayEventsData.subtitle}</span></h2>
                        </div>
                        <Link to="/events" className="z-10 text-xs font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-2 group cursor-pointer p-2 -m-2">
                            View All Events
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="space-y-6">
                        {displayEventsData.list.length > 0 ? (
                            displayEventsData.list.map((event, idx) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + idx * 0.1 }}
                                >
                                    <EventCard event={event} />
                                </motion.div>
                            ))
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl sm:rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-10 sm:p-20 text-center">
                                <Shield size={48} className="mx-auto text-slate-200 mb-6" />
                                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest leading-none mb-2">No Priority Events</h3>
                                <p className="text-slate-400 text-xs font-bold">Scanning for new opportunities...</p>
                            </div>
                        )}
                    </div>

                    {/* Tactical Unit (Team Members) */}
                    <div className="relative group pt-8">
                        <div className="absolute inset-0 bg-indigo-600 rounded-[2.5rem] blur-[30px] opacity-10 group-hover:opacity-20 transition-opacity" />
                        <div className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2.5rem] border border-indigo-600/20 overflow-hidden shadow-2xl p-5 sm:p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 uppercase tracking-tighter">
                                    <Users size={24} className="text-indigo-600" />
                                    Tactical Unit
                                </h3>
                                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">
                                    {teamMembers.length || 1} OPERATIVE(S)
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {teamMembers.length > 0 ? teamMembers.map((member, idx) => (
                                    <div key={member.id || idx} className="group/member flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-600 overflow-hidden flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">
                                            {member.photoURL ? (
                                                <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                                            ) : (
                                                (member.displayName || 'OP').substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-wider">{member.displayName || 'Unknown Unit'}</p>
                                                {member.id === teamId && <Crown size={12} className="text-amber-500" title="Team Leader" />}
                                                {member.id === user.uid && <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-[8px] font-black text-indigo-600 uppercase">You</span>}
                                            </div>
                                            
                                            {editingMember === member.id ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input 
                                                        autoFocus
                                                        value={newPosition}
                                                        onChange={(e) => setNewPosition(e.target.value)}
                                                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-[10px] font-bold text-slate-900 dark:text-white"
                                                    />
                                                    <button onClick={() => handleUpdatePosition(member.id)} className="p-1 px-1.5 bg-indigo-600 text-white rounded text-[10px] font-black"><Check size={10} /></button>
                                                    <button onClick={() => setEditingMember(null)} className="p-1 px-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-[10px] font-black"><X size={10} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">{member.position || 'Explorer'}</p>
                                                    {user.uid === teamId && (
                                                        <button 
                                                            onClick={() => { setEditingMember(member.id); setNewPosition(member.position || 'Explorer'); }}
                                                            className="opacity-0 group-hover/member:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        No secondary units deployed.
                                    </div>
                                )}
                            </div>

                                <div className="space-y-4 mt-6">
                                    {teamId && teamId !== user.uid ? (
                                        /* Team Member View: Leave Option */
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button 
                                                onClick={handleLeaveTeam}
                                                className="flex-1 py-4 bg-rose-50 dark:bg-rose-900/40 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-800"
                                            >
                                                <LogOut size={14} /> Leave Team
                                            </button>
                                            <button 
                                                onClick={() => setIsChatOpen(!isChatOpen)}
                                                className={cn(
                                                    "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                                                    isChatOpen 
                                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-indigo-600" 
                                                        : "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 hover:bg-indigo-100 border-indigo-100 dark:border-indigo-800"
                                                )}
                                            >
                                                <MessageSquare size={14} /> Team Intel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {(userRole === 'subscriber' || userRole === 'team_leader' || userRole === 'admin') ? (
                                                /* Team Leader View: Manage & Intel */
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <button 
                                                        onClick={() => openModal('teamInvite')}
                                                        className="relative w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 border border-slate-800"
                                                    >
                                                        <Crown size={14} className="text-amber-500" /> Manage
                                                        {teamRequests.length > 0 && (
                                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                                                                {teamRequests.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => openModal('teamInvite')}
                                                        className="w-full py-4 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border border-indigo-100 dark:border-indigo-800"
                                                    >
                                                        <Plus size={14} /> Invite
                                                    </button>
                                                    <button 
                                                        onClick={() => setIsChatOpen(!isChatOpen)}
                                                        className={cn(
                                                            "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                                                            isChatOpen 
                                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-indigo-600" 
                                                                : "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 hover:bg-indigo-100 border-indigo-100 dark:border-indigo-800"
                                                        )}
                                                    >
                                                        <MessageSquare size={14} /> Intel
                                                    </button>
                                                </div>
                                            ) : null}

                                            {/* Join Input: Visible for everyone in their own workspace */}
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Users size={12} /> {userRole === 'public' ? 'Join a Tactical Unit' : 'Infil Another Unit'}
                                                    </h4>
                                                    <button 
                                                        onClick={() => {
                                                            const id = window.prompt("Enter Team ID/Code to join:");
                                                            if (id) navigate(`/invite/${id}`);
                                                        }}
                                                        className="text-[8px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                                    >
                                                        Manual Join
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input 
                                                        id="join-team-input"
                                                        type="text" 
                                                        placeholder="Invite Code (e.g. AB12XY78)..."
                                                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = e.target.value.trim();
                                                                if (val) navigate(`/invite/${val}`);
                                                            }
                                                        }}
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const val = document.getElementById('join-team-input').value.trim();
                                                            if (val) navigate(`/invite/${val}`);
                                                        }}
                                                        className="px-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-indigo-600/20"
                                                    >
                                                        Join Team
                                                    </button>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 mt-3 flex items-center gap-1">
                                                    <Sparkles size={10} className="text-amber-500" /> 
                                                    {userRole === 'public' ? "Join a leader's workspace." : "Switch from your current workspace to another."}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            {/* Team Messenger Section */}
                            <AnimatePresence>
                                {isChatOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mt-6 pt-6 border-t border-indigo-600/10 overflow-hidden"
                                    >
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex flex-col h-[300px]">
                                            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
                                                {messages.length > 0 ? messages.map((msg, i) => (
                                                    <div key={msg.id || i} className={cn("flex flex-col", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{msg.senderName || 'Unknown'}</span>
                                                            <span className="text-[7px] text-slate-500">{format(new Date(msg.timestamp), 'HH:mm')}</span>
                                                        </div>
                                                        <div 
                                                            className={cn(
                                                                "px-4 py-2 rounded-2xl text-xs font-bold max-w-[85%] break-words",
                                                                msg.senderId === user?.uid ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-tl-none shadow-sm"
                                                            )}
                                                            dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                                                        />
                                                    </div>
                                                )) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                                                        <MessageSquare size={32} className="text-slate-200 mb-2" />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No intel decoded yet.</p>
                                                    </div>
                                                )}
                                                <div ref={msgEndRef} />
                                            </div>
                                            
                                            <form onSubmit={handleSendMessage} className="relative">
                                                <input 
                                                    type="text"
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    placeholder="Send tactical intel..."
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white pr-12 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                                />
                                                <button 
                                                    type="submit"
                                                    className="absolute right-2 top-1.5 w-9 h-9 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                                                >
                                                    <Send size={14} strokeWidth={3} />
                                                </button>
                                            </form>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Critical Alert Module */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-amber-500 rounded-[2.5rem] blur-[30px] opacity-10 group-hover:opacity-20 transition-opacity" />
                        <div className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2.5rem] border border-amber-500/20 overflow-hidden shadow-2xl">
                            <div className="p-5 sm:p-8 pb-4">
                                <div className="flex items-center justify-between mb-4 sm:mb-8">
                                    <h3 className="text-xl font-black text-amber-600 flex items-center gap-3">
                                        <Clock size={24} strokeWidth={3} className="animate-pulse" />
                                        CRITICAL
                                    </h3>
                                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-amber-200">
                                        {criticalDeadlines.length} ALERT(S)
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {criticalDeadlines.slice(0, 4).map((event, idx) => {
                                            const days = differenceInDays(startOfDay(new Date(event.registrationDeadline)), startOfDay(new Date()));
                                            return (
                                                <motion.div
                                                    key={event.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.8 + idx * 0.1 }}
                                                    onClick={() => { setSelectedEvent(event.id); openModal('eventDetails'); }}
                                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:scale-[1.02] transition-transform cursor-pointer"
                                                >
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm border shadow-sm",
                                                        days === 0 ? "bg-amber-600 text-white border-amber-600" : "bg-white dark:bg-slate-900 text-amber-600 border-amber-100"
                                                    )}>
                                                        {days === 0 ? '!' : days}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-wider">{event.eventName}</h4>
                                                        <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">{event.collegeName}</p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                            <div className="p-5 sm:p-8 pt-4 sm:pt-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => navigate('/events')}
                                        className="flex-1 px-4 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Check Live Status
                                    </button>
                                    <button
                                        onClick={() => navigate('/analytics')}
                                        className="flex-1 px-4 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Analyze Risk
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Integrity Module */}
                    <div className="bg-slate-900 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                            <Shield size={120} />
                        </div>
                        <h3 className="text-xl font-black mb-8 relative z-10 flex items-center gap-3">
                            <Sparkles size={20} className="text-indigo-400" />
                            Grid Integrity
                        </h3>
                        <div className="space-y-6 relative z-10">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Core Synchronization</span>
                                    <span className="text-indigo-400">98.4%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '98.4%' }}
                                        transition={{ duration: 1.5, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Active Nodes</span>
                                    <span className="text-xl font-black">{events.length}</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">XP Gathered</span>
                                    <span className="text-xl font-black text-amber-500">{(events.filter(e => e.status === 'Won').length * 1500 + events.filter(e => e.status === 'Attended').length * 500).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default React.memo(Dashboard);
