// ─────────────────────────────────────────────────────────────────────────────
//  Sidecar WhatsApp Dentiva — mode TIDAK RESMI (Baileys, nomor ditautkan lewat QR).
//  Dipakai sambil menunggu WhatsApp Cloud API resmi (Meta) disetujui.
//
//  - Hanya bisa diakses dari jaringan internal Docker (tidak ada port publik).
//    Edge function memanggil http://wa-sidecar:3000 dengan header x-api-key.
//  - Kunci sesi WhatsApp disimpan di /data/auth (volume, izin 700).
//  - Isi pesan & nomor pasien TIDAK dicatat di log (nomor disamarkan); pesan masuk tidak disimpan.
//  - Kirim berurutan dengan jeda acak & batas per jam untuk mengurangi risiko nomor diblokir.
//
//  API (semua kecuali /health wajib x-api-key):
//    GET  /health                 → { ok, status }
//    GET  /status                 → { status, me, since, lastError }
//    GET  /qr[?format=terminal]   → { status, qr } (qr = teks QR atau gambar terminal)
//    POST /pairing-code {phone}   → { code }   (alternatif QR: "Tautkan dengan nomor telepon")
//    POST /send {to, text}        → { ok, id }
//    POST /logout                 → { ok }
// ─────────────────────────────────────────────────────────────────────────────
import http from 'node:http'
import { rm, mkdir } from 'node:fs/promises'
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from 'baileys'
import pino from 'pino'
import QRCode from 'qrcode'
import { normalizeTo, mask, safeEqual, createSender, cleanText } from './lib.mjs'

const PORT = Number(process.env.PORT || 3000)
const AUTH_DIR = process.env.AUTH_DIR || '/data/auth'
const API_KEY = process.env.WA_SIDECAR_KEY || ''
if (API_KEY.length < 32) {
  console.error('WA_SIDECAR_KEY belum diisi (minimal 32 karakter) — sidecar tidak dijalankan.')
  process.exit(1)
}

const log = (...a) => console.log(new Date().toISOString(), ...a)
const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'warn' })
const send = createSender({
  minGapMs: Number(process.env.WA_MIN_GAP_MS || 1500),
  jitterMs: Number(process.env.WA_JITTER_MS || 1500),
  perHour: Number(process.env.WA_PER_HOUR || 200),
})

const state = { status: 'starting', qr: null, me: null, since: new Date().toISOString(), lastError: null }
let sock = null
let retry = 0
let starting = false

function setStatus(status, extra = {}) {
  Object.assign(state, { status, since: new Date().toISOString() }, extra)
}

async function start() {
  if (starting) return
  starting = true
  try {
    await mkdir(AUTH_DIR, { recursive: true, mode: 0o700 })
    const { state: auth, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))
    sock = makeWASocket({
      auth,
      version,
      logger: baileysLogger,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false, // notifikasi di HP pemilik nomor tetap muncul
      // Riwayat penuh tidak diunduh. Sinkron awal bawaan Baileys tetap jalan karena dibutuhkan untuk
      // pemetaan LID (tanpa itu sesi tidak stabil); isinya tidak disimpan — tidak ada store pesan.
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', onConnectionUpdate)
    // Pesan masuk sengaja diabaikan (tidak disimpan) — belum ada fitur balasan otomatis.
  } catch (err) {
    state.lastError = String(err?.message || err)
    log('gagal memulai:', state.lastError)
    scheduleRestart()
  } finally {
    starting = false
  }
}

function scheduleRestart(delayMs) {
  const wait = delayMs ?? Math.min(60_000, 2_000 * 2 ** Math.min(retry++, 5))
  setTimeout(start, wait)
}

async function onConnectionUpdate({ connection, lastDisconnect, qr }) {
  if (qr) {
    setStatus('qr', { qr })
    log('menunggu scan QR')
  }
  if (connection === 'open') {
    retry = 0
    setStatus('connected', { qr: null, me: sock?.user?.id ?? null, lastError: null })
    log('tersambung sebagai', mask(state.me))
  }
  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode
    state.lastError = `terputus (kode ${code ?? '?'})`
    if (code === DisconnectReason.loggedOut) {
      log('sesi dikeluarkan dari HP — kunci sesi dihapus, menunggu QR baru')
      await rm(AUTH_DIR, { recursive: true, force: true })
      setStatus('logged_out', { qr: null, me: null })
      scheduleRestart(2_000)
    } else if (code === DisconnectReason.restartRequired) {
      setStatus('reconnecting', { qr: null })
      scheduleRestart(0)
    } else {
      setStatus('reconnecting', { qr: null })
      log('terputus, sambung ulang —', state.lastError)
      scheduleRestart()
    }
  }
}

