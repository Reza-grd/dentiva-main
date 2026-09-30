/**
 * Edge Function: whatsapp-webhook (Meta WhatsApp Cloud API) — verify_jwt = false.
 *
 * Versi lama (hanya ada di produksi) menulis WHATSAPP_VERIFY_TOKEN ke log saat token
 * tidak cocok, tidak memverifikasi tanda tangan Meta, dan mencatat isi pesan pasien.
 *
 *   GET  : verifikasi webhook (hub.mode/hub.verify_token/hub.challenge).
 *   POST : wajib bertanda tangan X-Hub-Signature-256 = HMAC-SHA256(body, WHATSAPP_APP_SECRET).
 *          Hanya mencatat jumlah & jenis event (tanpa isi pesan / nomor lengkap).
 *
 * Catatan: pengiriman WA aplikasi memakai Whapi.cloud; webhook Meta ini hanya diperlukan
 * bila nomor Meta Cloud API dipakai. Pesan masuk belum diproses (fitur mendatang).
 */

const encoder = new TextEncoder()

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

    let messages = 0
    let statuses = 0
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue
        messages += change.value?.messages?.length ?? 0
        statuses += change.value?.statuses?.length ?? 0
      }
    }
    // Tanpa isi pesan / nomor pasien di log (UU PDP).
    console.log(`[whatsapp-webhook] diterima: ${messages} pesan, ${statuses} status`)
    return new Response('EVENT_RECEIVED', { status: 200 })
  }

  return new Response('Method Not Allowed', { status: 405 })
})
