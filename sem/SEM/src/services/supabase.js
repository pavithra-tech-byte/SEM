import { createClient } from '@supabase/supabase-js';

let supabase = null;

/**
 * Initializes the Supabase client dynamically.
 * @param {Object} config - Contains supabaseUrl and supabaseKey.
 */
export const initSupabase = (config) => {
    if (!config || !config.supabaseUrl || !config.supabaseKey) {
        return null;
    }
    try {
        if (!supabase) {
            supabase = createClient(config.supabaseUrl, config.supabaseKey);
            console.log("⚡ Supabase Client initialized successfully.");
        }
        return supabase;
    } catch (error) {
        console.error("❌ Supabase Initialization failed:", error);
        return null;
    }
};

/**
 * Returns the current active Supabase client instance.
 */
export const getSupabase = () => {
    return supabase;
};
