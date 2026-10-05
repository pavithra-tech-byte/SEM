import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Calendar, 
    Bell, Shield, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Search, 
    Filter, 
    MoreVertical, 
    UserPlus, 
    Trash2, 
    Edit2, 
    Plus, 
    Trophy,
    ArrowRight,
    Loader2,
    Zap,
    CreditCard,
    Eye,
    X,
    Smartphone,
    Mail,
    Building2,
    MapPin,
    BookOpen
} from 'lucide-react';
import { useAppStore } from '../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getMergedEvents } from '../db';
import { 
    getAllUsers, 
    updateUserRole, 
    subscribeToPaymentRequests, 
    approvePaymentRequest, 
    rejectPaymentRequest,
    deleteEventFromFirestore,
    deleteUserData,
    getTeamMembers,
    subscribeToTeamRequests,
    auth,
    approveJoinTeam,
    rejectJoinTeam
} from '../services/firebase';
import { format } from 'date-fns';
import { cn } from '../utils';

const AdminPanel = () => {
    const userRole = useAppStore((state) => state.userRole);
    const isRoleVerified = useAppStore((state) => state.isRoleVerified);
    const openModal = useAppStore((state) => state.openModal);
    const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);

    const [activeTab, setActiveTab] = useState('events'); // 'events', 'users', 'payments'
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    
    // Data states
    const [users, setUsers] = useState([]);
    const [payments, setPayments] = useState([]);
    const [teamRequests, setTeamRequests] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const teamId = useAppStore((state) => state.teamId);
    const localEvents = useLiveQuery(async () => {
        return await getMergedEvents();
    }, [teamId]) || [];

    // Security Check
    if (!isRoleVerified || (userRole !== 'admin' && userRole !== 'event_manager')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center text-rose-500 mb-6 border-2 border-rose-100 dark:border-rose-800 animate-pulse">
                    <Shield size={40} />
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Access Denied</h1>
                <p className="text-slate-500 font-bold max-w-sm">This sector is reserved for Administrative Intelligence. Redirecting unauthorized units...</p>
            </div>
        );
    }

    useEffect(() => {
        let unsubscribePayments = () => {};

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const allUsers = await getAllUsers();
                setUsers(allUsers);
                
                unsubscribePayments = subscribeToPaymentRequests((allPayments) => {
                    setPayments(allPayments);
                });
            } catch (err) {
                console.error("Failed to fetch admin data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (activeTab === 'users' || activeTab === 'payments') {
            fetchData();
        } else if (activeTab === 'members') {
            const loadMembers = async () => {
                setIsLoading(true);
                try {
                    if (auth?.currentUser) {
                        const members = await getTeamMembers(auth.currentUser.uid);
                        setTeamMembers(members);
                        unsubscribePayments = subscribeToTeamRequests(auth.currentUser.uid, setTeamRequests) || (() => {});
                    }
                } catch (err) {
                    console.error('Failed to load team data:', err);
                } finally {
                    setIsLoading(false);
                }
            };
            loadMembers();
        } else {
            setIsLoading(false);
        }

        return () => unsubscribePayments();
    }, [activeTab]);

    const handleRoleUpdate = async (uid, newRole) => {
        try {
            await updateUserRole(uid, newRole);
            setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error("Role update failed:", err);
        }
    };

    const handlePaymentAction = async (request, action) => {
        try {
            if (action === 'approve') {
                const roleToAssign = request.planRole || 'subscriber';
                await approvePaymentRequest(request.id, request.userId, roleToAssign);
                setUsers(prev => prev.map(u => u.id === request.userId ? { ...u, role: roleToAssign } : u));
            } else {
                await rejectPaymentRequest(request.id, request.userId);
                setUsers(prev => prev.map(u => u.id === request.userId ? { ...u, role: 'public' } : u));
            }
        } catch (err) {
            console.error("Payment action failed:", err);
        }
    };

    const handleDeleteEvent = async (event) => {
        if (!window.confirm(`Are you sure you want to permanently delete event: ${event.eventName}?`)) return;
        
        try {
            // Delete from local DB
            await db.events.delete(event.id);
            // Delete from Firestore if serverId exists
            if (event.serverId) {
                await deleteEventFromFirestore(event.serverId);
            }
        } catch (err) {
            console.error("Failed to delete event:", err);
        }
    };

    const handleDeleteUser = async (userObj) => {
        if (!window.confirm(`Are you sure you want to permanently delete user: ${userObj.displayName || userObj.email}?`)) return;
        try {
            await deleteUserData(userObj.id);
            setUsers(prev => prev.filter(u => u.id !== userObj.id));
        } catch (err) {
            console.error("Failed to delete user:", err);
            alert("Failed to delete. Ensure you have permissions.");
        }
    };

    const handleTeamRequestAction = async (req, action) => {
        try {
            if (action === 'approve') {
                await approveJoinTeam(req.id, req.userId, req.teamId);
                setTeamRequests(prev => prev.filter(r => r.id !== req.id));
            } else {
                await rejectJoinTeam(req.id);
                setTeamRequests(prev => prev.filter(r => r.id !== req.id));
            }
        } catch (err) {
            console.error('Team request action failed:', err);
        }
    };

    const tabs = [
        { id: 'events', label: 'Matrix Control', icon: Calendar, description: 'Manage global events & data streams' },
        { id: 'users', label: 'Unit Directory', icon: Users, description: 'User roles & system permissions' },
        { id: 'payments', label: 'Financial Grid', icon: CreditCard, description: 'Manual verification & subscriptions' },
        { id: 'members', label: 'Team Network', icon: Users, description: 'Members, join requests & team stats' }
    ];

    return (
        <div className="pb-32 pt-4 sm:pt-8">
            {/* Admin Banner */}
            <div className="relative mb-8 sm:mb-12 overflow-hidden bg-slate-900 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-12 shadow-2xl border border-white/5 group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-indigo-400 mb-4 sm:mb-6 border border-white/10">
                            <Shield size={12} /> ADMIN PANEL
                        </div>
                        <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tighter leading-none mb-3 sm:mb-4">
                            Operational <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Command</span>
                        </h1>
                        <p className="text-slate-400 font-bold max-w-xl text-xs sm:text-sm leading-relaxed hidden sm:block">
                            Welcome, Founder. Manage the global event matrix, verify personnel credentials, and monitor system-wide transaction logs from this interface.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-4">
                        <div className="px-3 sm:px-6 py-3 sm:py-4 bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 text-center flex-1 sm:flex-none sm:min-w-[120px]">
                            <span className="block text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Events</span>
                            <span className="text-lg sm:text-2xl font-black text-white">{(localEvents || []).length}</span>
                        </div>
                        <div className="px-3 sm:px-6 py-3 sm:py-4 bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 text-center flex-1 sm:flex-none sm:min-w-[120px]">
                            <span className="block text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Units</span>
                            <span className="text-lg sm:text-2xl font-black text-indigo-400">{users.length || '--'}</span>
                        </div>
                        <div className="px-3 sm:px-6 py-3 sm:py-4 bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 text-center flex-1 sm:flex-none sm:min-w-[120px]">
                            <span className="block text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Teams</span>
                            <span className="text-lg sm:text-2xl font-black text-emerald-400">{new Set((users || []).map(u => u.teamId).filter(Boolean)).size || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-8 sm:mb-12">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border-2 transition-all group overflow-hidden text-left",
                                isActive 
                                    ? "bg-white dark:bg-slate-900 border-indigo-600 shadow-xl" 
                                    : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-slate-300"
                            )}
                        >
                            {isActive && <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full translate-x-1/2 -translate-y-1/2" />}
                            <div className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-6 transition-transform group-hover:scale-110",
                                isActive ? "bg-indigo-600 text-white shadow-lg" : "bg-white dark:bg-slate-800 text-slate-400"
                            )}>
                                <Icon size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <h3 className={cn("text-xs sm:text-lg font-black uppercase tracking-tighter mb-1", isActive ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                                {tab.label}
                            </h3>
                            <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">{tab.description}</p>
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px] sm:min-h-[500px]">
                {/* Search Bar / Actions */}
                <div className="p-4 sm:p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search directory..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-600 transition-all"
                        />
                    </div>
                    
                    {activeTab === 'users' && (
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-6 py-4 outline-none font-black text-[10px] uppercase tracking-widest border-2 border-transparent focus:border-indigo-600 transition-all text-slate-600 dark:text-slate-300 min-w-[160px]"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Administrators</option>
                            <option value="event_manager">Event Managers</option>
                            <option value="subscriber">Subscribers</option>
                            <option value="public">Public Agents</option>
                        </select>
                    )}

                    {activeTab === 'events' && (
                        <button 
                            onClick={() => openModal('addEvent')}
                            className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-3"
                        >
                            <Plus size={18} strokeWidth={3} /> Inject Global Event
                        </button>
                    )}
                </div>

                <div className="p-0 sm:p-2">
                    {isLoading ? (
                        <div className="py-40 text-center">
                            <Loader2 size={40} className="mx-auto text-indigo-600 animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Matrix Data...</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-8"
                            >
                                {activeTab === 'events' && (
                                    <div className="space-y-4">
                                        <div className="hidden sm:grid grid-cols-12 gap-6 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                                            <div className="col-span-6">Event Identity</div>
                                            <div className="col-span-3">Status</div>
                                            <div className="col-span-1 text-center">Priority</div>
                                            <div className="col-span-2 text-right">Actions</div>
                                        </div>
                                        {localEvents.filter(e => e.eventName.toLowerCase().includes(searchQuery.toLowerCase())).map(event => (
                                            <div key={event.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 items-center px-6 py-5 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                                                <div className="col-span-1 sm:col-span-6 flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <Calendar size={20} className="text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter sm:text-lg">{event.eventName}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{event.collegeName}</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-1 sm:col-span-3">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                        event.status === 'Open' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                        event.status === 'Closed' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                    )}>
                                                        {event.status || 'ACTIVE'}
                                                    </span>
                                                </div>
                                                <div className="col-span-1 sm:col-span-1 flex justify-center">
                                                    <div className="w-10 h-10 rounded-xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center font-black text-xs text-slate-900 dark:text-white">
                                                        {event.priorityScore}
                                                    </div>
                                                </div>
                                                <div className="col-span-1 sm:col-span-2 flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => { setSelectedEvent(event.id); openModal('editEvent'); }}
                                                        className="w-10 h-10 bg-white dark:bg-slate-900 text-slate-400 hover:text-indigo-600 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteEvent(event)}
                                                        className="w-10 h-10 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center border border-rose-100 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'users' && (
                                    <div className="space-y-4">
                                        {users
                                            .filter(u => roleFilter === 'all' || u.role === roleFilter)
                                            .filter(u => u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map(u => (
                                            <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-lg shadow-inner">
                                                        {u.photoURL ? <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" /> : (u.displayName || 'U').substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{u.displayName || 'System Unit'}</h4>
                                                        <p className="text-xs font-bold text-slate-400">{u.email}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={cn(
                                                                "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border",
                                                                u.role === 'admin' ? "bg-rose-50 border-rose-100 text-rose-600" :
                                                                u.role === 'event_manager' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                                                u.role === 'subscriber' ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
                                                                u.role === 'team_leader' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                                                                "bg-slate-100 border-slate-200 text-slate-500"
                                                            )}>{u.role}</span>
                                                            {u.teamId && (
                                                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-100">In Team</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                    <button 
                                                        onClick={() => setSelectedUser(u)}
                                                        className="h-9 sm:h-10 px-3 sm:px-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 hover:border-indigo-600 hover:text-indigo-600 transition-all"
                                                    >
                                                        <Eye size={14} /> View
                                                    </button>
                                                    <select 
                                                        value={u.role} 
                                                        onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                                                        className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-600 h-9 sm:h-10"
                                                    >
                                                        <option value="public">Public</option>
                                                        <option value="subscriber">Subscriber</option>
                                                        <option value="event_manager">Event Manager</option>
                                                        <option value="admin">Administrator</option>
                                                    </select>
                                                    <button 
                                                        onClick={() => handleDeleteUser(u)}
                                                        className="h-9 sm:h-10 px-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-rose-100"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'payments' && (
                                    <div className="space-y-6">
                                        {payments.length === 0 && (
                                            <div className="py-20 text-center opacity-40">
                                                <CreditCard size={48} className="mx-auto mb-4" />
                                                <p className="font-black uppercase tracking-widest text-[10px]">No pending financial requests.</p>
                                            </div>
                                        )}
                                        {payments.map(req => (
                                            <div key={req.id} className="p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                                                <div className="flex flex-col lg:flex-row justify-between gap-4 sm:gap-8">
                                                    <div className="space-y-4 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending Verification</span>
                                                        </div>
                                                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                                                            {req.userName} requested <span className="text-indigo-600">{req.planName}</span>
                                                        </h4>
                                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                                                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden text-ellipsis">
                                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 shadow-sm">Transaction ID / Ref</span>
                                                                <span className="text-xs font-bold text-indigo-600 truncate block">{req.transactionId || 'N/A'}</span>
                                                            </div>
                                                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden text-ellipsis">
                                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">User UPI / App</span>
                                                                <span className="text-xs font-bold text-slate-500 truncate block">{req.userUpiId || 'Not Provided'}</span>
                                                            </div>
                                                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden text-ellipsis">
                                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Request Intelligence</span>
                                                                <span className="text-xs font-bold text-slate-500">UID: {req.userId?.substring(0, 10)}...</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-row lg:flex-col justify-end gap-3 min-w-[200px]">
                                                        {req.status === 'pending' ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => handlePaymentAction(req, 'approve')}
                                                                    className="flex-1 lg:flex-none py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg"
                                                                >
                                                                    <CheckCircle2 size={16} /> Approve
                                                                </button>
                                                                <button 
                                                                    onClick={() => handlePaymentAction(req, 'reject')}
                                                                    className="flex-1 lg:flex-none py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 transition-all border border-rose-100"
                                                                >
                                                                    <XCircle size={16} /> Reject
                                                                </button>
                                                            </>
                                                        ) : req.status === 'approved' ? (
                                                            <>
                                                                <div className="py-4 rounded-2xl text-center font-black text-[10px] uppercase tracking-[0.2em] border bg-emerald-50 text-emerald-600 border-emerald-200">
                                                                    APPROVED
                                                                </div>
                                                                <button 
                                                                    onClick={() => handlePaymentAction(req, 'reject')}
                                                                    className="py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 transition-all border border-rose-100"
                                                                >
                                                                    <XCircle size={16} /> Revert
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="py-4 rounded-2xl text-center font-black text-[10px] uppercase tracking-[0.2em] border bg-rose-50 text-rose-600 border-rose-200">
                                                                {req.status?.toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* User Inspection Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative"
                        >
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-all z-10"
                            >
                                <X size={20} />
                            </button>

                            <div className="relative h-32 bg-indigo-600 overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                            </div>

                            <div className="px-8 pb-8 -mt-16 relative">
                                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2rem] p-2 shadow-xl mb-6 flex-shrink-0">
                                    <div className="w-full h-full bg-indigo-100 text-indigo-600 rounded-[1.5rem] flex items-center justify-center text-4xl font-black overflow-hidden relative">
                                        {selectedUser.photoURL ? <img src={selectedUser.photoURL} alt="Profile" className="w-full h-full object-cover" /> : (selectedUser.displayName || 'U').substring(0, 1).toUpperCase()}
                                    </div>
                                </div>

                                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-1">
                                    {selectedUser.displayName || 'Unnamed Protocol'}
                                </h2>
                                <p className="text-slate-500 font-bold mb-8">{selectedUser.email}</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400"><Smartphone size={16} /></div>
                                            <div>
                                                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest">Mobile Link</span>
                                                <span className="font-bold text-slate-700 text-sm">{selectedUser.mobile || '--'}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-400 shadow-sm"><Trophy size={16} /></div>
                                            <div>
                                                <span className="block text-[8px] font-black uppercase text-indigo-400 tracking-widest">Network XP</span>
                                                <span className="font-black text-indigo-700 text-lg leading-none">{selectedUser.persistentStats?.totalXP?.toLocaleString() || '0'} XP</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm"><Calendar size={16} /></div>
                                            <div>
                                                <span className="block text-[8px] font-black uppercase text-emerald-500 tracking-widest">Missions (Won/Total)</span>
                                                <span className="font-bold text-emerald-700 text-sm leading-none">{selectedUser.persistentStats?.winCount || 0} / {selectedUser.persistentStats?.totalEvents || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400"><MapPin size={16} /></div>
                                            <div>
                                                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest">Locality</span>
                                                <span className="font-bold text-slate-700 text-sm">{selectedUser.locality || '--'}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-sm"><CreditCard size={16} /></div>
                                            <div>
                                                <span className="block text-[8px] font-black uppercase text-amber-500 tracking-widest">Total Prizes Won</span>
                                                <span className="font-bold text-amber-700 text-sm">₹{selectedUser.persistentStats?.totalPrize?.toLocaleString() || '0'}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400"><Users size={16} /></div>
                                            <div>
                                                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest">Team Network</span>
                                                <span className="font-bold text-slate-700 text-xs truncate max-w-[150px] block">{selectedUser.teamId || 'Lone Wolf'}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400"><Clock size={16} /></div>
                                            <div>
                                                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest">Enrolled Date</span>
                                                <span className="font-bold text-slate-700 text-sm">{selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '--'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminPanel;
