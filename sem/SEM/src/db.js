/**
 * 💾 INDEXED-DB CORE DATABASE LAYER
 * 
 * This file powers the "Offline-First" capability of the app.
 * It uses Dexie.js to manage a local database in the user's browser.
 */

import Dexie from 'dexie';
import { useAppStore } from './store';
import { saveEventToFirestore, deleteEventFromFirestore, saveTeamEventData } from './services/firebase';

/**
 * Define the Database Schema
 */
export class EventDatabase extends Dexie {
    constructor() {
        super('CollegeEventManager');

        // Version 1: Original schema
        this.version(1).stores({
            events: '++id, collegeName, eventName, eventType, registrationDeadline, startDate, endDate, status, priorityScore, createdAt, contact1, contact2, leader, prizeWon, isShortlisted, serverId, teamId, createdBy',
            colleges: '++id, name, location, pastEvents',
            notes: '++id, eventId, content, createdAt',
            settings: 'key, value'
        });

        // Version 2: Added teamEventData table for team-specific event tracking
        this.version(2).stores({
            events: '++id, collegeName, eventName, eventType, registrationDeadline, startDate, endDate, status, priorityScore, createdAt, contact1, contact2, leader, prizeWon, isShortlisted, serverId, teamId, createdBy',
            teamEventData: '++id, teamId, eventId, status, prizeWon, isShortlisted, updatedAt',
            colleges: '++id, name, location, pastEvents',
            notes: '++id, eventId, content, createdAt',
            settings: 'key, value'
        });

        // Version 3: Added userEventStats for per-user individual prize tracking
        this.version(3).stores({
            events: '++id, collegeName, eventName, eventType, registrationDeadline, startDate, endDate, status, priorityScore, createdAt, contact1, contact2, leader, prizeWon, isShortlisted, serverId, teamId, createdBy',
            teamEventData: '++id, teamId, eventId, status, prizeWon, isShortlisted, updatedAt',
            userEventStats: '++id, userId, eventId, prizeWon, updatedAt',
            colleges: '++id, name, location, pastEvents',
            notes: '++id, eventId, content, createdAt',
            settings: 'key, value'
        });
    }
}

export const db = new EventDatabase();

/**
 * Event Constants
 */
export const EventType = {
    HACKATHON: 'Hackathon',
    PAPER_PRESENTATION: 'Paper Presentation',
    PROJECT_EXPO: 'Project Expo',
    WORKSHOP: 'Workshop',
    CONTEST: 'Contest',
    SEMINAR: 'Seminar',
    CONFERENCE: 'Conference',
    OTHER: 'Other'
};

export const EventStatus = {
    OPEN: 'Open',
    REGISTERED: 'Registered',
    SHORTLISTED: 'Shortlisted',
    DEADLINE_TODAY: 'Deadline Today',
    CLOSED: 'Closed',
    COMPLETED: 'Completed',
    ATTENDED: 'Attended',
    WON: 'Won',
    BLOCKED: 'Blocked',
    UPCOMING: 'Upcoming'
};

const MANUAL_STATUSES = [
    EventStatus.WON, 
    EventStatus.ATTENDED, 
    EventStatus.BLOCKED, 
    EventStatus.REGISTERED, 
    EventStatus.SHORTLISTED,
    EventStatus.UPCOMING,
    EventStatus.OPEN
];

/**
 * Creates a standard event object with defaults.
 */
export const createEvent = ({
    collegeName,
    eventName,
    eventType,
    registrationDeadline,
    startDate,
    endDate,
    prizeAmount = 0,
    registrationFee = 0,
    accommodation = false,
    location = '',
    isOnline = false,
    contactNumbers = [],
    contact1 = '',
    contact2 = '',
    posterUrl = '',
    posterBlob = null,
    posterUrls = [],
    posterBlobs = [],
    website = '',
    registrationLink = '',
    registrationLinks = [],
    instagram = '',
    linkedin = '',
    twitter = '',
    youtube = '',
    description = '',
    teamSize = 1,
    teamName = '',
    leader = '',
    members = '',
    noOfTeams = '',
    prizeWon = '',
    eligibility = '',
    status = null,
    priorityScore = null,
    customReminders = [],
    tags = [],
    isShortlisted = false,
    createdAt = null,
    updatedAt = null,
    serverId = null,
    teamId = null,
    createdBy = null,
    id = null
}) => {
    const now = new Date();

    const event = {
        id,
        serverId: serverId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36)),
        collegeName,
        eventName,
        eventType,
        registrationDeadline: new Date(registrationDeadline),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        prizeAmount,
        registrationFee,
        accommodation,
        location,
        isOnline,
        contactNumbers,
        contact1,
        contact2,
        posterUrl,
        posterBlob,
        posterUrls: Array.isArray(posterUrls) ? posterUrls : (posterUrl ? [posterUrl] : []),
        posterBlobs: Array.isArray(posterBlobs) ? posterBlobs : (posterBlob ? [posterBlob] : []),
        website,
        registrationLink,
        registrationLinks: Array.isArray(registrationLinks) ? registrationLinks : (registrationLink ? [{ label: 'Register', url: registrationLink }] : []),
        instagram,
        linkedin,
        twitter,
        youtube,
        description,
        teamSize,
        teamName,
        leader,
        members,
        noOfTeams,
        prizeWon,
        eligibility,
        status: status || calculateStatus(registrationDeadline, startDate, endDate),
        priorityScore: priorityScore || 0,
        customReminders,
        tags,
        isShortlisted: !!isShortlisted,
        teamId: teamId || null,
        createdBy: createdBy || null,
        createdAt: createdAt ? new Date(createdAt) : now,
        updatedAt: updatedAt ? new Date(updatedAt) : now
    };

    if (event.id === null) delete event.id;
    return event;
};

