-- Fix seed trigger: add ON CONFLICT DO NOTHING to prevent errors if sync
-- has already pushed rows before the trigger fires (or on re-runs).

CREATE OR REPLACE FUNCTION public.seed_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Create the "Firm / Internal" client
    INSERT INTO public.clients (id, user_id, name, is_internal, created_at, updated_at)
    VALUES (
        'internal-' || NEW.id,
        NEW.id,
        'Firm / Internal',
        TRUE,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create non-billable matters
    INSERT INTO public.matters (id, user_id, client_id, name, billing_type, keywords, created_at, updated_at)
    VALUES
        ('nb-admin-' || NEW.id, NEW.id, 'internal-' || NEW.id, 'Administrative', 'non-billable',
         '["calendar", "outlook calendar", "timekeeping", "billing", "expense", "invoice"]'::jsonb, now(), now()),
        ('nb-cle-' || NEW.id, NEW.id, 'internal-' || NEW.id, 'CLE/Training', 'non-billable',
         '["cle", "training", "seminar", "webinar", "continuing legal education"]'::jsonb, now(), now()),
        ('nb-bizdev-' || NEW.id, NEW.id, 'internal-' || NEW.id, 'Business Development', 'non-billable',
         '["business development", "marketing", "proposal", "pitch", "networking", "linkedin"]'::jsonb, now(), now()),
        ('nb-probono-' || NEW.id, NEW.id, 'internal-' || NEW.id, 'Pro Bono', 'non-billable',
         '["pro bono", "legal aid", "volunteer"]'::jsonb, now(), now())
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
