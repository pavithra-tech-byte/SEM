import React, { useRef, useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import ReactDOM from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateEvent, deleteEvent, EventStatus, setUserEventStat, getUserEventStat, updateTeamEventStatus } from '../db';
import { useAppStore } from '../store';
import { X, Calendar, MapPin, Trophy, Users, ExternalLink, Trash2, Edit, Clock, Sparkles, Heart, Phone, Info, Globe, Shield, ShieldCheck, Zap, Share2, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, AlertCircle, Loader2, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { cn, resolveImageUrl, getDefaultPoster, downloadIcsFile, getGoogleCalendarUrl, useEventPosters, extractEventImages } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { saveUserEventStat } from '../services/firebase';

// Safe Formatter
const safeFormat = (date, formatStr) => {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'TBD';
        return format(d, formatStr);
    } catch (e) {
        return 'TBD';
    }
};

const PostersCarousel = ({ images, activeIndex, onSelectIndex, eventName }) => {
    if (!images || images.length === 0) {
        return (
            <div className="w-full h-32 sm:h-40 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-transparent rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                <Zap size={24} className="text-indigo-400 mb-2 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">No Information Poster</span>
            </div>
        );
    }

    return (
        <div className="relative rounded-xl overflow-hidden bg-slate-950">
            <img
                src={images[activeIndex]}
                alt={eventName || "Event Poster"}
                className="w-full h-[220px] sm:h-[300px] object-cover bg-slate-900 transition-all duration-300 select-none"
            />
            {images.length > 1 && (
                <>
                    {/* Navigation Arrows with stopPropagation to avoid opening zoom */}
                    <button 
                        type="button"
                        aria-label="Previous Poster"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectIndex((activeIndex - 1 + images.length) % images.length);
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all z-10 hover:scale-105 active:scale-95"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button 
                        type="button"
                        aria-label="Next Poster"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectIndex((activeIndex + 1) % images.length);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all z-10 hover:scale-105 active:scale-95"
                    >
                        <ChevronRight size={18} />
                    </button>
                    
                    {/* Dots indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full z-10">
                        {images.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                aria-label={`Go to slide ${idx + 1}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectIndex(idx);
                                }}
                                className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    idx === activeIndex ? "bg-white w-4" : "bg-white/40 hover:bg-white/70 w-1.5"
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const PosterLightbox = ({ images, initialIndex = 0, event, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoomScale, setZoomScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Keep currentIndex in sync if initialIndex changes
    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    // Reset zoom and pan when slide changes
    useEffect(() => {
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
        setIsLoading(true);
        setHasError(false);
    }, [currentIndex]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && images.length > 1) {
                setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
            } else if (e.key === 'ArrowRight' && images.length > 1) {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            } else if (e.key === '+' || e.key === '=') {
                setZoomScale((prev) => Math.min(3, +(prev + 0.5).toFixed(1)));
            } else if (e.key === '-') {
                setZoomScale((prev) => {
                    const next = Math.max(1, +(prev - 0.5).toFixed(1));
                    if (next === 1) setPanOffset({ x: 0, y: 0 });
                    return next;
                });
            } else if (e.key === '0') {
                setZoomScale(1);
                setPanOffset({ x: 0, y: 0 });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [images.length, onClose]);

    // Zoom controls
    const handleZoomIn = (e) => {
        e.stopPropagation();
        setZoomScale((prev) => Math.min(3, +(prev + 0.5).toFixed(1)));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setZoomScale((prev) => {
            const next = Math.max(1, +(prev - 0.5).toFixed(1));
            if (next === 1) setPanOffset({ x: 0, y: 0 });
            return next;
        });
    };

    const handleResetZoom = (e) => {
        e?.stopPropagation?.();
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
    };

    const handleToggleZoom = (e) => {
        e.stopPropagation();
        if (zoomScale > 1) {
            handleResetZoom();
        } else {
            setZoomScale(2);
        }
    };

    // Pan controls
    const handleMouseDown = (e) => {
        if (zoomScale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || zoomScale <= 1) return;
        setPanOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Download handler
    const handleDownload = async (e) => {
        e.stopPropagation();
        const currentUrl = images[currentIndex];
        if (!currentUrl) return;

        try {
            const res = await fetch(currentUrl, { mode: 'cors' });
            if (!res.ok) throw new Error('Fetch failed');
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            const safeTitle = (event?.eventName || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
            a.download = `${safeTitle}_poster_${currentIndex + 1}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            // Fallback for CORS or cross-origin URLs
            const a = document.createElement('a');
            a.href = currentUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.download = `poster_${currentIndex + 1}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const currentSrc = images[currentIndex];
    if (!currentSrc) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-2 sm:p-4 select-none cursor-zoom-out"
        >
            {/* Top Toolbar */}
            <div 
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-5xl z-20 flex items-center justify-between gap-2 p-2 sm:p-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-white cursor-default"
            >
                {/* Event Name & Counter */}
                <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-[11px] sm:text-xs font-black truncate text-white/90">
                        {event?.eventName || 'Poster View'}
                    </span>
                    {images.length > 1 && (
                        <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                            {currentIndex + 1} / {images.length}
                        </span>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {/* Zoom Out */}
                    <button
                        type="button"
                        title="Zoom Out (-)"
                        onClick={handleZoomOut}
                        disabled={zoomScale <= 1}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all"
                    >
                        <ZoomOut size={16} />
                    </button>

                    {/* Zoom Percentage */}
                    <button
                        type="button"
                        title="Reset Zoom (0)"
                        onClick={handleResetZoom}
                        className="px-2 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-[10px] font-mono font-bold text-white/90 hover:text-white transition-all gap-1"
                    >
                        <span>{Math.round(zoomScale * 100)}%</span>
                        {zoomScale !== 1 && <RotateCcw size={12} className="opacity-70" />}
                    </button>

                    {/* Zoom In */}
                    <button
                        type="button"
                        title="Zoom In (+)"
                        onClick={handleZoomIn}
                        disabled={zoomScale >= 3}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all"
                    >
                        <ZoomIn size={16} />
                    </button>

                    <div className="w-[1px] h-4 bg-white/20 mx-0.5 sm:mx-1" />

                    {/* Download */}
                    <button
                        type="button"
                        title="Download High-Res Poster"
                        onClick={handleDownload}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
                    >
                        <Download size={16} />
                    </button>

                    {/* Open Original */}
                    <a
                        href={currentSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in New Tab"
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
                    >
                        <ExternalLink size={16} />
                    </a>

                    <div className="w-[1px] h-4 bg-white/20 mx-0.5 sm:mx-1" />

                    {/* Close */}
                    <button
                        type="button"
                        title="Close (Esc)"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white border border-rose-500/30 flex items-center justify-center transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Central Viewport */}
            <div 
                className="flex-1 w-full flex items-center justify-center relative overflow-hidden my-2"
                onClick={onClose}
            >
                {/* Loading Spinner */}
                {isLoading && !hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-white/70 gap-2">
                        <Loader2 size={36} className="animate-spin text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading High-Res Poster...</span>
                    </div>
                )}

                {/* Error Fallback */}
                {hasError && (
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center max-w-sm text-center shadow-2xl z-10"
                    >
                        <AlertCircle size={36} className="text-amber-400 mb-3" />
                        <h4 className="text-sm font-black text-white mb-1">Failed to load poster</h4>
                        <p className="text-xs text-slate-400 mb-4">The poster file could not be rendered directly in the lightbox.</p>
                        <a
                            href={currentSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg"
                        >
                            <ExternalLink size={14} /> Open Directly
                        </a>
                    </div>
                )}

                {/* Main Poster Image */}
                <motion.div
                    key={currentSrc}
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={handleToggleZoom}
                    onMouseDown={handleMouseDown}
                    style={{
                        transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                        cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
                    }}
                    className="transition-transform duration-75 flex items-center justify-center max-w-full max-h-full"
                >
                    <img
                        src={currentSrc}
                        alt={event?.eventName || "Event Poster"}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setIsLoading(false);
                            setHasError(true);
                        }}
                        className={cn(
                            "max-w-[92vw] max-h-[82vh] object-contain rounded-xl shadow-2xl transition-opacity duration-200 select-none",
                            isLoading ? "opacity-0" : "opacity-100"
                        )}
                        draggable={false}
                    />
                </motion.div>

                {/* Carousel Left / Right Buttons */}
                {images.length > 1 && (
                    <>
                        <button
                            type="button"
                            aria-label="Previous Poster"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
                            }}
                            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900/80 hover:bg-black text-white/80 hover:text-white border border-white/20 backdrop-blur-xl flex items-center justify-center transition-all z-20 shadow-2xl hover:scale-105 active:scale-95"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            type="button"
                            aria-label="Next Poster"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex((prev) => (prev + 1) % images.length);
                            }}
                            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900/80 hover:bg-black text-white/80 hover:text-white border border-white/20 backdrop-blur-xl flex items-center justify-center transition-all z-20 shadow-2xl hover:scale-105 active:scale-95"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}
            </div>

            {/* Bottom Dots / Thumbnails */}
            {images.length > 1 && (
                <div 
                    onClick={(e) => e.stopPropagation()}
                    className="z-20 flex gap-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full shadow-2xl"
                >
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            aria-label={`Go to poster ${idx + 1}`}
                            onClick={() => setCurrentIndex(idx)}
                            className={cn(
                                "h-2 rounded-full transition-all",
                                idx === currentIndex ? "bg-white w-6" : "bg-white/30 hover:bg-white/60 w-2"
                            )}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
};

const EventDetailsModal = () => {
    const modals = useAppStore((state) => state.modals);
    const closeModal = useAppStore((state) => state.closeModal);
    const selectedEvent = useAppStore((state) => state.selectedEvent);
    const isOpen = modals.eventDetails;
    const userRole = useAppStore((state) => state.userRole);
    const isRoleVerified = useAppStore((state) => state.isRoleVerified);
    const canManage = (userRole === 'admin' || userRole === 'event_manager') && isRoleVerified;

    const eventRaw = useLiveQuery(
        () => selectedEvent ? db.events.get(selectedEvent) : null,
        [selectedEvent]
    );

    const teamData = useLiveQuery(
        () => {
            const teamId = useAppStore.getState().teamId;
            return (selectedEvent && teamId) ? db.teamEventData.where('teamId').equals(teamId).and(item => item.eventId === eventRaw?.serverId).first() : null;
        },
        [selectedEvent, eventRaw?.serverId]
    );

    const event = useMemo(() => {
        if (!eventRaw) return null;
        
        const now = new Date();
        const endDate = new Date(eventRaw.endDate);
        const deadline = new Date(eventRaw.registrationDeadline);
        
        // 1. Start with the most specific status (private user/team status)
        let status = teamData?.status || eventRaw.status;

        // 2. Only apply automatic dates-based logic if the user HAS NOT set their own status yet
        const manualStatuses = [
            EventStatus.WON, 
            EventStatus.ATTENDED, 
            EventStatus.REGISTERED, 
            EventStatus.SHORTLISTED, 
            EventStatus.BLOCKED,
            EventStatus.UPCOMING,
            EventStatus.OPEN
        ];
        
        const isUserOverridden = !!teamData?.status;
        if (!isUserOverridden && !manualStatuses.includes(status)) {
            if (!isNaN(endDate.getTime()) && now > endDate) status = EventStatus.COMPLETED;
            else if (!isNaN(deadline.getTime()) && now > deadline) status = EventStatus.CLOSED;
            else if (status === EventStatus.CLOSED || status === EventStatus.COMPLETED) {
                // Restore to Upcoming/Open if dates are in future but global status says closed
                status = EventStatus.UPCOMING;
            }
        }

        return {
            ...eventRaw,
            status,
            prizeWon: teamData?.prizeWon || 0,
            isShortlisted: !!teamData?.isShortlisted
        };
    }, [eventRaw, teamData]);

    const openModal = useAppStore((state) => state.openModal);
    const preferences = useAppStore((state) => state.preferences);
    const modalContentRef = useRef(null);
    const posterImages = useEventPosters(event);
    const [activePosterIndex, setActivePosterIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [myPrize, setMyPrize] = useState('');
    const [prizeLoaded, setPrizeLoaded] = useState(false);

    // Reset poster index & zoom state when event changes
    useEffect(() => {
        setActivePosterIndex(0);
        setIsZoomed(false);
    }, [event?.serverId, event?.id]);

    // Load personal prize stat when event changes
    useEffect(() => {
        if (!event?.serverId && !event?.id) return;
        const uid = useAppStore.getState().userProfile?.uid;
        if (!uid) return;
        const eventId = event.serverId || String(event.id);
        setPrizeLoaded(false);
        getUserEventStat(uid, eventId).then(stat => {
            setMyPrize(stat?.prizeWon != null ? String(stat.prizeWon) : '');
            setPrizeLoaded(true);
        });
    }, [event?.serverId, event?.id]);

    // Save personal prize on blur
    const handleMyPrizeSave = async () => {
        const uid = useAppStore.getState().userProfile?.uid;
        if (!uid) return;
        const eventId = event.serverId || String(event.id);
        const amount = parseFloat(myPrize) || 0;
        await setUserEventStat(uid, eventId, { prizeWon: amount });
        // Also sync to Firestore
        try { await saveUserEventStat(uid, eventId, { prizeWon: amount }); } catch(_) {}
    };

    useEffect(() => {
        // Only lock scroll if the modal is open AND we have event data to show
        // This prevents the "freeze" where the scroll is locked but no modal is visible yet
        if (isOpen && event) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';

            requestAnimationFrame(() => {
                if (modalContentRef.current) {
                    modalContentRef.current.scrollTo(0, 0);
                }
            });
        }
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        };
    }, [isOpen, event]);

    const handleDelete = async () => {
        if (preferences.isDeleteLocked) {
            const pin = prompt('Safe mode is active. Enter PIN:');
            if (pin !== '2026') {
                alert('Access Denied.');
                return;
            }
        }
        if (window.confirm('Erase this event from the grid?')) {
            await deleteEvent(event.id);
            closeModal('eventDetails');
        }
    };

    const handleEdit = () => {
        closeModal('eventDetails');
        openModal('editEvent');
    };

    const handleStatusChange = async (newStatus) => {
        const eventId = event.serverId || event.id;
        if (!eventId) return alert("Wait for sync to complete before tracking.");
        await updateTeamEventStatus(eventId, { status: newStatus });
    };

    const handlePrizeWonChange = async () => {
        const amount = prompt("Enter prize amount won by your team:", event.prizeWon || 0);
        if (amount === null) return;
        const eventId = event.serverId || event.id;
        await updateTeamEventStatus(eventId, { prizeWon: parseFloat(amount) || 0 });
    };

    return ReactDOM.createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Persistent Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => closeModal('eventDetails')}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Content Switcher */}
                    <AnimatePresence mode="wait">
                        {!event ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative z-10 bg-white dark:bg-slate-900 p-8 rounded-[2rem] flex flex-col items-center gap-4 shadow-2xl"
                            >
                                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Signal...</p>
                            </motion.div>
                        ) : (
                            <React.Fragment key="modal-wrapper">
                                <motion.div
                                    key="modal-content"
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative w-full max-w-[92%] sm:max-w-md md:max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[1.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden flex flex-col max-h-[88vh]"
                            >
                {/* Header Section */}
                <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 px-4 py-3 sm:px-5 sm:py-4 text-white relative shrink-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        {Array.isArray(event.eventType) ? event.eventType.map(t => (
                            <div key={t} className="px-1.5 py-0.5 bg-white/20 backdrop-blur-md rounded text-[6px] sm:text-[7px] font-black uppercase tracking-widest border border-white/20">
                                {t}
                            </div>
                        )) : (
                            <div className="px-1.5 py-0.5 bg-white/20 backdrop-blur-md rounded text-[6px] sm:text-[7px] font-black uppercase tracking-widest border border-white/20">
                                {event.eventType}
                            </div>
                        )}
                        <div className={cn(
                            "px-1.5 py-0.5 backdrop-blur-md rounded text-[6px] sm:text-[7px] font-black uppercase tracking-widest border",
                            event.status === 'Registered' ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-100" :
                                event.status === 'Deadline Today' ? "bg-amber-500/20 border-amber-500/20 text-amber-100 animate-pulse" :
                                    "bg-white/10 border-white/10"
                        )}>
                            {event.status}
                        </div>
                    </div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight pr-16">{event.eventName}</h2>
                    <p className="text-[9px] sm:text-[10px] text-white/70 font-bold mt-0.5 flex items-center gap-1.5">
                        <Globe size={9} />
                        {event.collegeName}
                    </p>

                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button
                            onClick={async () => {
                                if (userRole === 'public') {
                                    openModal('payment');
                                } else {
                                    await updateTeamEventStatus(event.serverId, { isShortlisted: !event.isShortlisted });
                                }
                            }}
                            className={cn(
                                "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all border",
                                event.isShortlisted ? "bg-rose-500 border-rose-400 text-white" : "bg-white/10 border-white/10 text-white/60 hover:bg-white/20"
                            )}
                        >
                            <Heart size={12} className="sm:size-[14px]" fill={event.isShortlisted ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={() => closeModal('eventDetails')}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all border border-white/20"
                        >
                            <X size={14} className="sm:size-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20" ref={modalContentRef}>
                    <div className="p-3 sm:p-4">
                        {/* Poster Image (Zoomable) */}
                        {posterImages.length > 0 ? (
                            <div 
                                onClick={() => setIsZoomed(true)} 
                                className="cursor-zoom-in relative group rounded-xl overflow-hidden shadow-lg border border-white/20 mb-3"
                            >
                                <PostersCarousel 
                                    images={posterImages} 
                                    activeIndex={activePosterIndex} 
                                    onSelectIndex={setActivePosterIndex}
                                    eventName={event.eventName} 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] border border-white/30 px-3 py-1 rounded-full backdrop-blur-sm shadow-md">
                                        Click to Expand
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-32 sm:h-40 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-transparent rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 mb-3">
                                <Zap size={24} className="text-indigo-400 mb-2 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">No Information Poster</span>
                            </div>
                        )}

                        {/* Prize Pool Bar */}
                        <div 
                            onClick={userRole !== 'public' ? handlePrizeWonChange : undefined}
                            className={cn(
                                "p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white shadow-lg shadow-amber-500/10 flex justify-between items-center overflow-hidden relative mb-3 cursor-pointer group",
                                userRole === 'public' && "cursor-default brightness-90"
                            )
                        }>
                            <Trophy size={44} className="absolute -right-1 -bottom-1 opacity-20 group-hover:scale-110 transition-transform" />
                            <div className="relative z-10">
                                <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80 block">Prize Pool / Earnings</span>
                                <h3 className="text-xl sm:text-2xl font-black">₹{(event.prizeAmount || 0).toLocaleString()}</h3>
                            </div>
                            <div className="relative z-10 px-2 py-1 bg-white/20 rounded-lg flex flex-col items-end">
                                <span className="text-[6px] font-black uppercase opacity-70">Team Winnings</span>
                                <span className="text-[10px] font-black">{event.prizeWon ? `₹${event.prizeWon}` : '₹0'}</span>
                            </div>
                        </div>

                        {/* Info Grid - 2x2 compact */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {/* Deadline Card - Interactive */}
                            <div
                                onClick={async () => {
                                    if (event.status !== 'Registered') {
                                        if (confirm("Mark this event as registered? This will track it as 'Participating'.")) {
                                            await updateTeamEventStatus(event.serverId || event.id, { status: 'Registered' });
                                        }
                                    }
                                }}
                                className={cn(
                                    "p-2.5 sm:p-3 rounded-lg border shadow-sm transition-all cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800",
                                    event.status === 'Registered' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" :
                                        event.status === 'Completed' || event.status === 'Closed' ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60" :
                                            "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                                )}
                            >
                                <div className={cn("flex items-center gap-1.5 mb-0.5",
                                    event.status === 'Registered' ? "text-emerald-600 dark:text-emerald-400" :
                                        (event.status === 'Deadline Today' || event.status === 'Open') ? "text-amber-500" : "text-slate-400"
                                )}>
                                    {event.status === 'Registered' ? <ShieldCheck size={10} /> : <Calendar size={10} />}
                                    <span className={cn("text-[7px] font-black uppercase tracking-wider", event.status === 'Registered' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
                                        {event.status === 'Registered' ? 'Registered' : 'Deadline'}
                                    </span>
                                </div>
                                <p className={cn("text-[11px] sm:text-xs font-black",
                                    event.status === 'Registered' ? "text-emerald-700 dark:text-emerald-300" :
                                        (event.status === 'Deadline Today' || event.status === 'Open') ? "text-amber-600 dark:text-amber-400" :
                                            "text-slate-500 dark:text-slate-400"
                                )}>
                                    {event.status === 'Registered' ? 'Participation Confirmed' : safeFormat(event.registrationDeadline, 'MMM dd, yyyy')}
                                </p>
                            </div>

                            <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-1.5 text-indigo-500 mb-0.5">
                                    <Zap size={10} />
                                    <span className="text-[7px] font-black uppercase tracking-wider text-slate-400">Schedule</span>
                                </div>
                                <p className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white">{safeFormat(event.startDate, 'MMM dd')} - {safeFormat(event.endDate, 'dd')}</p>
                            </div>
                            <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0"><MapPin size={11} /></div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-wider text-slate-400 block">Location</span>
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-white leading-none truncate block">{event.location || 'Campus'}</span>
                                </div>
                                {event.isOnline && <div className="text-[6px] font-black uppercase px-1 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 shrink-0">Online</div>}
                            </div>
                            <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0"><Users size={11} /></div>
                                <div className="flex-1">
                                    <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-wider text-slate-400 block">Requirement</span>
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-white uppercase leading-none">
                                        {event.teamSize > 1
                                            ? (event.teamName ? <><span className="text-indigo-600">{event.teamName}</span> <span className="text-slate-400">({event.teamSize})</span></> : `Squad of ${event.teamSize}`)
                                            : 'Solo Person'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Primary Contact Bar */}
                        {event.contact1 && (
                            <a 
                                href={userRole === 'public' ? '#' : `tel:${event.contact1}`} 
                                onClick={(e) => userRole === 'public' && (e.preventDefault(), openModal('payment'))}
                                className="p-2.5 sm:p-3 bg-slate-900 text-white rounded-lg shadow-sm flex items-center gap-2.5 hover:scale-[1.01] transition-transform mb-2"
                            >
                                <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-white shrink-0"><Phone size={12} /></div>
                                <div className="flex-1">
                                    <span className="text-[7px] font-black uppercase tracking-wider text-white/50 block">Primary Contact</span>
                                    <span className="text-[11px] font-mono font-bold leading-none">
                                        {(event.contact1 && userRole !== 'public') 
                                            ? event.contact1 
                                            : (event.contact1 
                                                ? `${event.contact1.substring(0, 3)}****${event.contact1.substring(event.contact1.length - 3)}` 
                                                : '91+ **********')}
                                    </span>
                                </div>
                                {userRole === 'public' && <div className="text-[6px] font-black uppercase px-1.5 py-1 bg-indigo-500 rounded text-white tracking-widest">Unlock</div>}
                            </a>
                        )}

                        {/* Secondary Contact Bar */}
                        {event.contact2 && (
                            <a 
                                href={userRole === 'public' ? '#' : `tel:${event.contact2}`} 
                                onClick={(e) => userRole === 'public' && (e.preventDefault(), openModal('payment'))}
                                className="p-2.5 sm:p-3 bg-slate-900 text-white rounded-lg shadow-sm flex items-center gap-2.5 hover:scale-[1.01] transition-transform mb-3"
                            >
                                <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-white shrink-0"><Phone size={12} /></div>
                                <div className="flex-1">
                                    <span className="text-[7px] font-black uppercase tracking-wider text-white/50 block">Secondary Contact</span>
                                    <span className="text-[11px] font-mono font-bold leading-none">
                                        {(event.contact2 && userRole !== 'public') 
                                            ? event.contact2 
                                            : (event.contact2 
                                                ? `${event.contact2.substring(0, 3)}****${event.contact2.substring(event.contact2.length - 3)}` 
                                                : '91+ **********')}
                                    </span>
                                </div>
                                {userRole === 'public' && <div className="text-[6px] font-black uppercase px-1.5 py-1 bg-indigo-500 rounded text-white tracking-widest">Unlock</div>}
                            </a>
                        )}

                        {/* About Section */}
                        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm mb-3">
                            <div className="flex items-center gap-1.5 mb-2 text-indigo-500">
                                <Info size={12} />
                                <span className="text-[7px] font-black uppercase tracking-widest">About the Event</span>
                            </div>
                            {event.description ? (
                                <div 
                                    className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert prose-p:my-1"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }} 
                                />
                            ) : (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    No detailed briefing available for this operative.
                                </p>
                            )}
                        </div>

                        {/* More Details (Eligibility, Website button) */}
                        {event.eligibility && (
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-3">
                                <div className="flex items-center gap-1.5 mb-1 text-indigo-600 dark:text-indigo-400">
                                    <Shield size={10} />
                                    <span className="text-[7px] font-black uppercase tracking-widest">Eligibility Protocol</span>
                                </div>
                                <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300">{event.eligibility}</p>
                            </div>
                        )}

                        {/* Status Grid - Available to all logged-in users */}
                        {userRole !== 'public' && (
                            <div className="mb-4">
                                <h4 className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1.5"><ShieldCheck size={10}/> Update Your Team Status</h4>
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                    {Object.values(EventStatus || {}).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(status)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border",
                                                event.status === status
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                                    : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-indigo-300"
                                            )}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {event.website && (
                            <a
                                href={event.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 w-full h-10 sm:h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg flex items-center justify-center gap-2 group hover:brightness-110 transition-all font-black text-[9px] uppercase tracking-widest"
                            >
                                <Globe size={14} className="text-indigo-500" />
                                Official Website
                                <ExternalLink size={12} />
                            </a>
                        )}

                        {/* Multiple Registration Links */}
                        {Array.isArray(event.registrationLinks) && event.registrationLinks.length > 0 ? (
                            event.registrationLinks.map((link, idx) => (
                                link.url && (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 w-full h-10 sm:h-11 bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 group hover:brightness-110 transition-all font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                                    >
                                        <ExternalLink size={12} />
                                        {link.label || `Register Link ${idx + 1}`}
                                        <ExternalLink size={12} />
                                    </a>
                                )
                            ))
                        ) : (
                            event.registrationLink && (
                                <a
                                    href={event.registrationLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 w-full h-10 sm:h-11 bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 group hover:brightness-110 transition-all font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                                >
                                    <ExternalLink size={12} />
                                    Registration Form
                                    <ExternalLink size={12} />
                                </a>
                            )
                        )}

                        {/* Social Media Links */}
                        {(event.instagram || event.linkedin || event.twitter || event.youtube) && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1.5">
                                    <Globe size={10} /> Social Channels
                                </h4>
                                <div className="flex gap-2">
                                    {event.instagram && (
                                        <a href={event.instagram} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all font-black text-[8px] uppercase tracking-wider">
                                            Instagram
                                        </a>
                                    )}
                                    {event.linkedin && (
                                        <a href={event.linkedin} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all font-black text-[8px] uppercase tracking-wider">
                                            LinkedIn
                                        </a>
                                    )}
                                    {event.twitter && (
                                        <a href={event.twitter} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all font-black text-[8px] uppercase tracking-wider">
                                            Twitter
                                        </a>
                                    )}
                                    {event.youtube && (
                                        <a href={event.youtube} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all font-black text-[8px] uppercase tracking-wider">
                                            YouTube
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Calendar Integration */}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1.5">
                                <Calendar size={10} /> Sync Event Schedule
                            </h4>
                            <div className="flex gap-2">
                                <a
                                    href={getGoogleCalendarUrl(event)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 transition-all"
                                >
                                    <Globe size={12} className="text-indigo-500" />
                                    Google Calendar
                                </a>
                                <button
                                    onClick={() => downloadIcsFile(event)}
                                    className="flex-1 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 transition-all"
                                >
                                    <Download size={12} className="text-indigo-500" />
                                    Export .ics
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
                    {canManage && (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 px-3 py-2 text-rose-500 font-black text-[8px] uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                        >
                            <Trash2 size={12} />
                            Delete
                        </button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                        {canManage && (
                            <button
                                onClick={handleEdit}
                                className="px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-black text-[8px] uppercase tracking-widest hover:brightness-95 transition-all flex items-center gap-1.5"
                            >
                                <Edit size={12} />
                                Edit Details
                            </button>
                        )}
                        <button
                            onClick={() => closeModal('eventDetails')}
                            className="px-4 sm:px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-black text-[8px] uppercase tracking-widest hover:brightness-110 transition-all"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* FULL SCREEN IMAGE LIGHTBOX */}
            <AnimatePresence>
                {isZoomed && posterImages.length > 0 && (
                    <PosterLightbox
                        images={posterImages}
                        initialIndex={activePosterIndex}
                        event={event}
                        onClose={() => setIsZoomed(false)}
                    />
                )}
            </AnimatePresence>
            </React.Fragment>
        )}
        </AnimatePresence>
        </div>
        )}
        </AnimatePresence>,
        document.body
    );
};

export default EventDetailsModal;

