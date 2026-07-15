/**
 * DENTIVA EMR — ENCRYPTION & DATA CLASSIFICATION FRAMEWORK
 * 
 * Provides client-side and server-side ready abstraction for key management,
 * field classification, key rotation, and AES-GCM encryption wrappers.
 */

// 1. Data Classification Matrix
export const DATA_CLASSIFICATION = {
  PUBLIC: 'PUBLIC',             // Clinic info, templates
  INTERNAL: 'INTERNAL',         // Treatment lists, pricing
  CONFIDENTIAL: 'CONFIDENTIAL', // Patient PII (Name, Phone, DOB, Address)
  HIGHLY_CONFIDENTIAL: 'HIGHLY_CONFIDENTIAL' // Clinical EMR (Diagnosis, SOAP notes, histories)
};

// Target fields map for future incremental column migrations
export const ENCRYPTED_FIELDS_MAP = {
  patients: {
    nama_lengkap: DATA_CLASSIFICATION.CONFIDENTIAL,
    no_wa: DATA_CLASSIFICATION.CONFIDENTIAL,
    alamat: DATA_CLASSIFICATION.CONFIDENTIAL
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
  _masterKEK: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENCRYPTION_KEY) || (typeof process !== 'undefined' && process.env && process.env.VITE_ENCRYPTION_KEY) || 'dentiva-default-shared-system-kek-2026',

  /**
   * Derive a Tenant-Specific Data Encryption Key (DEK)
   */
  async getTenantDEK(clinicId = 'default') {
    // Derive key using KEK + Clinic ID as salt
    return deriveKey(this._masterKEK, clinicId);
  },

  /**
   * Encrypt a value using AES-GCM 256
   */
  async encrypt(plaintext, clinicId = 'default') {
    if (!plaintext) return plaintext;
    try {
      const key = await this.getTenantDEK(clinicId);
      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
      
      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        enc.encode(plaintext)
      );

      // Package payload: IV + Ciphertext as Base64
      const ivBase64 = btoa(String.fromCharCode(...iv));
      const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

      return `ENC:v1:${ivBase64}:${cipherBase64}`;
    } catch (e) {
      console.error('Encryption failed:', e);
      return plaintext; // Fallback
    }
  },

  /**
   * Decrypt a value using AES-GCM 256
   */
  async decrypt(encryptedPayload, clinicId = 'default') {
    if (!encryptedPayload || !encryptedPayload.startsWith('ENC:v1:')) return encryptedPayload;
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
      console.warn('Decryption failed, returning raw payload:', e.message);
      return encryptedPayload; // Return raw value if decryption fails (e.g. not encrypted)
    }
  },

  /**
   * ROTATION STRATEGY
   * Recrypts a payload from an old KEK to a new KEK.
   */
  async rotatePayload(payload, oldKEK, newKEK, clinicId = 'default') {
    if (!payload || !payload.startsWith('ENC:')) return payload;
    
    // Save current KEK
    const currentKEK = this._masterKEK;
    
    // Decrypt using old key
    this._masterKEK = oldKEK;
    const plaintext = await this.decrypt(payload, clinicId);
    
    // Encrypt using new key
    this._masterKEK = newKEK;
    const reencrypted = await this.encrypt(plaintext, clinicId);
    
    // Restore current KEK
    this._masterKEK = currentKEK;
    
    return reencrypted;
  }
};
