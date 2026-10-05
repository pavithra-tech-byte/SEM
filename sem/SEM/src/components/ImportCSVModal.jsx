import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { importCSV } from '../csvUtils';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, FileUp, Info, Database, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';

const ImportCSVModal = () => {
    const modals = useAppStore((state) => state.modals);
    const closeModal = useAppStore((state) => state.closeModal);
    const isOpen = modals.importCSV;

    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
            setFile(selectedFile);
            setResult(null);
        } else {
            setResult({ success: false, error: 'INVALID_FILE_TYPE: Please select a verified CSV file node.' });
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setIsImporting(true);
        try {
            const importResult = await importCSV(file);
            setResult(importResult);
            if (importResult.success) {
                // Success feedback duration
                setTimeout(() => {
                    handleClose();
                }, 3000);
            }
        } catch (error) {
            console.error('Injection error:', error);
            setResult({ success: false, error: error.message });
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        closeModal('importCSV');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden flex flex-col"
                    >
                {/* Header Subsystem */}
                <div className="bg-slate-950 p-6 sm:p-8 text-white flex items-center justify-between border-b border-white/10 relative">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 border border-white/10">
                            <FileUp size={24} strokeWidth={3} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight leading-none mb-1">Data <span className="text-indigo-400">Injection</span></h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CSV Node Import Portal</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all border border-white/5">
                        <X size={20} />
                    </button>
                    {/* Animated Pulse */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                </div>

                <div className="p-6 sm:p-10">
                    <AnimatePresence mode="wait">
                        {!result ? (
                            <motion.div 
                                key="upload"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Info size={16} className="text-indigo-500" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Protocol Requirements</h4>
                                    </div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                        Upload a CSV file containing event nodes. The intelligence matrix will auto-align columns for College, Event, Dates, and Prize information.
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        {['College Name', 'Event Name', 'Prize Amount', 'Deadlines'].map(item => (
                                            <div key={item} className="flex items-center gap-2 text-[9px] font-black uppercase text-indigo-500">
                                                <div className="w-1 h-1 rounded-full bg-indigo-500" /> {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "group relative border-4 border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all duration-500 overflow-hidden",
                                        file 
                                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20" 
                                            : "border-slate-100 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                                    
                                    <div className="relative z-10">
                                        {file ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-20 h-20 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-2xl mb-6 transform group-hover:scale-110 transition-transform">
                                                    <FileSpreadsheet size={32} strokeWidth={3} />
                                                </div>
                                                <p className="text-lg font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">{file.name}</p>
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-100 dark:bg-indigo-900/50 px-3 py-1 rounded-full">
                                                    Ready for Injection: {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                                                    <Upload size={32} strokeWidth={3} />
                                                </div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white mb-1 uppercase tracking-widest">Transmit CSV Data Packet</p>
                                                <p className="text-xs font-bold text-slate-400">Click to browse or drop file here</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Grid Pattern BG */}
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="result"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8"
                            >
                                {result.success ? (
                                    <div className="space-y-8">
                                        <div className="w-24 h-24 rounded-[2rem] bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                                            <CheckCircle size={48} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Injection Successful</h4>
                                            <p className="text-slate-500 font-bold">Data stream merged with local database grid.</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                            <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
                                                <p className="text-3xl font-black text-indigo-600 mb-1">{result.count.added}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Nodes</p>
                                            </div>
                                            <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
                                                <p className="text-3xl font-black text-violet-600 mb-1">{result.count.updated}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Updated</p>
                                            </div>
                                        </div>

                                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                            <Database size={14} /> Total Records Processed: {result.count.added + result.count.updated}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="w-24 h-24 rounded-[2rem] bg-rose-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/30">
                                            <AlertCircle size={48} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Injection Failure</h4>
                                            <p className="text-rose-500 font-bold uppercase text-[10px] tracking-widest mb-4">Error Code: PARSE_EX_V1</p>
                                            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                                                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{result.error}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setResult(null)} className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">Abort and Retry</button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Actions Subsystem */}
                {!result && (
                    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                        <button onClick={handleClose} className="px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">Cancel Mission</button>
                        <button
                            onClick={handleImport}
                            disabled={!file || isImporting}
                            className="flex-1 max-w-[240px] h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
                        >
                            {isImporting ? (
                                <>
                                    <div className="w-5 h-5 border-4 border-slate-400 border-t-indigo-500 rounded-full animate-spin" />
                                    Injecting...
                                </>
                            ) : (
                                <>
                                    Execute Batch Import
                                    <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ImportCSVModal;
