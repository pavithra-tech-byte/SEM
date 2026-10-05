// CSV Import Utility using PapaParse
import Papa from 'papaparse';
import DOMPurify from 'dompurify';
import { db, addEvent, updateEvent, EventType } from './db';

// Column mapping configurations
const COLUMN_MAPPINGS = {
    collegeName: ['college name', 'college', 'institution', 'university'],
    eventName: ['event name', 'event', 'name', 'title'],
    eventType: ['event type', 'type', 'category'],
    registrationDeadline: ['registration deadline', 'deadline', 'reg deadline', 'last date'],
    startDate: ['start date', 'from date', 'event date', 'date'],
    endDate: ['end date', 'to date', 'closing date'],
    prizeAmount: ['prize', 'prize amount', 'prize money', 'reward'],
    registrationFee: ['fee', 'registration fee', 'reg fee', 'entry fee', 'cost'],
    accommodation: ['accommodation', 'stay', 'hostel', 'acm'],
    location: ['location', 'venue', 'place', 'city'],
    isOnline: ['online', 'mode', 'virtual'],
    contactNumbers: ['contact', 'phone', 'mobile', 'contact number'],
    contact1: ['contact - 1', 'contact1'],
    contact2: ['contact - 2', 'contact2'],
    posterUrl: ['poster', 'poster link', 'image', 'poster url', 'posters'],
    website: ['website', 'url', 'link', 'official link', 'official website'],
    registrationLink: ['registration link', 'registration', 'reg link', 'google form', 'form link'],
    description: ['description', 'details', 'about'],
    teamSize: ['team size', 'team'],
    leader: ['leader'],
    members: ['members'],
    noOfTeams: ['no of teams', 'no. of teams'],
    prizeWon: ['price won', 'prize won'],
    eligibility: ['eligibility', 'eligible', 'criteria'],
    status: ['status', 'current status', 'state']
};

// Normalize column name
const normalizeColumnName = (column) => {
    return column.toLowerCase().trim();
};

// Find matching field for a column
const findMatchingField = (column) => {
    const normalized = normalizeColumnName(column);

    for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
        if (variations.includes(normalized)) {
            return field;
        }
    }

    return null;
};

// Parse date string
export const parseDate = (dateStr) => {
    if (!dateStr) return null;

    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
        return isoDate;
    }

    // Try DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
    const parts = dateStr.split(/[/-]/).map(p => parseInt(p, 10));
    if (parts.length === 3) {
        let year = parts[2];
        // Fix 2-digit year bug: 26 -> 2026, 99 -> 2099
        if (year < 100) {
            year += 2000;
        }
        // Greedy attempt 1: DD/MM/YYYY
        let d1 = new Date(year, parts[1] - 1, parts[0]);
        // Greedy attempt 2: MM/DD/YYYY
        let d2 = new Date(year, parts[0] - 1, parts[1]);

        // If both are valid, pick the one that makes more sense (if day > 12, it must be DD/MM/YYYY)
        if (!isNaN(d1.getTime()) && parts[0] > 12) return d1;
        if (!isNaN(d2.getTime()) && parts[1] > 12) return d2;

        // Default to d1 if valid
        if (!isNaN(d1.getTime())) return d1;
    }

    return null;
};

// Parse boolean value
const parseBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase().trim();
    return ['yes', 'true', '1', 'y'].includes(str);
};

// Parse number value
const parseNumber = (value) => {
    if (typeof value === 'number') return value;
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
};

// Parse contact numbers
const parseContacts = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value).split(/[,;]/).map(c => c.trim()).filter(Boolean);
};

// Normalize string to Title Case (e.g. "hackathon" -> "Hackathon", "paper presentation" -> "Paper Presentation")
const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

// Try to map a string to a known EventType key/value
const normalizeEventType = (value) => {
    if (!value) return 'Other';
    const lower = String(value).toLowerCase().trim();

    // Direct matches with values
    const exactMatch = Object.values(EventType).find(v => v.toLowerCase() === lower);
    if (exactMatch) return exactMatch;

    // Fuzzy matches
    if (lower.includes('hack')) return EventType.HACKATHON;
    if (lower.includes('paper')) return EventType.PAPER_PRESENTATION;
    if (lower.includes('project') || lower.includes('expo')) return EventType.PROJECT_EXPO;
    if (lower.includes('workshop')) return EventType.WORKSHOP;
    if (lower.includes('contest') || lower.includes('competition')) return EventType.CONTEST;
    if (lower.includes('seminar')) return EventType.SEMINAR;
    if (lower.includes('conference')) return EventType.CONFERENCE;

    return toTitleCase(value); // Fallback to capitalizing what we got
};

