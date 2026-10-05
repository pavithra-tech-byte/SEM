-- ⚡ SUPABASE SCHEMA SETUP FOR SEM STUDENT EVENT MANAGER
-- Run these commands in your Supabase Project's SQL Editor (https://supabase.com) to create the tables.

-- 1. Create 'system_logs' table
CREATE TABLE IF NOT EXISTS public.system_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB
);

-- 2. Create 'events' table
CREATE TABLE IF NOT EXISTS public.events (
    server_id TEXT PRIMARY KEY,
    college_name TEXT,
    event_name TEXT NOT NULL,
    event_type TEXT[],
    registration_deadline TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    prize_amount NUMERIC DEFAULT 0,
    registration_fee NUMERIC DEFAULT 0,
    accommodation BOOLEAN DEFAULT FALSE,
    location TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    contact_numbers TEXT[],
    contact1 TEXT,
    contact2 TEXT,
    poster_urls TEXT[],
    website TEXT,
    registration_links JSONB,
    instagram TEXT,
    linkedin TEXT,
    twitter TEXT,
    youtube TEXT,
    description TEXT,
    team_size INT DEFAULT 1,
    team_name TEXT,
    eligibility TEXT,
    leader TEXT,
    members TEXT,
    no_of_teams TEXT,
    prize_won NUMERIC DEFAULT 0,
    status TEXT,
    priority_score NUMERIC DEFAULT 0,
    team_id TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create 'team_event_data' table
CREATE TABLE IF NOT EXISTS public.team_event_data (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    status TEXT,
    prize_won NUMERIC DEFAULT 0,
    is_shortlisted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create 'user_profiles' table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    uid TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    role TEXT DEFAULT 'public',
    mobile TEXT,
    college TEXT,
    department TEXT,
    year TEXT,
    section TEXT,
    dob TEXT,
    reg_no TEXT,
    locality TEXT,
    professional_details TEXT,
    photo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) or public read/writes depending on credentials.
-- If utilizing Anon Public key, ensure the tables are accessible to public client scripts.
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_event_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access using the Anon Public key
CREATE POLICY "Allow public select on system_logs" ON public.system_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on system_logs" ON public.system_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public all on events" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on team_event_data" ON public.team_event_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
