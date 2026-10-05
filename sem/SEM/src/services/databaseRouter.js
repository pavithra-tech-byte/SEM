import { getSupabase } from './supabase';

/**
 * Log dynamic network, sync, or auth events to Supabase database.
 * Table structure: system_logs (id, timestamp, level, category, message, details)
 */
export const logSystemEvent = async (level, category, message, details = {}) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
        await supabase.from('system_logs').insert({
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            details: typeof details === 'string' ? { info: details } : details
        });
    } catch (err) {
        console.error('[Supabase Log Error]:', err.message);
    }
};

/**
 * Sync event details to Supabase.
 */
export const syncEventToSupabase = async (event) => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Prepare SQL compatible fields
    const payload = {
        server_id: event.serverId,
        college_name: event.collegeName,
        event_name: event.eventName,
        event_type: Array.isArray(event.eventType) ? event.eventType : [event.eventType],
        registration_deadline: event.registrationDeadline instanceof Date ? event.registrationDeadline.toISOString() : event.registrationDeadline,
        start_date: event.startDate instanceof Date ? event.startDate.toISOString() : event.startDate,
        end_date: event.endDate instanceof Date ? event.endDate.toISOString() : event.endDate,
        prize_amount: parseFloat(event.prizeAmount) || 0,
        registration_fee: parseFloat(event.registrationFee) || 0,
        accommodation: !!event.accommodation,
        location: event.location || '',
        is_online: !!event.isOnline,
        contact_numbers: event.contactNumbers || [],
        contact1: event.contact1 || '',
        contact2: event.contact2 || '',
        poster_urls: event.posterUrls || (event.posterUrl ? [event.posterUrl] : []),
        website: event.website || '',
        registration_links: event.registrationLinks || (event.registrationLink ? [{ label: 'Register', url: event.registrationLink }] : []),
        instagram: event.instagram || '',
        linkedin: event.linkedin || '',
        twitter: event.twitter || '',
        youtube: event.youtube || '',
        description: event.description || '',
        team_size: parseInt(event.teamSize) || 1,
        team_name: event.teamName || '',
        eligibility: event.eligibility || '',
        leader: event.leader || '',
        members: event.members || '',
        no_of_teams: event.noOfTeams || '',
        prize_won: parseFloat(event.prizeWon) || 0,
        status: event.status,
        priority_score: parseFloat(event.priorityScore) || 0,
        team_id: event.teamId || null,
        created_by: event.createdBy || 'unknown',
        created_at: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabase
            .from('events')
            .upsert(payload, { onConflict: 'server_id' });

        if (error) throw error;
        await logSystemEvent('INFO', 'SYNC', `Event synced to Supabase: ${event.eventName}`, { serverId: event.serverId });
    } catch (err) {
        await logSystemEvent('ERROR', 'SYNC', `Failed to sync event to Supabase: ${err.message}`, { serverId: event.serverId });
    }
};

/**
 * Delete event from Supabase backup.
 */
export const deleteEventFromSupabase = async (serverId) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('server_id', serverId);

        if (error) throw error;
        await logSystemEvent('INFO', 'SYNC', `Event deleted from Supabase: ${serverId}`);
    } catch (err) {
        await logSystemEvent('ERROR', 'SYNC', `Failed to delete event from Supabase: ${err.message}`, { serverId });
    }
};

/**
 * Sync team private details (Status/Prize/Shortlist) to Supabase.
 */
export const syncTeamEventDataToSupabase = async (teamId, eventId, data) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const payload = {
        id: `${teamId}_${eventId}`,
        team_id: teamId,
        event_id: eventId,
        status: data.status || null,
        prize_won: parseFloat(data.prizeWon) || 0,
        is_shortlisted: !!data.isShortlisted,
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabase
            .from('team_event_data')
            .upsert(payload, { onConflict: 'id' });

        if (error) throw error;
    } catch (err) {
        await logSystemEvent('ERROR', 'SYNC', `Failed to sync teamEventData to Supabase: ${err.message}`, { teamId, eventId });
    }
};

/**
 * Write/Update User Profile details to Supabase.
 */
export const syncProfileToSupabase = async (uid, data) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const payload = {
        uid,
        email: data.email || '',
        display_name: data.displayName || '',
        role: data.role || 'public',
        mobile: data.mobile || '',
        college: data.college || '',
        department: data.department || '',
        year: data.year || '',
        section: data.section || '',
        dob: data.dob || '',
        reg_no: data.regNo || '',
        locality: data.locality || '',
        professional_details: data.professionalDetails || '',
        photo_url: data.photoURL || '',
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabase
            .from('user_profiles')
            .upsert(payload, { onConflict: 'uid' });

        if (error) throw error;
    } catch (err) {
        await logSystemEvent('ERROR', 'SYNC', `Failed to sync user profile to Supabase: ${err.message}`, { uid });
    }
};

/**
 * Fallback reader: Fetch global events catalog from Supabase if Firebase is down.
 */
