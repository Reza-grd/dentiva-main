/**
 * DENTIVA EMR — ENCRYPTION & DATA CLASSIFICATION FRAMEWORK
 * 
 * Provides client-side delegation to server-side database pgcrypto functions
 * with a temporary local fallback decryptor for client-side legacy data.
 */

import { supabase } from './supabase.js';

// 1. Data Classification Matrix
export const DATA_CLASSIFICATION = {
  PUBLIC: 'PUBLIC',             // Clinic info, templates
  INTERNAL: 'INTERNAL',         // Treatment lists, pricing
  CONFIDENTIAL: 'CONFIDENTIAL', // Patient PII (Name, Phone, DOB, Address)
  HIGHLY_CONFIDENTIAL: 'HIGHLY_CONFIDENTIAL' // Clinical EMR (Diagnosis, SOAP notes, histories)
};

// Target fields map for verification
export const ENCRYPTED_FIELDS_MAP = {
  patients: {
    nama_lengkap: DATA_CLASSIFICATION.CONFIDENTIAL,
    no_wa: DATA_CLASSIFICATION.CONFIDENTIAL,
    alamat: DATA_CLASSIFICATION.CONFIDENTIAL,
    nik: DATA_CLASSIFICATION.CONFIDENTIAL,
    nik_ibu: DATA_CLASSIFICATION.CONFIDENTIAL
  },
  users: {
    nik: DATA_CLASSIFICATION.CONFIDENTIAL
  },
  visits: {
    diagnosa: DATA_CLASSIFICATION.HIGHLY_CONFIDENTIAL,
    keluhan: DATA_CLASSIFICATION.HIGHLY_CONFIDENTIAL,
    pemeriksaan_fisik: DATA_CLASSIFICATION.HIGHLY_CONFIDENTIAL,
    terapi: DATA_CLASSIFICATION.HIGHLY_CONFIDENTIAL,
    catatan_dokter: DATA_CLASSIFICATION.HIGHLY_CONFIDENTIAL
  },
  medical_history: {
    alergi_detail: DATA_CLASSIFICATION.HIGHLY_CONFIDENTIAL,
    riwayat_lain: DATA_CLASSIFICATION.HIGHLY_CONFIDENTIAL,
    konsumsi_obat: DATA_CLASSIFICATION.HIGHLY_CONFIDENTIAL
  }
};

/**
 * Helper to convert a raw string to a WebCrypto key using PBKDF2 derivation.
 */
async function deriveKey(masterSecret, salt, iterations = 100000) {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterSecret),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export const encryptionService = {
  // CONFIG CUTOFF: Change to false to permanently disable the client-side fallback
  FALLBACK_ENABLED: true,

  // Vite environment key (strictly env-driven; no default fallback string allowed)
  _masterKEK: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENCRYPTION_KEY) || (typeof process !== 'undefined' && process.env && process.env.VITE_ENCRYPTION_KEY) || null,

  /**
   * Derive local KEK salt for fallback decryption
   */
  async getTenantDEK(clinicId = 'default') {
    if (!this._masterKEK) {
      throw new Error('Fallback Master Key is not configured in client environment.');
    }
    return deriveKey(this._masterKEK, clinicId);
  },

  /**
   * Decrypt a value using legacy client-side AES-GCM 256 (strictly fallback only)
   */
  async decryptLocalFallback(encryptedPayload, clinicId = 'default') {
    if (!this.FALLBACK_ENABLED) {
      console.warn('[SECURITY] Fallback client-side decryption is disabled.');
      return encryptedPayload;
    }
    if (!this._masterKEK) {
      console.warn('[SECURITY] No fallback master KEK configured. Cannot decrypt legacy payload.');
      return encryptedPayload;
    }
    if (!encryptedPayload || !encryptedPayload.startsWith('ENC:v1:')) {
      return encryptedPayload;
    }
    try {
      const parts = encryptedPayload.split(':');
      if (parts.length < 4) return encryptedPayload;

      const ivBase64 = parts[2];
      const cipherBase64 = parts[3];

      const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
      const ciphertext = new Uint8Array(atob(cipherBase64).split('').map(c => c.charCodeAt(0)));

      const key = await this.getTenantDEK(clinicId);
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.warn('[SECURITY] Decrypting legacy payload failed:', e.message);
      return encryptedPayload;
    }
  },

  /**
   * BATCH ENCRYPTION (SERVER-DELEGATED)
   * Encrypts multiple plaintext fields in a single Supabase RPC call.
   */
  async encryptBatch(plaintextsArray) {
    if (!plaintextsArray || plaintextsArray.length === 0) return [];
    
    // Call server-side batch encryption RPC
    const { data, error } = await supabase.rpc('encrypt_batch', { p_payloads: plaintextsArray });
    if (error) {
      console.error('[SECURITY] Server-side batch encryption failed:', error);
      throw new Error('Encryption error: ' + error.message);
    }
    return data || [];
  },

  /**
   * BATCH DECRYPTION (SERVER-DELEGATED)
   * Decrypts multiple ciphertext fields in a single Supabase RPC call,
   * while transparently routing legacy 'ENC:v1:' data to the client-side fallback.
   */
  async decryptBatch(ciphertextsArray) {
    if (!ciphertextsArray || ciphertextsArray.length === 0) return [];

    const processed = [];
    const pgpPayloads = [];
    const pgpIndices = [];

    // 1. Separate legacy client-side ENC:v1: from server-side PGP / plaintext fields
    for (let i = 0; i < ciphertextsArray.length; i++) {
      const val = ciphertextsArray[i];
      if (val && val.startsWith('ENC:v1:')) {
        processed[i] = await this.decryptLocalFallback(val);
      } else if (val && val.startsWith('PGP:')) {
        processed[i] = null; // placeholder for server-side decrypted value
        pgpPayloads.push(val);
        pgpIndices.push(i);
      } else {
        processed[i] = val; // Plaintext or null
      }
    }

    // 2. Fetch server-side decrypted values for all PGP inputs in a single round-trip
    if (pgpPayloads.length > 0) {
      const { data, error } = await supabase.rpc('decrypt_batch', { p_payloads: pgpPayloads });
      if (error) {
        console.error('[SECURITY] Server-side batch decryption failed:', error);
        // Fallback to original ciphertext on error
        pgpIndices.forEach((origIdx, batchIdx) => {
          processed[origIdx] = pgpPayloads[batchIdx];
        });
      } else {
        pgpIndices.forEach((origIdx, batchIdx) => {
          processed[origIdx] = data[batchIdx];
        });
      }
    }

    return processed;
  }
};
