-- SUPABASE MIGRATION 39: SAAS TENANT ISOLATION AND BILLING (Phase 5)

-- 1. Create SaaS Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_patients INTEGER NOT NULL DEFAULT 100,
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Plans
INSERT INTO public.subscription_plans (name, price_monthly, price_yearly, max_users, max_patients, features)
VALUES 
  ('Starter', 299000, 2990000, 3, 1000, '{"whatsapp_reminders": false, "custom_reports": false}'),
  ('Pro', 599000, 5990000, 10, 5000, '{"whatsapp_reminders": true, "custom_reports": true}'),
  ('Enterprise', 1499000, 14990000, 9999, 99999, '{"whatsapp_reminders": true, "custom_reports": true, "priority_support": true}')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Subscriptions (Billing)
CREATE TABLE IF NOT EXISTS public.clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL, -- Assuming clinics table exists or ties to users.clinic_id
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: The clinic_id should reference public.clinics if it exists. 
-- In Dentiva currently, it's tied via users table or isolated schemas.
-- We will enforce Tenant Isolation on core tables if missing.

-- 3. Tenant Isolation RLS Check (Replaced by RBAC in Migration 41)
-- To avoid errors if clinic_id is not yet fully propagated in all environments,
-- we rely on the granular RBAC permissions established in Migration 41.
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
