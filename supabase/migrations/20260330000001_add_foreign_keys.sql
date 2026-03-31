-- Add foreign key constraints so PostgREST can resolve nested selects
-- (e.g. activities → matters → clients for analytics and CSV export)

ALTER TABLE public.matters
  ADD CONSTRAINT matters_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_matter_id_fkey
  FOREIGN KEY (matter_id) REFERENCES public.matters(id) ON DELETE SET NULL;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_matter_id_fkey
  FOREIGN KEY (matter_id) REFERENCES public.matters(id) ON DELETE SET NULL;
