/**
 * 🔒 CONSENT MODAL
 *
 * Shown once to every new user on first launch (before anything else).
 * User must check both checkboxes and click "Agree & Continue" to proceed.
 * Acceptance is persisted in the Zustand store (localStorage).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileText, CheckCircle2, Circle, Zap, Lock } from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../utils';

const ConsentModal = () => {
    const hasAcceptedTerms = useAppStore((state) => state.hasAcceptedTerms);
    const setHasAcceptedTerms = useAppStore((state) => state.setHasAcceptedTerms);
    const openModal = useAppStore((state) => state.openModal);
    const user = useAppStore((state) => state.user);

    const [agreedPrivacy, setAgreedPrivacy] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [declined, setDeclined] = useState(false);

    const canProceed = agreedPrivacy && agreedTerms;

    const handleAccept = () => {
        if (!canProceed) return;
        setHasAcceptedTerms(true);
    };

    // Already accepted or not logged in — render nothing
    if (hasAcceptedTerms || !user) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                    {/* Top gradient bar */}
                    <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600" />

                    <div className="p-5 sm:p-6">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                    Before You Begin
                                </h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                                    Student Event Manager
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-5">
                            To use SEM you must read and agree to our policies.
                            Your data is stored securely and never sold.
                        </p>

                        {/* Policy Cards */}
                        <div className="space-y-2.5 mb-5">
                            {/* Privacy Policy */}
                            <button
                                onClick={() => setAgreedPrivacy(v => !v)}
                                className={cn(
                                    "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all group",
                                    agreedPrivacy
                                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500"
                                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                                )}
                            >
                                <div className={cn("mt-0.5 shrink-0 transition-colors", agreedPrivacy ? "text-indigo-600" : "text-slate-300 dark:text-slate-600")}>
                                    {agreedPrivacy ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Shield size={12} className="text-indigo-500" />
                                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                            Privacy Policy
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                        We collect only necessary info. Your data is not sold and can be deleted on request.
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openModal('legal'); }}
                                        className="mt-1.5 text-[9px] font-black text-indigo-600 hover:underline uppercase tracking-widest"
                                    >
                                        Read Policy →
                                    </button>
                                </div>
                            </button>

                            {/* Terms of Service */}
                            <button
                                onClick={() => setAgreedTerms(v => !v)}
                                className={cn(
                                    "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all group",
                                    agreedTerms
                                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500"
                                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                                )}
                            >
                                <div className={cn("mt-0.5 shrink-0 transition-colors", agreedTerms ? "text-indigo-600" : "text-slate-300 dark:text-slate-600")}>
                                    {agreedTerms ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <FileText size={12} className="text-violet-500" />
                                        <span className="text-[9px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                                            Terms of Service
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                        You agree not to misuse the platform or bypass role controls.
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openModal('legal'); }}
                                        className="mt-1.5 text-[9px] font-black text-violet-600 hover:underline uppercase tracking-widest"
                                    >
                                        Read Terms →
                                    </button>
                                </div>
                            </button>
                        </div>

                        {/* Declined warning */}
                        <AnimatePresence>
                            {declined && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="mb-3 px-3 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 text-center"
                                >
                                    You must agree to both policies.
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                            <motion.button
                                onClick={() => {
                                    if (!canProceed) { setDeclined(true); return; }
                                    handleAccept();
                                }}
                                whileTap={{ scale: 0.97 }}
                                className={cn(
                                    "w-full h-10 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all",
                                    canProceed
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                <Zap size={14} />
                                Agree & Continue
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConsentModal;
