import React, { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db, EventType, EventStatus, getAllEvents, getMergedEvents } from '../db';
import { useAppStore } from '../store';
import EventCard from './EventCard';
import { Search, Filter, SortDesc, SlidersHorizontal, ArrowUpDown, Table as TableIcon, LayoutGrid, FileSpreadsheet, ChevronRight, MapPin, Calendar, Clock, Trophy, Zap, ArrowUp, Heart, Terminal, Cpu, Database, Binary, Shield, ExternalLink, Globe } from 'lucide-react';
import { cn, matchesDateRange } from '../utils';
import { format, isSameDay } from 'date-fns';
import { exportToCSV, downloadCSV } from '../csvUtils';

// Safe Date Formatter
const safeFormat = (date, formatStr) => {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'TBD';
        return format(d, formatStr);
    } catch (e) {
        return 'TBD';
    }
};

const TableView = React.memo(({ events }) => {
    const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);
    const openModal = useAppStore((state) => state.openModal);

    const handleRowClick = useCallback((id) => {
        setSelectedEvent(id);
        openModal('eventDetails');
    }, [setSelectedEvent, openModal]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Event Name</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">College</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Deadline</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Priority</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Prize</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Links</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((event) => (
                            <tr
                                key={event.id}
                                onClick={() => handleRowClick(event.id)}
                                className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group"
                            >
                                <td className="px-8 py-6">
                                    <div className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-base">{event.eventName}</div>
                                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2 mt-1 uppercase tracking-widest opacity-60">
                                        <MapPin size={12} className="text-rose-500" /> {event.location || 'GLOBAL_CLOUD'}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{event.collegeName}</td>
                                <td className="px-8 py-6">
                                    <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 shadow-sm">
                                        {Array.isArray(event.eventType) ? event.eventType.join(' • ') : event.eventType}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">
                                        {safeFormat(event.registrationDeadline, 'dd MMM yyyy')}
                                    </div>
                                    <div className={cn(
                                        "text-[9px] font-black mt-1 uppercase tracking-widest",
                                        (event.status || '').toLowerCase().includes('today') ? "text-rose-500 animate-pulse" : "text-slate-400"
                                    )}>
                                        {event.status || 'STABLE'}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className={cn(
                                        "inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm border-2 shadow-sm",
                                        event.priorityScore >= 70 ? "bg-rose-50 border-rose-100 text-rose-600" : event.priorityScore >= 40 ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                                    )}>
                                        {event.priorityScore}
                                    </div>
                                </td>
                                <td className="px-8 py-6 font-black text-emerald-600 dark:text-emerald-400 text-base tabular-nums">
                                    {(parseFloat(event.prizeAmount) || 0) > 0 ? `₹${Number(event.prizeAmount).toLocaleString()}` : '---'}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex gap-2 no-click" onClick={(e) => e.stopPropagation()}>
                                        {event.registrationLink && (
                                            <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Registration Form">
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                        {event.website && (
                                            <a href={event.website} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-200 hover:text-slate-600 transition-all shadow-sm" title="Official Website">
                                                <Globe size={14} />
                                            </a>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all border border-transparent group-hover:border-indigo-100">
                                        <ChevronRight size={20} strokeWidth={3} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

const EventList = () => {
    const filters = useAppStore((state) => state.filters);
    const setFilters = useAppStore((state) => state.setFilters);
    const sortBy = useAppStore((state) => state.sortBy);
    const sortOrder = useAppStore((state) => state.sortOrder);
    const setSorting = useAppStore((state) => state.setSorting);
    const viewMode = useAppStore((state) => state.viewMode);
    const setViewMode = useAppStore((state) => state.setViewMode);
    const userRole = useAppStore((state) => state.userRole);
    const openPaymentModal = () => useAppStore.getState().openModal('payment');

    const [showScrollTop, setShowScrollTop] = useState(false);

    // --- Performance Optimizations ---
    const [localSearch, setLocalSearch] = useState(filters.search || '');
    const [page, setPage] = useState(1);
    const itemsPerPage = 12;

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (filters.search !== localSearch) {
                setFilters({ search: localSearch });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localSearch, filters.search, setFilters]);

    // Handle global filter clear
    useEffect(() => {
        if (filters.search === '' && localSearch !== '') {
            setLocalSearch('');
        }
    }, [filters.search]);

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
    }, [filters, sortBy, sortOrder]);
    useEffect(() => {
        const debounce = (fn, delay) => {
            let timer;
            return () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    fn();
                }, delay);
            };
        };
        const handleScroll = debounce(() => setShowScrollTop(window.scrollY > 300), 200);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const events = useLiveQuery(async () => {
        return await getMergedEvents();
    }, [filters.showShortlisted]); 

    const filteredEvents = useMemo(() => {
        if (!events) return [];
        let filtered = [...events];
        const f = filters;

        if (f.status !== 'all') {
            if (f.status === 'participated') {
                filtered = filtered.filter(e => ['Attended', 'Won', 'Registered'].includes(e.status));
            } else {
                filtered = filtered.filter(e => e.status === f.status);
            }
        }
        if (f.eventType !== 'all') {
            filtered = filtered.filter(e => {
                const types = Array.isArray(e.eventType) ? e.eventType : [e.eventType];
                return types.includes(f.eventType);
            });
        }
        if (f.search) {
            const q = f.search.toLowerCase();
            filtered = filtered.filter(e =>
                (e.eventName || '').toLowerCase().includes(q) ||
                (e.collegeName || '').toLowerCase().includes(q) ||
                (e.location || '').toLowerCase().includes(q) ||
                (Array.isArray(e.eventType) ? e.eventType.join(' ') : (e.eventType || '')).toLowerCase().includes(q) ||
                (e.description || '').toLowerCase().includes(q)
            );
        }
        if (f.showShortlisted) filtered = filtered.filter(e => e.isShortlisted);

        if (f.dateRange && f.dateRange !== 'all') {
            const now = new Date();
            filtered = filtered.filter(e => matchesDateRange(e, f.dateRange, now));
        }

        // Custom Date Range Filter (dateFrom / dateTo)
        if (f.dateFrom) {
            const fromDate = new Date(f.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(e => {
                const deadline = new Date(e.registrationDeadline);
                const start = new Date(e.startDate);
                return (!isNaN(deadline.getTime()) && deadline >= fromDate) || (!isNaN(start.getTime()) && start >= fromDate);
            });
        }
        if (f.dateTo) {
            const toDate = new Date(f.dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(e => {
                const deadline = new Date(e.registrationDeadline);
                const start = new Date(e.startDate);
                return (!isNaN(deadline.getTime()) && deadline <= toDate) || (!isNaN(start.getTime()) && start <= toDate);
            });
        }

        if (f.prizeRange && f.prizeRange !== 'all') {
            filtered = filtered.filter(e => {
                const prize = parseFloat(e.prizeAmount) || 0;
                if (f.prizeRange === 'free') return prize === 0;
                if (f.prizeRange === 'small') return prize > 0 && prize < 10000;
                if (f.prizeRange === 'medium') return prize >= 10000 && prize < 50000;
                if (f.prizeRange === 'large') return prize >= 50000;
                return true;
            });
        }

        filtered.sort((a, b) => {
            let res = 0;
            if (sortBy === 'priorityScore') res = (b.priorityScore || 0) - (a.priorityScore || 0);
            else if (sortBy === 'prizeAmount') res = (parseFloat(b.prizeAmount) || 0) - (parseFloat(a.prizeAmount) || 0);
            else if (sortBy === 'deadline' || sortBy === 'startDate') {
                res = new Date(a[sortBy]) - new Date(b[sortBy]);
            }
            return sortOrder === 'desc' ? res : -res;
        });
        return filtered;
    }, [events, filters, sortBy, sortOrder]);

    if (!events) return <div className="py-20 text-center animate-pulse"><div className="w-12 h-12 bg-indigo-500 rounded-full mx-auto mb-4" /></div>;

    return (
        <div className="pb-32">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-4 border border-indigo-100 dark:border-indigo-900/50">
                        <Binary size={12} /> System Status: Online
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        Event <span className="text-indigo-600">Inventory</span>
                    </h1>
                    <p className="text-slate-500 font-bold mt-2 max-w-xl">Manage and track all college events in one place.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            const data = await getAllEvents();
                            downloadCSV(exportToCSV(data), `grid-export-${Date.now()}.csv`);
                        }}
                        className="px-6 h-14 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <FileSpreadsheet size={18} /> Export CSV
                    </button>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800">
                        <button onClick={() => setViewMode('cards')} className={cn("w-11 h-11 flex items-center justify-center rounded-xl transition-all", viewMode === 'cards' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-md" : "text-slate-400")}><LayoutGrid size={20} /></button>
                        <button onClick={() => setViewMode('table')} className={cn("w-11 h-11 flex items-center justify-center rounded-xl transition-all", viewMode === 'table' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-md" : "text-slate-400")}><TableIcon size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Tactical Search & Filters */}
            <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 mb-12 border border-slate-100 dark:border-slate-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] overflow-hidden">
                {userRole === 'public' && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-4">
                            <Shield size={32} />
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Team Edition Required</h3>
                        <p className="text-xs font-bold text-slate-500 mb-6 max-w-md">Advanced filtering, smart sorting, and priority scoring are reserved for Team Edition members. Upgrade to unlock.</p>
                        <button onClick={openPaymentModal} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:scale-105 relative z-20 cursor-pointer">
                            Upgrade to Team Edition
                        </button>
                    </div>
                )}

                <div className={cn(userRole === 'public' && "opacity-30 blur-sm pointer-events-none")}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative group lg:col-span-2">
                            <div className="absolute inset-y-0 left-6 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Terminal size={20} strokeWidth={3} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by Event Name, College, or Location..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-2xl outline-none font-black text-sm tracking-tight text-slate-900 dark:text-white transition-all shadow-inner"
                            />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:col-span-2">
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ status: e.target.value })}
                                className="bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 rounded-2xl px-6 py-5 outline-none font-black text-[10px] uppercase tracking-widest text-slate-500 appearance-none shadow-inner"
                            >
                                <option value="all">Every Status</option>
                                {Object.values(EventStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                value={filters.eventType}
                                onChange={(e) => setFilters({ eventType: e.target.value })}
                                className="bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 rounded-2xl px-6 py-5 outline-none font-black text-[10px] uppercase tracking-widest text-slate-500 appearance-none shadow-inner"
                            >
                                <option value="all">Every Category</option>
                                {Object.values(EventType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button
                                onClick={() => setFilters({ showShortlisted: !filters.showShortlisted })}
                                className={cn("flex items-center justify-center gap-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 h-full", filters.showShortlisted ? "bg-rose-600 text-white border-rose-600 shadow-xl shadow-rose-500/20" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400")}
                            >
                                <Heart size={14} fill={filters.showShortlisted ? "currentColor" : "none"} /> Shortlisted
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800/50 flex flex-col gap-6">
                        {/* Top Filters Row */}
                        <div className="flex flex-wrap items-center justify-between gap-6">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sort By</span>
                                    <div className="flex p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        {['priorityScore', 'deadline', 'prizeAmount'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setSorting(f, sortOrder)}
                                                className={cn("px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", sortBy === f ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                            >
                                                {f.replace('priorityScore', 'Priority').replace('deadline', 'Deadline').replace('prizeAmount', 'Prize')}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setSorting(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')} className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <ArrowUpDown size={18} strokeWidth={3} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Time Filter</span>
                                    <select
                                        value={filters.dateRange}
                                        onChange={(e) => setFilters({ dateRange: e.target.value })}
                                        className="bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 rounded-2xl px-6 py-3 outline-none font-black text-[10px] uppercase tracking-widest text-slate-500 appearance-none shadow-inner"
                                    >
                                        <option value="all">Any Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">This Week</option>
                                        <option value="month">This Month</option>
                                        <option value="upcoming">Upcoming</option>
                                        <option value="completed">Past Events</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Prize Pool</span>
                                    <select
                                        value={filters.prizeRange}
                                        onChange={(e) => setFilters({ prizeRange: e.target.value })}
                                        className="bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 rounded-2xl px-6 py-3 outline-none font-black text-[10px] uppercase tracking-widest text-slate-500 appearance-none shadow-inner"
                                    >
                                        <option value="all">Any Prize</option>
                                        <option value="free">No Prize</option>
                                        <option value="small">{"< ₹10k"}</option>
                                        <option value="medium">₹10k - ₹50k</option>
                                        <option value="large">{"≥ ₹50k"}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Filters Row / Custom Dates */}
                        <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-slate-50 dark:border-slate-800/50">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date Range</span>
                                <div className="flex items-center gap-2">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">From</label>
                                    <input
                                        type="date"
                                        value={filters.dateFrom || ''}
                                        onChange={(e) => setFilters({ dateFrom: e.target.value })}
                                        className="bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 rounded-xl px-4 py-2.5 outline-none font-bold text-xs text-slate-600 dark:text-slate-300 shadow-inner"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">To</label>
                                    <input
                                        type="date"
                                        value={filters.dateTo || ''}
                                        onChange={(e) => setFilters({ dateTo: e.target.value })}
                                        className="bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 rounded-xl px-4 py-2.5 outline-none font-bold text-xs text-slate-600 dark:text-slate-300 shadow-inner"
                                    />
                                </div>
                                {(filters.dateFrom || filters.dateTo) && (
                                    <button
                                        onClick={() => setFilters({ dateFrom: '', dateTo: '' })}
                                        className="text-[9px] font-black uppercase tracking-widest text-rose-500 shadow-sm px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 dark:bg-rose-500/10 hover:bg-rose-100 transition-colors"
                                    >
                                        Clear Dates
                                    </button>
                                )}
                            </div>

                            <button onClick={() => setFilters({ search: '', status: 'all', eventType: 'all', dateRange: 'all', prizeRange: 'all', showShortlisted: false, dateFrom: '', dateTo: '' })} className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm">
                                Reset All Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_8px_rgba(79,70,229,1)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{filteredEvents.length} SIGNAL(S) IDENTIFIED</span>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {filteredEvents.length > 0 ? (
                        <motion.div key={viewMode} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.2 }}>
                            {viewMode === 'table' ? <TableView events={filteredEvents.slice(0, page * itemsPerPage)} /> : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 auto-rows-fr">
                                    {filteredEvents.slice(0, page * itemsPerPage).map((event, idx) => (
                                        <motion.div key={event.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx < itemsPerPage ? Math.min(idx * 0.05, 0.4) : 0 }} className="h-full">
                                            <EventCard event={event} />
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {filteredEvents.length > (page * itemsPerPage) && (
                                <div className="mt-12 flex justify-center">
                                    <button 
                                        onClick={() => setPage(p => p + 1)}
                                        className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all shadow-sm flex items-center gap-3 active:scale-95"
                                    >
                                        Load More Signals ({filteredEvents.length - (page * itemsPerPage)} Remaining)
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <div className="py-40 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <Database size={64} className="mx-auto text-slate-200 mb-8" />
                            <h3 className="text-2xl font-black text-slate-400 uppercase tracking-[0.2em]">Zero Grid Matches</h3>
                            <p className="text-xs text-slate-400 font-bold mt-2">Adjust search parameters or initialize new node.</p>
                        </div>
                    )}
                </AnimatePresence>

            {/* Float Scroll To Top */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button 
                        initial={{ scale: 0, y: 20 }} 
                        animate={{ scale: 1, y: 0 }} 
                        exit={{ scale: 0, y: 20 }} 
                        onClick={scrollToTop} 
                        className="fixed bottom-24 sm:bottom-32 right-6 sm:right-12 w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl z-50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-white/20"
                    >
                        <ArrowUp size={24} strokeWidth={3} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(EventList);
