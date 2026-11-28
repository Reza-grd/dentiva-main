// Template pengingat WhatsApp — HARUS sama dengan DEFAULT_* di supabase/functions/_shared/visitMessages.ts.
export const TEMPLATE_VARS = [
  { key: 'nama', label: 'Nama pasien', contoh: 'Budi Santoso' },
  { key: 'klinik', label: 'Nama klinik', contoh: 'Klinik Gigi Sehat' },
  { key: 'tanggal', label: 'Tanggal kunjungan', contoh: 'Senin, 12 Oktober 2026' },
  { key: 'jam', label: 'Jam kunjungan', contoh: '09:00' },
  { key: 'dokter', label: 'Nama dokter', contoh: 'drg. Ani Lestari' },
  { key: 'telepon', label: 'Telepon klinik', contoh: '021-1234567' },
];

export const DEFAULT_REMINDER_DAY = `*PENGINGAT JADWAL KUNJUNGAN*
{klinik}

Yth. {nama},
kami mengingatkan jadwal kunjungan Anda:

Tanggal : {tanggal}
Jam     : {jam} WIB
Dokter  : {dokter}

Mohon hadir 10 menit lebih awal. Untuk perubahan jadwal, silakan hubungi {telepon}.`;

export const DEFAULT_REMINDER_HOUR = `*JADWAL ANDA SEBENTAR LAGI*
{klinik}

Yth. {nama},
kunjungan Anda dimulai sekitar 1 jam lagi.

Tanggal : {tanggal}
Jam     : {jam} WIB
Dokter  : {dokter}

Bila berhalangan hadir, mohon kabari kami di {telepon}.`;

export const MAX_TEMPLATE_LENGTH = 1500;

/** Pratinjau dengan data contoh (aturan sama dengan server: kode dikenal diganti, lainnya dibiarkan). */
export function renderPreview(template, overrides = {}) {
  const vars = Object.fromEntries(TEMPLATE_VARS.map((v) => [v.key, overrides[v.key] ?? v.contoh]));
  return String(template || '').replace(/\{(nama|klinik|tanggal|jam|dokter|telepon)\}/g, (_m, k) => vars[k]);
}

/** Kode `{...}` yang tidak dikenal (kemungkinan salah ketik). */
export function unknownPlaceholders(template) {
  const known = new Set(TEMPLATE_VARS.map((v) => v.key));
  return [...new Set([...String(template || '').matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).filter((k) => !known.has(k)))];
}
