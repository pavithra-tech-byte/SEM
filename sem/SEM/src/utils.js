import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { isSameDay, startOfDay } from "date-fns";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const resolveImageUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return null;
    const cleanUrl = url.trim();
    if (!cleanUrl) return null;

    // Handle Google Drive sharing links
    if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('googleusercontent.com') || cleanUrl.includes('docs.google.com')) {
        // match various formats: /d/ID, id=ID, file/d/ID/view, etc.
        const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                      cleanUrl.match(/id=([a-zA-Z0-9_-]+)/) ||
                      cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                      
        if (match && match[1]) {
            // Using lh3.googleusercontent.com/d/ is more reliable for direct images than drive.google.com/thumbnail
            return `https://lh3.googleusercontent.com/d/${match[1]}`;
        }
    }

    return cleanUrl;
};

/**
 * Extracts and normalizes all poster images from an event object.
 * Handles single & array fields (posterUrls, posterBlobs, posterUrl, posterBlob)
 * and snake_case database fallbacks.
 */
export const extractEventImages = (event) => {
    if (!event) return [];
    const list = [];
    const seen = new Set();

    const addSource = (source) => {
        if (!source) return;
        if (source instanceof Blob) {
            list.push(source);
            return;
        }
        if (typeof source === 'string') {
            const trimmed = source.trim();
            if (!trimmed) return;
            const resolved = resolveImageUrl(trimmed);
            if (resolved && !seen.has(resolved)) {
                seen.add(resolved);
                list.push(resolved);
            }
        }
    };

    // 1. Process posterBlobs / poster_blobs
    const blobs = event.posterBlobs || event.poster_blobs;
    if (Array.isArray(blobs)) {
        blobs.forEach(addSource);
    } else if (blobs) {
        addSource(blobs);
    }

    // 2. Process posterBlob / poster_blob
    const blob = event.posterBlob || event.poster_blob;
    if (blob) {
        addSource(blob);
    }

    // 3. Process posterUrls / poster_urls
    const urls = event.posterUrls || event.poster_urls;
    if (Array.isArray(urls)) {
        urls.forEach(addSource);
    } else if (typeof urls === 'string') {
        addSource(urls);
    }

    // 4. Process posterUrl / poster_url
    const url = event.posterUrl || event.poster_url;
    if (url) {
        addSource(url);
    }

    // 5. Fallback poster field if present
    if (event.poster) {
        addSource(event.poster);
    }

    return list;
};

/**
 * React hook that extracts poster images for an event, converting any local
 * Blob objects to Object URLs with automatic lifecycle revocation.
 */
