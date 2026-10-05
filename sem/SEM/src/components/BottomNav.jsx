import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, BarChart3, List, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { useAppStore } from '../store';

const BottomNav = () => {
    const location = useLocation();
    const openModal = useAppStore((state) => state.openModal);
    const userRole = useAppStore((state) => state.userRole);

    const navItems = [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/events', icon: List, label: 'Events' },
        { path: '/discovery', icon: Zap, label: 'Discovery' },
        { path: '/calendar', icon: Calendar, label: 'Calendar' },
        {
            label: 'Upgrade',
            icon: ShieldCheck,
            onClick: () => openModal('payment'),
            hideIfUpgrade: true
        },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' }
    ];

    const filteredItems = navItems.filter(item =>
        !(item.hideIfUpgrade && (userRole === 'subscriber' || userRole === 'team_leader' || userRole === 'admin'))
    );

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
        >
            <div className="flex items-stretch justify-around w-full h-16 px-1">
                {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.path ? location.pathname === item.path : false;

                    const Content = (
                        <>
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform", isActive && "scale-110", item.label === 'Upgrade' && "text-indigo-600")} />
                            <span className={cn(
                                "text-[10px] tracking-wide leading-none mt-0.5",
                                isActive ? "font-black" : "font-bold",
                                item.label === 'Upgrade' && "text-indigo-600"
                            )}>
                                {item.label}
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabMobile"
                                    className="absolute -top-0.5 left-3 right-3 h-[3px] bg-indigo-600 rounded-full shadow-[0_2px_8px_rgba(79,70,229,0.5)]"
                                    initial={false}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                        </>
                    );

                    if (item.onClick) {
                        return (
                            <button
                                key={item.label}
                                onClick={() => { if (navigator.vibrate) navigator.vibrate(40); item.onClick?.(); }}
                                className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 relative transition-colors text-slate-400"
                            >
                                {Content}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => { if (navigator.vibrate) navigator.vibrate(40); }}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 relative transition-colors",
                                isActive
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-400 dark:text-slate-500 active:text-slate-600'
                            )}
                        >
                            {Content}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
