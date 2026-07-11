-- 1. Remove Fonnte and Whatsva secrets from clinic_settings
DELETE FROM clinic_settings WHERE key IN ('fonnte_token', 'meta_whatsapp_token');

-- 2. Harden RLS for clinic_settings
DROP POLICY IF EXISTS "Staff read clinic_settings" ON clinic_settings;
CREATE POLICY "Staff read clinic_settings" ON clinic_settings FOR SELECT 
USING (
  public.get_user_role() = 'admin' OR 
  (public.get_user_role() IN ('dokter', 'resepsionis') AND key IN ('clinic_name', 'clinic_phone', 'wa_payment_confirmation_enabled', 'wa_reminder_h1_day_enabled', 'wa_reminder_h1_hour_enabled', 'wa_post_treatment_education_enabled'))
);

-- 3. Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL, -- receipt/education/reminder_day/reminder_hour/manual/test
    status TEXT NOT NULL, -- sent/failed/skipped_no_consent
    gateway_response TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL -- null means system/scheduler
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read all notification logs" ON notification_logs FOR SELECT USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff read logs" ON notification_logs FOR SELECT USING (public.get_user_role() IN ('dokter', 'resepsionis'));

-- Insert notification_logs for existing reminder_logs to supersede it, safely
DO $$ 
BEGIN
  INSERT INTO notification_logs (id, visit_id, patient_id, message_type, status, gateway_response, timestamp)
  SELECT id, visit_id, (SELECT patient_id FROM visits WHERE visits.id = reminder_logs.visit_id),
         CASE WHEN reminder_type = 'H-1_day' THEN 'reminder_day' ELSE 'reminder_hour' END,
         status, error_message, sent_at
  FROM reminder_logs;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'reminder_logs migration skipped: %', SQLERRM;
END $$;

-- 4. Add wa_consent boolean column to patients table
ALTER TABLE patients ADD COLUMN wa_consent BOOLEAN NOT NULL DEFAULT false;

-- 5. Create treatment_education_templates table
CREATE TABLE IF NOT EXISTS treatment_education_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_type TEXT UNIQUE NOT NULL,
    education_text TEXT,
    medication_instructions TEXT,
    last_updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE treatment_education_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Dokter_ALL" ON treatment_education_templates FOR ALL USING (public.get_user_role() IN ('admin', 'dokter'));
CREATE POLICY "Resepsionis_SELECT" ON treatment_education_templates FOR SELECT USING (public.get_user_role() = 'resepsionis');

-- Seed initial data
INSERT INTO treatment_education_templates (treatment_type, education_text, medication_instructions)
VALUES (
    'scaling',
    'Yang perlu diperhatikan setelah scaling:
• Gusi mungkin terasa ngilu atau sedikit berdarah selama 1-2 hari, ini normal.
• Gigi bisa terasa lebih sensitif terhadap makanan/minuman dingin atau panas sementara waktu.
• Hindari makan/minum terlalu panas atau dingin dalam 24 jam pertama.
• Tetap sikat gigi 2x sehari seperti biasa, gunakan sikat berbulu lembut.
• Hindari merokok dan kumur dengan obat kumur beralkohol selama 1-2 hari.
⚠️ Jika perdarahan tidak berhenti setelah 24 jam, gusi bengkak signifikan, atau nyeri hebat — segera hubungi klinik.',
    '[Diisi oleh dokter sesuai resep]'
) ON CONFLICT (treatment_type) DO NOTHING;

NOTIFY pgrst, 'reload schema';
