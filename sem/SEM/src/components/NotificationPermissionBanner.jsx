import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, BellOff } from 'lucide-react';

const DISMISSED_KEY = 'sem_notif_dismissed';
const LATER_KEY = 'sem_notif_later';

const NotificationPermissionBanner = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Don't show if notifications not supported, already granted/denied, or user dismissed
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'default') return;
        if (localStorage.getItem(DISMISSED_KEY) === 'true') return;

        // If user chose "Later", wait at least 24h before showing again
        const laterTimestamp = localStorage.getItem(LATER_KEY);
        if (laterTimestamp) {
            const elapsed = Date.now() - parseInt(laterTimestamp, 10);
            if (elapsed < 24 * 60 * 60 * 1000) return;
        }

        // Small delay so it doesn't flash immediately on page load
        const timer = setTimeout(() => setVisible(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleEnable = async () => {
        try {
            const { initNotificationSystem } = await import('../notifications');
            await initNotificationSystem();
        } catch (e) {
            console.error('[Notification] Permission request failed:', e);
        }
        setVisible(false);
    };

    const handleLater = () => {
        localStorage.setItem(LATER_KEY, String(Date.now()));
        setVisible(false);
    };

    const handleNever = () => {
        localStorage.setItem(DISMISSED_KEY, 'true');
        setVisible(false);
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="sticky top-0 z-[70] bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/20"
                >
                    <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                                <Bell size={18} className="animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-widest leading-tight">Stay in the loop</p>
                                <p className="text-[10px] font-medium text-indigo-100 leading-tight mt-0.5">Get deadline alerts & event updates pushed to your device.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={handleEnable}
                                className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-lg"
                            >
                                Enable
                            </button>
                            <button
                                onClick={handleLater}
                                className="px-3 py-2 bg-white/10 backdrop-blur rounded-lg font-bold text-[9px] uppercase tracking-widest hover:bg-white/20 transition-colors"
                            >
                                Later
                            </button>
                            <button
                                onClick={handleNever}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                title="Never show again"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NotificationPermissionBanner;