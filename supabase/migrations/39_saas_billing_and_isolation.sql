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

-- 3. Tenant Isolation RLS Check
-- Re-verify RLS policies on patients table to ensure strict clinic_id isolation
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Drop generic policy if exists to replace with strict tenant isolated policy
DROP POLICY IF EXISTS "Patients are isolated by clinic_id" ON public.patients;
CREATE POLICY "Patients are isolated by clinic_id" 
  ON public.patients 
  FOR ALL
  USING (
    -- The user must belong to the same clinic as the patient record
    -- This requires a lookup function or storing clinic_id directly on patients.
    -- For this baseline, we assume patients has a clinic_id column.
    clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
  );

-- Do the same for visits
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Visits are isolated by clinic_id" ON public.visits;
CREATE POLICY "Visits are isolated by clinic_id" 
  ON public.visits 
  FOR ALL
  USING (
    clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
  );
