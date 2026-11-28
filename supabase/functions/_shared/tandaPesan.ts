/**
 * Identitas pesan WhatsApp untuk pasien (satu nomor Dentiva untuk semua klinik).
 * Baris pembuka setiap pesan:  SMLE · RM-000123 · Budi S.
 *   - kode klinik pengirim (clinics.kode_wa)
 *   - No. RM: pasien yang dimaksud (aman bila satu nomor dipakai sekeluarga)
 *   - nama depan + inisial: cukup untuk dikenali tanpa menampilkan nama lengkap
 * Tanpa emoji, agar terbaca profesional di semua perangkat.
 */
import { decryptBatch } from './decryptionHelper.ts'

export interface IdentitasPesan { kode?: string | null; noRm?: string | null; nama?: string | null }

const PEMISAH = ' · '

/** "budi  santoso" → "Budi S."; "Siti" → "Siti"; gelar/tanda baca di depan diabaikan. */
export function namaSingkat(nama: string | null | undefined): string {
  const kata = String(nama ?? '')
    .replace(/^(?:\s*(?:tn|ny|nn|sdr|sdri|an|by|bpk|ibu|bapak)\.?\s+)+/i, '')
    .split(/\s+/)
    .map((k) => k.replace(/[^\p{L}'-]/gu, ''))
    .filter(Boolean)
  if (kata.length === 0) return ''
  const rapi = (k: string) => k.charAt(0).toLocaleUpperCase('id-ID') + k.slice(1).toLocaleLowerCase('id-ID')
  const depan = rapi(kata[0])
  return kata.length > 1 ? `${depan} ${kata[kata.length - 1].charAt(0).toLocaleUpperCase('id-ID')}.` : depan
}

/** "RM-000123" tetap; "000123" → "RM-000123"; kosong → ''. */
export function formatRm(noRm: string | null | undefined): string {
  const t = String(noRm ?? '').trim()
  if (!t) return ''
  return /^rm/i.test(t) ? t.replace(/^rm[\s\-.:]*/i, 'RM-') : `RM-${t}`
}

/** Baris identitas; bagian yang kosong dilewati. Kosong bila tidak ada kode klinik maupun RM. */
export function barisIdentitas({ kode, noRm, nama }: IdentitasPesan): string {
  const k = String(kode ?? '').trim().toUpperCase()
  const rm = formatRm(noRm)
  if (!k && !rm) return ''
  return [k, rm, namaSingkat(nama)].filter(Boolean).join(PEMISAH)
}

/** Sisipkan baris identitas di atas pesan (sekali saja; tidak dobel bila sudah ada). */
export function beriIdentitas(pesan: string, identitas: string): string {
  const isi = String(pesan ?? '')
  const baris = String(identitas ?? '').trim()
  if (!baris || !isi.trim()) return isi
  if (isi.trimStart().startsWith(baris)) return isi
  return `${baris}\n\n${isi}`
}

/**
 * Ambil identitas pasien dari database (klien service role) lalu susun barisnya.
 * Gagal membaca → '' (pesan tetap terkirim tanpa baris identitas, tidak pernah diblokir).
 */
// deno-lint-ignore no-explicit-any
export async function identitasPasien(db: any, patientId: string | null | undefined): Promise<string> {
  if (!patientId) return ''
  try {
    const { data, error } = await db
      .from('patients')
      .select('no_rm, nama_lengkap, clinic:clinics(kode_wa)')
      .eq('id', patientId)
      .maybeSingle()
    if (error || !data) return ''
    const [nama] = data.nama_lengkap ? await decryptBatch(db, [data.nama_lengkap]) : ['']
    return barisIdentitas({ kode: data.clinic?.kode_wa, noRm: data.no_rm, nama: /^(PGPM?:|ENC:)/.test(nama ?? '') ? '' : nama })
  } catch (e) {
    console.error('identitasPasien gagal:', (e as Error).message)
    return ''
  }
}
