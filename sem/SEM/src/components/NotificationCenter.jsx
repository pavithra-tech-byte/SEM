import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { Bell, X, CheckCheck, Trash2, Zap, AlertTriangle, CreditCard, Users, Clock, Info } from 'lucide-react';
import { cn } from '../utils';
import { formatDistanceToNow } from 'date-fns';

// ─── Icon per notification type ──────────────────────────────────────────────
const TYPE_CONFIG = {
    critical: { icon: AlertTriangle, color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-500/10',   dot: 'bg-rose-500' },
    warning:  { icon: Clock,         color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-500/10', dot: 'bg-amber-500' },
    event:    { icon: Zap,           color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', dot: 'bg-indigo-500' },
    payment:  { icon: CreditCard,    color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-500/10', dot: 'bg-emerald-500' },
    team:     { icon: Users,         color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10', dot: 'bg-violet-500' },
    push:     { icon: Bell,          color: 'text-sky-500',    bg: 'bg-sky-50 dark:bg-sky-500/10', dot: 'bg-sky-500' },
    info:     { icon: Info,          color: 'text-slate-500',  bg: 'bg-slate-50 dark:bg-slate-800',  dot: 'bg-slate-400' },
};

const NotificationItem = ({ notif, onRead }) => {
    const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
    const Icon = cfg.icon;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => onRead(notif.id)}
            className={cn(
                'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all group',
                notif.read ? 'opacity-60' : 'bg-white dark:bg-slate-800/80 shadow-sm border border-slate-100 dark:border-slate-700/50'
            )}
        >
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
                <Icon size={16} className={cfg.color} />
            </div>
            <div className='flex-1 min-w-0'>
                <p className={cn('text-[11px] font-black text-slate-900 dark:text-white leading-tight', !notif.read && 'text-slate-900')}>
                    {notif.title}
                </p>
                {notif.body && (
                    <p className='text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2'>
                        {notif.body}
                    </p>
                )}
                <p className='text-[9px] text-slate-400 dark:text-slate-600 mt-1 font-bold uppercase tracking-wider'>
                    {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                </p>
            </div>
            {!notif.read && (
                <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', cfg.dot)} />
            )}
        </motion.div>
    );
};

// ─── Notification Bell + Panel ───────────────────────────────────────────────
const NotificationCenter = () => {
    const notifications    = useAppStore(s => s.notifications);
    const markAllRead      = useAppStore(s => s.markAllRead);
    const clearNotifications = useAppStore(s => s.clearNotifications);
    const markNotificationRead = useAppStore(s => s.markNotificationRead);
    const isOpen           = useAppStore(s => s.modals.notifications);
    const openModal        = useAppStore(s => s.openModal);
    const closeModal       = useAppStore(s => s.closeModal);

    const unreadCount = notifications.filter(n => !n.read).length;
    const panelRef    = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                closeModal('notifications');
            }
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, closeModal]);

    const toggle = () => isOpen ? closeModal('notifications') : openModal('notifications');

    return (
        <div className='relative' ref={panelRef}>
            {/* Bell Button */}
            <button
                id='notification-bell-btn'
                onClick={toggle}
                className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all relative',
                    isOpen
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                )}
                aria-label='Notifications'
            >
                <Bell size={20} />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            key='badge'
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className='absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900'
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key='notif-panel'
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className='absolute right-0 top-14 w-80 sm:w-96 max-h-[80vh] flex flex-col rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-black/20 z-[80] overflow-hidden'
                    >
                        {/* Header */}
                        <div className='flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'>
                            <div className='flex items-center gap-2'>
                                <Bell size={16} className='text-indigo-600' />
                                <span className='text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest'>Notifications</span>
                                {unreadCount > 0 && (
                                    <span className='px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-full'>
                                        {unreadCount} NEW
                                    </span>
                                )}
                            </div>
                            <div className='flex items-center gap-1'>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        title='Mark all read'
                                        className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors'
                                    >
                                        <CheckCheck size={14} />
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearNotifications}
                                        title='Clear all'
                                        className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors'
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => closeModal('notifications')}
                                    className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors'
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className='overflow-y-auto flex-1 p-2 space-y-1.5'>
                            <AnimatePresence initial={false}>
                                {notifications.length === 0 ? (
                                    <motion.div
                                        key='empty'
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className='py-14 text-center'
                                    >
                                        <Bell size={32} className='mx-auto text-slate-200 dark:text-slate-700 mb-3' />
                                        <p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>All Clear</p>
                                        <p className='text-[10px] text-slate-300 dark:text-slate-600 mt-1'>No notifications yet.</p>
                                    </motion.div>
                                ) : (
                                    notifications.map(n => (
                                        <NotificationItem
                                            key={n.id}
                                            notif={n}
                                            onRead={markNotificationRead}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className='px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50'>
                                <p className='text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest'>
                                    {notifications.length} total · Last 50 stored
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;
