-- Seed built-in internal client + non-billable matters when a new user signs up

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
    );

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
         '["pro bono", "legal aid", "volunteer"]'::jsonb, now(), now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.seed_user_data();
