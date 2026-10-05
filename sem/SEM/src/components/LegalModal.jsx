import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, Info, Mail } from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../utils';

const LegalModal = () => {
    const isOpen = useAppStore((state) => state.modals.legal);
    const closeModal = useAppStore((state) => state.closeModal);

    // activeTab can be: 'privacy', 'terms', 'about', 'contact'
    const [activeTab, setActiveTab] = useState('privacy');


    const tabs = [
        { id: 'privacy', label: 'Privacy Policy', icon: Shield },
        { id: 'terms', label: 'Terms of Service', icon: FileText },
        { id: 'about', label: 'About Us', icon: Info },
        { id: 'contact', label: 'Contact', icon: Mail }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-left">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => closeModal('legal')}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-[600px]"
                    >
                    {/* Sidebar */}
                    <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-100 dark:border-slate-800 flex flex-col pt-6 shrink-0">
                        <div className="px-6 mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Legal & Info</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible custom-scrollbar">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all whitespace-nowrap min-w-max md:min-w-0 md:w-full",
                                        activeTab === tab.id
                                            ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/20"
                                            : "font-bold text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                                    )}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 relative">
                        <button
                            onClick={() => closeModal('legal')}
                            className="absolute top-4 right-4 p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                            <div className="prose dark:prose-invert max-w-none">
                                {activeTab === 'privacy' && (
                                    <>
                                        <h1 className="text-3xl font-black mb-6">Privacy Policy</h1>
                                        <p className="text-slate-500 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
                                        <h3 className="text-xl font-bold mt-8 mb-4">1. Information We Collect</h3>
                                        <p className="text-slate-600 dark:text-slate-400">We collect information that you provide directly to us when organizing or participating in college events.</p>
                                        <h3 className="text-xl font-bold mt-8 mb-4">2. How We Use Information</h3>
                                        <p className="text-slate-600 dark:text-slate-400">We use the information we collect to provide, maintain, and improve our services, and to process transactions and send related information.</p>
                                        <h3 className="text-xl font-bold mt-8 mb-4">3. Information Sharing</h3>
                                        <p className="text-slate-600 dark:text-slate-400">We do not share your personal information with third parties except as required by law or as necessary to provide our services.</p>
                                    </>
                                )}
                                {activeTab === 'terms' && (
                                    <>
                                        <h1 className="text-3xl font-black mb-6">Terms of Service</h1>
                                        <p className="text-slate-500 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
                                        <h3 className="text-xl font-bold mt-8 mb-4">1. Acceptance of Terms</h3>
                                        <p className="text-slate-600 dark:text-slate-400">By accessing or using the Student Event Manager (SEM), you agree to be bound by these Terms of Service.</p>
                                        <h3 className="text-xl font-bold mt-8 mb-4">2. Use of Service</h3>
                                        <p className="text-slate-600 dark:text-slate-400">You must use the Service in compliance with all applicable laws and not for any unlawful purpose.</p>
                                        <h3 className="text-xl font-bold mt-8 mb-4">3. Accounts</h3>
                                        <p className="text-slate-600 dark:text-slate-400">You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>
                                    </>
                                )}
                                {activeTab === 'about' && (
                                    <>
                                        <h1 className="text-3xl font-black mb-6">About Us</h1>
                                        <p className="text-slate-600 dark:text-slate-400 font-medium mb-6 leading-relaxed">
                                            The Student Event Manager (SEM) is an innovative platform tailored to modernizing
                                            how college students organize, discover, and participate in academic and extracurricular events.
                                        </p>
                                        <h3 className="text-xl font-bold mt-8 mb-4">Our Mission</h3>
                                        <p className="text-slate-600 dark:text-slate-400">To simplify event management in the educational sector, providing robust tools for team collaboration, analytics, and seamless discovery.</p>
                                    </>
                                )}
                                {activeTab === 'contact' && (
                                    <>
                                        <h1 className="text-3xl font-black mb-6">Contact Us</h1>
                                        <p className="text-slate-600 dark:text-slate-400 font-medium mb-8">We'd love to hear from you. Please reach out with any questions or concerns.</p>

                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-4 mb-4 text-indigo-600 dark:text-indigo-400">
                                                <Mail size={24} />
                                                <span className="font-bold">support@sem.edu</span>
                                            </div>
                                            <p className="text-sm text-slate-500">Expect a response within 24-48 business hours.</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
    );
};

export default LegalModal;
