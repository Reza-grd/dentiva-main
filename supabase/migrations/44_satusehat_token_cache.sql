-- SUPABASE MIGRATION 44: SATUSEHAT TOKEN CACHE
-- Target: Table for caching SatuSehat OAuth2 access token to prevent hitting request limits.

CREATE TABLE IF NOT EXISTS public.satusehat_token_cache (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- single row, satu token aktif per environment saat ini
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  environment TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.satusehat_token_cache ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated. This table is only accessed via service role from within Edge Functions.
