import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAppStore } from '../store';
import { db, updateEvent, EventType, EventStatus } from '../db';
import { X, Save, Sparkles, Image as ImageIcon, Link as LinkIcon, Calendar, Trophy, MapPin, Users, Phone, User, Info, Check, Clock, Plus, Upload } from 'lucide-react';
import { cn } from '../utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';

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

// Helper: Format date for input[type="date"] (YYYY-MM-DD)
const formatDateForInput = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

const EditEventModal = () => {
    const modals = useAppStore((state) => state.modals);
    const closeModal = useAppStore((state) => state.closeModal);
    const selectedEvent = useAppStore((state) => state.selectedEvent);
    const isOpen = modals.editEvent;

    const event = useLiveQuery(
        () => selectedEvent ? db.events.get(selectedEvent) : null,
        [selectedEvent]
    );

    const [formData, setFormData] = useState({
        collegeName: '',
        eventName: '',
        eventType: [EventType.HACKATHON],
        registrationDeadline: '',
        startDate: '',
        endDate: '',
        prizeAmount: '',
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
        eligibility: '',
        status: 'Open',
        contact1: '',
        contact2: '',
        leader: '',
        members: '',
        noOfTeams: '',
        prizeWon: '',
        teamName: '',
        customEventType: ''
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
    const [activeTab, setActiveTab] = useState('basic');

    useEffect(() => {
        if (event) {
            const currentTypes = Array.isArray(event.eventType) ? event.eventType : (event.eventType ? [event.eventType] : [EventType.HACKATHON]);
            const isCustom = currentTypes.some(t => !Object.values(EventType).includes(t));
            const customVal = isCustom ? currentTypes.find(t => !Object.values(EventType).includes(t)) : '';
            
            // Map custom types back to 'Other' in the checkboxes if needed, or just handle them as is
            // For now, let's just make sure 'Other' is checked if there's a custom type
            const finalTypes = currentTypes.map(t => Object.values(EventType).includes(t) ? t : EventType.OTHER);
            // Remove duplicates (e.g. if 'Other' was already there)
            const uniqueTypes = [...new Set(finalTypes)];

            setFormData({
                collegeName: event.collegeName || '',
                eventName: event.eventName || '',
                eventType: uniqueTypes,
                registrationDeadline: event.registrationDeadline ? formatDateForInput(event.registrationDeadline) : '',
                startDate: event.startDate ? formatDateForInput(event.startDate) : '',
                endDate: event.endDate ? formatDateForInput(event.endDate) : '',
                prizeAmount: event.prizeAmount || '',
                registrationFee: event.registrationFee || '',
                accommodation: !!event.accommodation,
                location: event.location || '',
                isOnline: !!event.isOnline,
                contactNumbers: Array.isArray(event.contactNumbers) ? event.contactNumbers.join(', ') : '',
                posterUrl: event.posterUrl || '',
                posterBlob: event.posterBlob || null,
                posterUrls: Array.isArray(event.posterUrls) ? event.posterUrls : (event.posterUrl ? [event.posterUrl] : []),
                posterBlobs: Array.isArray(event.posterBlobs) ? event.posterBlobs : (event.posterBlob ? [event.posterBlob] : []),
                instagram: event.instagram || '',
                linkedin: event.linkedin || '',
                twitter: event.twitter || '',
                youtube: event.youtube || '',
                website: event.website || '',
                registrationLink: event.registrationLink || '',
                registrationLinks: Array.isArray(event.registrationLinks) ? event.registrationLinks : (event.registrationLink ? [{ label: 'Register', url: event.registrationLink }] : [{ label: 'Register', url: '' }]),
                description: event.description || '',
                teamSize: event.teamSize || '1',
                eligibility: event.eligibility || '',
                status: event.status || 'Open',
                contact1: event.contact1 || '',
                contact2: event.contact2 || '',
                leader: event.leader || '',
                members: event.members || '',
                noOfTeams: event.noOfTeams || '',
                prizeWon: event.prizeWon || '',
                teamName: event.teamName || '',
                customEventType: customVal || ''
            });
        }
    }, [event]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setActiveTab('basic');
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const actualEventTypes = formData.eventType.map(t => 
                (t === EventType.OTHER && formData.customEventType.trim()) ? formData.customEventType.trim() : t
            );

            const updates = {
                ...formData,
                description: DOMPurify.sanitize(formData.description),
                eventType: actualEventTypes,
                prizeAmount: parseFloat(formData.prizeAmount) || 0,
                prizeWon: parseFloat(formData.prizeWon) || 0,
                registrationFee: parseFloat(formData.registrationFee) || 0,
                teamSize: parseInt(formData.teamSize) || 1,
                contactNumbers: formData.contactNumbers.split(',').map(c => c.trim()).filter(Boolean),
                registrationDeadline: new Date(formData.registrationDeadline),
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate)
            };

            await updateEvent(selectedEvent, updates);
            closeModal('editEvent');
        } catch (error) {
            console.error('ERROR UPDATING EVENT:', error);
            alert(`System Error: ${error.message || 'Unknown database error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: 'basic', label: 'General', icon: Info },
        { id: 'logistics', label: 'Logistics', icon: MapPin },
        { id: 'team', label: 'Team Info', icon: Users },
        { id: 'media', label: 'Poster & Web', icon: ImageIcon }
    ];

    if (!isOpen || !event) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={() => closeModal('editEvent')}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-[95%] sm:max-w-2xl lg:max-w-4xl bg-white dark:bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-4 sm:p-8">
                        <button
                            onClick={() => closeModal('editEvent')}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all border border-white/20"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Sparkles size={24} className="text-indigo-200" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Update Record</h2>
                            <p className="opacity-70 text-xs font-bold tracking-widest uppercase">Target ID: {String(selectedEvent).substring(0, 8)}...</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 px-4 sm:px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all shrink-0 border",
                                        isActive
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30 -translate-y-1"
                                            : "text-slate-500 border-transparent hover:bg-slate-200 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <Icon size={14} strokeWidth={3} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10">
                        {activeTab === 'basic' && (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="form-group">
                                            <label className="label-premium">Event Name</label>
                                            <input type="text" name="eventName" value={formData.eventName} onChange={handleChange} required className="input-premium" />
                                        </div>
                                        <div className="form-group">
                                            <label className="label-premium">College Name</label>
                                            <input type="text" name="collegeName" value={formData.collegeName} onChange={handleChange} required className="input-premium" />
                                        </div>
                                        <div className="form-group col-span-2">
                                            <label className="label-premium">Event Categories</label>
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
                                                                    eventType: checked ? [...prev.eventType, t] : prev.eventType.filter(x => x !== t)
                                                                }));
                                                            }}
                                                        />
                                                        {t}
                                                    </label>
                                                ))}
                                            </div>
                                            {formData.eventType.includes(EventType.OTHER) && (
                                                <input 
                                                    type="text" 
                                                    name="customEventType" 
                                                    value={formData.customEventType} 
                                                    onChange={handleChange} 
                                                    className="input-premium mt-3" 
                                                    placeholder="Specify Custom Type" 
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-8">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="text-indigo-600" size={20} />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Timeline & Status</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="form-group">
                                                <label className="label-premium text-[10px]">Current Status</label>
                                                <select name="status" value={formData.status} onChange={handleChange} className="input-premium">
                                                    {Object.values(EventStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="label-premium text-[10px]">Reg. Deadline</label>
                                                <input type="date" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} required className="input-premium" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="form-group">
                                                    <label className="label-premium text-[10px]">Starts</label>
                                                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="input-premium" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="label-premium text-[10px]">Ends</label>
                                                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="input-premium" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'logistics' && (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="form-group">
                                            <label className="label-premium">Grand Prize (₹)</label>
                                            <div className="relative">
                                                <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={20} />
                                                <input type="number" name="prizeAmount" value={formData.prizeAmount} onChange={handleChange} className="input-premium pl-12 text-lg font-black" />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="label-premium">Prize Won (₹)</label>
                                            <div className="relative">
                                                <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                                                <input type="number" name="prizeWon" value={formData.prizeWon} onChange={handleChange} className="input-premium pl-12 text-lg font-black" />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="label-premium">Registration Fee (₹)</label>
                                            <input type="number" name="registrationFee" value={formData.registrationFee} onChange={handleChange} className="input-premium" />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="form-group">
                                            <label className="label-premium">Location / Venue</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                                                <input type="text" name="location" value={formData.location} onChange={handleChange} className="input-premium pl-12" />
                                            </div>
                                        </div>
                                        <div className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <label className="flex-1 flex items-center justify-center gap-3 cursor-pointer py-4 rounded-2xl hover:bg-white dark:hover:bg-slate-900 transition-all border-2 border-transparent has-[:checked]:border-indigo-600">
                                                <input type="checkbox" name="isOnline" checked={formData.isOnline} onChange={handleChange} className="hidden" />
                                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", formData.isOnline ? "border-indigo-600 bg-indigo-600" : "border-slate-300")}>
                                                    {formData.isOnline && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Online</span>
                                            </label>
                                            <label className="flex-1 flex items-center justify-center gap-3 cursor-pointer py-4 rounded-2xl hover:bg-white dark:hover:bg-slate-900 transition-all border-2 border-transparent has-[:checked]:border-indigo-600">
                                                <input type="checkbox" name="accommodation" checked={formData.accommodation} onChange={handleChange} className="hidden" />
                                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", formData.accommodation ? "border-indigo-600 bg-indigo-600" : "border-slate-300")}>
                                                    {formData.accommodation && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Stay</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="label-premium">Eligibility Description</label>
                                    <textarea name="eligibility" value={formData.eligibility} onChange={handleChange} rows="2" className="input-premium pt-4" />
                                </div>
                                <div className="form-group">
                                    <label className="label-premium">Full Event Description (Rich Text Supported)</label>
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
                        )}

                        {activeTab === 'team' && (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="form-group">
                                            <label className="label-premium">Lead / POC Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                                                <input type="text" name="leader" value={formData.leader} onChange={handleChange} className="input-premium pl-12" />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="label-premium">Squad Members</label>
                                            <div className="relative">
                                                <Users className="absolute left-4 top-6 text-indigo-500" size={20} />
                                                <textarea name="members" value={formData.members} onChange={handleChange} rows="2" className="input-premium pl-12 pt-4" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="form-group">
                                            <label className="label-premium">Team Size</label>
                                            <input type="number" name="teamSize" value={formData.teamSize} onChange={handleChange} className="input-premium" min="1" />
                                        </div>
                                        <div className="form-group">
                                            <label className="label-premium">Department Alias</label>
                                            <input type="text" name="noOfTeams" value={formData.noOfTeams} onChange={handleChange} className="input-premium" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Phone size={24} className="text-indigo-400" />
                                        <h3 className="text-lg font-black uppercase tracking-widest text-indigo-300">Contact Network</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <input type="text" name="contact1" value={formData.contact1} onChange={handleChange} className="bg-slate-800 border-0 rounded-2xl px-6 py-4 font-mono text-sm focus:ring-2 ring-indigo-500 outline-none" placeholder="Comm Link 1" />
                                        <input type="text" name="contact2" value={formData.contact2} onChange={handleChange} className="bg-slate-800 border-0 rounded-2xl px-6 py-4 font-mono text-sm focus:ring-2 ring-indigo-500 outline-none" placeholder="Comm Link 2" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'media' && (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="form-group">
                                            <label className="label-premium text-[11px] font-black uppercase tracking-widest mb-4 block">Visual Protocol (Posters)</label>
                                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-h-[150px] bg-slate-50 dark:bg-slate-900/50">
                                                {(formData.posterBlobs.length > 0 || formData.posterUrls.length > 0) ? (
                                                    <PosterPreviews 
                                                        blobs={formData.posterBlobs} 
                                                        urls={formData.posterUrls} 
                                                        onRemoveBlob={handleRemovePosterBlob} 
                                                        onRemoveUrl={handleRemovePosterUrl} 
                                                    />
                                                ) : (
                                                    <div className="text-slate-400 text-xs font-semibold text-center p-8">No posters uploaded</div>
                                                )}
                                            </div>
                                            <div className="mt-6 flex gap-3">
                                                <label className="flex-grow px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-center cursor-pointer hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                                                    Inject Media
                                                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" multiple />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="form-group">
                                            <label className="label-premium">Add Poster URLs</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                                                    <input type="url" value={posterUrlInput} onChange={(e) => setPosterUrlInput(e.target.value)} className="input-premium pl-12 border-emerald-100 dark:border-emerald-800" placeholder="https://cdn.example.com/poster.jpg" />
                                                </div>
                                                <button type="button" onClick={handleAddPosterUrl} className="px-6 bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Add</button>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="label-premium">Website URL</label>
                                            <div className="relative">
                                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                                                <input type="url" name="website" value={formData.website} onChange={handleChange} className="input-premium pl-12" placeholder="https://..." />
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
                                                            placeholder="Label" 
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
                                        
                                        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                            <label className="label-premium mb-4 block">Social Media Links</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="form-group">
                                                    <label className="label-premium">Instagram</label>
                                                    <input type="url" name="instagram" value={formData.instagram} onChange={handleChange} className="input-premium" placeholder="Profile URL" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="label-premium">LinkedIn</label>
                                                    <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} className="input-premium" placeholder="Company/Profile URL" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="label-premium">Twitter (X)</label>
                                                    <input type="url" name="twitter" value={formData.twitter} onChange={handleChange} className="input-premium" placeholder="Profile URL" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="label-premium">YouTube</label>
                                                    <input type="url" name="youtube" value={formData.youtube} onChange={handleChange} className="input-premium" placeholder="Video/Channel URL" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-10 py-8 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => closeModal('editEvent')}
                            className="px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            Abort Task
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-2xl font-black text-[14px] uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-4 border border-white/20"
                        >
                            {isSubmitting ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={20} />
                            )}
                            Finalize Update
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default EditEventModal;
