import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';
import { format, differenceInDays } from 'date-fns';
import { cn, useEventPosters, getDefaultPoster } from '../utils';
import {
    Calendar, MapPin, Trophy, Clock, Heart, Zap, Users, ShieldCheck,
    Globe, Pin, IndianRupee, Trash2, Edit, ExternalLink
} from 'lucide-react';
import { updateEvent, deleteEvent, updateTeamEventStatus } from '../db';

const safeFormat = (date, formatStr) => {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'TBD';
        return format(d, formatStr);
    } catch (e) {
        return 'TBD';
    }
};

const safeDiff = (date) => {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return -1;
        return differenceInDays(d, new Date());
    } catch (e) {
        return -1;
    }
};

// Helper: Strip HTML tags from a rich text string to get plain text
const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const PosterImage = ({ event }) => {
    const images = useEventPosters(event);
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
        setHasError(false);
    }, [images]);

    const imgSrc = images[0];

    if (!imgSrc || hasError) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-800 flex flex-col items-center justify-center p-4">
                <Zap size={24} className="text-white/40 mb-2 animate-pulse" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest text-center leading-tight">No Poster</span>
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            alt={event.eventName}
            onError={() => setHasError(true)}
            className="w-full h-full object-contain"
        />
    );
};

const EventCard = React.memo(({ event, compact = false }) => {
    const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);
    const userProfile = useAppStore((state) => state.userProfile);
    const teamId = useAppStore((state) => state.teamId);
    const userId = userProfile?.uid;
    // User is in a real team when teamId is set and differs from their own uid
    const isInTeam = teamId && teamId !== userId;
    const openModal = useAppStore((state) => state.openModal);
    const togglePinnedEvent = useAppStore((state) => state.togglePinnedEvent);
    const pinnedEvents = useAppStore((state) => state.preferences.pinnedEvents || []);
    const userRole = useAppStore((state) => state.userRole); // 'admin', 'event_manager', 'member'

    const isPinned = pinnedEvents.includes(event.id);
    const isRoleVerified = useAppStore((state) => state.isRoleVerified);
    const canEdit = (userRole === 'admin' || userRole === 'event_manager') && isRoleVerified;
    const canDelete = (userRole === 'admin' || userRole === 'event_manager') && isRoleVerified;

    const handleClick = (e) => {
        if (e.target.closest('button') || e.target.closest('.no-click')) return;
        setSelectedEvent(event.id);
        openModal('eventDetails');
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this event?')) {
            await deleteEvent(event.id);
        }
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        setSelectedEvent(event.id);
        openModal('editEvent');
    };

    const statusConfig = useMemo(() => {
        const configs = {
            'Open': { icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
            'Won': { icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20', dot: 'bg-amber-500' },
            'Blocked': { icon: ShieldCheck, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-100 dark:border-rose-500/20', dot: 'bg-rose-500' },
            'Closed': { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20', dot: 'bg-slate-400' },
            'Completed': { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20', dot: 'bg-slate-400' },
            'Attended': { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-100 dark:border-indigo-500/20', dot: 'bg-indigo-500' },
            'Registered': { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
            'Deadline Today': { icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-100 dark:border-rose-500/20', dot: 'bg-rose-500 animate-pulse' }
        };
        const fallback = { icon: Calendar, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-100 dark:border-slate-800', dot: 'bg-slate-400' };
        return configs[event.status] || fallback;
    }, [event.status]);

    const daysUntilDeadline = safeDiff(event.registrationDeadline);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            onClick={handleClick}
            className={cn(
                "group relative bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl cursor-pointer border transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 overflow-hidden flex flex-col sm:flex-row h-full min-h-0 sm:min-h-[16rem]",
                isPinned ? "border-indigo-500/30 ring-2 ring-indigo-500/10" : "border-slate-100 dark:border-slate-800 hover:border-indigo-500/20"
            )}
        >
            {/* Left: Poster Image */}
            <div className={cn("relative w-full sm:shrink-0 h-36 sm:self-stretch overflow-hidden bg-slate-100 dark:bg-slate-800", compact ? "sm:w-40" : "sm:w-56 md:w-64")}>
                <PosterImage event={event} statusConfig={statusConfig} />

                {/* Priority Score Overlay */}
                <div className="absolute top-2 left-2">
                    <div className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md backdrop-blur-md border border-white/20 shadow-lg",
                        event.priorityScore >= 70 ? "bg-rose-500/90" : event.priorityScore >= 40 ? "bg-amber-500/90" : "bg-indigo-600/90"
                    )}>
                        <span className="text-[10px] font-black text-white">{event.priorityScore}</span>
                    </div>
                </div>

                {/* Status Overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                    <span className={cn(
                        "px-2 py-0.5 backdrop-blur-md text-[9px] font-black uppercase tracking-wider rounded border flex items-center gap-1 shadow-md w-fit",
                        event.status === 'Registered' ? "bg-emerald-600/90 text-white border-emerald-500/50" :
                            event.status === 'Won' ? "bg-amber-500/90 text-white border-amber-500/50" :
                                event.status === 'Open' ? "bg-emerald-500/90 text-white border-emerald-400/30" :
                                    event.status === 'Deadline Today' ? "bg-rose-600/90 text-white border-rose-500 animate-pulse" :
                                        event.status === 'Attended' ? "bg-indigo-600/90 text-white border-indigo-500/50" :
                                            "bg-slate-800/90 text-white/90 border-slate-700"
                    )}>
                        <statusConfig.icon size={10} className="text-white" />
                        {event.status}
                    </span>
                </div>
            </div>

            {/* Right: Content */}
            <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between min-w-0">

                {/* Header Row: Type + Actions */}
                <div className="flex items-start justify-between mb-2">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider rounded-md">
                        {Array.isArray(event.eventType) ? event.eventType.join(' • ') : event.eventType}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-click">
                        <button onClick={(e) => { e.stopPropagation(); togglePinnedEvent(event.id); }} className={cn("p-1.5 rounded-lg transition-colors", isPinned ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:bg-slate-100")}>
                            <Pin size={14} fill={isPinned ? "currentColor" : "none"} />
                        </button>
                        <button 
                            onClick={async (e) => { 
                                e.stopPropagation(); 
                                
                                await updateTeamEventStatus(event.serverId || event.id, { isShortlisted: !event.isShortlisted }); 
                            }} 
                            className={cn("p-1.5 rounded-lg transition-colors", event.isShortlisted ? "text-rose-500 bg-rose-50" : "text-slate-400 hover:bg-slate-100")}
                        >
                            <Heart size={14} fill={event.isShortlisted ? "currentColor" : "none"} />
                        </button>
                        {canEdit && (
                            <button onClick={handleEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                                <Edit size={14} />
                            </button>
                        )}
                        {canDelete && (
                            <button onClick={handleDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Info */}
                <div className="mb-3">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors leading-tight">
                        {event.eventName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-500 dark:text-slate-400">
                        <Globe size={12} />
                        <span className="text-xs font-bold uppercase tracking-wide truncate">{event.collegeName}</span>
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                    {/* Location / Mode Badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {event.isOnline ? <Globe size={10} /> : <MapPin size={10} />}
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                            {event.isOnline ? 'Online Event' : (event.location || 'Venue TBD')}
                        </span>
                    </div>

                    {/* Fee Badge */}
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border",
                        event.registrationFee === 0
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
                    )}>
                        <IndianRupee size={10} />
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                            {event.registrationFee === 0 ? 'Free Entry' : `Reg. Fee: ₹${event.registrationFee}`}
                        </span>
                    </div>

                    {/* Accommodation Badge */}
                    {event.accommodation && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                            <Heart size={10} />
                            <span className="text-[10px] font-bold uppercase tracking-wide">Stay Included</span>
                        </div>
                    )}
                </div>

                {/* Description Snippet or Eligibility */}
                {(event.eligibility || event.description) && (
                    <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        {event.eligibility ? (
                            <div className="flex items-start gap-2">
                                <ShieldCheck size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                                    <span className="uppercase text-slate-400 text-[9px] tracking-wider mr-1">Eligibility:</span>
                                    {event.eligibility}
                                </span>
                            </div>
                        ) : (
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {stripHtml(event.description)}
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 sm:gap-x-4 gap-y-2 sm:gap-y-3 mt-auto">
                    {/* Prize */}
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                            <Trophy size={14} className="text-amber-600 dark:text-amber-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Prize Pool</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 leading-tight">
                                {event.prizeAmount > 0 ? `₹${Number(event.prizeAmount).toLocaleString()}` : 'None'}
                            </span>
                        </div>
                    </div>

                    {/* Team Info */}
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                            <Users size={14} className="text-indigo-600 dark:text-indigo-500" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Team Size</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 leading-tight truncate">
                                {event.teamSize > 1 ? `${event.teamSize} Members` : 'Solo'}
                            </span>
                        </div>
                    </div>

                    {/* Leader / Contact Info � only visible when user is in a team */}
                    {isInTeam && (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                            <ShieldCheck size={14} className="text-violet-600 dark:text-violet-500" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Leader</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 leading-tight truncate">
                                {event.leader || 'Not Assigned'}
                            </span>
                        </div>
                    </div>
                    )}

                    {/* Deadline */}
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center shrink-0">
                            <Clock size={14} className="text-rose-600 dark:text-rose-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Deadline</span>
                            <span className={cn("text-xs font-black leading-tight",
                                daysUntilDeadline < 0 ? "text-slate-400" : "text-rose-600"
                            )}>
                                {safeFormat(event.registrationDeadline, 'MMM dd')}
                            </span>
                        </div>
                    </div>

                    {/* Event Date */}
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Event Date</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 leading-tight">
                                {safeFormat(event.startDate, 'MMM dd')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

export default EventCard;

