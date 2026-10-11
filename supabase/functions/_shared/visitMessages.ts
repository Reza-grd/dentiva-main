/**
 * Penyusun pesan WhatsApp kunjungan dari DATA TERCATAT (bukan dari isian form browser):
 *   - buildReceipt   : invoice/struk setelah pembayaran lunas
 *   - buildEducation : edukasi pasca-tindakan sesuai tindakan & obat yang tercatat
 * Fungsi murni — diuji di visitMessages.test.ts.
 */

export interface ReceiptLine { name: string; qty: number; subtotal: number; tooth?: number | null }
export interface ReceiptInput {
  clinicName: string
  clinicPhone?: string | null
  invoiceNumber?: string | null
  patientName: string
  noRm?: string | null
  doctorName: string
  paidAt?: string | null // ISO
  treatments: ReceiptLine[]
  medicines: ReceiptLine[]
  extraFee?: number | null
  extraFeeNote?: string | null
  discount?: number | null
  total: number
  amountPaid?: number | null
  method?: string | null
}

export const rupiah = (n: number | null | undefined) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID')

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS', debit: 'Kartu Debit', credit: 'Kartu Kredit', bpjs: 'BPJS', insurance: 'Asuransi',
}

export function doctorDisplayName(doc: { full_name?: string | null; gelar_depan?: string | null; gelar_belakang?: string | null } | null): string {
  if (!doc?.full_name) return 'Dokter Gigi'
  const depan = doc.gelar_depan?.trim() ? `${doc.gelar_depan.trim()} ` : ''
  const belakang = doc.gelar_belakang?.trim() ? `, ${doc.gelar_belakang.trim()}` : ''
  return `${depan}${doc.full_name.trim()}${belakang}`
}

export function buildReceipt(r: ReceiptInput): string {
  const tgl = r.paidAt
    ? new Date(r.paidAt).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB'
    : '-'
  const L: string[] = []
  L.push(`🦷 *${r.clinicName.toUpperCase()}*`)
  L.push('*INVOICE PEMBAYARAN*')
  L.push('━━━━━━━━━━━━━━━━━━')
  L.push(`No. Invoice : ${r.invoiceNumber || '-'}`)
  L.push(`Tanggal     : ${tgl}`)
  L.push(`Pasien      : ${r.patientName || '-'}`)
  if (r.noRm) L.push(`No. RM      : ${r.noRm}`)
  L.push(`Dokter      : ${r.doctorName}`)
  L.push('━━━━━━━━━━━━━━━━━━')
  if (r.treatments.length) {
    L.push('*Tindakan:*')
    for (const t of r.treatments) {
      const gigi = t.tooth ? ` (gigi ${t.tooth})` : ''
      const qty = t.qty > 1 ? ` ×${t.qty}` : ''
      L.push(`• ${t.name}${gigi}${qty} — ${rupiah(t.subtotal)}`)
    }
  }
  if (r.medicines.length) {
    L.push('*Obat:*')
    for (const m of r.medicines) L.push(`• ${m.name} ×${m.qty} — ${rupiah(m.subtotal)}`)
  }
  if (Number(r.extraFee) > 0) L.push(`• ${r.extraFeeNote?.trim() || 'Biaya tambahan'} — ${rupiah(r.extraFee)}`)
  if (Number(r.discount) > 0) L.push(`• Diskon — -${rupiah(r.discount)}`)
  L.push('━━━━━━━━━━━━━━━━━━')
  L.push(`*Total       : ${rupiah(r.total)}*`)
  const method = r.method ? (METHOD_LABEL[r.method.toLowerCase()] ?? r.method) : '-'
  L.push(`Pembayaran  : ${method}`)
  if (r.amountPaid != null && r.method?.toLowerCase() === 'cash' && Number(r.amountPaid) > r.total) {
    L.push(`Dibayar     : ${rupiah(r.amountPaid)}`)
    L.push(`Kembalian   : ${rupiah(Number(r.amountPaid) - r.total)}`)
  }
  L.push('Status      : ✅ *LUNAS*')
  L.push('━━━━━━━━━━━━━━━━━━')
  L.push(`Terima kasih atas kepercayaan Anda.${r.clinicPhone ? ` Info: ${r.clinicPhone}` : ''}`)
  return L.join('\n')
}

// ── Edukasi ─────────────────────────────────────────────────────────────────
export interface EduTreatment { treatmentId: string | null; name: string }
export interface EduTemplate { treatment_type: string; keywords?: string[] | null; education_text?: string | null; medication_instructions?: string | null }
export interface EduLinked { treatment_id: string; judul?: string | null; isi_edukasi?: string | null; edukasi_obat?: string | null; is_active?: boolean | null }
export interface EduMedicine { name: string; dosis?: string | null; frekuensi?: string | null }
export interface EduInput {
  clinicName: string
  clinicPhone?: string | null
  patientName: string
  treatments: EduTreatment[]
  medicines: EduMedicine[]
  templates: EduTemplate[]
  linked: EduLinked[]
}
export interface EduMatch { name: string; source: 'template_exact' | 'linked' | 'template_keyword' | 'none'; text: string; medication: string }

export const normalize = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

const PLACEHOLDER_OBAT = /^\[.*\]$/

/**
 * Prioritas per tindakan:
 *   1. template klinik yang namanya persis sama (kustomisasi klinik di Pengaturan)
 *   2. edukasi yang terhubung langsung ke treatment_id (treatment_education, aktif)
 *   3. template berdasarkan kata kunci (skor terbanyak, lalu kata kunci terpanjang)
 */