/**
 * ENGINE: Automatically decides the status based on current date.
 */
export const calculateStatus = (registrationDeadline, startDate, endDate) => {
    const now = new Date();
    const deadline = new Date(registrationDeadline);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(deadline.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
        return EventStatus.OPEN;
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    if (today > endDateOnly) return EventStatus.COMPLETED;
    if (today >= startDateOnly && today <= endDateOnly) return EventStatus.ATTENDED;
    if (today > deadlineDate) return EventStatus.CLOSED;
    if (today.getTime() === deadlineDate.getTime()) return EventStatus.DEADLINE_TODAY;

    return EventStatus.OPEN;
};

/**
 * ENGINE: Assigns a score (0-100) based on how "lucrative" the event is.
 */
export const calculatePriorityScore = (event) => {
    let score = 0;
    const now = new Date();
    const deadline = new Date(event.registrationDeadline);

    if (isNaN(deadline.getTime())) return 0;

    const prize = parseFloat(event.prizeAmount) || 0;
    const fee = parseFloat(event.registrationFee) || 0;
    if (fee === 0 && prize > 0) score += 40;
    else if (fee > 0) {
        const ratio = prize / fee;
        if (ratio >= 20) score += 40;
        else if (ratio >= 10) score += 30;
        else if (ratio >= 5) score += 20;
        else if (ratio >= 2) score += 10;
        else if (ratio >= 1) score += 5;
    }

    const typeScores = {
        [EventType.HACKATHON]: 25,
        [EventType.PROJECT_EXPO]: 20,
        [EventType.CONTEST]: 20,
        [EventType.PAPER_PRESENTATION]: 15,
        [EventType.WORKSHOP]: 10,
        [EventType.CONFERENCE]: 10,
        [EventType.SEMINAR]: 5,
        [EventType.OTHER]: 5
    };
    const eventTypes = Array.isArray(event.eventType) ? event.eventType : [event.eventType];
    const maxTypeScore = Math.max(...eventTypes.map(t => typeScores[t] || 5));
    score += maxTypeScore;

    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) score = 0;
    else if (daysRemaining <= 1) score += 30;
    else if (daysRemaining <= 3) score += 20;
    else if (daysRemaining <= 7) score += 10;

    const tSize = parseInt(event.teamSize) || 1;
    if (tSize === 1) score += 5;

    return Math.min(100, Math.max(0, score));
};

/**
 * DATA OP: Update a team-specific status/prize/shortlist for an event.
 */
export const updateTeamEventStatus = async (eventId, updates) => {
    const { teamId, cloudProvider } = useAppStore.getState();
    if (!teamId || !eventId) {
        console.warn('[DB] Update blocked: teamId or eventId missing', { teamId, eventId });
        return;
    }

    try {
        const existing = await db.teamEventData.where('teamId').equals(teamId).and(item => item.eventId === eventId).first();
        const now = new Date().toISOString();
        
        if (existing) {
            await db.teamEventData.update(existing.id, { ...updates, updatedAt: now });
        } else {
            await db.teamEventData.add({ ...updates, teamId, eventId, updatedAt: now });
        }
    } catch (e) {
        console.error('[DB] teamEventData write failed:', e);
        throw e; // Re-throw to allow component-level handling
    }

    if (cloudProvider === 'firestore') {
        try {
            await saveTeamEventData(teamId, eventId, updates);
        } catch (e) {
            console.error('[Sync Fail] Team event data sync failed:', e);
        }
    }
};

/**
 * UTILITY: Merges global events with the current team's private stats.
 */
