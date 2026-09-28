-- SUPABASE MIGRATION 28: SERVER-SIDE ENCRYPTION HARDENING
-- Target: Install secure pgcrypto Vault, create batch encryption RPCs, revoke unauthorized access.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. CREATE private SCHEMA & KEY TABLE
-- ==========================================
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.encryption_keys (
    key_name TEXT PRIMARY KEY,
    key_value TEXT NOT NULL
);

-- Revoke all privileges from public access
REVOKE ALL ON TABLE private.encryption_keys FROM PUBLIC;
REVOKE ALL ON TABLE private.encryption_keys FROM anon;
REVOKE ALL ON TABLE private.encryption_keys FROM authenticated;

-- Generate master key dynamically at migration time if it doesn't exist
INSERT INTO private.encryption_keys (key_name, key_value)
VALUES ('master_key', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key_name) DO NOTHING;

-- ==========================================
-- 2. PRIVATE KEY RETRIEVAL HELPER
-- ==========================================
CREATE OR REPLACE FUNCTION private.get_encryption_key()
RETURNS BYTEA AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT key_value INTO v_key FROM private.encryption_keys WHERE key_name = 'master_key';
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Configuration Error: Master encryption key is not set!';
  END IF;
  RETURN decode(v_key, 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke function execution
REVOKE ALL ON FUNCTION private.get_encryption_key FROM PUBLIC, anon, authenticated;

-- ==========================================
-- 3. CORE ENCRYPTION & DECRYPTION FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION public.encrypt_field(p_plaintext TEXT)
RETURNS TEXT AS $$
DECLARE
  v_encrypted TEXT;
BEGIN
  IF p_plaintext IS NULL OR p_plaintext = '' THEN
    RETURN p_plaintext;
  END IF;
  
  -- If it already starts with PGP: prefix, do not encrypt again (avoid double-encryption)
  IF p_plaintext LIKE 'PGP:%' THEN
    RETURN p_plaintext;
  END IF;
  
  v_encrypted := encode(pgp_sym_encrypt(p_plaintext, private.get_encryption_key()::text), 'base64');
  RETURN 'PGP:' || v_encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrypt_field(p_ciphertext TEXT)
RETURNS TEXT AS $$
BEGIN
  IF p_ciphertext IS NULL OR NOT p_ciphertext LIKE 'PGP:%' THEN
    -- Return raw value if not encrypted with server-side PGP scheme
    RETURN p_ciphertext;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(decode(substring(p_ciphertext from 5), 'base64'), private.get_encryption_key()::text);
  EXCEPTION WHEN OTHERS THEN
    -- Catch exception and return raw string (prevents crashes if key changes/corrupts)
    RETURN p_ciphertext;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. BATCH PROCESSING FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION public.encrypt_batch(p_payloads TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  v_result TEXT[] := ARRAY[]::TEXT[];
  v_item TEXT;
BEGIN
  FOREACH v_item IN ARRAY p_payloads
  LOOP
    v_result := array_append(v_result, public.encrypt_field(v_item));
  END LOOP;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrypt_batch(p_payloads TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  v_result TEXT[] := ARRAY[]::TEXT[];
  v_item TEXT;
BEGIN
  FOREACH v_item IN ARRAY p_payloads
  LOOP
    v_result := array_append(v_result, public.decrypt_field(v_item));
  END LOOP;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. FUNCTION EXECUTE PERMISSIONS
-- ==========================================
REVOKE ALL ON FUNCTION public.encrypt_field FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_field FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.encrypt_batch FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_batch FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.encrypt_field TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_field TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_batch TO authenticated;

-- ==========================================
-- 6. KEY ROTATION PROCEDURE
-- ==========================================
CREATE OR REPLACE FUNCTION private.rotate_master_key(p_new_key_hex TEXT)
RETURNS VOID AS $$
DECLARE
  v_old_key TEXT;
  v_new_key BYTEA;
  r RECORD;
BEGIN
  -- Verify new key format
  BEGIN
    v_new_key := decode(p_new_key_hex, 'hex');
    IF length(v_new_key) != 32 THEN
      RAISE EXCEPTION 'Invalid key length: Key must be 32 bytes (64 hex characters)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid hex format for new encryption key';
  END;

  SELECT key_value INTO v_old_key FROM private.encryption_keys WHERE key_name = 'master_key';
  IF v_old_key IS NULL THEN
    RAISE EXCEPTION 'Current master key not found';
  END IF;

  -- 1. Re-encrypt patients table
  FOR r IN SELECT id, nama_lengkap, no_wa, alamat FROM public.patients LOOP
    UPDATE public.patients
    SET 
      nama_lengkap = CASE 
        WHEN nama_lengkap LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(nama_lengkap from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE nama_lengkap
      END,
      no_wa = CASE 
        WHEN no_wa LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(no_wa from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE no_wa
      END,
      alamat = CASE 
        WHEN alamat LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(alamat from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE alamat
      END
    WHERE id = r.id;
  END LOOP;

  -- 2. Re-encrypt visits table
  FOR r IN SELECT id, diagnosa, keluhan, pemeriksaan_fisik, terapi, catatan_dokter FROM public.visits LOOP
    UPDATE public.visits
    SET 
      diagnosa = CASE 
        WHEN diagnosa LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(diagnosa from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE diagnosa
      END,
      keluhan = CASE 
        WHEN keluhan LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(keluhan from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE keluhan
      END,
      pemeriksaan_fisik = CASE 
        WHEN pemeriksaan_fisik LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(pemeriksaan_fisik from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE pemeriksaan_fisik
      END,
      terapi = CASE 
        WHEN terapi LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(terapi from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE terapi
      END,
      catatan_dokter = CASE 
        WHEN catatan_dokter LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(catatan_dokter from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE catatan_dokter
      END
    WHERE id = r.id;
  END LOOP;

  -- 3. Re-encrypt medical_history table
  FOR r IN SELECT id, alergi_detail, riwayat_lain, konsumsi_obat FROM public.medical_history LOOP
    UPDATE public.medical_history
    SET 
      alergi_detail = CASE 
        WHEN alergi_detail LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(alergi_detail from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE alergi_detail
      END,
      riwayat_lain = CASE 
        WHEN riwayat_lain LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(riwayat_lain from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE riwayat_lain
      END,
      konsumsi_obat = CASE 
        WHEN konsumsi_obat LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(konsumsi_obat from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE konsumsi_obat
      END
    WHERE id = r.id;
  END LOOP;

  -- 4. Update stored master key
  UPDATE private.encryption_keys
  SET key_value = p_new_key_hex
  WHERE key_name = 'master_key';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION private.rotate_master_key FROM PUBLIC, anon, authenticated;
