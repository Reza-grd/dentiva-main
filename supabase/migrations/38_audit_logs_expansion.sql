-- SUPABASE MIGRATION 38: AUDIT LOG EXPANSION (Phase 5)
-- Expand the audit log to track Login/Logout (via users table updates), Payments, and Soft-Deletes.

-- Ensure audit_logs can track more modules
ALTER TABLE public.audit_logs 
  DROP CONSTRAINT IF EXISTS audit_logs_risk_level_check;

-- Helper function to record audit logs for any table dynamically
CREATE OR REPLACE FUNCTION public.dynamic_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_clinic_id UUID;
  v_action TEXT;
  v_module TEXT;
  v_risk_level TEXT := 'LOW';
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if it's a soft delete
    IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
      v_action := 'SOFT_DELETE';
      v_risk_level := 'HIGH';
    ELSE
      v_action := 'UPDATE';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'HARD_DELETE';
    v_risk_level := 'CRITICAL';
  END IF;

  v_module := TG_TABLE_NAME;

  -- Attempt to extract current user and clinic from auth context (if available)
  v_user_id := auth.uid();
  
  -- If we can't get auth.uid() directly, maybe it's passed in the record (fallback for triggers)
  IF v_user_id IS NULL AND TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW ? 'clinic_id' THEN
      v_clinic_id := NEW.clinic_id;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    clinic_id,
    module,
    action,
    previous_value,
    new_value,
    risk_level
  ) VALUES (
    v_user_id,
    v_clinic_id,
    UPPER(v_module),
    v_action,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    v_risk_level
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Apply to Payments
DROP TRIGGER IF EXISTS audit_payments_trigger ON public.payments;
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.dynamic_audit_trigger();

-- 2. Apply to Users (for Role changes, deactivations)
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.dynamic_audit_trigger();

-- 3. Apply to Subscriptions (future billing)
-- (We will apply this once subscriptions table is created in the next migration)