export const getMergedEvents = async () => {
    const { teamId } = useAppStore.getState();
    const globalEvents = await db.events.toArray();
    
    if (!teamId) return globalEvents;

    let teamStats = [];
    try {
        teamStats = await db.teamEventData.where('teamId').equals(teamId).toArray();
    } catch (e) {
        console.warn('[DB] teamEventData query failed (table may not exist yet):', e.message);
        return globalEvents;
    }

    const statsMap = new Map(teamStats.map(s => [s.eventId, s]));

    const merged = globalEvents.map(event => {
        const stats = statsMap.get(event.serverId);
        const now = new Date();
        const endDate = new Date(event.endDate);
        const deadline = new Date(event.registrationDeadline);
        
        // 1. Trust user interaction above all else
        let status = stats?.status || event.status;
        
        // 2. Only apply automatic dates-based logic if the user HAS NOT manually tracked this event
        const isUserOverridden = !!stats?.status;
        if (!isUserOverridden && !MANUAL_STATUSES.includes(status)) {
            if (!isNaN(endDate.getTime()) && now > endDate) status = EventStatus.COMPLETED;
            else if (!isNaN(deadline.getTime()) && now > deadline) status = EventStatus.CLOSED;
        }

        return {
            ...event,
            status: status,
            prizeWon: parseFloat(stats?.prizeWon) || parseFloat(event.prizeWon) || 0,
            isShortlisted: !!stats?.isShortlisted,
            teamDataUpdatedAt: stats?.updatedAt || null
        };
    });

    return merged;
};

/**
 * DATA OP: Create a new event.
 */
export const addEvent = async (eventData) => {
    const event = createEvent(eventData);
    event.priorityScore = calculatePriorityScore(event);

    const result = await db.transaction('rw', db.events, async () => {
        const id = await db.events.add(event);
        return { ...event, id };
    });

    const state = useAppStore.getState();
    if (state.cloudProvider === 'firestore') {
        try {
            await saveEventToFirestore(result);
        } catch (e) {
            console.error('[Sync Fail] Local saved but cloud sync failed:', e);
        }
    }
    return result;
};

export const updateEvent = async (id, updates) => {
    const finalEvent = await db.transaction('rw', db.events, async () => {
        const event = await db.events.get(id);
        if (!event) throw new Error("Event not found");

        const updated = { ...updates, updatedAt: new Date() };
        if (updates.registrationDeadline || updates.startDate || updates.endDate ||
            updates.prizeAmount || updates.registrationFee) {
            const merged = { ...event, ...updates };
            if (!updates.status && !MANUAL_STATUSES.includes(event.status)) {
                updated.status = calculateStatus(merged.registrationDeadline, merged.startDate, merged.endDate);
            }
            updated.priorityScore = calculatePriorityScore(merged);
        }
        await db.events.update(id, updated);
        return await db.events.get(id);
    });

    const state = useAppStore.getState();
    if (state.cloudProvider === 'firestore') {
        try {
            await saveEventToFirestore(finalEvent);
        } catch (e) {
            console.error('[Sync Fail] Update failed to sync:', e);
        }
    }
    return finalEvent;
};

export const deleteEvent = async (id) => {
    const event = await db.events.get(id);
    if (!event) return;
    await db.events.delete(id);
    const state = useAppStore.getState();
    if (state.cloudProvider === 'firestore' && event.serverId) {
        try {
            await deleteEventFromFirestore(event.serverId);
        } catch (e) {
            console.error('[Sync Fail] Delete failed on cloud:', e);
        }
    }
};

/**
 * BULK OP: Used for initial sync from Firebase to Local DB (Global Events).
 */
export const bulkImportEvents = async (eventsArray, overwrite = false) => {
    if (!eventsArray) return { added: 0, updated: 0 };

    return await db.transaction('rw', db.events, async () => {
        let added = 0;
        let updated = 0;
        const existingEvents = await db.events.toArray();
        const serverIdMap = new Map();
        existingEvents.forEach(e => { if (e.serverId) serverIdMap.set(e.serverId, e.id); });
        const nameMap = new Map(existingEvents.map(e => [`${e.eventName}__${e.collegeName}`.toLowerCase(), e.id]));
        const currentServerIds = new Set();

        for (const data of eventsArray) {
            if (!data.eventName || data.eventName.length < 2) continue;
            const processed = createEvent(data);
            const remoteSid = processed.serverId;
            currentServerIds.add(remoteSid);
            let localIdToUpdate = serverIdMap.get(remoteSid);
            if (!localIdToUpdate) {
                const legacyKey = `${processed.eventName}__${processed.collegeName}`.toLowerCase();
                if (nameMap.has(legacyKey)) localIdToUpdate = nameMap.get(legacyKey);
            }
            if (localIdToUpdate) {
                const localEvent = existingEvents.find(e => e.id === localIdToUpdate);
                
                // Conflict resolution: Check if local modification timestamp is newer than incoming remote timestamp
                const localUpdateTs = localEvent?.updatedAt ? new Date(localEvent.updatedAt).getTime() : 0;
                const remoteUpdateTs = processed.updatedAt ? new Date(processed.updatedAt).getTime() : 0;

                if (localUpdateTs > remoteUpdateTs) {
                    console.log(`[DB] Conflict resolution for "${processed.eventName}": local copy is newer. Skipping overwrite.`);
                    const cloudProvider = useAppStore.getState().cloudProvider;
                    if (cloudProvider === 'firestore') {
                        saveEventToFirestore(localEvent).catch(err => console.error('[DB] Failed to sync newer local change:', err));
                    }
                } else {
                    if (localEvent?.posterBlob && !processed.posterBlob) processed.posterBlob = localEvent.posterBlob;
                    await db.events.update(localIdToUpdate, { ...processed, id: localIdToUpdate, serverId: remoteSid });
                    updated++;
                }
            } else {
                delete processed.id;
                await db.events.add(processed);
                added++;
            }
        }
        if (overwrite) {
            for (const e of existingEvents) {
                if (e.serverId && !currentServerIds.has(e.serverId)) await db.events.delete(e.id);
            }
        }
        return { added, updated };
    });
};

