import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db, getMergedEvents } from '../db';
import { useAppStore } from '../store';
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameDay,
    isToday,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Trophy, Download, Grid, ListFilter } from 'lucide-react';
import { cn } from '../utils';

const CalendarView = () => {
    const teamId = useAppStore((state) => state.teamId);
    const events = useLiveQuery(async () => {
        
        return await getMergedEvents();
    }, [teamId]) || [];
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [direction, setDirection] = useState(0);
    const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'

    const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);
    const openModal = useAppStore((state) => state.openModal);

    const calendarDays = useMemo(() => {
        if (viewMode === 'week') {
            const calendarStart = startOfWeek(currentDate);
            const calendarEnd = endOfWeek(currentDate);
            return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
        } else {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            const calendarStart = startOfWeek(monthStart);
            const calendarEnd = endOfWeek(monthEnd);
            return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
        }
    }, [currentDate, viewMode]);

    const getEventsForDay = (day) => {
        if (!events) return [];
        return events.filter(event => {
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            const deadline = new Date(event.registrationDeadline);

            const hasStart = event.startDate && !isNaN(startDate.getTime());
            const hasEnd = event.endDate && !isNaN(endDate.getTime());
            const hasDeadline = event.registrationDeadline && !isNaN(deadline.getTime());

            return (
                (hasStart && isSameDay(day, startDate)) ||
                (hasEnd && isSameDay(day, endDate)) ||
                (hasDeadline && isSameDay(day, deadline))
            );
        });
    };

    const selectedDayEvents = useMemo(() => getEventsForDay(selectedDate), [selectedDate, events]);

    const previousPeriod = () => {
        setDirection(-1);
        if (viewMode === 'week') {
            setCurrentDate(subWeeks(currentDate, 1));
        } else {
            setCurrentDate(subMonths(currentDate, 1));
        }
    };

    const nextPeriod = () => {
        setDirection(1);
        if (viewMode === 'week') {
            setCurrentDate(addWeeks(currentDate, 1));
        } else {
            setCurrentDate(addMonths(currentDate, 1));
        }
    };

    const exportToICS = () => {
        if (!events || events.length === 0) {
            alert("No events to export.");
            return;
        }

        let icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//SEM Student Event Manager//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH"
        ];

        events.forEach(event => {
            const start = event.startDate ? new Date(event.startDate) : null;
            const end = event.endDate ? new Date(event.endDate) : (start ? new Date(start.getTime() + 2 * 60 * 60 * 1000) : null);
            if (!start || isNaN(start.getTime())) return;

            const formatDateICS = (date) => {
                return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
            };

            icsContent.push("BEGIN:VEVENT");
            icsContent.push(`UID:event-${event.id || Math.random()}@sem.app`);
            icsContent.push(`DTSTAMP:${formatDateICS(new Date())}`);
            icsContent.push(`DTSTART:${formatDateICS(start)}`);
            if (end && !isNaN(end.getTime())) {
                icsContent.push(`DTEND:${formatDateICS(end)}`);
            }
            icsContent.push(`SUMMARY:${event.eventName || 'Untitled Event'}`);
            icsContent.push(`DESCRIPTION:${(event.description || '').replace(/<[^>]*>/g, '').replace(/\n/g, '\\n')}`);
            icsContent.push(`LOCATION:${event.isOnline ? 'Online' : (event.location || 'TBD')}`);
            icsContent.push(`ORGANIZER;CN=${event.collegeName || 'Organizer'}:MAILTO:no-reply@sem.app`);
            icsContent.push("END:VEVENT");
        });

        icsContent.push("END:VCALENDAR");

        const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `sem_events_${format(new Date(), 'yyyyMMdd')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const variants = {
        enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
        center: { zIndex: 1, x: 0, opacity: 1 },
        exit: (direction) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 })
    };

    return (
        <div className="pb-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Event <span className="text-indigo-600">Timeline</span>
                    </h1>
                    <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                        Tactical scheduler & planner
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <button 
                            onClick={() => setViewMode('month')} 
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                viewMode === 'month' 
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            )}
                        >
                            Month
                        </button>
                        <button 
                            onClick={() => setViewMode('week')} 
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                viewMode === 'week' 
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            )}
                        >
                            Week
                        </button>
                    </div>

                    {/* Navigation controls */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <button onClick={previousPeriod} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400">
                            <ChevronLeft size={16} />
                        </button>
                        <h2 className="text-xs font-black text-slate-900 dark:text-white min-w-[120px] text-center uppercase tracking-widest">
                            {viewMode === 'week' 
                                ? `Week of ${format(startOfWeek(currentDate), 'MMM dd')}` 
                                : format(currentDate, 'MMMM yyyy')}
                        </h2>
                        <button onClick={nextPeriod} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* ICS Export Button */}
                    <button 
                        onClick={exportToICS}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md shadow-indigo-600/10"
                    >
                        <Download size={14} />
                        Export ICS
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Calendar Grid */}
                <div className="lg:col-span-3 glass-card overflow-hidden">
                    <div className="overflow-x-auto pb-4 sm:pb-0">
                        <div className="min-w-[500px] sm:min-w-0">
                            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className={cn(
                                "relative overflow-hidden transition-all duration-300",
                                viewMode === 'week' ? "min-h-[140px]" : "min-h-[500px]"
                            )}>
                                <AnimatePresence initial={false} custom={direction} mode="wait">
                                    <motion.div
                                        key={currentDate.toString() + viewMode}
                                        custom={direction}
                                        variants={variants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="grid grid-cols-7"
                                    >
                                        {calendarDays.map((day, idx) => {
                                            const dayEvents = getEventsForDay(day);
                                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                                            const today = isToday(day);
                                            const isSelected = isSameDay(day, selectedDate);

                                            return (
                                                <div
                                                    key={day.toString()}
                                                    onClick={() => setSelectedDate(day)}
                                                    className={cn(
                                                        "p-2 border-r border-b border-slate-100 dark:border-slate-800 transition-all cursor-pointer group",
                                                        viewMode === 'week' ? "min-h-[120px]" : "min-h-[100px]",
                                                        !isCurrentMonth && viewMode !== 'week' && "bg-slate-50/50 dark:bg-slate-950/20",
                                                        today && "bg-indigo-50/30 dark:bg-indigo-900/10",
                                                        isSelected && "ring-2 ring-inset ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={cn(
                                                            "flex items-center justify-center w-7 h-7 text-xs font-bold rounded-lg transition-all",
                                                            today ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" :
                                                                isSelected ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" :
                                                                    (isCurrentMonth || viewMode === 'week') ? "text-slate-700 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-800" :
                                                                        "text-slate-300 dark:text-slate-700"
                                                        )}>
                                                            {format(day, 'd')}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1">
                                                        {dayEvents.slice(0, 2).map(event => {
                                                            const isDeadline = isSameDay(day, new Date(event.registrationDeadline));
                                                            return (
                                                                <div key={event.id} className={cn(
                                                                    "text-[9px] px-1.5 py-1 rounded-md font-bold truncate transition-all",
                                                                    isDeadline ? "bg-rose-100/80 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" :
                                                                        "bg-indigo-100/80 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
                                                                )}>
                                                                    {isDeadline && "?? "}{event.eventName}
                                                                </div>
                                                            );
                                                        })}
                                                        {dayEvents.length > 2 && (
                                                            <div className="text-[9px] text-slate-400 font-black pl-1 font-mono">
                                                                +{dayEvents.length - 2} MORE
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Day Schedule Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                <CalendarIcon size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">Day Schedule</h3>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">{format(selectedDate, 'EEEE, MMMM dd')}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {selectedDayEvents.length > 0 ? (
                                selectedDayEvents.map(event => (
                                    <button
                                        key={event.id}
                                        onClick={() => {
                                            setSelectedEvent(event.id);
                                            openModal('eventDetails');
                                        }}
                                        className="w-full group text-left p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[8px] font-black uppercase tracking-widest rounded">
                                                {event.eventType}
                                            </span>
                                            {isSameDay(selectedDate, new Date(event.registrationDeadline)) && (
                                                <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-[8px] font-black uppercase tracking-widest rounded flex items-center gap-1">
                                                    <Clock size={8} /> Deadline
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate">
                                            {event.eventName}
                                        </h4>
                                        <p className="text-[10px] text-slate-500 font-medium truncate">{event.collegeName}</p>
                                    </button>
                                ))
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <Clock size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Events Found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-6 bg-indigo-600 text-white">
                        <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-3 opacity-80">Quick Legend</h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Standard Event</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Critical Deadline</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;