import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { logoutUser } from '../services/firebase';
import { Moon, Sun, Plus, Zap, LogOut, Settings as SettingsIcon, User, MessageSquare, Crown, CreditCard, FileText, ChevronDown, Shield, Users, HelpCircle } from 'lucide-react';
import { cn } from '../utils';
import NotificationCenter from './NotificationCenter';

const Header = () => {
    const location = useLocation();
    const theme = useAppStore((state) => state.theme);
    const toggleTheme = useAppStore((state) => state.toggleTheme);
    const openModal = useAppStore((state) => state.openModal);
    const user = useAppStore((state) => state.user);
    const cloudProvider = useAppStore((state) => state.cloudProvider);
    const userRole = useAppStore((state) => state.userRole);
    const isRoleVerified = useAppStore((state) => state.isRoleVerified);
    const navigate = useNavigate();
    const canAdd = (userRole === 'admin' || userRole === 'event_manager') && isRoleVerified;

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const setUser = useAppStore((state) => state.setUser);

    const handleLogout = async () => {
        try {
            if (cloudProvider === 'firestore') {
                await logoutUser();
            }
            setUser(null);
            window.location.reload();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const navItems = [
        { path: '/', label: 'Dashboard' },
        { path: '/events', label: 'Events' },
        { path: '/discovery', label: 'Discovery' },
        { path: '/calendar', label: 'Calendar' },
        { path: '/analytics', label: 'Analytics' }
    ];

    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 shadow-sm px-safe">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center group">
                            <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                <span className="text-white font-black text-xs">{(user?.displayName || user?.email || 'U').substring(0, 2).toUpperCase()}</span>
                            </div>
                            <div className="flex flex-col ml-3">
                                <span className="text-xl font-black text-[#1e1b4b] dark:text-white leading-none flex items-center gap-1">
                                    SEM
                                </span>
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mt-1">
                                    {userRole === 'public' ? 'PUBLIC' : 'TEAM'} <span className="hidden sm:inline">EDITION</span>
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center space-x-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.label}
                                to={item.path}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${location.pathname === item.path
                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center space-x-4">
                        {canAdd && (
                            <button
                                onClick={() => openModal('addEvent')}
                                className="h-10 px-4 sm:px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline">Add Event</span>
                            </button>
                        )}

                        {/* User Guide Help Button */}
                        <button
                            onClick={() => openModal('userGuide')}
                            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="User Guide"
                            aria-label="Open User Guide"
                        >
                            <HelpCircle size={20} />
                        </button>

                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>

                        <NotificationCenter />

                        <button
                            onClick={handleLogout}
                            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>

                        <div className="relative pl-4 border-l border-slate-100 dark:border-slate-800" ref={profileRef}>
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 group relative border",
                                        userRole !== 'public' 
                                            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-[0_0_20px_rgba(245,158,11,0.2)]" 
                                            : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800"
                                    )}
                                >
                                    <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center">
                                        {user?.photoURL ? (
                                            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} />
                                        )}
                                    </div>
                                    {userRole !== 'public' && (
                                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 group-hover:rotate-12 transition-transform z-10">
                                            <Crown size={12} className="text-white fill-current" />
                                        </div>
                                    )}
                                </button>

                                {/* Dropdown Menu */}
                                {isProfileOpen && (
                                    <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-500/10 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 z-[70]">
                                        <div className="px-4 py-3 mb-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.displayName || 'No Name'}</p>
                                            <p className="text-[10px] text-indigo-500 truncate font-bold">{user?.email}</p>
                                        </div>

                                        {(userRole === 'admin' || userRole === 'event_manager') && (
                                            <Link
                                                to="/admin"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 mx-2 mt-1 mb-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] transition-all shadow-lg"
                                            >
                                                <Shield size={16} /> Admin Terminal
                                            </Link>
                                        )}

                                        <button
                                             onClick={(e) => { 
                                                 e.stopPropagation();
                                                 e.preventDefault();
                                                 setIsProfileOpen(false); 
                                                 openModal('profile'); 
                                             }}
                                             className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-3"
                                         >
                                             <User size={16} className="text-indigo-500" /> Personalize Profile
                                         </button>

                                        <Link
                                            to="/settings"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-3"
                                        >
                                            <SettingsIcon size={16} className="text-slate-400" /> Account Settings
                                        </Link>

                                        {(userRole === 'subscriber' || userRole === 'team_leader' || userRole === 'admin') ? (
                                            <button
                                                onClick={() => { setIsProfileOpen(false); openModal('teamInvite'); }}
                                                className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-3"
                                            >
                                                <Users size={16} className="text-indigo-500" /> Manage Tactical Unit
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { setIsProfileOpen(false); navigate('/'); /* User can use the join input on dashboard */ }}
                                                className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-3"
                                            >
                                                <Users size={16} className="text-indigo-500" /> Join Tactical Team
                                            </button>
                                        )}

                                        {(userRole === 'public') ? (
                                            <button
                                                onClick={() => { setIsProfileOpen(false); openModal('payment'); }}
                                                className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 transition-colors flex items-center gap-3 group"
                                            >
                                                <div className="w-6 h-6 rounded flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 group-hover:bg-indigo-600 transition-colors shrink-0">
                                                    <Crown size={12} className="text-indigo-600 group-hover:text-white transition-colors" />
                                                </div>
                                                <span>Go Premium (₹10)</span>
                                            </button>
                                        ) : (
                                            <div className="px-4 py-2.5 flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-900/10">
                                                <div className="w-6 h-6 rounded flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
                                                    <Crown size={12} className="text-indigo-600" fill="currentColor" />
                                                </div>
                                                <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600 dark:text-indigo-400">TEAM EDITION</span>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => { setIsProfileOpen(false); openModal('legal'); }}
                                            className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-3"
                                        >
                                            <FileText size={16} className="text-slate-400" /> Legal Documents
                                        </button>

                                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                        <button
                                            onClick={() => { setIsProfileOpen(false); handleLogout(); }}
                                            className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 transition-colors flex items-center gap-3"
                                        >
                                            <LogOut size={16} /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                    </div>
                </div>
            </div>
        </header>
    );
};


export default Header;
