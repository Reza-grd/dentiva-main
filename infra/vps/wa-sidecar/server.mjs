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
//  API (semua kecuali /health dan /pair wajib x-api-key):
//    GET  /health                 → { ok, status }
//    POST /pair-token             → { token } halaman QR sekali pakai, berlaku 10 menit
//    GET  /pair?t=TOKEN           → halaman QR (gambar SVG, diperbarui otomatis) — dibuka lewat
//                                   terowongan SSH ke 127.0.0.1:3002, tidak pernah dari internet
//    GET  /status                 → { status, me, since, lastError }
//    GET  /qr[?format=terminal]   → { status, qr } (qr = teks QR atau gambar terminal)
//    POST /pairing-code {phone}   → { code }   (alternatif QR: "Tautkan dengan nomor telepon")
//    POST /send {to, text}        → { ok, id }
//    POST /logout                 → { ok }
// ─────────────────────────────────────────────────────────────────────────────
import http from 'node:http'
import { rm, mkdir } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
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
let gen = 0 // nomor generasi soket; event dari soket lama diabaikan
let retry = 0
let starting = false
let authStore = null // kunci sesi dimuat SEKALI & dipakai ulang antar sambung-ulang (tidak dibaca ulang dari disk)
let pairing = null // { code, digits, gen, at } — kode tautan aktif, agar tidak ditimpa kode baru
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function setStatus(status, extra = {}) {
  Object.assign(state, { status, since: new Date().toISOString() }, extra)
}

async function loadAuth(fresh) {
  if (fresh) {
    await rm(AUTH_DIR, { recursive: true, force: true })
    authStore = null
  }
  if (!authStore) {
    await mkdir(AUTH_DIR, { recursive: true, mode: 0o700 })
    authStore = await useMultiFileAuthState(AUTH_DIR)
  }
  return authStore
}

async function start({ fresh = false } = {}) {
  if (starting) return
  starting = true
  try {
    const { state: auth, saveCreds } = await loadAuth(fresh)
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))
    const myGen = ++gen
    const s = makeWASocket({
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
    sock = s
    // ev.process memproses event berurutan: kunci sesi baru (mis. setelah scan QR berhasil) SELESAI
    // disimpan sebelum sambung-ulang (kode 515) — tanpa ini HP diminta scan ulang.
    // Pesan masuk sengaja diabaikan (tidak disimpan) — belum ada fitur balasan otomatis.
    s.ev.process(async (events) => {
      if (myGen !== gen) return
      if (events['creds.update']) await saveCreds()
      if (events['connection.update']) await onConnectionUpdate(events['connection.update'])
    })
  } catch (err) {
    state.lastError = String(err?.message || err)
    log('gagal memulai:', state.lastError)
    scheduleRestart()
  } finally {
    starting = false
  }
}

function scheduleRestart(delayMs, opts) {
  const wait = delayMs ?? Math.min(60_000, 2_000 * 2 ** Math.min(retry++, 5))
  const at = gen
  setTimeout(() => { if (at === gen) start(opts) }, wait)
}

/** Hentikan soket sekarang dan mulai yang baru (fresh = buang kunci sesi yang belum terdaftar). */
async function restartNow({ fresh = false } = {}) {
  const old = sock
  gen++
  sock = null
  setStatus('starting', { qr: null })
  try { old?.end(undefined) } catch {}
  await start({ fresh })
}