export const useEventPosters = (event) => {
    const [images, setImages] = useState([]);

    useEffect(() => {
        if (!event) {
            setImages([]);
            return;
        }

        const rawList = extractEventImages(event);
        const resolvedList = [];
        const objectUrls = [];

        rawList.forEach((item) => {
            if (item instanceof Blob) {
                const objectUrl = URL.createObjectURL(item);
                objectUrls.push(objectUrl);
                resolvedList.push(objectUrl);
            } else if (typeof item === 'string') {
                resolvedList.push(item);
            }
        });

        setImages(resolvedList);

        return () => {
            objectUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [
        event?.id,
        event?.serverId,
        event?.posterUrl,
        event?.posterBlob,
        Array.isArray(event?.posterUrls) ? event.posterUrls.join('|') : event?.posterUrls,
        Array.isArray(event?.posterBlobs) ? event.posterBlobs.length : (event?.posterBlobs ? 1 : 0)
    ]);

    return images;
};

export const getDefaultPoster = (eventName, seed = '') => {
    // Returning null enforces the application to use the safe, abstract gradient "No Poster" fallback
    // Instead of using misleading placeholder images with text.
    return null;
};

/**
 * Parses markdown-like text safely for HTML rendering.
 */
export function parseMarkdown(text) {
    if (!text) return '';
    
    // HTML Entity encoding to prevent XSS
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Bold (**text**)
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic (*text*)
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Inline code (`code`)
    escaped = escaped.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-pink-600 dark:text-pink-400 font-black">$1</code>');
    
    // Links [text](url)
    escaped = escaped.replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-500 dark:text-indigo-400 underline hover:text-indigo-600 font-bold">$1</a>');
    
    // Naked URLs (if not already matched inside a link)
    const urlRegex = /(?<!href="|">)(https?:\/\/[^\s<]+)/g;
    escaped = escaped.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-500 dark:text-indigo-400 underline hover:text-indigo-600 font-bold">$1</a>');

    return escaped;
}

/**
 * Downloads a standard .ics calendar file for an event.
 */
export function downloadIcsFile(event) {
    const formatIcsDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = formatIcsDate(event.startDate || event.registrationDeadline);
    const end = formatIcsDate(event.endDate || event.startDate || event.registrationDeadline);
    const deadline = formatIcsDate(event.registrationDeadline);

    let icsContent = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//SEM Student Event Manager//EN\r
BEGIN:VEVENT\r
UID:sem-${event.id || event.serverId || Date.now()}@student.event.manager\r
DTSTAMP:${formatIcsDate(new Date())}\r
DTSTART:${start}\r
DTEND:${end}\r
SUMMARY:${event.eventName}\r
DESCRIPTION:College: ${event.collegeName}\\nDeadline: ${event.registrationDeadline ? event.registrationDeadline : 'TBD'}\\nWebsite: ${event.website || 'None'}\\n\\n${(event.description || '').replace(/\r?\n/g, '\\n')}\r
LOCATION:${event.location || (event.isOnline ? 'Online' : 'Campus')}\r
END:VEVENT\r
`;

    if (deadline) {
        icsContent += `BEGIN:VEVENT\r
UID:sem-deadline-${event.id || event.serverId || Date.now()}@student.event.manager\r
DTSTAMP:${formatIcsDate(new Date())}\r
DTSTART:${deadline}\r
DTEND:${deadline}\r
SUMMARY:DEADLINE: ${event.eventName}\r
DESCRIPTION:Registration deadline for ${event.eventName} hosted by ${event.collegeName}\r
LOCATION:${event.location || (event.isOnline ? 'Online' : 'Campus')}\r
END:VEVENT\r
`;
    }

    icsContent += `END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_event.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Builds Google Calendar event template URL.
 */
export function getGoogleCalendarUrl(event) {
    const formatGCalDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = formatGCalDate(event.startDate || event.registrationDeadline);
    const end = formatGCalDate(event.endDate || event.startDate || event.registrationDeadline);
    const details = `College: ${event.collegeName}\nRegistration Deadline: ${event.registrationDeadline || 'TBD'}\nWebsite: ${event.website || ''}\n\nDescription: ${event.description || ''}`;
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.eventName)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(event.location || (event.isOnline ? 'Online' : 'Campus'))}`;
}

/**
 * Smart parsing of poster OCR text using search patterns and heuristics.
 */
export function parseOcrTextHeuristics(text) {
    const result = {};
    if (!text) return result;

    const cleanText = text.replace(/\s+/g, ' ');
    const textLower = cleanText.toLowerCase();

    // 1. Extract URLs
    const urls = cleanText.match(/https?:\/\/[^\s]+/gi);
    if (urls && urls.length > 0) {
        result.website = urls[0];
        if (urls.length > 1) {
            result.registrationLink = urls[1];
        }
    }

    // 2. Extract Registration Fee
    const feeMatch = cleanText.match(/(?:fee|entry|reg(?:istration)?)\s*(?:fee)?\s*(?:-|:|=|\s+)?\s*(?:rs\.?|inr|₹)?\s*(?:free|0|([0-9,]+))/i);
    if (feeMatch) {
        if (feeMatch[0].toLowerCase().includes('free') || feeMatch[0].includes(' 0')) {
            result.registrationFee = 0;
        } else if (feeMatch[1]) {
            result.registrationFee = parseInt(feeMatch[1].replace(/,/g, ''), 10);
        }
    }

    // 3. Extract Prize Amount
    const prizeMatch = cleanText.match(/(?:prize|pool|worth|reward)\s*(?:pool|worth|amount)?\s*(?:-|:|=|\s+)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+)\s*(k|lakh)?/i);
    if (prizeMatch) {
        let amount = parseInt(prizeMatch[1].replace(/,/g, ''), 10);
        const suffix = (prizeMatch[2] || '').toLowerCase();
        if (suffix === 'k') amount *= 1000;
        else if (suffix === 'lakh') amount *= 100000;
        result.prizeAmount = amount;
    }

    // 4. Extract Dates
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthRegexStr = `(?:${months.join('|')})[a-z]*`;
    
    const numericDateRegex = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/g;
    const isoDateRegex = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/g;
    const textDateRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthRegexStr})\\s+(\\d{4})\\b`, 'ig');
    const textDateRegex2 = new RegExp(`\\b(${monthRegexStr})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,)?\\s+(\\d{4})\\b`, 'ig');

    const foundDates = [];
    let match;

    while ((match = numericDateRegex.exec(cleanText)) !== null) {
        const dateObj = new Date(`${match[3]}-${match[2]}-${match[1]}`);
        if (!isNaN(dateObj.getTime())) foundDates.push({ date: dateObj, text: match[0], index: match.index });
    }
    while ((match = isoDateRegex.exec(cleanText)) !== null) {
        const dateObj = new Date(`${match[1]}-${match[2]}-${match[3]}`);
        if (!isNaN(dateObj.getTime())) foundDates.push({ date: dateObj, text: match[0], index: match.index });
    }
    while ((match = textDateRegex.exec(cleanText)) !== null) {
        const monthIndex = months.indexOf(match[2].toLowerCase().substring(0, 3));
        const dateObj = new Date(parseInt(match[3], 10), monthIndex, parseInt(match[1], 10));
        if (!isNaN(dateObj.getTime())) foundDates.push({ date: dateObj, text: match[0], index: match.index });
    }
    while ((match = textDateRegex2.exec(cleanText)) !== null) {
        const monthIndex = months.indexOf(match[1].toLowerCase().substring(0, 3));
        const dateObj = new Date(parseInt(match[3], 10), monthIndex, parseInt(match[2], 10));
        if (!isNaN(dateObj.getTime())) foundDates.push({ date: dateObj, text: match[0], index: match.index });
    }

    foundDates.sort((a, b) => a.index - b.index);

    if (foundDates.length > 0) {
        const getClueScore = (idx, regexStr) => {
            const surroundingText = cleanText.substring(Math.max(0, idx - 40), Math.min(cleanText.length, idx + 40)).toLowerCase();
            return new RegExp(regexStr, 'i').test(surroundingText) ? 1 : 0;
        };

        const scoredDates = foundDates.map(fd => {
            const deadlineScore = getClueScore(fd.index, 'dead|last|close|reg|end');
            const eventScore = getClueScore(fd.index, 'start|event|date|held|venue');
            return { ...fd, deadlineScore, eventScore };
        });

        const deadlineDate = scoredDates.find(d => d.deadlineScore > d.eventScore) || scoredDates[0];
        result.registrationDeadline = deadlineDate.date.toISOString().split('T')[0];

        const eventDates = scoredDates.filter(d => d.date >= deadlineDate.date);
        if (eventDates.length > 0) {
            result.startDate = eventDates[0].date.toISOString().split('T')[0];
            if (eventDates.length > 1) {
                result.endDate = eventDates[1].date.toISOString().split('T')[0];
            } else {
                result.endDate = result.startDate;
            }
        }
    }

    return result;
}

