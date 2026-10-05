import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Zap, ArrowRight, Download, ExternalLink, Sparkles, Filter, Trophy, Users, Terminal, Cpu, ShieldCheck, Clock } from 'lucide-react';
import { cn } from '../utils';
import { addEvent, EventType } from '../db';

// Module-level cache persists while the component is mounted
const queryCache = new Map();

const CATEGORY_FILTERS = [
    { id: 'all', label: 'All Types' },
    { id: 'Hackathon', label: 'Hackathon' },
    { id: 'Contest', label: 'Contest' },
    { id: 'Workshop', label: 'Workshop' },
    { id: 'Paper Presentation', label: 'Paper Pres.' },
    { id: 'Project Expo', label: 'Project Expo' },
];

const Discovery = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedPlatform, setSelectedPlatform] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchPulse, setSearchPulse] = useState(false);
    const [lastSearched, setLastSearched] = useState(null);
    const [lastSearchQuery, setLastSearchQuery] = useState('');

    const platforms = [
        { id: 'all', name: 'All Networks', icon: Sparkles, color: 'text-indigo-500' },
        { id: 'google', name: 'Google', icon: Globe, color: 'text-blue-500' },
        { id: 'unstop', name: 'Unstop', icon: Zap, color: 'text-amber-500' },
        { id: 'devpost', name: 'Devpost', icon: ExternalLink, color: 'text-emerald-500' },
        { id: 'mlh', name: 'MLH', icon: Trophy, color: 'text-indigo-500' },
        { id: 'meetup', name: 'Meetup', icon: Users, color: 'text-violet-500' },
    ];

    // Initial Trending Results Load
    useEffect(() => {
        setResults([
            {
                id: 'trend-1',
                eventName: 'SpaceX Mars Habitat Hackathon',
                collegeName: 'Galactic Engineering Consortium',
                eventType: EventType.HACKATHON,
                registrationDeadline: '2026-06-20',
                startDate: '2026-06-25',
                endDate: '2026-06-28',
                prizeAmount: 10000000,
                location: 'Earth / Mars Sync',
                isOnline: true,
                website: 'https://spacex.com/hack',
                platform: 'Google Search',
                description: 'Design the primary life support neural network for the first Mars colony.'
            },
            {
                id: 'trend-2',
                eventName: 'NVIDIA RTX Pathfinding Challenge',
                collegeName: 'NVIDIA Research Lab',
                eventType: EventType.CONTEST,
                registrationDeadline: '2026-05-30',
                startDate: '2026-06-01',
                endDate: '2026-06-03',
                prizeAmount: 2500000,
                location: 'Austin HQ [Remote Option]',
                isOnline: true,
                website: 'https://nvidia.com/rtx-challenge',
                platform: 'Unstop',
                description: 'Optimize real-time raytracing kernels for minimal latency on high-bandwidth memory.'
            }
        ]);
    }, []);

    // Format time since last search
    const getLastSearchedLabel = () => {
        if (!lastSearched) return null;
        const secs = Math.floor((Date.now() - lastSearched) / 1000);
        if (secs < 60) return `${secs}s ago`;
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
    };

    const handleAIsignSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        // Check cache first
        const cacheKey = `${searchQuery.trim().toLowerCase()}::${selectedPlatform}`;
        if (queryCache.has(cacheKey)) {
            setResults(queryCache.get(cacheKey));
            setLastSearchQuery(searchQuery.trim());
            setLastSearched(Date.now());
            return;
        }

        setIsSearching(true);
        setSearchPulse(true);

        // Simulated AI Grid Search
        setTimeout(() => {
            const mockResults = [
                {
                    id: 'ext-1',
                    eventName: 'Global Generative AI Hackathon v4',
                    collegeName: 'Devpost Community',
                    eventType: EventType.HACKATHON,
                    registrationDeadline: '2026-05-25',
                    startDate: '2026-06-05',
                    endDate: '2026-06-07',
                    prizeAmount: 500000,
                    location: 'Cloud Only',
                    isOnline: true,
                    website: 'https://devpost.com/hackathons/global-ai',
                    platform: 'Devpost',
                    description: 'Build robust LLM agents that can operate across fragmented data silos with zero-shot learning.'
                },
                {
                    id: 'ext-2',
                    eventName: 'Smart India Hackathon 2026',
                    collegeName: 'Ministry of Education',
                    eventType: EventType.HACKATHON,
                    registrationDeadline: '2026-07-15',
                    startDate: '2026-08-20',
                    endDate: '2026-08-25',
                    prizeAmount: 1500000,
                    location: 'Nodal Command Centers',
                    isOnline: false,
                    website: 'https://sih.gov.in',
                    platform: 'Google Search',
                    description: 'Solving the nation\'s hardest engineering problems through collaborative student innovation.'
                },
                {
                    id: 'ext-3',
                    eventName: 'Major League Hacking: Winter 26',
                    collegeName: 'MLH Operational Command',
                    eventType: EventType.CONTEST,
                    registrationDeadline: '2026-11-10',
                    startDate: '2026-11-12',
                    endDate: '2026-11-14',
                    prizeAmount: 200000,
                    location: 'Virtual Grid',
                    isOnline: true,
                    website: 'https://mlh.io',
                    platform: 'MLH',
                    description: 'Compete, learn, and level up your operational efficiency in the world\'s largest hacker circuit.'
                },
                {
                    id: 'ext-4',
                    eventName: 'Stanford AI Project Expo',
                    collegeName: 'Stanford Center for AI',
                    eventType: EventType.PROJECT_EXPO,
                    registrationDeadline: '2026-06-20',
                    startDate: '2026-07-01',
                    endDate: '2026-07-03',
                    prizeAmount: 1000000,
                    location: 'Palo Alto [Hybrid]',
                    isOnline: true,
                    website: 'https://stanford.edu/expo',
                    platform: 'Bing Search',
                    description: 'Exhibit your frontier research and practical implementations to top-tier VC and academic heads.'
                }
            ];

            const filtered = mockResults.filter(r =>
                (selectedPlatform === 'all' || r.platform.toLowerCase().includes(selectedPlatform.toLowerCase())) &&
                (r.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            setResults(filtered);
            setIsSearching(false);
            setSearchPulse(false);
        }, 2200);
    };

    const handleImport = async (event) => {
        try {
            const { id, platform, ...cleanEvent } = event;
            await addEvent(cleanEvent);
            alert(`EVENT IMPORTED: ${event.eventName} added to your list.`);
        } catch (error) {
            console.error('Injection error:', error);
        }
    };

    return (
        <div className="pb-32 pt-12">
            {/* Header / Intro */}
            <div className="mb-16 text-center max-w-4xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.4em] mb-8 border border-white/10 shadow-2xl"
                >
                    <Cpu size={14} className="text-indigo-400" />
                    AI Event Search Engine
                </motion.div>
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 leading-none">
                    Discover <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Events</span> Online
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-bold max-w-2xl mx-auto">
                    AI-powered multi-platform search. Find hackathons, contests, and workshops across the web in real-time.
                </p>
            </div>

            {/* Tactical Search Interface */}
            <div className="max-w-4xl mx-auto mb-20 px-4">
                <div className="relative group">
                    <div className={cn(
                        "absolute -inset-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 rounded-[2.5rem] blur opacity-20 group-focus-within:opacity-50 transition-opacity duration-1000",
                        isSearching && "animate-pulse opacity-40"
                    )} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <form onSubmit={handleAIsignSearch} className="flex flex-col md:flex-row items-center">
                            <div className="flex-1 w-full relative">
                                <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-slate-400">
                                    <Terminal size={22} strokeWidth={3} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter search parameters: 'Hackathons in India', 'AI Project Expos'..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-20 pr-8 py-8 bg-transparent focus:outline-none text-xl font-bold tracking-tight text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700"
                                />
                            </div>
                            <div className="p-4 w-full md:w-auto">
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="w-full md:w-auto px-10 h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSearching ? (
                                        <>
                                            <div className="w-5 h-5 border-4 border-slate-400 border-t-indigo-500 rounded-full animate-spin" />
                                            Scanning...
                                        </>
                                    ) : (
                                        <>
                                            Search Events
                                            <ArrowRight size={18} strokeWidth={3} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Filter Grid */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
                    {platforms.map((p) => {
                        const Icon = p.icon;
                        const isActive = selectedPlatform === p.id;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPlatform(p.id)}
                                className={cn(
                                    "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                                    isActive
                                        ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20 -translate-y-1"
                                        : "bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-indigo-300"
                                )}
                            >
                                <Icon size={14} className={cn(!isActive && p.color)} strokeWidth={3} />
                                {p.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Data Feed Grid */}
            <div className="max-w-7xl mx-auto px-4 lg:px-8">

                {/* Category Filter Chips + Last Searched */}
                {results.length > 0 && (
                    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                            {CATEGORY_FILTERS.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                        selectedCategory === cat.id
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                            : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                                    )}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        {lastSearched && (
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock size={10} />
                                Last searched: {getLastSearchedLabel()} — &quot;{lastSearchQuery}&quot;
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <AnimatePresence mode="popLayout">
                        {(() => {
                            const visibleResults = selectedCategory === 'all' ? results : results.filter(r => r.eventType === selectedCategory);
                            return visibleResults.length > 0 ? (
                            visibleResults.map((event, idx) => (
                                <motion.div
                                    key={event.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -30 }}
                                    transition={{ delay: idx * 0.1, type: 'spring', damping: 20 }}
                                    className="relative group h-full"
                                >
                                    {/* Backdrop FX */}
                                    <div className="absolute inset-0 bg-indigo-600 rounded-[3rem] blur-[40px] opacity-0 group-hover:opacity-10 transition-opacity" />

                                    <div className="relative h-full bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-2xl transition-all flex flex-col overflow-hidden">
                                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-full group-hover:scale-125 transition-transform duration-700" />

                                        <div className="flex justify-between items-start mb-10 relative z-10">
                                            <div className={cn(
                                                "flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border-2",
                                                event.platform.toLowerCase().includes('search')
                                                    ? "bg-blue-50 text-blue-600 border-blue-100"
                                                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            )}>
                                                {event.platform.toLowerCase().includes('search') ? <Globe size={11} /> : <Zap size={11} />}
                                                Found on {event.platform}
                                            </div>
                                            <a href={event.website} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
                                                <ExternalLink size={18} />
                                            </a>
                                        </div>

                                        <div className="flex-1 relative z-10">
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight group-hover:text-indigo-600 transition-colors leading-[1.1]">{event.eventName}</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{event.collegeName}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-8 italic">
                                                "{event.description}"
                                            </p>

                                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</span>
                                                    <span className="text-xs font-black text-slate-900 dark:text-slate-200">{event.eventType}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Deadline</span>
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-amber-500" />
                                                        <span className="text-xs font-black text-amber-600">{event.registrationDeadline}</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Registration Portal</span>
                                                    <a href={event.registrationLink || event.website} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-1.5">
                                                        {event.platform} Link <ExternalLink size={10} />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-10 relative z-10">
                                            <button
                                                onClick={() => handleImport(event)}
                                                className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-500/10"
                                            >
                                                <Download size={18} strokeWidth={3} />
                                                Add to My List
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : null;
                        })()}
                        {isSearching && (
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="bg-slate-100 dark:bg-slate-800/50 rounded-[3rem] h-[450px] animate-pulse border-2 border-dashed border-slate-200 dark:border-slate-800" />
                            ))
                        )}
                        {!isSearching && results.length === 0 && searchQuery && (
                            <div className="col-span-full py-32 text-center">
                                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                                    <ShieldCheck size={48} className="text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Search Complete</h3>
                                <p className="text-slate-500 font-bold">No events found matching your search at the moment.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Intelligence Footer */}
            <div className="mt-32 max-w-4xl mx-auto px-4 text-center">
                <div className="flex items-center justify-center gap-10 opacity-30">
                    <img src="https://unstop.com/favicon.ico" alt="U" className="w-8 grayscale invert brightness-0" />
                    <img src="https://devpost.com/favicon.ico" alt="D" className="w-8 grayscale invert brightness-0" />
                    <img src="https://mlh.io/favicon.ico" alt="M" className="w-8 grayscale invert brightness-0" />
                </div>
            </div>
        </div>
    );
};

export default Discovery;
