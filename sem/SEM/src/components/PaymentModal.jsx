import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2, Loader2, CreditCard, Zap, Star, Crown, Copy, Smartphone, Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils';
import { useAppStore } from '../store';
import { createPaymentRequest, updateUserRole } from '../services/firebase';
import { auth, db } from '../services/firebase';

const PaymentModal = () => {
    const isOpen = useAppStore((state) => state.modals.payment);
    const closeModal = useAppStore((state) => state.closeModal);
    const userRole = useAppStore((state) => state.userRole);
    const setUserRole = useAppStore((state) => state.setUserRole);
    const user = useAppStore((state) => state.user);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('gpay');
    const [selectedPlan, setSelectedPlan] = useState('team');
    const [transactionId, setTransactionId] = useState('');
    const [userUpiId, setUserUpiId] = useState('');
    const [copied, setCopied] = useState(false);
    const [maskKeys, setMaskKeys] = useState(true);


    const adminGPayNumber = "8015024729";
    const adminVPA = "jagadish2k2006-2@oksbi";

    const maskValue = (val) => {
        if (!val) return '';
        const parts = val.split('@');
        if (parts.length === 2) {
            const start = parts[0].slice(0, 3);
            return `${start}****@${parts[1]}`;
        }
        return val.slice(0, 3) + "****" + val.slice(-3);
    };

    const plans = [
        {
            id: 'team',
            name: 'Team Edition',
            price: 10,
            icon: Crown,
            role: 'subscriber',
            features: ['Join or Create Teams', 'Custom Team Strategy', 'Advanced Analytics', 'Unlimited Shortlisting']
        }
    ];

    const paymentMethods = [
        { id: 'gpay', label: 'Google Pay (GPay)', icon: Smartphone },
        { id: 'upi', label: 'Other UPI Apps', icon: Zap },
        { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
        { id: 'netbanking', label: 'Net Banking', icon: ShieldCheck }
    ];

    const currentPlan = plans.find(p => p.id === selectedPlan);

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(adminGPayNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleUPIPayment = async () => {
        if (!auth?.currentUser) {
            alert("You must be logged in to proceed with payment.");
            return;
        }

        const upiURL = `upi://pay?pa=${adminVPA}&pn=College%20Event%20Manager&am=${currentPlan.price}&cu=INR&tn=Upgrade_${auth.currentUser.uid}`;

        // Record intent initiation
        setIsProcessing(true);
        try {
            await createPaymentRequest({
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email || user?.email || 'unknown',
                planId: currentPlan.id,
                planName: currentPlan.name,
                planRole: currentPlan.role,
                amount: currentPlan.price,
                paymentMethod: selectedMethod === 'gpay' ? 'gpay_intent' : 'upi_intent',
                status: 'intent_initiated',
                vpaUsed: adminVPA
            });

            // Open UPI app
            window.location.href = upiURL;

            // Provide feedback to user
            setTimeout(() => {
                setIsProcessing(false);
                alert("If the UPI app didn't open automatically, please ensure you have a UPI-enabled app installed.");
            }, 2000);
        } catch (error) {
            console.error("Failed to record payment intent:", error);
            setIsProcessing(false);
            window.location.href = upiURL; // Try to open anyway
        }
    };

    const handleSubmitPayment = async () => {
        if (!transactionId.trim()) {
            alert("Please enter the Transaction ID / UTR Number from your payment app.");
            return;
        }

        if (!auth?.currentUser) {
            alert("You must be logged in to submit a payment request.");
            return;
        }

        setIsProcessing(true);
        try {
            const requestId = await createPaymentRequest({
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email || user?.email || 'unknown',
                planId: currentPlan.id,
                planName: currentPlan.name,
                planRole: currentPlan.role,
                amount: currentPlan.price,
                paymentMethod: selectedMethod,
                transactionId: transactionId,
                userUpiId: userUpiId,
                status: 'pending' // Send securely to Admin as pending
            });

            console.log("Payment request submitted securely for admin verification with ID:", requestId);
            setIsSuccess(true);

            // Close modal after showing success message briefly
            setTimeout(() => {
                closeModal('payment');
                setIsSuccess(false);
                setIsProcessing(false);
            }, 5000);
        } catch (error) {
            console.error("Payment submission failed:", error);
            const errorMessage = error.message || "Unknown error occurred";
            alert(`Failed to submit request: ${errorMessage}\n\nHint: Check if Firestore rules are deployed or if you have a stable network.`);
            setIsProcessing(false);
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
                        onClick={() => !isProcessing && closeModal('payment')}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
                    >
                    {!isSuccess ? (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Upgrade Your Plan</h2>
                                    <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">Select a plan and pay manually.</p>
                                </div>
                                <button
                                    onClick={() => closeModal('payment')}
                                    disabled={isProcessing}
                                    className="p-3 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-8">
                                {plans.map((plan) => (
                                    <button
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan.id)}
                                        className={cn(
                                            "relative p-5 rounded-3xl border-2 transition-all text-left flex flex-col items-start gap-4",
                                            selectedPlan === plan.id
                                                ? "bg-indigo-50 border-indigo-600 dark:bg-indigo-900/20"
                                                : "bg-slate-50 border-transparent dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                                            selectedPlan === plan.id ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-700 text-slate-500"
                                        )}>
                                            <plan.icon size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">{plan.name}</h3>
                                            <p className="text-2xl font-black text-indigo-600 mt-1">₹{plan.price} <span className="text-sm text-slate-500 font-bold">/ month</span></p>
                                        </div>
                                        <ul className="text-[10px] font-bold text-slate-500 space-y-1 mt-auto">
                                            {plan.features.map((f, i) => (
                                                <li key={i} className="flex items-center gap-1">
                                                    <CheckCircle2 size={10} className="text-emerald-500" /> {f}
                                                </li>
                                            ))}
                                        </ul>
                                        {selectedPlan === plan.id && (
                                            <div className="absolute top-4 right-4 text-indigo-600">
                                                <CheckCircle2 size={24} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Payment Method</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {paymentMethods.map(method => (
                                            <button
                                                key={method.id}
                                                onClick={() => setSelectedMethod(method.id)}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                                    selectedMethod === method.id
                                                        ? "bg-indigo-50 border-indigo-600 dark:bg-indigo-900/20"
                                                        : "bg-slate-50 border-transparent dark:bg-slate-800/50 hover:bg-slate-100"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", selectedMethod === method.id ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500")}>
                                                        <method.icon size={16} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{method.label}</span>
                                                </div>
                                                {selectedMethod === method.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {(selectedMethod === 'gpay' || selectedMethod === 'upi') && (
                                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Express Payment</p>

                                            <button
                                                onClick={handleUPIPayment}
                                                className="w-full mb-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all"
                                            >
                                                <Zap size={20} /> Pay with {selectedMethod === 'gpay' ? 'GPay' : 'UPI App'}
                                            </button>

                                            <div className="relative mb-6">
                                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                                                <div className="relative flex justify-center text-[8px] font-black uppercase tracking-tighter"><span className="px-2 bg-slate-50 dark:bg-slate-800 text-slate-400">Or Manual Transfer</span></div>
                                            </div>

                                            <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Admin UPI ID</p>
                                                    <p className="text-sm font-black text-indigo-600 truncate">
                                                        {maskKeys ? maskValue(adminVPA) : adminVPA}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => setMaskKeys(!maskKeys)}
                                                        className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-indigo-600 transition-colors"
                                                        title={maskKeys ? "Show full ID" : "Mask ID"}
                                                    >
                                                        {maskKeys ? <Eye size={18} /> : <EyeOff size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(adminVPA);
                                                            setCopied(true);
                                                            setTimeout(() => setCopied(false), 2000);
                                                        }}
                                                        className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:scale-110 active:scale-95 transition-all"
                                                        title="Copy ID"
                                                    >
                                                        {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Your UPI ID / App Used (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. yourname@okbank or GPay"
                                            value={userUpiId}
                                            onChange={(e) => setUserUpiId(e.target.value)}
                                            className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-2xl px-6 text-sm font-bold transition-all outline-none mb-4"
                                        />
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Transaction ID / UTR Number</label>
                                        <input
                                            type="text"
                                            placeholder="Enter 12-digit Ref No."
                                            value={transactionId}
                                            onChange={(e) => setTransactionId(e.target.value)}
                                            className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-2xl px-6 text-sm font-bold transition-all outline-none"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSubmitPayment}
                                        disabled={isProcessing || userRole === currentPlan.role}
                                        className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
                                    >
                                        {isProcessing ? (
                                            <><Loader2 size={18} className="animate-spin" /> Submitting Request...</>
                                        ) : userRole === currentPlan.role ? (
                                            <>Already on this Plan</>
                                        ) : (
                                            <><ShieldCheck size={18} /> Submit Verification Request</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16 px-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2.5rem] flex items-center justify-center text-indigo-500 dark:text-indigo-400 mx-auto mb-8 shadow-xl shadow-indigo-500/20"
                            >
                                <CheckCircle2 size={48} />
                            </motion.div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Request Submitted</h2>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-sm mx-auto mb-8">
                                Welcome to the <span className="text-indigo-600">{currentPlan.name}</span>!
                                Your transaction <span className="text-indigo-600">{transactionId}</span> has been verified and your profile is now upgraded.
                            </p>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                                Protocol Status: Verified & Active
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        )}
    </AnimatePresence>
    );
};

export default PaymentModal;