/**
 * BULK OP: Import Team Stats from Firestore to Local DB.
 */
export const bulkImportTeamEventData = async (statsMap, teamId) => {
    if (!statsMap || !teamId) return;

    await db.transaction('rw', db.teamEventData, async () => {
        for (const eventId in statsMap) {
            const data = statsMap[eventId];
            const existing = await db.teamEventData.where('teamId').equals(teamId).and(item => item.eventId === eventId).first();
            if (existing) {
                await db.teamEventData.update(existing.id, { ...data, teamId, eventId });
            } else {
                await db.teamEventData.add({ ...data, teamId, eventId });
            }
        }
    });
};

/**
 * UTILITY: Run maintenance (update statuses of all events based on current time)
 */
export const updateAllEventStatuses = async () => {
    try {
        const events = await db.events.toArray();
        const updates = [];
        const now = new Date();

        for (const event of events) {
            if (MANUAL_STATUSES.includes(event.status)) continue;
            const newStatus = calculateStatus(event.registrationDeadline, event.startDate, event.endDate);
            const newScore = calculatePriorityScore(event);
            
            if (newStatus !== event.status || newScore !== event.priorityScore) {
                updates.push({
                    ...event,
                    status: newStatus,
                    priorityScore: newScore,
                    updatedAt: now
                });
            }
        }

        if (updates.length > 0) {
            await db.events.bulkPut(updates);
            console.log(`[DB] Bulk Status Sync: Updated ${updates.length} events.`);
        }
    } catch (error) {
        console.error('[DB] Maintenance update failed:', error);
    }
};

export const getAllEvents = async () => {
    return await getMergedEvents();
};


/**
 * USER EVENT STATS: Save or update a user's personal prize/stat for an event.
 */
export const setUserEventStat = async (userId, eventId, data) => {
    if (!userId || !eventId) return;
    try {
        const existing = await db.userEventStats
            .where('userId').equals(userId)
            .and(item => item.eventId === eventId)
            .first();
        const payload = { userId, eventId, updatedAt: new Date().toISOString(), ...data };
        if (existing) {
            await db.userEventStats.update(existing.id, payload);
        } else {
            await db.userEventStats.add(payload);
        }
    } catch (e) {
        console.error('[DB] setUserEventStat failed:', e);
    }
};

/**
 * USER EVENT STATS: Get a single user's stat record for a specific event.
 */
export const getUserEventStat = async (userId, eventId) => {
    if (!userId || !eventId) return null;
    try {
        return await db.userEventStats
            .where('userId').equals(userId)
            .and(item => item.eventId === eventId)
            .first() || null;
    } catch (e) {
        console.warn('[DB] userEventStats table not ready yet:', e.message);
        return null;
    }
};

/**
 * USER EVENT STATS: Returns a summary { totalPrize, winCount } for a user.
 */
export const getUserPrizeSummary = async (userId) => {
    if (!userId) return { totalPrize: 0, winCount: 0 };
    try {
        const stats = await db.userEventStats.where('userId').equals(userId).toArray();
        const totalPrize = stats.reduce((sum, s) => sum + (parseFloat(s.prizeWon) || 0), 0);
        const winCount = stats.filter(s => parseFloat(s.prizeWon) > 0).length;
        return { totalPrize, winCount, eventIds: stats.map(s => s.eventId) };
    } catch (e) {
        console.warn('[DB] getUserPrizeSummary failed:', e.message);
        return { totalPrize: 0, winCount: 0 };
    }
};

export const purgeDatabase = async () => {
    await db.events.clear();
    await db.teamEventData.clear();
    await db.colleges.clear();
    await db.notes.clear();
    try { await db.userEventStats.clear(); } catch(_) {}
};
