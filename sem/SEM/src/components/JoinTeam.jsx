import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';
import { doc, updateDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db, auth, getTeamMembers, requestJoinTeam } from '../services/firebase';
import { ShieldCheck, Users, Loader2, ArrowRight, LogIn, AlertTriangle } from 'lucide-react';

const JoinTeam = () => {
    const { teamId } = useParams(); // This can be a UID or an Invite Code
    const navigate = useNavigate();

    const user = useAppStore((state) => state.user);
    const userRole = useAppStore((state) => state.userRole);
    const setUserRole = useAppStore((state) => state.setUserRole);
    const setTeamId = useAppStore((state) => state.setTeamId);

    const [status, setStatus] = useState('loading'); // idle, loading, success, error
    const [errorMsg, setErrorMsg] = useState('');
    const [resolvedTeamId, setResolvedTeamId] = useState(null);
    const [teamName, setTeamName] = useState('Tactical Workspace');
    const [teamSize, setTeamSize] = useState(0);

    useEffect(() => {
        const resolveAndFetch = async () => {
            if (!db || !teamId) {
                if (!teamId) {
                    setErrorMsg("Mission Critical: Team Identifier missing.");
                    setStatus('error');
                }
                return;
            }

            setStatus('loading');
            try {
                let leaderSnap = null;
                let leaderUid = null;

                // 1. Attempt Direct UID Resolution
                try {
                    const directSnap = await getDoc(doc(db, 'users', teamId));
                    if (directSnap.exists()) {
                        leaderSnap = directSnap;
                        leaderUid = directSnap.id;
                    }
                } catch (e) { /* ignore cast errors */ }

                // 2. Attempt Invite Code Resolution
                if (!leaderSnap) {
                    const q = query(collection(db, 'users'), where('inviteCode', '==', teamId.toUpperCase()));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        leaderSnap = querySnapshot.docs[0];
                        leaderUid = leaderSnap.id;
                    }
                }

                if (leaderSnap && leaderUid) {
                    const data = leaderSnap.data();
                    setTeamName(`${data.displayName || 'Leader'}'s Tactical Unit`);
                    setResolvedTeamId(leaderUid);

                    const members = await getTeamMembers(leaderUid);
                    setTeamSize(members.length);
                    
                    if (members.length >= 10) {
                        setErrorMsg("Tactical Alert: This unit is at maximum capacity (10/10).");
                        setStatus('error');
                    } else {
                        setStatus('idle');
                    }
                } else {
                    setErrorMsg("Invalid Intel: Team ID or Code not found.");
                    setStatus('error');
                }
            } catch (err) {
                console.error("Resolution failed", err);
                setErrorMsg("Communication Failure: Could not sync with network.");
                setStatus('error');
            }
        };

        resolveAndFetch();
    }, [teamId, db]);

    const handleJoinTeam = async () => {
        if (!user) {
            sessionStorage.setItem('pendingInvite', teamId);
            navigate('/');
            return;
        }

        if (!resolvedTeamId) return;

        if (resolvedTeamId === user.uid) {
            setErrorMsg("Operational Paradox: You are already the leader.");
            setStatus('error');
            return;
        }

        const { teamId: currentTeamId } = useAppStore.getState();
        if (currentTeamId && currentTeamId !== user.uid && currentTeamId !== resolvedTeamId) {
            setErrorMsg("Deployment Lock: You are active in another team. Leave it first.");
            setStatus('error');
            return;
        }

        setStatus('loading');
        try {
            if (db && auth?.currentUser) {
                await requestJoinTeam(auth.currentUser.uid, user.displayName || 'Anonymous Unit', resolvedTeamId);
                
                setStatus('success');
                // We keep success state but don't redirect to home immediately? 
                // Or inform them it's pending.
                setTimeout(() => navigate('/'), 3000);
            } else {
                throw new Error("Authorization failed.");
            }
        } catch (error) {
            setErrorMsg(error.message || "Operation Failed.");
            setStatus('error');
        }
    };

    return (
        <div className="min-h-[90vh] flex flex-col justify-center items-center p-6 bg-slate-50 dark:bg-slate-950">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 text-center border border-slate-100 dark:border-slate-800 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full translate-x-10 -translate-y-10" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -translate-x-10 translate-y-10" />

                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto mb-8 shadow-inner">
                    {status === 'error' ? <AlertTriangle size={48} className="text-rose-500" /> : <Users size={48} />}
                </div>

                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 uppercase italic leading-none">
                    Unit <span className="text-indigo-600">induction</span>
                </h1>
                <p className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.3em]">Sector: {teamName}</p>

                <div className="space-y-6 relative z-10">
                    {status === 'loading' ? (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 size={32} className="animate-spin text-indigo-600" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Decrypting Frequency...</p>
                        </div>
                    ) : status === 'success' ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/50 flex flex-col items-center"
                        >
                            <ShieldCheck size={40} className="mb-4" />
                            <p className="font-black uppercase tracking-[0.2em] text-xs">Request Transmitted</p>
                            <p className="text-[10px] font-bold opacity-60 mt-2 text-center px-4">Induction signal sent to Team Leader. You will be active once approved.</p>
                        </motion.div>
                    ) : status === 'error' ? (
                        <div className="space-y-6">
                            <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-6 rounded-[2rem] text-[11px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-800/50 leading-loose">
                                {errorMsg}
                            </div>
                            <button 
                                onClick={() => navigate('/')}
                                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                            >
                                Abort Mission
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 text-left">
                            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-800/50">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase">Unit Strength</p>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase italic">{teamSize} / 10 Active</p>
                                </div>
                                <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(teamSize/10)*100}%` }} />
                                </div>
                            </div>

                            {!user ? (
                                <div className="space-y-4">
                                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed text-center">
                                        You must establish a secure connection (Login) before you can be inducted into this Tactical Unit.
                                    </p>
                                    <button
                                        onClick={() => {
                                            sessionStorage.setItem('pendingInvite', teamId);
                                            navigate('/');
                                        }}
                                        className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <LogIn size={20} /> Establish Connection
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleJoinTeam}
                                    className="w-full h-20 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] flex flex-col items-center justify-center gap-1 shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                                >
                                    <span className="flex items-center gap-2">Accept Command <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></span>
                                    <span className="text-[9px] opacity-60 normal-case tracking-normal font-bold font-sans italic">Induct as Unit Member</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default JoinTeam;
