-- Shared multi-user access: all authenticated users see all data.
-- user_id kept for attribution, not isolation.

-- ============================================================
-- 1. Replace per-user RLS policies with authenticated-only
-- ============================================================

DROP POLICY "Users see own clients" ON public.clients;
CREATE POLICY "Authenticated users access all clients"
    ON public.clients FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY "Users see own matters" ON public.matters;
CREATE POLICY "Authenticated users access all matters"
    ON public.matters FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY "Users see own sessions" ON public.sessions;
CREATE POLICY "Authenticated users access all sessions"
    ON public.sessions FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY "Users see own activities" ON public.activities;
CREATE POLICY "Authenticated users access all activities"
    ON public.activities FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 2. Make user_id nullable, change FK to SET NULL on delete
-- ============================================================

ALTER TABLE public.clients ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.clients DROP CONSTRAINT clients_user_id_fkey;
ALTER TABLE public.clients ADD CONSTRAINT clients_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.matters ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.matters DROP CONSTRAINT matters_user_id_fkey;
ALTER TABLE public.matters ADD CONSTRAINT matters_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.sessions DROP CONSTRAINT sessions_user_id_fkey;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.activities ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.activities DROP CONSTRAINT activities_user_id_fkey;
ALTER TABLE public.activities ADD CONSTRAINT activities_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Migrate existing per-user seed data to stable shared IDs
-- ============================================================

-- Create the canonical shared internal client (from first per-user copy)
INSERT INTO public.clients (id, user_id, name, is_internal, created_at, updated_at)
SELECT 'internal', user_id, 'Firm / Internal', TRUE, MIN(created_at), now()
FROM public.clients
WHERE id LIKE 'internal-%' AND is_internal = TRUE
GROUP BY user_id
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Create canonical shared matters
INSERT INTO public.matters (id, user_id, client_id, name, billing_type, keywords, created_at, updated_at)
SELECT 'nb-admin', user_id, 'internal', name, billing_type, keywords, MIN(created_at), now()
FROM public.matters WHERE id LIKE 'nb-admin-%'
GROUP BY user_id, name, billing_type, keywords LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.matters (id, user_id, client_id, name, billing_type, keywords, created_at, updated_at)
SELECT 'nb-cle', user_id, 'internal', name, billing_type, keywords, MIN(created_at), now()
FROM public.matters WHERE id LIKE 'nb-cle-%'
GROUP BY user_id, name, billing_type, keywords LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.matters (id, user_id, client_id, name, billing_type, keywords, created_at, updated_at)
SELECT 'nb-bizdev', user_id, 'internal', name, billing_type, keywords, MIN(created_at), now()
FROM public.matters WHERE id LIKE 'nb-bizdev-%'
GROUP BY user_id, name, billing_type, keywords LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.matters (id, user_id, client_id, name, billing_type, keywords, created_at, updated_at)
SELECT 'nb-probono', user_id, 'internal', name, billing_type, keywords, MIN(created_at), now()
FROM public.matters WHERE id LIKE 'nb-probono-%'
GROUP BY user_id, name, billing_type, keywords LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Re-point references from old per-user IDs to stable shared IDs
UPDATE public.activities SET matter_id = 'nb-admin' WHERE matter_id LIKE 'nb-admin-%';
UPDATE public.activities SET matter_id = 'nb-cle' WHERE matter_id LIKE 'nb-cle-%';
UPDATE public.activities SET matter_id = 'nb-bizdev' WHERE matter_id LIKE 'nb-bizdev-%';
UPDATE public.activities SET matter_id = 'nb-probono' WHERE matter_id LIKE 'nb-probono-%';

UPDATE public.sessions SET matter_id = 'nb-admin' WHERE matter_id LIKE 'nb-admin-%';
UPDATE public.sessions SET matter_id = 'nb-cle' WHERE matter_id LIKE 'nb-cle-%';
UPDATE public.sessions SET matter_id = 'nb-bizdev' WHERE matter_id LIKE 'nb-bizdev-%';
UPDATE public.sessions SET matter_id = 'nb-probono' WHERE matter_id LIKE 'nb-probono-%';

UPDATE public.matters SET client_id = 'internal' WHERE client_id LIKE 'internal-%';

-- Delete old per-user duplicates
DELETE FROM public.matters WHERE id LIKE 'nb-admin-%';
DELETE FROM public.matters WHERE id LIKE 'nb-cle-%';
DELETE FROM public.matters WHERE id LIKE 'nb-bizdev-%';
DELETE FROM public.matters WHERE id LIKE 'nb-probono-%';
DELETE FROM public.clients WHERE id LIKE 'internal-%' AND is_internal = TRUE;

-- ============================================================
-- 4. Replace seed trigger to use stable IDs with ON CONFLICT
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Shared internal client (created once, subsequent signups are no-ops)
    INSERT INTO public.clients (id, user_id, name, is_internal, created_at, updated_at)
    VALUES ('internal', NEW.id, 'Firm / Internal', TRUE, now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- Shared non-billable matters
    INSERT INTO public.matters (id, user_id, client_id, name, billing_type, keywords, created_at, updated_at)
    VALUES
        ('nb-admin', NEW.id, 'internal', 'Administrative', 'non-billable',
         '["calendar", "outlook calendar", "timekeeping", "billing", "expense", "invoice"]'::jsonb, now(), now()),
        ('nb-cle', NEW.id, 'internal', 'CLE/Training', 'non-billable',
         '["cle", "training", "seminar", "webinar", "continuing legal education"]'::jsonb, now(), now()),
        ('nb-bizdev', NEW.id, 'internal', 'Business Development', 'non-billable',
         '["business development", "marketing", "proposal", "pitch", "networking", "linkedin"]'::jsonb, now(), now()),
        ('nb-probono', NEW.id, 'internal', 'Pro Bono', 'non-billable',
         '["pro bono", "legal aid", "volunteer"]'::jsonb, now(), now())
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
