/**
 * DENTIVA EMR — ENCRYPTION MIGRATION SCRIPT
 * 
 * This script migrates old client-side encrypted fields (ENC:v1:...) or plaintext fields
 * to the new server-side PGP encryption scheme.
 * 
 * CRITICAL SECURITY INSTRUCTIONS:
 * 1. This script requires the Supabase `service_role` key to bypass Row-Level Security (RLS).
 * 2. This script MUST be run manually and locally.
 * 3. NEVER commit this script to GitHub with active credentials, and never run it in CI pipelines.
 * 4. IMPORTANT: You must rotate your Supabase `service_role` key in the Supabase dashboard
 *    immediately after this migration is done running.
 * 
 * Usage:
 *   SUPABASE_URL="your-supabase-url" \
 *   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
 *   VITE_ENCRYPTION_KEY="your-old-client-key" \
 *   node scripts/migrate_encryption.js
 */

import { createClient } from '@supabase/supabase-js';
import { webcrypto } from 'crypto';

// Setup Mock SubtleCrypto for Node environment
globalThis.window = { crypto: webcrypto };

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const oldViteKey = process.env.VITE_ENCRYPTION_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env variables must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

// Decrypt helper for legacy client-side AES-GCM
async function decryptLegacy(encryptedPayload, masterKey) {
  if (!encryptedPayload || !encryptedPayload.startsWith('ENC:v1:')) {
    return encryptedPayload;
  }
  if (!masterKey) {
    throw new Error('VITE_ENCRYPTION_KEY is required to decrypt legacy ENC:v1: payloads.');
  }
  try {
    const deriveKey = async (secret, salt) => {
      const enc = new TextEncoder();
      const baseKey = await webcrypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      return webcrypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['decrypt']
      );
    };

    const parts = encryptedPayload.split(':');
    const ivBase64 = parts[2];
    const cipherBase64 = parts[3];

    const iv = new Uint8Array(Buffer.from(ivBase64, 'base64'));
    const ciphertext = new Uint8Array(Buffer.from(cipherBase64, 'base64'));

    const key = await deriveKey(masterKey, 'default');
    const decrypted = await webcrypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error(`Failed to decrypt legacy payload: ${e.message}`);
    return null;
  }
}

async function runMigration() {
  console.log('==================================================');
  console.log('STARTING SERVER-SIDE ENCRYPTION MIGRATION RUNNER');
  console.log('==================================================\n');

  try {
    // ----------------------------------------------
    // 1. MIGRATE PATIENTS
    // ----------------------------------------------
    console.log('--> Migrating Patients...');
    const { data: patients, error: pErr } = await supabase.from('patients').select('*');
    if (pErr) throw pErr;

    let patientCount = 0;
    for (const p of patients) {
      let isModified = false;
      const fields = ['nama_lengkap', 'no_wa', 'alamat'];
      const plaintexts = {};

      for (const f of fields) {
        const val = p[f];
        if (val && val.startsWith('ENC:v1:')) {
          const decrypted = await decryptLegacy(val, oldViteKey);
          if (decrypted !== null) {
            plaintexts[f] = decrypted;
            isModified = true;
          }
        } else if (val && !val.startsWith('PGP:')) {
          // Plaintext data
          plaintexts[f] = val;
          isModified = true;
        }
      }

      if (isModified) {
        // Call postgres RPC to encrypt fields
        const updatePayload = {};
        for (const [f, plainTextVal] of Object.entries(plaintexts)) {
          const { data: encVal, error: rpcErr } = await supabase.rpc('encrypt_field', { p_plaintext: plainTextVal });
          if (rpcErr) throw rpcErr;
          updatePayload[f] = encVal;
        }

        const { error: updErr } = await supabase
          .from('patients')
          .update(updatePayload)
          .eq('id', p.id);
        if (updErr) throw updErr;
        patientCount++;
      }
    }
    console.log(`✅ Patients migrated: ${patientCount} rows updated.`);

    // ----------------------------------------------
    // 2. MIGRATE VISITS
    // ----------------------------------------------
    console.log('--> Migrating Visits...');
    const { data: visits, error: vErr } = await supabase.from('visits').select('*');
    if (vErr) throw vErr;

    let visitCount = 0;
    for (const v of visits) {
      let isModified = false;
      const fields = ['diagnosa', 'keluhan', 'pemeriksaan_fisik', 'terapi', 'catatan_dokter'];
      const plaintexts = {};

      for (const f of fields) {
        const val = v[f];
        if (val && val.startsWith('ENC:v1:')) {
          const decrypted = await decryptLegacy(val, oldViteKey);
          if (decrypted !== null) {
            plaintexts[f] = decrypted;
            isModified = true;
          }
        } else if (val && !val.startsWith('PGP:')) {
          plaintexts[f] = val;
          isModified = true;
        }
      }

      if (isModified) {
        const updatePayload = {};
        for (const [f, plainTextVal] of Object.entries(plaintexts)) {
          const { data: encVal, error: rpcErr } = await supabase.rpc('encrypt_field', { p_plaintext: plainTextVal });
          if (rpcErr) throw rpcErr;
          updatePayload[f] = encVal;
        }

        const { error: updErr } = await supabase
          .from('visits')
          .update(updatePayload)
          .eq('id', v.id);
        if (updErr) throw updErr;
        visitCount++;
      }
    }
    console.log(`✅ Visits migrated: ${visitCount} rows updated.`);

    // ----------------------------------------------
    // 3. MIGRATE MEDICAL HISTORY
    // ----------------------------------------------
    console.log('--> Migrating Medical History...');
    const { data: histories, error: mErr } = await supabase.from('medical_history').select('*');
    if (mErr) throw mErr;

    let histCount = 0;
    for (const m of histories) {
      let isModified = false;
      const fields = ['alergi_detail', 'riwayat_lain', 'konsumsi_obat'];
      const plaintexts = {};

      for (const f of fields) {
        const val = m[f];
        if (val && val.startsWith('ENC:v1:')) {
          const decrypted = await decryptLegacy(val, oldViteKey);
          if (decrypted !== null) {
            plaintexts[f] = decrypted;
            isModified = true;
          }
        } else if (val && !val.startsWith('PGP:')) {
          plaintexts[f] = val;
          isModified = true;
        }
      }

      if (isModified) {
        const updatePayload = {};
        for (const [f, plainTextVal] of Object.entries(plaintexts)) {
          const { data: encVal, error: rpcErr } = await supabase.rpc('encrypt_field', { p_plaintext: plainTextVal });
          if (rpcErr) throw rpcErr;
          updatePayload[f] = encVal;
        }

        const { error: updErr } = await supabase
          .from('medical_history')
          .update(updatePayload)
          .eq('id', m.id);
        if (updErr) throw updErr;
        histCount++;
      }
    }
    console.log(`✅ Medical History migrated: ${histCount} rows updated.`);

    console.log('\n==================================================');
    console.log('MIGRATION RUN COMPLETED SUCCESSFULLY!');
    console.log('ACTION REQUIRED: Please rotate your Supabase service_role key now.');
    console.log('==================================================');
  } catch (err) {
    console.error('Migration failed with error:', err);
    process.exit(1);
  }
}

runMigration();