export function matchEducation(t: EduTreatment, templates: EduTemplate[], linked: EduLinked[]): EduMatch {
  const nt = normalize(t.name)
  const clean = (s?: string | null) => (s ?? '').trim()
  const med = (s?: string | null) => (PLACEHOLDER_OBAT.test(clean(s)) ? '' : clean(s))

  const exact = templates.find((x) => normalize(x.treatment_type) === nt && (clean(x.education_text) || med(x.medication_instructions)))
  if (exact) return { name: t.name, source: 'template_exact', text: clean(exact.education_text), medication: med(exact.medication_instructions) }

  const link = t.treatmentId ? linked.find((x) => x.treatment_id === t.treatmentId && x.is_active !== false && (clean(x.isi_edukasi) || clean(x.edukasi_obat))) : undefined
  if (link) return { name: t.name, source: 'linked', text: clean(link.isi_edukasi), medication: med(link.edukasi_obat) }

  let best: EduTemplate | null = null
  let bestScore = 0
  let bestLen = 0
  for (const x of templates) {
    if (!(clean(x.education_text) || med(x.medication_instructions))) continue
    let score = 0
    let longest = 0
    for (const kw of x.keywords ?? []) {
      const nk = normalize(kw)
      // bagian kata (imbuhan bahasa Indonesia: "pencabutan" ⊃ "cabut"); kata kunci < 4 huruf diabaikan
      if (nk.length >= 4 && nt.includes(nk)) { score++; longest = Math.max(longest, nk.length) }
    }
    if (score > bestScore || (score === bestScore && score > 0 && longest > bestLen)) { best = x; bestScore = score; bestLen = longest }
  }
  if (best) return { name: t.name, source: 'template_keyword', text: clean(best.education_text), medication: med(best.medication_instructions) }
  return { name: t.name, source: 'none', text: '', medication: '' }
}

/** null bila tidak ada edukasi yang bisa dikirim (tidak ada tindakan cocok & tidak ada obat). */
export function buildEducation(e: EduInput): { message: string | null; matches: EduMatch[] } {
  // satu bagian per tindakan unik (tindakan yang sama di beberapa gigi cukup sekali)
  const seen = new Set<string>()
  const unique = e.treatments.filter((t) => {
    const k = t.treatmentId ?? normalize(t.name)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  const matches = unique.map((t) => matchEducation(t, e.templates, e.linked))
  const withText = matches.filter((m) => m.text || m.medication)
  const meds = e.medicines.filter((m) => m.name?.trim())
  if (!withText.length && !meds.length) return { message: null, matches }

  const L: string[] = []
  L.push('📋 *EDUKASI PERAWATAN*')
  L.push(e.clinicName)
  L.push('━━━━━━━━━━━━━━━━━━')
  L.push(`Halo ${e.patientName || 'Bapak/Ibu'}, berikut panduan setelah perawatan hari ini:`)
  for (const m of withText) {
    L.push('')
    L.push(`*${m.name}*`)
    if (m.text) L.push(m.text)
    if (m.medication) L.push(`💊 ${m.medication}`)
  }
  if (meds.length) {
    L.push('')
    L.push('*💊 Obat yang diresepkan:*')
    for (const m of meds) {
      const aturan = [m.dosis?.trim(), m.frekuensi?.trim()].filter(Boolean).join(', ')
      L.push(`• ${m.name.trim()}${aturan ? ` — ${aturan}` : ''}`)
    }
  }
  L.push('━━━━━━━━━━━━━━━━━━')
  L.push(`Jika ada keluhan atau pertanyaan, hubungi kami${e.clinicPhone ? `: ${e.clinicPhone}` : '.'}`)
  return { message: L.join('\n'), matches }
}

// ── Template pengingat yang bisa diatur admin (clinic_settings.wa_template_reminder_day / _hour) ──
export const TEMPLATE_PLACEHOLDERS = ['nama', 'klinik', 'tanggal', 'jam', 'dokter', 'telepon'] as const
export const DEFAULT_REMINDER_DAY =
  `🦷 *PENGINGAT JADWAL*
{klinik}
━━━━━━━━━━━━━━━━━━
Halo {nama},
Anda memiliki jadwal kunjungan:
📅 {tanggal} jam {jam} WIB
👨‍⚕️ Dokter: {dokter}
📍 {klinik}
━━━━━━━━━━━━━━━━━━
Mohon hadir tepat waktu. Hubungi kami jika perlu reschedule: {telepon}`
export const DEFAULT_REMINDER_HOUR =
  `⏰ *SEBENTAR LAGI JADWAL ANDA*
{klinik}
━━━━━━━━━━━━━━━━━━
Halo {nama}, kunjungan Anda dimulai sekitar 1 jam lagi:
📅 {tanggal} jam {jam} WIB
👨‍⚕️ Dokter: {dokter}
━━━━━━━━━━━━━━━━━━
Mohon hadir tepat waktu. Perlu reschedule? Hubungi {telepon}`

/** Ganti {placeholder} dikenal; yang tidak dikenal dibiarkan apa adanya. Kosong/terlalu panjang → bawaan. */
export function renderTemplate(template: string | null | undefined, vars: Record<string, string>, fallback: string): string {
  const t = (template ?? '').trim()
  const use = t && t.length <= 1500 ? t : fallback
  return use.replace(/\{(nama|klinik|tanggal|jam|dokter|telepon)\}/g, (_m, k) => vars[k] ?? '')
}