// Transform row to event object
export const transformRow = (row, columnMapping) => {
    const event = {};

    for (const [csvColumn, field] of Object.entries(columnMapping)) {
        const value = row[csvColumn];

        if (value === undefined || value === null) continue;

        switch (field) {
            case 'registrationDeadline':
            case 'startDate':
            case 'endDate':
                event[field] = parseDate(value);
                break;

            case 'prizeAmount':
            case 'registrationFee':
            case 'teamSize':
                event[field] = parseNumber(value);
                break;

            case 'accommodation':
            case 'isOnline':
                event[field] = parseBoolean(value);
                break;

            case 'contactNumbers':
                event[field] = parseContacts(value);
                break;

            case 'leader':
            case 'members':
            case 'noOfTeams':
            case 'prizeWon':
            case 'contact1':
            case 'contact2':
            case 'posterUrl':
            case 'eligibility':
            case 'website':
            case 'registrationLink':
                event[field] = String(value).trim();
                break;

            case 'description':
                event[field] = DOMPurify.sanitize(String(value).trim());
                break;

            case 'status':
                event[field] = toTitleCase(String(value).trim());
                break;

            default:
                event[field] = String(value).trim();
        }
    }

    // Set defaults and Normalize
    if (!event.collegeName) event.collegeName = 'Unknown College';
    else event.collegeName = toTitleCase(event.collegeName); // Nice formatting

    if (!event.eventName) event.eventName = 'Untitled Event';

    // intelligently normalize Event Type
    event.eventType = normalizeEventType(event.eventType);

    // Fallback for dates if they were null
    const now = new Date();
    if (!event.registrationDeadline) event.registrationDeadline = now;
    if (!event.startDate) event.startDate = now;
    if (!event.endDate) event.endDate = event.startDate || now;

    return event;
};

// Auto-detect column mapping
export const autoDetectMapping = (headers) => {
    const mapping = {};

    headers.forEach(header => {
        const field = findMatchingField(header);
        if (field) {
            mapping[header] = field;
        }
    });

    return mapping;
};

// Parse CSV file
export const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn('CSV parsing warnings:', results.errors);
                }
                resolve(results);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};

// Import CSV and save to database
export const importCSV = async (file, customMapping = null) => {
    try {
        const results = await parseCSVFile(file);

        if (!results.data || results.data.length === 0) {
            throw new Error('No data found in CSV file');
        }

        // Auto-detect or use custom mapping
        const headers = Object.keys(results.data[0]);
        const columnMapping = customMapping || autoDetectMapping(headers);

        // Transform rows to events
        const events = results.data.map(row => transformRow(row, columnMapping));

        // Process events one by one to ensure Cloud Sync
        let added = 0;
        let updated = 0;

        // Get existing events for deduplication cache
        const existingEvents = await db.events.toArray();
        // Create a map for fast lookups: "eventname__collegename" -> id
        const nameMap = new Map(existingEvents.map(e => [`${e.eventName}__${e.collegeName}`.toLowerCase(), e.id]));

        for (const eventData of events) {
            // Basic validation
            if (!eventData.eventName || eventData.eventName.length < 2) continue;

            const strictKey = `${eventData.eventName}__${eventData.collegeName}`.toLowerCase();

            if (nameMap.has(strictKey)) {
                // Update existing
                const id = nameMap.get(strictKey);
                await updateEvent(id, eventData);
                updated++;
            } else {
                // Add new
                await addEvent(eventData);
                added++;
            }
        }

        return {
            success: true,
            count: { added, updated },
            events,
            mapping: columnMapping
        };
    } catch (error) {
        console.error('CSV import error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Export events to CSV
export const exportToCSV = (events) => {
    const csv = Papa.unparse(events, {
        header: true,
        columns: [
            'College Name',
            'Event Name',
            'Event Type',
            'Registration Deadline',
            'Start Date',
            'End Date',
            'Prize Amount',
            'Registration Fee',
            'Accommodation',
            'Location',
            'Online',
            'Status',
            'Priority Score',
            'Website',
            'Registration Link',
            'Description',
            'Team Size',
            'Eligibility',
            'Leader',
            'Members',
            'No of Teams',
            'Prize Won',
            'Contact 1',
            'Contact 2',
            'Poster URL',
            'Contact Numbers'
        ]
    });

    return csv;
};

// Download CSV file
export const downloadCSV = (csvContent, filename = 'events.csv') => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