export const fetchBackupEvents = async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Map database naming back to Frontend JS camelCase schema
        return data.map(item => ({
            serverId: item.server_id,
            collegeName: item.college_name,
            eventName: item.event_name,
            eventType: item.event_type,
            registrationDeadline: item.registration_deadline,
            startDate: item.start_date,
            endDate: item.end_date,
            prizeAmount: item.prize_amount,
            registrationFee: item.registration_fee,
            accommodation: item.accommodation,
            location: item.location,
            isOnline: item.is_online,
            contactNumbers: item.contact_numbers,
            contact1: item.contact1,
            contact2: item.contact2,
            posterUrls: item.poster_urls,
            website: item.website,
            registrationLinks: item.registration_links,
            instagram: item.instagram,
            linkedin: item.linkedin,
            twitter: item.twitter,
            youtube: item.youtube,
            description: item.description,
            teamSize: item.team_size,
            teamName: item.team_name,
            eligibility: item.eligibility,
            leader: item.leader,
            members: item.members,
            noOfTeams: item.no_of_teams,
            prizeWon: item.prize_won,
            status: item.status,
            priorityScore: item.priority_score,
            teamId: item.team_id,
            createdBy: item.created_by,
            createdAt: item.created_at,
            updatedAt: item.updated_at
        }));
    } catch (err) {
        await logSystemEvent('CRITICAL', 'FALLBACK', `Failed to fetch events from Supabase fallback: ${err.message}`);
        throw err;
    }
};

/**
 * Fallback reader: Fetch team performance stats from Supabase.
 */
export const fetchBackupTeamEventData = async (teamId) => {
    const supabase = getSupabase();
    if (!supabase) return {};

    try {
        const { data, error } = await supabase
            .from('team_event_data')
            .select('*')
            .eq('team_id', teamId);

        if (error) throw error;

        return data.reduce((acc, row) => {
            acc[row.event_id] = {
                eventId: row.event_id,
                teamId: row.team_id,
                status: row.status,
                prizeWon: row.prize_won,
                isShortlisted: row.is_shortlisted,
                updatedAt: row.updated_at
            };
            return acc;
        }, {});
    } catch (err) {
        console.error('Failed to fetch backup team stats:', err);
        return {};
    }
};

/**
 * Bulk sync all events to Supabase at once using a single batch upsert.
 */
export const bulkSyncEventsToSupabase = async (events) => {
    const supabase = getSupabase();
    if (!supabase || !events || events.length === 0) return;

    const payloads = events.map(event => ({
        server_id: event.serverId,
        college_name: event.collegeName,
        event_name: event.eventName,
        event_type: Array.isArray(event.eventType) ? event.eventType : [event.eventType],
        registration_deadline: event.registrationDeadline instanceof Date ? event.registrationDeadline.toISOString() : event.registrationDeadline,
        start_date: event.startDate instanceof Date ? event.startDate.toISOString() : event.startDate,
        end_date: event.endDate instanceof Date ? event.endDate.toISOString() : event.endDate,
        prize_amount: parseFloat(event.prizeAmount) || 0,
        registration_fee: parseFloat(event.registrationFee) || 0,
        accommodation: !!event.accommodation,
        location: event.location || '',
        is_online: !!event.isOnline,
        contact_numbers: event.contactNumbers || [],
        contact1: event.contact1 || '',
        contact2: event.contact2 || '',
        poster_urls: event.posterUrls || (event.posterUrl ? [event.posterUrl] : []),
        website: event.website || '',
        registration_links: event.registrationLinks || (event.registrationLink ? [{ label: 'Register', url: event.registrationLink }] : []),
        instagram: event.instagram || '',
        linkedin: event.linkedin || '',
        twitter: event.twitter || '',
        youtube: event.youtube || '',
        description: event.description || '',
        team_size: parseInt(event.teamSize) || 1,
        team_name: event.teamName || '',
        eligibility: event.eligibility || '',
        leader: event.leader || '',
        members: event.members || '',
        no_of_teams: event.noOfTeams || '',
        prize_won: parseFloat(event.prizeWon) || 0,
        status: event.status,
        priority_score: parseFloat(event.priorityScore) || 0,
        team_id: event.teamId || null,
        created_by: event.createdBy || 'unknown',
        created_at: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
        updated_at: event.updatedAt instanceof Date ? event.updatedAt.toISOString() : (event.updatedAt || new Date().toISOString())
    }));

    try {
        const { error } = await supabase
            .from('events')
            .upsert(payloads, { onConflict: 'server_id' });

        if (error) throw error;
        await logSystemEvent('INFO', 'SYNC', `Bulk synced ${events.length} events to Supabase`);
        console.log(`[Supabase Backup] Successfully bulk-synced ${events.length} events.`);
    } catch (err) {
        await logSystemEvent('ERROR', 'SYNC', `Failed bulk sync to Supabase: ${err.message}`);
        console.error('[Supabase Backup] Bulk sync failed:', err.message);
    }
};
