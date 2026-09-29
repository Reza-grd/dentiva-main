/**
 * Konfigurasi SATUSEHAT.
 * Base URL resmi: satusehat.kemkes.go.id/platform/docs/id/postman-workshop/endpoint-information/
 *   Sandbox    : https://api-satusehat-stg.dto.kemkes.go.id/{oauth2,fhir-r4}/v1
 *   Production : https://api-satusehat.kemkes.go.id/{oauth2,fhir-r4}/v1
 * (Host sandbox lama api-satusehat-stg.kemkes.go.id sudah tidak dipakai.)
 */
export type SatuSehatEnv = 'sandbox' | 'production';

export function getSatuSehatEnv(): SatuSehatEnv {
  return Deno.env.get('SATUSEHAT_ENVIRONMENT') === 'production' ? 'production' : 'sandbox';
}

export function getSatuSehatBaseUrl(): { auth: string; fhir: string } {
  if (getSatuSehatEnv() === 'production') {
    return {
      auth: 'https://api-satusehat.kemkes.go.id/oauth2/v1',
      fhir: 'https://api-satusehat.kemkes.go.id/fhir-r4/v1',
    };
  }
  return {
    auth: 'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1',
    fhir: 'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1',
  };
}

/**
 * Kamus Farmasi & Alat Kesehatan (KFA) v2 — base path berbeda dari FHIR.
 * Sumber: satusehat.kemkes.go.id/platform/docs/id/master-data/kfa/rest-api-kfa/apis/api-kfa-v2/
 */
export function getKfaBaseUrl(): string {
  return getSatuSehatEnv() === 'production'
    ? 'https://api-satusehat.kemkes.go.id/kfa-v2'
    : 'https://api-satusehat-stg.dto.kemkes.go.id/kfa-v2';
}

/**
 * Pengiriman ke SATUSEHAT PRODUKSI dikunci sampai uji sandbox satu kunjungan
 * lengkap lulus (satusehat-sandbox-verify) dan tim Dentiva menyalakan
 * SATUSEHAT_PRODUCTION_APPROVED=true setelah mencocokkan hasilnya dengan koleksi
 * Postman resmi. Mencegah data rekam medis salah format masuk ke sistem pemerintah.
 */
export function assertEnvironmentAllowed(): void {
  if (getSatuSehatEnv() === 'production' && Deno.env.get('SATUSEHAT_PRODUCTION_APPROVED') !== 'true') {
    throw new Error(
      'SATUSEHAT produksi masih dikunci: jalankan uji sandbox (satusehat-sandbox-verify) sampai lulus, ' +
        'lalu set secret SATUSEHAT_PRODUCTION_APPROVED=true. Lihat docs/satusehat-sandbox-runbook.md.',
    );
  }
}

const DIAGNOSIS_ROLE_DISPLAY: Record<string, string> = {
  AD: 'Admission diagnosis',
  DD: 'Discharge diagnosis',
  CC: 'Chief complaint',
  CM: 'Comorbidity diagnosis',
  'pre-op': 'pre-op diagnosis',
  'post-op': 'post-op diagnosis',
  billing: 'Billing',
};

/**
 * Encounter.diagnosis.use — dokumentasi SATUSEHAT belum konsisten (halaman resource
 * mencontohkan AD, playbook Rawat Jalan menyebut CC, contoh Postman memakai DD).
 * Hanya dikirim bila secret SATUSEHAT_DIAGNOSIS_USE diisi dengan kode yang LULUS
 * uji sandbox; selain itu dihilangkan.
 */
export function getDiagnosisUseCoding(): { system: string; code: string; display: string } | null {
  const code = (Deno.env.get('SATUSEHAT_DIAGNOSIS_USE') || '').trim();
  if (!code || !DIAGNOSIS_ROLE_DISPLAY[code]) return null;
  return {
    system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
    code,
    display: DIAGNOSIS_ROLE_DISPLAY[code],
  };
}

export const DIAGNOSIS_USE_CANDIDATES = ['DD', 'CC', 'AD'] as const;
export const diagnosisUseCodingFor = (code: string) =>
  DIAGNOSIS_ROLE_DISPLAY[code]
    ? { system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role', code, display: DIAGNOSIS_ROLE_DISPLAY[code] }
    : null;
