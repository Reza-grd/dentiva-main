-- SUPABASE MIGRATION 22: STORAGE & AUTH HARDENING

-- 1. Convert medical buckets to private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('radiologi', 'klinik');

-- 2. Restrict invoice_counters RLS
DROP POLICY IF EXISTS "invoice_counters_manage" ON public.invoice_counters;
CREATE POLICY "invoice_counters_admin" ON public.invoice_counters 
  FOR ALL 
  USING (public.get_user_role() = 'admin');

-- 3. Harden SECURITY DEFINER functions with role checks
CREATE OR REPLACE FUNCTION replace_treatment_plans(p_patient_id UUID, p_plans JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.get_user_role() NOT IN ('admin', 'dokter') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya dokter atau admin yang dapat memodifikasi rencana perawatan';
    END IF;

    DELETE FROM treatment_plans WHERE patient_id = p_patient_id;
    IF jsonb_array_length(p_plans) > 0 THEN
        INSERT INTO treatment_plans (patient_id, prioritas, tindakan, gigi, keterangan, status, created_by)
        SELECT 
            p_patient_id,
            (elem->>'prioritas')::INTEGER,
            elem->>'tindakan',
            elem->>'gigi',
            elem->>'keterangan',
            elem->>'status',
            (elem->>'created_by')::UUID
        FROM jsonb_array_elements(p_plans) AS elem;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION replace_tooth_conditions(p_patient_id UUID, p_conditions JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.get_user_role() NOT IN ('admin', 'dokter') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya dokter atau admin yang dapat memodifikasi kondisi odontogram';
    END IF;

    DELETE FROM tooth_conditions WHERE patient_id = p_patient_id;
    IF jsonb_array_length(p_conditions) > 0 THEN
        INSERT INTO tooth_conditions (patient_id, tooth_number, condition_type, condition_code, surface, has_rct, notes, recorded_by)
        SELECT 
            p_patient_id,
            (elem->>'tooth_number')::INTEGER,
            elem->>'condition_type',
            elem->>'condition_code',
            elem->>'surface',
            (elem->>'has_rct')::BOOLEAN,
            elem->>'notes',
            (elem->>'recorded_by')::UUID
        FROM jsonb_array_elements(p_conditions) AS elem;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION replace_visit_treatments(p_visit_id UUID, p_treatments JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.get_user_role() NOT IN ('admin', 'dokter') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya dokter atau admin yang dapat memodifikasi tindakan kunjungan';
    END IF;

    DELETE FROM visit_treatments WHERE visit_id = p_visit_id;
    IF jsonb_array_length(p_treatments) > 0 THEN
        INSERT INTO visit_treatments (visit_id, treatment_id, tooth_number, quantity, harga_satuan, subtotal, notes)
        SELECT 
            p_visit_id,
            (elem->>'treatment_id')::UUID,
            (elem->>'tooth_number')::INTEGER,
            (elem->>'quantity')::INTEGER,
            (elem->>'harga_satuan')::NUMERIC,
            (elem->>'subtotal')::NUMERIC,
            elem->>'notes'
        FROM jsonb_array_elements(p_treatments) AS elem;
    END IF;
END;
$$;
