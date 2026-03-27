-- Initial schema for Donna cloud database
-- Mirrors the local SQLite schema with user_id + sync support

-- ============================================================
-- Clients
-- ============================================================
CREATE TABLE public.clients (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_info TEXT,
    billing_address TEXT,
    default_rate REAL,
    notes TEXT,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clients_user_id ON public.clients(user_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own clients"
    ON public.clients FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================
-- Matters
-- ============================================================
CREATE TABLE public.matters (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    matter_number TEXT,
    status TEXT DEFAULT 'active',
    practice_area TEXT,
    billing_type TEXT DEFAULT 'hourly',
    hourly_rate REAL,
    keywords JSONB DEFAULT '[]',
    key_people JSONB DEFAULT '[]',
    team_members JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_matters_user_id ON public.matters(user_id);
CREATE INDEX idx_matters_client_id ON public.matters(client_id);

ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own matters"
    ON public.matters FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================
-- Sessions
-- ============================================================
CREATE TABLE public.sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'tracking',
    summary TEXT,
    categories JSONB DEFAULT '[]',
    activities JSONB DEFAULT '[]',
    matter_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_start_time ON public.sessions(user_id, start_time);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sessions"
    ON public.sessions FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================
-- Activities
-- ============================================================
CREATE TABLE public.activities (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    matter_id TEXT,
    app TEXT NOT NULL,
    context TEXT,
    minutes INTEGER,
    narrative TEXT,
    category TEXT,
    billable BOOLEAN DEFAULT TRUE,
    effective_rate REAL,
    activity_code TEXT,
    sort_order INTEGER DEFAULT 0,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    approval_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_session_id ON public.activities(session_id);
CREATE INDEX idx_activities_billable ON public.activities(user_id, billable);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own activities"
    ON public.activities FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================
-- Auto-update updated_at on row changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER matters_updated_at BEFORE UPDATE ON public.matters
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
