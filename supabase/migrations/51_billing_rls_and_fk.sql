-- SUPABASE MIGRATION 51: BILLING TABLE RLS + FK CONSTRAINT
-- Phase 0 of SaaS Maturity Program
-- Adds missing RLS policies to subscription_plans and clinic_subscriptions.
-- Adds missing FK constraint on clinic_subscriptions.clinic_id → public.clinics(id).
-- Pattern: follows established codebase pattern from migrations 43, 46, 48
--   using public.get_user_clinic_id() and public.get_user_role() helpers.

-- ============================================================
-- 1. subscription_plans — Global reference / pricing catalog
--    Safe to be publicly readable by any authenticated user.
--    No client-facing write policies (only service_role can
--    add/update/delete plans — service_role bypasses RLS).
-- ============================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read plan catalog (needed for pricing page)
DROP POLICY IF EXISTS "Plans_Public_SELECT" ON public.subscription_plans;
CREATE POLICY "Plans_Public_SELECT" ON public.subscription_plans
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- 2. clinic_subscriptions — Per-clinic billing state
--    Add missing FK to public.clinics, then add RLS.
--    SELECT: any authenticated staff of the clinic can read
--             their own clinic's subscription status.
--    UPDATE: admin-only (e.g. cancel_at_period_end flag) —
--             final status writes from Midtrans webhook use
--             service_role and bypass RLS.
--    INSERT / DELETE: no client-facing policies — only the
--             midtrans-webhook Edge Function (service_role)
--             creates or archives subscription rows.
-- ============================================================

-- Add missing FK constraint (clinic_id was declared UUID NOT NULL
-- in migration 39 but without a REFERENCES clause)
ALTER TABLE public.clinic_subscriptions
  ADD CONSTRAINT fk_clinic_subscriptions_clinic
  FOREIGN KEY (clinic_id)
  REFERENCES public.clinics(id)
  ON DELETE CASCADE;

ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;

-- Any authenticated staff of the clinic can see their subscription
DROP POLICY IF EXISTS "Subscriptions_Clinic_SELECT" ON public.clinic_subscriptions;
CREATE POLICY "Subscriptions_Clinic_SELECT" ON public.clinic_subscriptions
  FOR SELECT
  USING (
    clinic_id = public.get_user_clinic_id()
    AND public.get_user_role() IN ('admin', 'dokter', 'resepsionis')
  );

-- Only admins can update non-critical fields client-side
-- (e.g. cancel_at_period_end). Webhook writes use service_role.
DROP POLICY IF EXISTS "Subscriptions_Admin_UPDATE" ON public.clinic_subscriptions;
CREATE POLICY "Subscriptions_Admin_UPDATE" ON public.clinic_subscriptions
  FOR UPDATE
  USING (
    clinic_id = public.get_user_clinic_id()
    AND public.get_user_role() = 'admin'
  )
  WITH CHECK (
    clinic_id = public.get_user_clinic_id()
    AND public.get_user_role() = 'admin'
  );
