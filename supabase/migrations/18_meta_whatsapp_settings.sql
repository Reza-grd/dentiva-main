-- ============================================
-- MIGRATION: 18_meta_whatsapp_settings.sql
-- Configure Meta WhatsApp Cloud API credentials
-- ============================================

INSERT INTO clinic_settings (key, value) VALUES
  ('meta_whatsapp_token', ''),
  ('meta_phone_number_id', ''),
  ('active_whatsapp_provider', 'fonnte')
ON CONFLICT (key) DO NOTHING;
