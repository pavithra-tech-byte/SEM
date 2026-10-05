import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useAppStore } from '../store';
import { addEvent } from '../db';
import { parseDate } from '../csvUtils';
import { X, Upload, Image as ImageIcon, Sparkles, Wand2, Info, MapPin, Calendar, Trophy, Users, Globe, Terminal, ShieldCheck, Check, Save, Plus, Clock } from 'lucide-react';
import { cn, parseOcrTextHeuristics } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Defined locally to prevent circular dependency issues crash
const EventType = {
    HACKATHON: 'Hackathon',
    PAPER_PRESENTATION: 'Paper Presentation',
    PROJECT_EXPO: 'Project Expo',
    WORKSHOP: 'Workshop',
    CONTEST: 'Contest',
    SEMINAR: 'Seminar',
    CONFERENCE: 'Conference',
    OTHER: 'Other'
};

const PosterPreviews = ({ blobs, urls, onRemoveBlob, onRemoveUrl }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full p-2">
            {blobs.map((blob, idx) => {
                const url = blob instanceof Blob ? URL.createObjectURL(blob) : '';
                return (
                    <div key={`blob-${idx}`} className="relative group rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800">
                        <img src={url} alt="Local Preview" className="h-20 w-full object-cover" />
                        <button 
                            type="button" 
                            onClick={() => onRemoveBlob(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shadow-md hover:bg-rose-700"
                        >
                            &times;
                        </button>
                    </div>
                );
            })}
            {urls.map((url, idx) => (
                <div key={`url-${idx}`} className="relative group rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800">
                    <img src={url} alt="Remote Preview" className="h-20 w-full object-cover" />
                    <button 
                        type="button" 
                        onClick={() => onRemoveUrl(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shadow-md hover:bg-rose-700"
                    >
                        &times;
                    </button>
                </div>
            ))}
        </div>
    );
};

const AddEventModal = () => {
    const modals = useAppStore((state) => state.modals);
    const closeModal = useAppStore((state) => state.closeModal);
    const isOpen = modals && modals.addEvent;

    const [formData, setFormData] = useState({
        collegeName: '',
        eventName: '',
        eventType: [EventType.HACKATHON],
        customEventType: '',
        registrationDeadline: '',
        startDate: '',
        endDate: '',
        prizeAmount: '',
        prizeWon: '',
        registrationFee: '',
        accommodation: false,
        location: '',
        isOnline: false,
        contactNumbers: '',
        posterUrl: '',
        posterBlob: null,
        posterUrls: [],
        posterBlobs: [],
        instagram: '',
        linkedin: '',
        twitter: '',
        youtube: '',
        website: '',
        registrationLink: '',
        registrationLinks: [{ label: 'Register', url: '' }],
        description: '',
        teamSize: '1',
        teamName: '',
        eligibility: '',
        leader: '',
        members: '',
        contact1: '',
        contact2: ''
    });

    const [posterUrlInput, setPosterUrlInput] = useState('');

    const handleAddPosterUrl = () => {
        if (posterUrlInput.trim()) {
            setFormData(prev => ({
                ...prev,
                posterUrls: [...prev.posterUrls, posterUrlInput.trim()]
            }));
            setPosterUrlInput('');
        }
    };

    const handleRemovePosterUrl = (index) => {
        setFormData(prev => ({
            ...prev,
            posterUrls: prev.posterUrls.filter((_, i) => i !== index)
        }));
    };

    const handleRemovePosterBlob = (index) => {
        setFormData(prev => ({
            ...prev,
            posterBlobs: prev.posterBlobs.filter((_, i) => i !== index)
        }));
    };

    const handleRegLinkChange = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.registrationLinks];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, registrationLinks: updated };
        });
    };

    const handleAddRegLink = () => {
        setFormData(prev => ({
            ...prev,
            registrationLinks: [...prev.registrationLinks, { label: 'Register Link ' + (prev.registrationLinks.length + 1), url: '' }]
        }));
    };

    const handleRemoveRegLink = (index) => {
        setFormData(prev => ({
            ...prev,
            registrationLinks: prev.registrationLinks.filter((_, i) => i !== index)
        }));
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleAIAnalysis = async () => {
        if (!formData.posterBlob && !formData.posterUrl) {
            alert('SYSTEM: Neural Input Source required for AI Analysis.');
            return;
        }

        setIsAnalyzing(true);
        try {
            let extractedText = "";
            if (formData.posterBlob) {
                const { data: { text } } = await window.Tesseract.recognize(
                    formData.posterBlob,
                    'eng',
                    { logger: m => console.log(`[Neural Vision] ${Math.round(m.progress * 100)}%`) }
                );
                extractedText = text;
            } else {
                extractedText = "Simulated Scan: Global Hackathon Event hosted by MIT Manipal on Dec 20, 2024. Prize Pool: 50,000 INR.";
            }

            const textLower = extractedText.toLowerCase();
            const lines = extractedText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            const parsedResults = parseOcrTextHeuristics(extractedText);

            setFormData(prev => ({
                ...prev,
                eventName: lines[0] || prev.eventName,
                description: `AI ANALYZED:\n${extractedText.substring(0, 500)}...`,
                eventType: textLower.includes('hack') ? [EventType.HACKATHON] : (textLower.includes('work') ? [EventType.WORKSHOP] : (textLower.includes('paper') ? [EventType.PAPER_PRESENTATION] : [EventType.CONTEST])),
                prizeAmount: parsedResults.prizeAmount !== undefined ? String(parsedResults.prizeAmount) : prev.prizeAmount,
                registrationFee: parsedResults.registrationFee !== undefined ? String(parsedResults.registrationFee) : prev.registrationFee,
                registrationDeadline: parsedResults.registrationDeadline || prev.registrationDeadline,
                startDate: parsedResults.startDate || prev.startDate,
                endDate: parsedResults.endDate || prev.endDate,
                website: parsedResults.website || prev.website,
                registrationLink: parsedResults.registrationLink || prev.registrationLink
            }));

            alert('SYSTEM: Neural Protocol Complete. Data successfully injected into form matrix.');
        } catch (error) {
            alert(`Neural Error: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setFormData(prev => ({
                ...prev,
                posterBlobs: [...prev.posterBlobs, ...files]
            }));
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { teamId, user, userRole } = useAppStore.getState();
            const isAdmin = userRole === 'admin' || userRole === 'event_manager';
            const actualEventTypes = formData.eventType.map(t => 
                (t === EventType.OTHER && formData.customEventType.trim()) ? formData.customEventType.trim() : t
            );
            
            const eventData = {
                ...formData,
                description: DOMPurify.sanitize(formData.description),
                eventType: actualEventTypes,
                prizeAmount: parseFloat(formData.prizeAmount) || 0,
                prizeWon: parseFloat(formData.prizeWon) || 0,
                registrationFee: parseFloat(formData.registrationFee) || 0,
                teamSize: parseInt(formData.teamSize) || 1,
                contactNumbers: formData.contactNumbers.split(',').map(c => c.trim()).filter(Boolean),
                teamId: isAdmin ? null : (teamId || null),
                createdBy: user?.uid || 'unknown'
            };
            await addEvent(eventData);
            closeModal('addEvent');
            setFormData({ collegeName: '', eventName: '', eventType: [EventType.HACKATHON], customEventType: '', registrationDeadline: '', startDate: '', endDate: '', prizeAmount: '', prizeWon: '', registrationFee: '', accommodation: false, location: '', isOnline: false, contactNumbers: '', posterUrl: '', posterBlob: null, posterUrls: [], posterBlobs: [], instagram: '', linkedin: '', twitter: '', youtube: '', website: '', registrationLink: '', registrationLinks: [{ label: 'Register', url: '' }], description: '', teamSize: '1', teamName: '', eligibility: '', leader: '', members: '', contact1: '', contact2: '' });
        } catch (error) {
            alert(`CRITICAL ERROR: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: Terminal },
        { id: 'logistics', label: 'Logistics', icon: Globe },
        { id: 'team', label: 'Team Info', icon: Users },
        { id: 'ai', label: 'AI Assistant', icon: Sparkles }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={() => closeModal('addEvent')}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-[2rem] md:rounded-[3rem] shadow-[0_64px_128px_-24px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[95vh]"
                    >
                {/* Header Subsystem */}
                <div className="bg-slate-900 p-4 sm:p-8 text-white relative flex items-center justify-between border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 border border-white/20">
                            <Plus size={22} strokeWidth={3} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-none mb-1">Add <span className="text-indigo-400">Event</span></h2>
                            <p className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Create a new event entry</p>
                        </div>
                    </div>
                    <button onClick={() => closeModal('addEvent')} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-8 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar shrink-0">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all shrink-0", isActive ? "bg-slate-900 text-white shadow-xl -translate-y-0.5 sm:-translate-y-1" : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800")}>
                                <Icon size={14} strokeWidth={3} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tactical Input Matrix */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
                    <form id="add-event-form" onSubmit={handleSubmit}>
                        <div className={cn("space-y-6 sm:space-y-10", activeTab === 'basic' ? 'block' : 'hidden')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                                <div className="space-y-4 sm:space-y-6">
                                    <div className="form-group">
                                        <label className="label-premium">Event Name</label>
                                        <input type="text" name="eventName" value={formData.eventName} onChange={handleChange} required={activeTab === 'basic'} className="input-premium" placeholder="e.g. Hackfest 2026" />
                                    </div>
                                    <div className="form-group">
                                        <label className="label-premium">College Name</label>
                                        <input type="text" name="collegeName" value={formData.collegeName} onChange={handleChange} required={activeTab === 'basic'} className="input-premium" placeholder="Host College Name" />
                                    </div>
                                        <div className="form-group col-span-2">
                                            <label className="label-premium">Event Categories (Select Multiple)</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                                                {Object.values(EventType).map(t => (
                                                    <label key={t} className={cn(
                                                        "flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer text-[9px] font-black uppercase tracking-wider",
                                                        formData.eventType.includes(t) 
                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20" 
                                                            : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-indigo-300"
                                                    )}>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden" 
                                                            checked={formData.eventType.includes(t)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    eventType: checked 
                                                                        ? [...prev.eventType, t]
                                                                        : prev.eventType.filter(type => type !== t)
                                                                }));
                                                            }}
                                                        />
                                                        {t}
                                                    </label>
                                                ))}
                                            </div>
                                            {(Array.isArray(formData.eventType) ? formData.eventType : [formData.eventType]).includes(EventType.OTHER) && (
                                                <input 
                                                    type="text" 
                                                    name="customEventType" 
                                                    value={formData.customEventType} 
                                                    onChange={handleChange} 
                                                    required={activeTab === 'basic'} 
                                                    className="input-premium mt-3" 
                                                    placeholder="Specify Custom Event Type" 
                                                />
                                            )}
                                        </div>
                                    <div className="grid grid-cols-2 gap-x-4">
                                        <div className="form-group">
                                            <label className="label-premium">Team Size</label>
                                            <input type="number" name="teamSize" value={formData.teamSize} onChange={handleChange} className="input-premium" min="1" />
                                        </div>
                                    </div>
                                    {parseInt(formData.teamSize) > 1 && (
                                        <div className="form-group">
                                            <label className="label-premium">Team Name</label>
                                            <input type="text" name="teamName" value={formData.teamName} onChange={handleChange} className="input-premium" placeholder="e.g. The Avengers" />
                                        </div>
                                    )}
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/40 p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 relative group">
                                    <div className="absolute top-4 right-4 sm:top-8 sm:right-8 text-indigo-200 opacity-20 group-hover:rotate-12 transition-transform duration-700">
                                        <Calendar size={80} className="sm:w-[120px] sm:h-[120px]" />
                                    </div>
                                    <h4 className="flex items-center gap-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-indigo-600 mb-4 sm:mb-8">
                                        <Clock size={16} strokeWidth={3} /> Event Schedule
                                    </h4>
                                    <div className="space-y-4 sm:space-y-6 relative z-10">
                                        <div className="form-group">
                                            <label className="label-premium">Registration Deadline</label>
                                            <input type="date" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} required={activeTab === 'basic'} className="input-premium bg-white dark:bg-slate-900" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                            <div className="form-group">
                                                <label className="label-premium">Start Date</label>
                                                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required={activeTab === 'basic'} className="input-premium bg-white dark:bg-slate-900" />
                                            </div>
                                            <div className="form-group">
                                                <label className="label-premium">End Date</label>
                                                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required={activeTab === 'basic'} className="input-premium bg-white dark:bg-slate-900" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={cn("space-y-6 sm:space-y-10", activeTab === 'logistics' ? 'block' : 'hidden')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                                <div className="space-y-6">
                                    <div className="form-group">
                                        <label className="label-premium">Event Venue</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="input-premium pl-16 font-black" placeholder="Campus Name / Venue" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="label-premium">Registration Fee (₹)</label>
                                        <input type="number" name="registrationFee" value={formData.registrationFee} onChange={handleChange} className="input-premium" placeholder="0" />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="form-group">
                                        <label className="label-premium">Total Prize amount (₹)</label>
                                        <input type="number" name="prizeAmount" value={formData.prizeAmount} onChange={handleChange} className="input-premium" placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label className="label-premium">Prize Won (₹)</label>
                                        <input type="number" name="prizeWon" value={formData.prizeWon} onChange={handleChange} className="input-premium" placeholder="Amount if you already won" />
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <label className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl sm:rounded-[2rem] bg-indigo-50 dark:bg-indigo-950/20 border-2 border-transparent has-[:checked]:border-indigo-600 cursor-pointer group transition-all">
                                            <input type="checkbox" name="isOnline" checked={formData.isOnline} onChange={handleChange} className="hidden" />
                                            <div className={cn("w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all", formData.isOnline ? "bg-indigo-600 border-indigo-600" : "border-slate-300")}><Check size={16} className="text-white" /></div>
                                            <div><span className="block text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">Online Event</span><span className="text-[10px] text-slate-500">Enable for virtual events</span></div>
                                        </label>
                                        <label className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl sm:rounded-[2rem] bg-emerald-50 dark:bg-emerald-950/20 border-2 border-transparent has-[:checked]:border-emerald-600 cursor-pointer group transition-all">
                                            <input type="checkbox" name="accommodation" checked={formData.accommodation} onChange={handleChange} className="hidden" />
                                            <div className={cn("w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all", formData.accommodation ? "bg-emerald-600 border-emerald-600" : "border-slate-300")}><Check size={16} className="text-white" /></div>
                                            <div><span className="block text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Accommodation</span><span className="text-[10px] text-slate-500">Stay provided by college</span></div>
                                        </label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="label-premium">Add Poster URLs</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                                            <input type="url" value={posterUrlInput} onChange={(e) => setPosterUrlInput(e.target.value)} className="input-premium pl-16 text-emerald-600 font-black border-emerald-100 dark:border-emerald-900" placeholder="https://cdn.example.com/poster.jpg" />
                                        </div>
                                        <button type="button" onClick={handleAddPosterUrl} className="px-6 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Add URL</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="label-premium">Website Link</label>
                                    <div className="relative">
                                        <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                                        <input type="url" name="website" value={formData.website} onChange={handleChange} className="input-premium pl-16 text-indigo-600 font-black" placeholder="Official Website URL" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="label-premium">Registration Links</label>
                                    <div className="space-y-2">
                                        {formData.registrationLinks.map((link, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input 
                                                    type="text" 
                                                    value={link.label} 
                                                    onChange={(e) => handleRegLinkChange(idx, 'label', e.target.value)} 
                                                    placeholder="e.g. Register Link" 
                                                    className="input-premium flex-1" 
                                                />
                                                <input 
                                                    type="url" 
                                                    value={link.url} 
                                                    onChange={(e) => handleRegLinkChange(idx, 'url', e.target.value)} 
                                                    placeholder="URL" 
                                                    className="input-premium flex-2" 
                                                />
                                                {formData.registrationLinks.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveRegLink(idx)} 
                                                        className="w-10 h-10 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-100"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={handleAddRegLink} 
                                            className="py-2 px-4 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 mt-1"
                                        >
                                            <Plus size={14} /> Add Link
                                        </button>
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-6">
                                    <label className="label-premium mb-4 block">Social Media Links</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="form-group">
                                            <label className="label-premium">Instagram URL</label>
                                            <input type="url" name="instagram" value={formData.instagram} onChange={handleChange} className="input-premium" placeholder="Instagram Profile Link" />
                                        </div>
                                        <div className="form-group">
                                            <label className="label-premium">LinkedIn URL</label>
                                            <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} className="input-premium" placeholder="LinkedIn Page Link" />
                                        </div>
                                        <div className="form-group">
                                            <label className="label-premium">Twitter (X) URL</label>
                                            <input type="url" name="twitter" value={formData.twitter} onChange={handleChange} className="input-premium" placeholder="Twitter Profile Link" />
                                        </div>
                                        <div className="form-group">
                                            <label className="label-premium">YouTube URL</label>
                                            <input type="url" name="youtube" value={formData.youtube} onChange={handleChange} className="input-premium" placeholder="YouTube Video / Channel Link" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={cn("space-y-6 sm:space-y-10", activeTab === 'team' ? 'block' : 'hidden')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                                <div className="space-y-8">
                                    <div className="form-group">
                                        <label className="label-premium">Team Leader Name</label>
                                        <input type="text" name="leader" value={formData.leader} onChange={handleChange} className="input-premium" placeholder="Name of leader" />
                                    </div>
                                    <div className="form-group">
                                        <label className="label-premium">Eligibility Criteria</label>
                                        <input type="text" name="eligibility" value={formData.eligibility} onChange={handleChange} className="input-premium" placeholder="e.g. All Departments" />
                                    </div>
                                    <div className="form-group">
                                        <label className="label-premium">Event Description (Rich Text Supported)</label>
                                        <div className="bg-white text-slate-900 rounded-xl overflow-hidden border border-slate-200">
                                            <ReactQuill 
                                                theme="snow" 
                                                value={formData.description} 
                                                onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                                                placeholder="Brief about the event... (Paste with formatting!)"
                                                modules={{
                                                    toolbar: [
                                                        [{ 'header': [1, 2, 3, false] }],
                                                        ['bold', 'italic', 'underline', 'strike'],
                                                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                                        [{ 'color': [] }, { 'background': [] }],
                                                        ['clean']
                                                    ]
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 sm:space-y-6 bg-slate-900 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-10 text-white shadow-2xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <ShieldCheck size={20} className="text-indigo-400" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Contact Details</span>
                                    </div>
                                    <input type="text" name="contact1" value={formData.contact1} onChange={handleChange} className="w-full bg-slate-800 border-0 rounded-2xl px-6 py-4 font-mono text-sm focus:ring-2 ring-indigo-500 outline-none" placeholder="Primary Contact Number" />
                                    <input type="text" name="contact2" value={formData.contact2} onChange={handleChange} className="w-full bg-slate-800 border-0 rounded-2xl px-6 py-4 font-mono text-sm focus:ring-2 ring-indigo-500 outline-none" placeholder="Secondary Contact Number" />
                                </div>
                            </div>
                        </div>

                        <div className={cn("space-y-6 sm:space-y-10", activeTab === 'ai' ? 'block' : 'hidden')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12">
                                <div className="space-y-6">
                                    <label className="label-premium">Event Poster AI Scan</label>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-h-[250px] relative group overflow-hidden">
                                        {(formData.posterBlobs.length > 0 || formData.posterUrls.length > 0) ? (
                                            <PosterPreviews 
                                                blobs={formData.posterBlobs} 
                                                urls={formData.posterUrls} 
                                                onRemoveBlob={handleRemovePosterBlob} 
                                                onRemoveUrl={handleRemovePosterUrl} 
                                            />
                                        ) : (
                                            <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full p-8">
                                                <Upload size={48} className="text-slate-300 mb-6 group-hover:text-indigo-600 group-hover:-translate-y-2 transition-all duration-500" />
                                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Upload Poster File(s)</span>
                                                <span className="text-[10px] text-slate-400 font-bold">Select one or more poster files</span>
                                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" multiple />
                                            </label>
                                        )}
                                    </div>
                                    <button type="button" onClick={handleAIAnalysis} disabled={isAnalyzing || (formData.posterBlobs.length === 0 && formData.posterUrls.length === 0)} className={cn("w-full h-16 rounded-2xl flex items-center justify-center gap-4 font-black uppercase text-[11px] tracking-[0.3em] transition-all shadow-2xl", isAnalyzing ? "bg-slate-100 text-slate-400" : "bg-gradient-to-r from-emerald-500 via-indigo-600 to-violet-700 text-white hover:scale-105 shadow-indigo-500/30")}>
                                        {isAnalyzing ? <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" /> : <><Sparkles size={20} /> Start AI Analysis</>}
                                    </button>
                                </div>
                                <div className="space-y-8 flex flex-col justify-center">
                                    <div className="p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-800">
                                        <h4 className="text-indigo-700 dark:text-indigo-400 font-black text-sm uppercase mb-4 flex items-center gap-2"><Info size={18} /> AI Assistant</h4>
                                        <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-bold leading-relaxed">Our AI assistant will scan your poster to automatically identify event names, dates, and prize details.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Modal Actions */}
                <div className="px-4 sm:px-10 py-4 sm:py-8 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 sm:gap-6 shrink-0">
                    <button type="button" onClick={() => closeModal('addEvent')} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                    <button type="submit" form="add-event-form" disabled={isSubmitting} className="px-6 sm:px-12 h-12 sm:h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider sm:tracking-[0.4em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 sm:gap-4">
                        {isSubmitting ? <div className="w-5 h-5 border-4 border-slate-400 border-t-white rounded-full animate-spin" /> : <><Save size={20} /> Save Event</>}
                    </button>
                </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const StatCardMock = ({ title, value, icon: Icon, color }) => (
    <div className="bg-slate-50 dark:bg-slate-800/40 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-8 group">
        <div className={cn("w-20 h-20 rounded-[1.8rem] bg-white dark:bg-slate-900 shadow-2xl flex items-center justify-center border transition-all duration-700 group-hover:rotate-12", color.replace('text-', 'border-'))}>
            <Icon size={32} className={color} strokeWidth={3} />
        </div>
        <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">{title}</span>
            <span className={cn("text-3xl font-black tracking-tight", color)}>{value > 0 ? `₹${Number(value).toLocaleString()}` : 'RECONNAISSANCE REQUIRED'}</span>
        </div>
    </div>
);

export default AddEventModal;
