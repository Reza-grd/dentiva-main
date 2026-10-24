/**
 * Edge Function: whatsapp-webhook (Meta WhatsApp Cloud API) — verify_jwt = false.
 * Callback URL: https://api.dentiva.id/functions/v1/whatsapp-webhook
 *
 *   GET  : verifikasi webhook (hub.mode/hub.verify_token/hub.challenge) — WHATSAPP_VERIFY_TOKEN.
 *   POST : wajib bertanda tangan X-Hub-Signature-256 = HMAC-SHA256(body, WHATSAPP_APP_SECRET).
 *          - status pesan (sent/delivered/read/failed) → notification_logs.delivery_status (lewat wa_catat_status)
 *          - pesan masuk → whatsapp_inbound (tanpa isi & nomor), "BERHENTI" mencabut wa_consent,
 *            balasan otomatis berisi kontak klinik bila WA_BALAS_OTOMATIS=true (maks. 1× per pengirim per 24 jam).
 *          Kiriman ulang Meta aman: status tidak pernah mundur, pesan masuk unik per wamid.
 *          Log hanya jumlah event (tanpa isi pesan / nomor — UU PDP).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { recipientHash, sendWhatsApp } from "../_shared/whatsapp.ts"
import { autoReplyText, type ClinicContact, isOptOut, optOutReplyText, parseEvents, type WaInboundEvent, type WaStatusEvent } from "../_shared/waWebhook.ts"

const encoder = new TextEncoder()
const RETENSI_HARI = 90

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmacSha256Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Proses berat (DB, balasan ke Graph API) berjalan setelah respons 200 agar Meta tidak menganggap webhook lambat.
const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime
const later = (p: Promise<unknown>) => (runtime?.waitUntil ? runtime.waitUntil(p) : p)

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN')
    if (!verifyToken) return new Response('Webhook belum dikonfigurasi', { status: 503 })
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token') ?? ''
    const challenge = url.searchParams.get('hub.challenge') ?? ''
    if (mode === 'subscribe' && timingSafeEqual(token, verifyToken)) {
      return new Response(challenge, { status: 200 })
    }
    console.warn('[whatsapp-webhook] verifikasi ditolak')
    return new Response('Forbidden', { status: 403 })
  }

  if (req.method === 'POST') {
    const appSecret = Deno.env.get('WHATSAPP_APP_SECRET')
    if (!appSecret) {
      console.error('[whatsapp-webhook] WHATSAPP_APP_SECRET belum diisi — event ditolak')
      return new Response('Webhook belum dikonfigurasi', { status: 503 })
    }
    const raw = await req.text()
    const header = req.headers.get('x-hub-signature-256') ?? ''
    const expected = 'sha256=' + (await hmacSha256Hex(appSecret, raw))
    if (!timingSafeEqual(header, expected)) {
      console.warn('[whatsapp-webhook] tanda tangan tidak valid')
      return new Response('Invalid signature', { status: 401 })
    }

    let payload: any
    try {
      payload = JSON.parse(raw)
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }
    if (payload?.object !== 'whatsapp_business_account') {
      return new Response('Unsupported object', { status: 400 })
    }

    const { statuses, messages } = parseEvents(payload, Deno.env.get('META_WA_PHONE_NUMBER_ID')?.trim() || undefined)
    console.log(`[whatsapp-webhook] diterima: ${messages.length} pesan, ${statuses.length} status`)
    if (statuses.length || messages.length) {
      await later(processEvents(statuses, messages).catch((e) => console.error('[whatsapp-webhook] proses gagal:', (e as Error).message)))
    }
    return new Response('EVENT_RECEIVED', { status: 200 })
  }

  return new Response('Method Not Allowed', { status: 405 })
})

async function processEvents(statuses: WaStatusEvent[], messages: WaInboundEvent[]) {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let updated = 0
  for (const s of statuses) {
    const { data, error } = await db.rpc('wa_catat_status', { p_wamid: s.wamid, p_status: s.status, p_at: s.at, p_error: s.error })
    if (error) console.error('[whatsapp-webhook] status gagal dicatat:', error.message)
    else if (data === true) updated++
  }

  const outcome = { baru: 0, duplikat: 0, berhenti: 0, dibalas: 0 }
  for (const m of messages) await handleInbound(db, m, outcome)

  // Retensi: pesan masuk lebih dari 90 hari dihapus (ringan; berjalan sesekali).
  if (messages.length && Math.random() < 0.05) {
    const batas = new Date(Date.now() - RETENSI_HARI * 86_400_000).toISOString()
    const { error } = await db.from('whatsapp_inbound').delete().lt('received_at', batas)
    if (error) console.error('[whatsapp-webhook] retensi gagal:', error.message)
  }

  console.log(`[whatsapp-webhook] diproses: ${updated} status diperbarui, ${outcome.baru} pesan baru, ${outcome.duplikat} duplikat, ${outcome.berhenti} berhenti, ${outcome.dibalas} dibalas`)
}

async function handleInbound(db: any, m: WaInboundEvent, outcome: Record<string, number>) {
  const senderHash = await recipientHash(m.from)
  if (!senderHash) return

  // Pesan terakhir yang dikirim ke nomor ini → klinik & pasien yang dibalas (60 hari terakhir).
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString()
  const { data: last } = await db.from('notification_logs')
    .select('clinic_id, patient_id')
    .eq('recipient_hash', senderHash)
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: row, error: insErr } = await db.from('whatsapp_inbound').insert([{
    wamid: m.wamid, clinic_id: last?.clinic_id ?? null, patient_id: last?.patient_id ?? null,
    sender_hash: senderHash, message_type: m.type,
  }]).select('id').single()
  if (insErr) {
    if (insErr.code === '23505') outcome.duplikat++ // kiriman ulang Meta: sudah diproses
    else console.error('[whatsapp-webhook] pesan masuk gagal dicatat:', insErr.code, insErr.message)
    return
  }
  outcome.baru++

  const optOut = isOptOut(m.text)
  if (optOut) {
    const { error } = await db.rpc('wa_cabut_persetujuan', { p_sender_hash: senderHash })
    if (error) console.error('[whatsapp-webhook] cabut persetujuan gagal:', error.message)
    else outcome.berhenti++
  }

  let action: 'none' | 'auto_reply' | 'opt_out' = optOut ? 'opt_out' : 'none'
  if (Deno.env.get('WA_BALAS_OTOMATIS') === 'true') {
    // Balasan otomatis paling banyak sekali per pengirim per 24 jam (konfirmasi BERHENTI selalu dikirim).
    const { count } = await db.from('whatsapp_inbound').select('id', { count: 'exact', head: true })
      .eq('sender_hash', senderHash).eq('action', 'auto_reply')
      .gte('received_at', new Date(Date.now() - 86_400_000).toISOString())
    if (optOut || (count ?? 0) === 0) {
      const contact = last?.clinic_id ? await clinicContact(db, last.clinic_id) : null
      const r = await sendWhatsApp({ to: m.from, text: optOut ? optOutReplyText(contact) : autoReplyText(contact) }, { provider: 'meta' })
      if (r.ok) {
        outcome.dibalas++
        if (!optOut) action = 'auto_reply'
      } else console.error('[whatsapp-webhook] balasan otomatis gagal:', r.error)
    }
  }
  if (action !== 'none') {
    const { error } = await db.from('whatsapp_inbound').update({ action }).eq('id', row.id)
    if (error) console.error('[whatsapp-webhook] tindakan gagal dicatat:', error.message)
  }
}

async function clinicContact(db: any, clinicId: string): Promise<ClinicContact | null> {
  const [{ data: settings }, { data: clinic }] = await Promise.all([
    db.from('clinic_settings').select('key, value').eq('clinic_id', clinicId).in('key', ['clinic_name', 'clinic_phone']),
    db.from('clinics').select('name').eq('id', clinicId).maybeSingle(),
  ])
  const s = Object.fromEntries((settings ?? []).map((r: any) => [r.key, r.value]))
  const name = s.clinic_name || clinic?.name
  return name ? { name, phone: s.clinic_phone || '-' } : null
}