// ── HTTP ─────────────────────────────────────────────────────────────────────
const reply = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(Object.assign(new Error('Body terlalu besar'), { status: 413 })); req.destroy() }
      else chunks.push(c)
    })
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}) }
      catch { reject(Object.assign(new Error('JSON tidak valid'), { status: 400 })) }
    })
    req.on('error', reject)
  })
}

const routes = {
  'GET /status': async () => [200, { status: state.status, me: state.me ? mask(state.me) : null, since: state.since, lastError: state.lastError }],

  'GET /qr': async (req, url) => {
    if (state.status !== 'qr' || !state.qr) return [200, { status: state.status, qr: null }]
    const qr = url.searchParams.get('format') === 'terminal'
      ? await QRCode.toString(state.qr, { type: 'terminal', small: true })
      : state.qr
    return [200, { status: state.status, qr }]
  },

  'POST /pairing-code': async (req) => {
    const { phone } = await readJson(req)
    const digits = normalizeTo(phone)
    if (!digits) return [400, { error: 'Nomor tidak valid' }]
    if (state.status === 'connected') return [409, { error: 'Sudah tersambung' }]
    if (!sock) return [503, { error: 'Sidecar belum siap, coba lagi sebentar' }]
    const code = await sock.requestPairingCode(digits)
    log('kode tautan dibuat untuk', mask(digits))
    return [200, { code }]
  },

  'POST /send': async (req) => {
    const body = await readJson(req)
    const to = normalizeTo(body.to)
    const text = cleanText(body.text)
    if (!to) return [400, { ok: false, error: 'Nomor tujuan tidak valid' }]
    if (!text) return [400, { ok: false, error: 'Isi pesan kosong atau terlalu panjang' }]
    if (state.status !== 'connected' || !sock) return [503, { ok: false, error: `WhatsApp belum tersambung (status: ${state.status})` }]
    const id = await send(async () => {
      const [hit] = (await sock.onWhatsApp(to)) ?? []
      if (!hit?.exists) throw Object.assign(new Error('Nomor tidak terdaftar di WhatsApp'), { status: 422 })
      const sent = await sock.sendMessage(hit.jid, { text })
      return sent?.key?.id ?? null
    })
    log('terkirim ke', mask(to))
    return [200, { ok: true, id }]
  },

  'POST /logout': async () => {
    if (sock && state.status === 'connected') await sock.logout().catch(() => {})
    await rm(AUTH_DIR, { recursive: true, force: true })
    setStatus('logged_out', { qr: null, me: null })
    scheduleRestart(1_000)
    return [200, { ok: true }]
  },
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (req.method === 'GET' && url.pathname === '/health') return reply(res, 200, { ok: true, status: state.status })
  if (!safeEqual(req.headers['x-api-key'], API_KEY)) return reply(res, 401, { error: 'Unauthorized' })
  const route = routes[`${req.method} ${url.pathname}`]
  if (!route) return reply(res, 404, { error: 'Not found' })
  try {
    const [status, body] = await route(req, url)
    reply(res, status, body)
  } catch (err) {
    const status = err?.status || 500
    if (status >= 500) log('galat', req.method, url.pathname, String(err?.message || err))
    reply(res, status, { ok: false, error: String(err?.message || 'Galat internal') })
  }
})

server.listen(PORT, '0.0.0.0', () => log(`sidecar WhatsApp Dentiva siap di :${PORT}`))
start()

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    log('berhenti')
    server.close()
    try { sock?.end(undefined) } catch {}
    setTimeout(() => process.exit(0), 500)
  })
}
