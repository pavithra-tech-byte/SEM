import React from 'react';
import { useAppStore } from '../store';
import { db, getAllEvents } from '../db';
import { exportToCSV, downloadCSV } from '../csvUtils';
import { requestNotificationPermission, initNotificationSystem } from '../notifications';
import { bulkSyncToFirestore, getAllUsers, updateUserRole, getPaymentRequests, approvePaymentRequest, rejectPaymentRequest } from '../services/firebase';
import { Bell, Download, Trash2, Moon, Sun, Shield, Database, Smartphone, Cloud, Loader2, ArrowUpFromLine, Info, ChevronRight, LogOut, CheckCircle2, ShieldCheck, UserCog, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { cn } from '../utils';

const Settings = () => {
    const theme = useAppStore((state) => state.theme);
    const toggleTheme = useAppStore((state) => state.toggleTheme);
    const preferences = useAppStore((state) => state.preferences);
    const updatePreferences = useAppStore((state) => state.updatePreferences);
    const cloudProvider = useAppStore((state) => state.cloudProvider);
    const setCloudProvider = useAppStore((state) => state.setCloudProvider);
    const firebaseConfig = useAppStore((state) => state.firebaseConfig);
    const setFirebaseConfig = useAppStore((state) => state.setFirebaseConfig);
    const user = useAppStore((state) => state.user);

    const [isSyncing, setIsSyncing] = React.useState(false);
    const [usersList, setUsersList] = React.useState([]);
    const [loadingUsers, setLoadingUsers] = React.useState(false);
    const [paymentRequests, setPaymentRequests] = React.useState([]);
    const [loadingPayments, setLoadingPayments] = React.useState(false);
    const [maskKeys, setMaskKeys] = React.useState(true);

    const maskSensitiveConfig = (config) => {
        const masked = { ...config };
        if (masked.apiKey) masked.apiKey = masked.apiKey.slice(0, 6) + "****************";
        if (masked.messagingSenderId) masked.messagingSenderId = "*********";
        if (masked.appId) masked.appId = masked.appId.slice(0, 6) + "****************";
        return masked;
    };

    const userRole = useAppStore((state) => state.userRole);
    const isRoleVerified = useAppStore((state) => state.isRoleVerified);

    React.useEffect(() => {
        if (userRole === 'admin' && isRoleVerified) {
            setLoadingUsers(true);
            getAllUsers().then(users => {
                setUsersList(users);
                setLoadingUsers(false);
            });

            setLoadingPayments(true);
            getPaymentRequests().then(requests => {
                setPaymentRequests(requests);
                setLoadingPayments(false);
            });
        }
    }, [userRole, isRoleVerified]);

    const handleRoleChange = async (uid, newRole) => {
        try {
            await updateUserRole(uid, newRole);
            setUsersList(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u));
            alert(`User role updated to ${newRole}`);
        } catch (error) {
            alert('Failed to update role: ' + error.message);
        }
    };

    const handleApprovePayment = async (request) => {
        if (!confirm(`Approve payment of ₹${request.amount} for ${request.userEmail}?`)) return;

        try {
            const planRole = request.planId === 'team' ? 'subscriber' : 'member';
            await approvePaymentRequest(request.id, request.userId, planRole);
            setPaymentRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r));
            alert('Payment approved and user role upgraded!');
        } catch (error) {
            alert('Approval failed: ' + error.message);
        }
    };

    const handleRejectPayment = async (requestId) => {
        const reason = prompt('Reason for rejection:');
        if (reason === null) return;

        try {
            await rejectPaymentRequest(requestId, reason);
            setPaymentRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
            alert('Payment rejected.');
        } catch (error) {
            alert('Rejection failed: ' + error.message);
        }
    };

    const handleInitialPush = async () => {
        if (!confirm('This will upload all your local events to the Cloud Repository. Continue?')) return;
        setIsSyncing(true);
        try {
            const events = await db.events.toArray();
            await bulkSyncToFirestore(events);
            alert(`✅ Success! ${events.length} events uploaded to Firebase.`);
            setCloudProvider('firestore');
        } catch (e) {
            alert('❌ Sync Error: ' + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExport = async () => {
        try {
            const events = await getAllEvents();
            const csv = exportToCSV(events);
            downloadCSV(csv, `events-export-${new Date().toISOString().split('T')[0]}.csv`);
        } catch (error) {
            alert('Export failed: ' + error.message);
        }
    };

    const handleClearAll = async () => {
        if (confirm('⚠️ DELETE ALL LOCAL EVENTS?\n\nThis cannot be undone! Type YES to confirm.')) {
            await db.events.clear();
            alert('All local events deleted.');
            window.location.reload();
        }
    };

    const handleCleanup = async () => {
        if (!confirm('This will remove duplicate entries and clean up garbage data. Proceed?')) return;

        try {
            const allEvents = await db.events.toArray();
            const seen = new Map();
            const toDelete = [];
            const toUpdate = [];

            for (const event of allEvents) {
                // Garbage check
                if (!event.eventName || event.eventName.length < 2 ||
                    event.collegeName === 'nlçlçlh' ||
                    (event.eventName.includes('nlç') && event.collegeName.includes('nlç'))) {
                    toDelete.push(event.id);
                    continue;
                }

                const key = `${event.eventName}__${event.collegeName}`.toLowerCase();
                if (seen.has(key)) {
                    const existing = seen.get(key);
                    // Keep the one with a poster if possible
                    if (!existing.posterBlob && event.posterBlob) {
                        toDelete.push(existing.id);
                        seen.set(key, event);
                    } else {
                        toDelete.push(event.id);
                    }
                } else {
                    seen.set(key, event);
                }
            }

            if (toDelete.length > 0) {
                await db.transaction('rw', db.events, async () => {
                    for (const id of toDelete) {
                        await db.events.delete(id);
                    }
                });
                alert(`✅ Cleanup Complete! Removed ${toDelete.length} garbage/duplicate entries.`);
            } else {
                alert('✨ Database is already clean!');
            }
        } catch (error) {
            alert('Cleanup Error: ' + error.message);
        }
    };

    const handleNotificationToggle = async (enabled) => {
        if (enabled) {
            const granted = await requestNotificationPermission();
            if (granted) updatePreferences({ notificationsEnabled: true });
        } else {
            updatePreferences({ notificationsEnabled: false });
        }
    };

    const SettingSection = ({ title, description, children, icon: Icon }) => (
        <div className="glass-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 mb-6">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600">
                    <Icon size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
                    <p className="text-sm text-slate-500 font-medium">{description}</p>
                </div>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );

    return (
        <div className="pb-20 max-w-4xl mx-auto px-4">
            <div className="mb-10 pt-8">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                    System <span className="text-indigo-600">Configuration</span>
                </h1>
                <p className="text-slate-500 font-medium">Control your team's cloud infrastructure and preferences.</p>
            </div>

            {userRole === 'admin' && isRoleVerified && (
                <SettingSection title="Team Cloud Setup" description="Configure your real-time database" icon={Cloud}>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Local Mode */}
                            <div className={cn(
                                "p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all",
                                cloudProvider === 'local'
                                    ? "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20"
                                    : "bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
                            )}>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
                                        {cloudProvider === 'local' ? <CheckCircle2 size={16} className="text-amber-500" /> : <Smartphone size={16} className="text-slate-400" />}
                                        Local Only
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">Data stays on this device. Fastest performance.</p>
                                </div>
                                <button
                                    onClick={() => setCloudProvider('local')}
                                    className={cn(
                                        "btn h-10 text-xs font-black uppercase",
                                        cloudProvider === 'local' ? "btn-secondary" : "btn-primary"
                                    )}
                                >
                                    {cloudProvider === 'local' ? 'Active' : 'Select Local'}
                                </button>
                            </div>

                            {/* Firebase Mode */}
                            <div className={cn(
                                "p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all",
                                cloudProvider === 'firestore'
                                    ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                                    : "bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
                            )}>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
                                        {cloudProvider === 'firestore' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Cloud size={16} className="text-slate-400" />}
                                        Firebase Sync
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">Direct sync with your Firebase project.</p>
                                </div>
                                <button
                                    onClick={() => setCloudProvider('firestore')}
                                    className={cn(
                                        "btn h-10 text-xs font-black uppercase",
                                        cloudProvider === 'firestore' ? "btn-secondary" : "btn-primary"
                                    )}
                                >
                                    {cloudProvider === 'firestore' ? 'Active' : 'Select Firebase'}
                                </button>
                            </div>
                        </div>

                        {cloudProvider === 'firestore' && (
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Firebase Project Config</label>
                                    <button
                                        onClick={() => setMaskKeys(!maskKeys)}
                                        className="p-1 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
                                    >
                                        {maskKeys ? <Eye size={12} /> : <EyeOff size={12} />}
                                        {maskKeys ? 'Show Keys' : 'Mask Keys'}
                                    </button>
                                </div>
                                <textarea
                                    value={maskKeys ? JSON.stringify(maskSensitiveConfig(firebaseConfig), null, 2) : JSON.stringify(firebaseConfig, null, 2)}
                                    onChange={(e) => {
                                        if (maskKeys) return; // Prevent editing while masked
                                        try { setFirebaseConfig(JSON.parse(e.target.value)); } catch (e) { }
                                    }}
                                    readOnly={maskKeys}
                                    className={cn("input font-mono text-xs py-3 min-h-[150px] w-full", maskKeys && "opacity-80")}
                                    placeholder='{ "apiKey": "...", "projectId": "...", ... }'
                                />
                                {maskKeys && (
                                    <p className="text-[9px] font-bold text-amber-600 dark:text-amber-500/80 mt-2 uppercase tracking-widest flex items-center gap-1.5">
                                        <ShieldAlert size={10} />
                                        Unmask to edit configuration
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </SettingSection>
            )}

            {userRole === 'admin' && isRoleVerified && (
                <SettingSection title="Payment Verification" description="Approve or reject plan upgrade requests" icon={ShieldCheck}>
                    <div className="space-y-4">
                        {loadingPayments ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="animate-spin text-indigo-600" />
                            </div>
                        ) : paymentRequests.filter(req => req.status === 'pending').length === 0 ? (
                            <p className="text-center py-8 text-xs font-bold text-slate-400 uppercase tracking-widest">No pending payment requests</p>
                        ) : (
                            <div className="space-y-3">
                                {paymentRequests.filter(req => req.status === 'pending').map((req) => (
                                    <div key={req.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-md">
                                                        {req.planName}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                                        req.status === 'pending' ? "bg-amber-100 text-amber-600" :
                                                            req.status === 'approved' ? "bg-emerald-100 text-emerald-600" :
                                                                 "bg-indigo-100 text-indigo-600"
                                                    )}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-black text-slate-900 dark:text-white">{req.userEmail}</p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">UTR: {req.transactionId || 'Not provided'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-indigo-600">₹{req.amount}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {req.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprovePayment(req)}
                                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectPayment(req.id)}
                                                    className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100 transition-all"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </SettingSection>
            )}

            {userRole === 'admin' && isRoleVerified && (
                <SettingSection title="User Management" description="Manage team roles and access" icon={UserCog}>
                    <div className="space-y-4">
                        {loadingUsers ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="animate-spin text-indigo-600" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {usersList.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                                                {(u.displayName || u.email || 'U').substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 dark:text-white">{u.displayName || 'Unnamed User'}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">{u.email}</p>
                                            </div>
                                        </div>
                                        <select
                                            value={u.role || 'member'}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                            className="text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none focus:border-indigo-500"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="event_manager">Manager</option>
                                            <option value="subscriber">Subscriber</option>
                                            <option value="member">Member</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3">
                            <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">RBAC Protocol Active</h4>
                                <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-1">
                                    Admins have full modification access. Managers can edit/delete events but cannot clear database. Members have read-only access.
                                </p>
                            </div>
                        </div>
                    </div>
                </SettingSection>
            )}

            {(userRole === 'subscriber' || userRole === 'team_leader') && (
                <SettingSection title="Team Management" description="Invite members to your team workspace" icon={UserCog}>
                    <div className="space-y-4">
                        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shadow-inner">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-900 dark:text-indigo-100 mb-3 flex items-center gap-2">
                                <ShieldCheck size={16} /> Team Invite Link
                            </h4>
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <input
                                    readOnly
                                    value={`${window.location.origin}/invite/${user?.uid}`}
                                    className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700/50 rounded-xl px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-300 outline-none select-all"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/invite/${user?.uid}`);
                                        alert("Invite link copied to clipboard!");
                                    }}
                                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all shrink-0"
                                >
                                    Copy Link
                                </button>
                            </div>
                            <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/80 mt-4 font-bold uppercase tracking-wider">
                                Share this link to allow users to join your Team Edition workspace (Max 10).
                            </p>
                        </div>
                    </div>
                </SettingSection>
            )}

            <SettingSection title="Visual Appearance" description="Customise your team dashboard" icon={Smartphone}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white">Dark Mode Synergy</p>
                        <p className="text-sm text-slate-500">Switch between light and high-contrast dark themes</p>
                    </div>
                    <button onClick={toggleTheme} className="btn btn-secondary flex items-center gap-3 px-6">
                        {theme === 'light' ? <><Moon size={18} className="text-indigo-600" /><span className="font-bold">Dark Mode</span></> : <><Sun size={18} className="text-amber-500" /><span className="font-bold">Light Mode</span></>}
                    </button>
                </div>
            </SettingSection>

            <SettingSection title="Notifications" description="Deadline alerts for the team" icon={Bell}>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">Push Notifications</p>
                            <p className="text-sm text-slate-500">Alerts for upcoming event registration deadlines</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={preferences.notificationsEnabled} onChange={(e) => handleNotificationToggle(e.target.checked)} className="sr-only peer" />
                            <div className="w-12 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6" />
                        </label>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Smartphone size={18} className="text-slate-400" />
                            <div>
                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Device Registration</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Required for instant background alerts</p>
                            </div>
                        </div>
                        <button 
                            onClick={async () => {
                                const granted = await initNotificationSystem();
                                if (granted) alert("✅ Success: This device is now registered for Intelligence Intel (Push Notifications).");
                                else alert("❌ Error: Notification permission denied or device unsupported.");
                            }}
                            className="w-full md:w-auto px-6 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 transition-all"
                        >
                            Register Device for Push
                        </button>
                    </div>
                </div>
            </SettingSection>

            {((userRole === 'admin' || userRole === 'event_manager') && isRoleVerified) && (
                <SettingSection title="Data & Security" description="Export and database maintenance" icon={Database}>
                    <div className="space-y-4">
                        <button onClick={handleExport} className="w-full btn btn-secondary h-14 flex justify-between items-center px-6">
                            <div className="flex items-center gap-4"><Download size={20} /><div className="text-left"><p className="font-bold">Backup Repository</p><p className="text-xs opacity-60">Export all events to CSV</p></div></div>
                            <ChevronRight size={18} />
                        </button>
                        <button onClick={handleCleanup} className="w-full btn btn-secondary h-14 flex justify-between items-center px-6">
                            <div className="flex items-center gap-4"><Database size={20} className="text-secondary" /><div className="text-left"><p className="font-bold">Cleanup Database</p><p className="text-xs opacity-60">Remove duplicates & garbage data</p></div></div>
                            <ChevronRight size={18} />
                        </button>
                        <button onClick={handleClearAll} className="w-full h-14 flex justify-between items-center px-6 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-100 dark:border-amber-500/20">
                            <div className="flex items-center gap-4"><Trash2 size={20} /><div className="text-left"><p className="font-bold">Wipe Local Database</p><p className="text-xs opacity-60">Reset internal event storage</p></div></div>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </SettingSection>
            )}

            <div className="glass-card p-8 flex flex-col md:flex-row gap-8 items-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent shadow-none">
                <Shield size={32} className="text-slate-400" />
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-bold mb-1">Team Privacy</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Data is synchronized with your private Firebase project. Individual local databases provide offline access with sub-second performance.</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
