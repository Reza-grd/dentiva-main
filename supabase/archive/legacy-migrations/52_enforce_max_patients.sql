-- ============================================================================
-- Migration 52: Enforce max_patients SaaS Subscription Quota at Database Level
-- ============================================================================
-- Enforces max_patients from active clinic_subscriptions -> subscription_plans
-- BEFORE INSERT on public.patients. Fails closed with SQL EXCEPTION if limit reached.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_max_patients_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_patients INT;
  v_current_count INT;
BEGIN
  -- 1. Find max_patients for the target clinic_id from active subscription
  SELECT sp.max_patients
  INTO v_max_patients
  FROM public.clinic_subscriptions cs
  JOIN public.subscription_plans sp ON sp.id = cs.plan_id
  WHERE cs.clinic_id = NEW.clinic_id
    AND cs.status = 'active'
  LIMIT 1;

  -- Fallback to default Starter plan limit (1000) if no active subscription row exists
  IF v_max_patients IS NULL THEN
    v_max_patients := 1000;
  END IF;

  -- 2. Count current non-deleted patients for this clinic
  SELECT COUNT(*)
  INTO v_current_count
  FROM public.patients
  WHERE clinic_id = NEW.clinic_id
    AND (deleted_at IS NULL);

  -- 3. Block insertion if quota reached
  IF v_current_count >= v_max_patients THEN
    RAISE EXCEPTION 'Batas jumlah pasien pada paket Anda telah tercapai (maksimal % pasien). Silakan upgrade paket langganan klinik Anda untuk menambah pasien baru.', v_max_patients;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_patients ON public.patients;

CREATE TRIGGER trg_enforce_max_patients
BEFORE INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.check_max_patients_limit();