async function onConnectionUpdate({ connection, lastDisconnect, qr }) {
  if (qr) {
    setStatus('qr', { qr })
    log('menunggu scan QR')
  }
  if (connection === 'open') {
    retry = 0
    pairing = null
    setStatus('connected', { qr: null, me: sock?.user?.id ?? null, lastError: null })
    log('tersambung sebagai', mask(state.me))
  }
  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode
    state.lastError = `terputus (kode ${code ?? '?'})`
    if (code === DisconnectReason.loggedOut) {
      log('sesi dikeluarkan dari HP — kunci sesi dihapus, menunggu QR baru')
      setStatus('logged_out', { qr: null, me: null })
      pairing = null
      scheduleRestart(2_000, { fresh: true })
    } else if (code === DisconnectReason.restartRequired) {
      log('penautan diterima, menyambung ulang dengan kunci sesi baru')
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

// Token halaman QR: sekali dibuat lewat API ber-kunci, berlaku 10 menit.
const pairTokens = new Map()
const pairTokenValid = (t) => {
  const exp = pairTokens.get(String(t ?? ''))
  if (!exp) return false
  if (Date.now() > exp) { pairTokens.delete(String(t)); return false }
  return true
}

const PAIR_PAGE = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Tautkan WhatsApp Dentiva</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f6f8;color:#14213d;display:grid;place-items:center;min-height:100vh;margin:0}
main{background:#fff;border-radius:16px;padding:28px 32px;box-shadow:0 6px 30px #0001;max-width:440px;text-align:center}
#qr svg{width:320px;height:320px}#qr{min-height:320px;display:grid;place-items:center}
ol{text-align:left;line-height:1.6;padding-left:20px}.ok{color:#0a7d3b;font-size:22px;font-weight:700}small{color:#667}</style></head>
<body><main><h2>Tautkan WhatsApp ke Dentiva</h2>
<div id="qr">Menyiapkan QR…</div><p id="st"><small>memuat…</small></p>
<ol><li>Buka <b>WhatsApp</b> di HP nomor klinik</li><li><b>⋮ / Setelan → Perangkat tertaut → Tautkan perangkat</b></li><li>Arahkan kamera ke QR di atas</li></ol>
<small>QR berganti otomatis ±20 detik sekali. Halaman ini hanya bisa dibuka lewat terowongan SSH.</small></main>
<script>const t=new URLSearchParams(location.search).get('t');let last='';
async function tick(){try{const r=await fetch('/pair/state?t='+encodeURIComponent(t));const d=await r.json();
const q=document.getElementById('qr'),st=document.getElementById('st');
if(!r.ok){q.textContent='';st.innerHTML='<b>'+(d.error||'Token tidak berlaku')+'</b>';return}
if(d.status==='connected'){q.innerHTML='<div class="ok">✓ Tersambung</div>';st.innerHTML='WhatsApp '+(d.me||'')+' siap dipakai Dentiva. Halaman ini boleh ditutup.';return}
if(d.svg&&d.svg!==last){q.innerHTML=d.svg;last=d.svg}
if(!d.svg){q.textContent='Menunggu QR baru…'}
st.innerHTML='<small>status: '+d.status+'</small>'}catch(e){}setTimeout(tick,2000)}tick()</script></body></html>`

const pairRoutes = {
  '/pair': async () => [200, PAIR_PAGE, 'text/html; charset=utf-8'],
  '/pair/state': async () => {
    if (state.status === 'connected') return [200, { status: state.status, me: state.me ? mask(state.me) : null }]
    const svg = state.status === 'qr' && state.qr ? await QRCode.toString(state.qr, { type: 'svg', margin: 2 }) : null
    return [200, { status: state.status, svg }]
  },
}

const routes = {
  'POST /pair-token': async () => {
    const token = randomBytes(24).toString('hex')
    pairTokens.set(token, Date.now() + 10 * 60_000)
    return [200, { token, expiresInSec: 600 }]
  },

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
    // Minta ulang untuk nomor yang sama → kode yang sama (kode baru membatalkan kode lama di HP).
    if (pairing && pairing.digits === digits && pairing.gen === gen && Date.now() - pairing.at < 120_000) {
      return [200, { code: pairing.code, reused: true, validForSec: Math.round((pairing.at + 150_000 - Date.now()) / 1000) }]
    }
    // Soket segar → waktu penuh ±2,5 menit untuk memasukkan kode.
    const registered = authStore?.state?.creds?.registered === true
    await restartNow({ fresh: !registered })
    for (let i = 0; i < 40 && state.status !== 'qr'; i++) await sleep(500)
    if (!sock || state.status !== 'qr') return [503, { error: 'Sidecar belum siap, coba lagi sebentar' }]
    const code = await sock.requestPairingCode(digits)
    pairing = { code, digits, gen, at: Date.now() }
    log('kode tautan dibuat untuk', mask(digits))
    return [200, { code, validForSec: 150 }]
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
    setStatus('logged_out', { qr: null, me: null })
    pairing = null
    await restartNow({ fresh: true })
    return [200, { ok: true }]
  },
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (req.method === 'GET' && url.pathname === '/health') return reply(res, 200, { ok: true, status: state.status })
  if (req.method === 'GET' && pairRoutes[url.pathname]) {
    if (!pairTokenValid(url.searchParams.get('t'))) return reply(res, 403, { error: 'Token tidak berlaku — buat tautan baru' })
    const [status, body, type] = await pairRoutes[url.pathname]()
    if (type) {
      res.writeHead(status, {
        'content-type': type, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY',
        'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:",
      })
      return res.end(body)
    }
    return reply(res, status, body)
  }
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