/**
 * Evaluates whether an event falls into a specific predefined time filter.
 * Serves as the single source of truth for both Dashboard stats and EventList filters.
 */
export const matchesDateRange = (event, rangeKey, now = new Date()) => {
    if (!event || !rangeKey || rangeKey === 'all') return true;

    const getValidDate = (dateVal) => {
        if (!dateVal) return null;
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? null : d;
    };

    const deadline = getValidDate(event.registrationDeadline);
    const start = getValidDate(event.startDate);
    const end = getValidDate(event.endDate);

    if (rangeKey === 'upcoming') {
        // Event is upcoming if its registration deadline is in the future OR it starts in the future
        return (deadline && deadline > now) || (start && start > now);
    }

    if (rangeKey === 'today') {
        return (deadline && isSameDay(deadline, now)) || (start && isSameDay(start, now));
    }

    if (rangeKey === 'week') {
        const today = startOfDay(now);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);
        return (deadline && deadline >= today && deadline <= nextWeek) ||
               (start && start >= today && start <= nextWeek);
    }

    if (rangeKey === 'month') {
        const isThisMonth = (d) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return (deadline && isThisMonth(deadline)) || (start && isThisMonth(start));
    }

    if (rangeKey === 'completed') {
        return end && end < now;
    }

    return true;
};

