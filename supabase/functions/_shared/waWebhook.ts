/**
 * Logika murni webhook WhatsApp Cloud API (Meta) — tanpa jaringan/DB, agar mudah diuji.
 * Dipakai oleh supabase/functions/whatsapp-webhook.
 */

export interface WaStatusEvent {
  wamid: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  at: string | null
  error: string | null
}

export interface WaInboundEvent {
  wamid: string
  from: string
  type: string
  /** Hanya untuk mengenali kata kunci (BERHENTI); tidak pernah disimpan atau dicatat. */
  text: string
}

const STATUSES = ['sent', 'delivered', 'read', 'failed'] as const

const isoFromUnix = (ts: unknown): string | null => {
  const n = Number(ts)
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : null
}

/**
 * Ambil event status & pesan masuk dari payload webhook. Bila `phoneNumberId` diisi, event untuk nomor lain
 * (aset lain di akun Meta yang sama) diabaikan.
 */
export function parseEvents(payload: any, phoneNumberId?: string): { statuses: WaStatusEvent[]; messages: WaInboundEvent[] } {
  const statuses: WaStatusEvent[] = []
  const messages: WaInboundEvent[] = []
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field !== 'messages') continue
      const value = change.value ?? {}
      if (phoneNumberId && value.metadata?.phone_number_id && String(value.metadata.phone_number_id) !== phoneNumberId) continue
      for (const s of Array.isArray(value.statuses) ? value.statuses : []) {
        if (typeof s?.id !== 'string' || !STATUSES.includes(s.status)) continue
        const e = Array.isArray(s.errors) ? s.errors[0] : undefined
        statuses.push({
          wamid: s.id,
          status: s.status,
          at: isoFromUnix(s.timestamp),
          error: e ? `${e.code ?? ''} ${e.title ?? e.message ?? ''}`.trim() : null,
        })
      }
      for (const m of Array.isArray(value.messages) ? value.messages : []) {
        if (typeof m?.id !== 'string' || typeof m?.from !== 'string') continue
        const text = m.type === 'text' ? m.text?.body
          : m.type === 'button' ? m.button?.text
          : m.type === 'interactive' ? (m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title)
          : ''
        messages.push({ wamid: m.id, from: m.from, type: String(m.type ?? 'unknown').slice(0, 30), text: String(text ?? '') })
      }
    }
  }
  return { statuses, messages }
}

/**
 * Hanya pesan yang benar-benar dikirim pengguna yang boleh dibalas otomatis — bukan pesan sistem
 * (user_changed_number/user_changed_user_id), reaksi emoji, atau jenis yang tidak didukung (spesifikasi
 * github.com/facebook/openapi, business-messaging-api_v23.0).
 */
export function isReplyable(type: string): boolean {
  return !['system', 'reaction', 'unsupported', 'unknown', 'errors'].includes(type)
}

/** Balasan berhenti berlangganan: hanya kata kunci itu sendiri (bukan kalimat yang kebetulan memuatnya). */
export function isOptOut(text: string): boolean {
  return /^\s*(berhenti|stop|unsubscribe|unreg|jangan kirim lagi)\s*[.!]*\s*$/i.test(text)
}

export interface ClinicContact {
  name: string
  phone: string
}

const kontak = (c: ClinicContact | null) =>
  c ? `${c.name}${c.phone && c.phone !== '-' ? ` di ${c.phone}` : ''}` : 'klinik Anda secara langsung'

export function autoReplyText(c: ClinicContact | null): string {
  return [
    c ? `Halo, ini nomor notifikasi otomatis untuk ${c.name}.` : 'Halo, ini nomor notifikasi otomatis klinik yang memakai Dentiva.',
    'Pesan di nomor ini tidak dibaca petugas.',
    `Untuk pertanyaan atau perubahan jadwal, silakan hubungi ${kontak(c)}.`,
    'Balas BERHENTI bila tidak ingin menerima pesan WhatsApp lagi.',
  ].join(' ')
}

export function optOutReplyText(c: ClinicContact | null): string {
  return `Baik, Anda tidak akan menerima pesan WhatsApp otomatis lagi. Untuk mengaktifkannya kembali, hubungi ${kontak(c)}.`
}
