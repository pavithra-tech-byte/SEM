import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare, Star, Loader2, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { cn } from '../utils';

const FeedbackModal = () => {
    const isOpen = useAppStore((state) => state.modals.feedback);
    const closeModal = useAppStore((state) => state.closeModal);
    const userRole = useAppStore((state) => state.userRole);
    const cloudProvider = useAppStore((state) => state.cloudProvider);

    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);


    const handleSubmit = async () => {
        if (rating === 0) {
            alert('Please select a rating before submitting.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (cloudProvider === 'firestore' && auth?.currentUser) {
                await addDoc(collection(db, 'feedbacks'), {
                    userId: auth.currentUser.uid,
                    userEmail: auth.currentUser.email || 'unknown',
                    role: userRole,
                    rating,
                    feedback,
                    timestamp: serverTimestamp()
                });
            } else {
                // local fallback
                console.log('Local Feedback Submitted:', { rating, feedback });
            }

            setIsSuccess(true);
            setTimeout(() => {
                closeModal('feedback');
                setIsSuccess(false);
                setRating(0);
                setFeedback('');
                setIsSubmitting(false);
            }, 3000);
        } catch (error) {
            console.error('Feedback submission failed:', error);
            alert('Failed to submit feedback. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => !isSubmitting && closeModal('feedback')}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
                    >
                    {!isSuccess ? (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                                        <MessageSquare size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Share Your Feedback</h2>
                                    <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">Help us improve the SEM platform</p>
                                </div>
                                <button
                                    onClick={() => closeModal('feedback')}
                                    disabled={isSubmitting}
                                    className="p-3 bg-slate-50 border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 block mb-3">How would you rate your experience?</label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="transition-transform hover:scale-110 focus:outline-none"
                                            >
                                                <Star
                                                    size={36}
                                                    fill={(hoverRating || rating) >= star ? "currentColor" : "none"}
                                                    className={cn(
                                                        "transition-colors",
                                                        (hoverRating || rating) >= star ? "text-amber-400" : "text-slate-200 dark:text-slate-700"
                                                    )}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 block mb-2">Any thoughts or suggestions? (Optional)</label>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Tell us what you love or what could be better..."
                                        rows={4}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-2xl p-4 text-sm font-bold text-slate-700 dark:text-slate-200 resize-none transition-all outline-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> Submitting...</>
                                    ) : (
                                        <><Send size={18} /> Submit Feedback</>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 px-8">
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6 shadow-xl"
                            >
                                <CheckCircle2 size={40} />
                            </motion.div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Thank You!</h2>
                            <p className="text-sm font-bold text-slate-500">Your feedback has been submitted successfully.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        )}
    </AnimatePresence>
    );
};

export default FeedbackModal;
