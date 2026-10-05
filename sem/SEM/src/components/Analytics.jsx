import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { db, EventType, getUserPrizeSummary, getMergedEvents } from '../db';
import EventCard from './EventCard';
import { BarChart3, TrendingUp, Award, DollarSign, Target, Zap, Globe, Map, Shield } from 'lucide-react';
import { cn } from '../utils';

const StatCard = ({ title, value, icon: Icon, subtitle, colorClass, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-card p-6 relative overflow-hidden group"
    >
        <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 blur-2xl group-hover:opacity-10 transition-opacity", colorClass)} />
        <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                <Icon size={24} className={cn("transition-transform group-hover:scale-110 duration-300", colorClass.replace('bg-', 'text-'))} />
            </div>
            {subtitle && (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                    {subtitle}
                </span>
            )}
        </div>
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{title}</h3>
        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
    </motion.div>
);

const Analytics = () => {
    const navigate = useNavigate();
    const userRole = useAppStore((state) => state.userRole);
    const openPaymentModal = () => useAppStore.getState().openModal('payment');

    const teamId = useAppStore((state) => state.teamId);
    const events = useLiveQuery(async () => {
        
        return await getMergedEvents();
    }, [teamId]) || [];
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, title: '' });
    const [personalPrize, setPersonalPrize] = useState({ totalPrize: 0, winCount: 0 });

    // Load personal prize summary
    React.useEffect(() => {
        const uid = useAppStore.getState().userProfile?.uid;
        if (uid) {
            getUserPrizeSummary(uid).then(setPersonalPrize);
        }
    }, [events]);

    const openAnalyticsModal = (type, title) => {
        setModalConfig({ isOpen: true, type, title });
    };

    const closeAnalyticsModal = () => {
        setModalConfig({ isOpen: false, type: null, title: '' });
    };

    const analytics = useMemo(() => {
        if (!events || events.length === 0) return null;

        const total = events.length;
        const byType = {};
        Object.values(EventType).forEach(type => {
            byType[type] = events.filter(e => e.eventType === type).length;
        });

        const byStatus = {};
        events.forEach(e => {
            byStatus[e.status] = (byStatus[e.status] || 0) + 1;
        });

        const totalPrize = events.reduce((sum, e) => sum + (parseFloat(e.prizeAmount) || 0), 0);
        const totalFees = events.reduce((sum, e) => sum + (parseFloat(e.registrationFee) || 0), 0);
        const avgPrize = totalPrize / total;

        const wonEvents = events.filter(e => e.status === 'Won');
        // Use personal prize total if available, otherwise fall back to team prizeWon
        const teamWonPrize = wonEvents.reduce((sum, e) => sum + (parseFloat(e.prizeWon) || 0), 0);
        const wonPrize = personalPrize.totalPrize > 0 ? personalPrize.totalPrize : teamWonPrize;
        const paidFees = events.filter(e => e.status === 'Attended' || e.status === 'Won')
            .reduce((sum, e) => sum + (parseFloat(e.registrationFee) || 0), 0);
        const roi = paidFees > 0 ? ((wonPrize - paidFees) / paidFees * 100) : 0;

        const online = events.filter(e => e.isOnline).length;
        const offline = total - online;

        return {
            total,
            byType,
            byStatus,
            totalPrize,
            totalFees,
            avgPrize,
            wonEvents: wonEvents.length,
            wonPrize,
            roi,
            online,
            offline
        };
    }, [events]);

    const filteredEvents = useMemo(() => {
        if (!events) return [];
        if (modalConfig.type === 'won') {
            return events.filter(e => e.status === 'Won');
        }
        if (modalConfig.type === 'participated') {
            return events.filter(e => ['Attended', 'Won', 'Registered'].includes(e.status));
        }
        if (modalConfig.type === 'prize') {
            return events.filter(e => (parseFloat(e.prizeAmount) || 0) > 0 && e.status === 'Won');
        }
        if (modalConfig.type === 'roi') {
            return events.filter(e => (parseFloat(e.registrationFee) || 0) > 0);
        }
        return [];
    }, [events, modalConfig.type]);

    if (!events) {
        return (
            <div className="space-y-8 py-8 animate-pulse">
                <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <BarChart3 size={64} className="text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Data Yet</h2>
                <p className="text-slate-500">Add some events to see your performance analytics.</p>
            </div>
        );
    }

    return (
        <div className="pb-20 relative">
            {userRole === 'public' && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center rounded-3xl mt-24">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mb-4 shadow-xl">
                        <Shield size={32} />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Team Edition Required</h3>
                    <p className="text-sm font-bold text-slate-500 mb-6 max-w-md">Advanced analytics, ROI tracking, and performance metics are reserved for Team Edition members. Upgrade to unlock your team's potential.</p>
                    <button onClick={openPaymentModal} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                        Upgrade to Team Edition
                    </button>
                </div>
            )}

            <div className={cn("mb-10", userRole === 'public' && "opacity-20 blur-sm pointer-events-none")}>
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                    Performance <span className="text-indigo-600">Analytics</span>
                </h1>
                <p className="text-slate-500 font-medium">Insights based on your event participation and results</p>
            </div>

            {/* Top Metrics */}
            <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8", userRole === 'public' && "opacity-20 blur-sm pointer-events-none")}>
                <div onClick={() => openAnalyticsModal('participated', 'Total Participations')} className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95">
                    <StatCard
                        title="Total Participations"
                        value={analytics.total}
                        icon={Target}
                        colorClass="bg-indigo-500"
                        delay={0.1}
                    />
                </div>
                <div onClick={() => openAnalyticsModal('won', 'Events Won')} className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95">
                    <StatCard
                        title="Events Won"
                        value={analytics.wonEvents}
                        icon={Award}
                        subtitle={`${analytics.total > 0 ? ((analytics.wonEvents / analytics.total) * 100).toFixed(0) : 0}% WIN RATE`}
                        colorClass="bg-amber-500"
                        delay={0.2}
                    />
                </div>
                <div onClick={() => openAnalyticsModal('prize', 'Revenue Breakdown')} className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95">
                    <StatCard
                        title="Total Prize Won"
                        value={analytics.wonPrize >= 1000 ? `₹${(analytics.wonPrize / 1000).toFixed(1)}k` : `₹${analytics.wonPrize}`}
                        icon={DollarSign}
                        subtitle="GROSS REVENUE"
                        colorClass="bg-emerald-500"
                        delay={0.3}
                    />
                </div>
                <div onClick={() => openAnalyticsModal('roi', 'Investment Analysis')} className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95">
                    <StatCard
                        title="Profitability (ROI)"
                        value={`${analytics.roi.toFixed(0)}%`}
                        icon={TrendingUp}
                        colorClass={analytics.roi >= 0 ? "bg-emerald-500" : "bg-amber-500"}
                        delay={0.4}
                    />
                </div>
            </div>

            {/* ... Rest of the existing analytics charts ... */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Mode Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card p-8"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-600">
                            <Zap size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Participation Mode</h3>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="flex-1">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-2">
                                        <Globe size={14} className="text-indigo-500" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Online/Remote</span>
                                    </div>
                                    <span className="text-lg font-black text-indigo-600">{analytics.online}</span>
                                </div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(analytics.online / analytics.total) * 100}%` }}
                                        className="h-full bg-indigo-500 rounded-full"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-2">
                                        <Map size={14} className="text-emerald-500" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">In-Person/Offline</span>
                                    </div>
                                    <span className="text-lg font-black text-emerald-600">{analytics.offline}</span>
                                </div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(analytics.offline / analytics.total) * 100}%` }}
                                        className="h-full bg-emerald-500 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Status Breakdown */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card p-8"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600">
                            <BarChart3 size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Status Breakdown</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(analytics.byStatus).map(([status, count]) => (
                            <div key={status} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{status}</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{count}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Type Distribution */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8"
            >
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Event Type Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
                    {Object.entries(analytics.byType).map(([type, count]) => (
                        <div key={type} className="group">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-500 transition-colors uppercase tracking-tight">{type}</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{count}</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(count / analytics.total) * 100}%` }}
                                    className="h-full bg-indigo-500 group-hover:bg-indigo-400 transition-colors"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* DRILL DOWN MODAL */}
            <AnimatePresence>
                {modalConfig.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeAnalyticsModal}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full sm:max-w-4xl bg-slate-50 dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border-t sm:border border-white/10 flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh]"
                        >
                            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 rounded-t-[2rem]">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{modalConfig.title}</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                        {filteredEvents.length} Record{filteredEvents.length !== 1 ? 's' : ''} Found
                                    </p>
                                </div>
                                <button
                                    onClick={closeAnalyticsModal}
                                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    {/* Using SVG directly directly to ensure it works without import issues */}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                                {filteredEvents.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-6 auto-rows-fr">
                                        {filteredEvents.map((event) => (
                                            <div key={event.id} className="transform transition-transform hover:scale-[1.01] h-full">
                                                <EventCard event={event} compact={true} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
                                        <Target size={48} className="mb-4" />
                                        <p className="font-bold">No events match this criteria.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    );
};

export default Analytics;

