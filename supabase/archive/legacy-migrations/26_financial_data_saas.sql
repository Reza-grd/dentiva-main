-- SUPABASE MIGRATION 26: FINANCIAL DATA SAAS (PAYMENTS, EXPENSES, REPORTS)
-- Target: Enforce tenant isolation on payments, invoicing, and expenses.

-- ==========================================
-- 1. ADD clinic_id TO FINANCIAL TABLES
-- ==========================================
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.payments ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.expenses ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.financial_reports ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.financial_reports ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.financial_reports ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.invoice_counters ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.invoice_counters ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.invoice_counters ALTER COLUMN clinic_id DROP DEFAULT;

-- ==========================================
-- 2. REWRITE RLS POLICIES FOR public.payments
-- ==========================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to payments" ON public.payments;
CREATE POLICY "Admins have full access to payments" ON public.payments 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
CREATE POLICY "Staff can view payments" ON public.payments 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('admin', 'resepsionis', 'dokter') 
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "Resepsionis can modify payments" ON public.payments;
CREATE POLICY "Resepsionis can modify payments" ON public.payments 
  FOR INSERT 
  WITH CHECK (public.get_user_role() = 'resepsionis' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Resepsionis can update payments" ON public.payments;
CREATE POLICY "Resepsionis can update payments" ON public.payments 
  FOR UPDATE 
  USING (public.get_user_role() = 'resepsionis' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 3. REWRITE RLS POLICIES FOR public.expenses
-- ==========================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses 
  FOR SELECT 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "expenses_manage" ON public.expenses;
CREATE POLICY "expenses_manage" ON public.expenses 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 4. REWRITE RLS POLICIES FOR public.financial_reports
-- ==========================================
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_reports_select" ON public.financial_reports;
CREATE POLICY "financial_reports_select" ON public.financial_reports 
  FOR SELECT 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "financial_reports_manage" ON public.financial_reports;
CREATE POLICY "financial_reports_manage" ON public.financial_reports 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 5. REWRITE RLS POLICIES FOR public.invoice_counters
-- ==========================================
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_counters_admin" ON public.invoice_counters;
CREATE POLICY "invoice_counters_admin" ON public.invoice_counters 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());
