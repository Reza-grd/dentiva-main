// ─────────────────────────────────────────────────────────────────────────────
//  Sidecar WhatsApp Dentiva — mode TIDAK RESMI: WhatsApp Web ASLI (whatsapp-web.js + Chromium
//  headless) di VPS. Nomor ditautkan lewat QR / kode tautan seperti WhatsApp Web biasa.
//  Dipakai sambil menunggu WhatsApp Cloud API resmi (Meta) disetujui.
//
//  - Hanya bisa diakses dari jaringan internal Docker + 127.0.0.1:3002 (halaman QR lewat terowongan SSH).
//    Edge function memanggil http://wa-sidecar:3000 dengan header x-api-key.
//  - Sesi WhatsApp Web (profil Chromium) di /data/wwebjs (volume, izin 700). Seperti WhatsApp Web di
//    komputer mana pun, profil itu memuat riwayat chat nomor tsb — volume ini setara data rahasia.
//  - Isi pesan & nomor pasien TIDAK dicatat di log (nomor disamarkan). Pesan tidak ditandai "dibaca".
//  - Kirim berurutan dengan jeda acak & batas per jam untuk mengurangi risiko nomor diblokir.
//
//  API (semua kecuali /health dan /pair wajib x-api-key):
//    GET  /health                 → { ok, status }
//    GET  /status                 → { status, me, since, lastError, code }
//    GET  /qr[?format=terminal]   → { status, qr }
//    POST /pair-token             → { token } halaman QR sekali pakai, berlaku 10 menit
//    GET  /pair?t=TOKEN           → halaman QR (SVG, diperbarui otomatis)
//    POST /pairing-code {phone}   → { code }   (alternatif QR: "Tautkan dengan nomor telepon")
//    POST /send {to, text}        → { ok, id }
//    POST /logout                 → { ok }
// ─────────────────────────────────────────────────────────────────────────────
import http from 'node:http'
import { rm, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import wweb from 'whatsapp-web.js'
import QRCode from 'qrcode'
import { normalizeTo, mask, safeEqual, createSender, cleanText } from './lib.mjs'

const { Client, LocalAuth } = wweb
const PORT = Number(process.env.PORT || 3000)
const DATA_DIR = process.env.WWEB_DIR || '/data/wwebjs'
const API_KEY = process.env.WA_SIDECAR_KEY || ''
if (API_KEY.length < 32) {
  console.error('WA_SIDECAR_KEY belum diisi (minimal 32 karakter) — sidecar tidak dijalankan.')
  process.exit(1)
}

const log = (...a) => console.log(new Date().toISOString(), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const send = createSender({
  minGapMs: Number(process.env.WA_MIN_GAP_MS || 1500),
  jitterMs: Number(process.env.WA_JITTER_MS || 1500),
  perHour: Number(process.env.WA_PER_HOUR || 200),
})

const state = { status: 'starting', qr: null, code: null, me: null, since: new Date().toISOString(), lastError: null }
let client = null
let gen = 0 // generasi klien; event dari klien lama diabaikan
let retry = 0
let pairing = null // { digits, gen } — mode kode tautan aktif
let readyWatchdog = null

function setStatus(status, extra = {}) {
  Object.assign(state, { status, since: new Date().toISOString() }, extra)
}

// Struktur QR untuk log diagnosis — TANPA isi kunci: awalan, jumlah bagian, panjang.
const qrShape = (q) => {
  if (!q) return 'kosong'
  const i = q.indexOf('#')
  const body = i >= 0 ? q.slice(i + 1) : q
  return `${i >= 0 ? q.slice(0, i) : 'tanpa-awalan'} | ${body.split(',').length} bagian | ${q.length} karakter`
}

// whatsapp-web.js menyusun QR format LAMA (ref,noise,identitas,adv,platform) — WhatsApp sekarang
// menggambar format BARU dengan awalan tautan berikut (terbukti 11 Okt: kelima bagian identik,
// hanya awalan yang berbeda). QR format lama terbaca HP tetapi penautannya ditolak.
const QR_PREFIX = 'https://wa.me/settings/linked_devices#'
const qrBaru = (q) => (q && !q.includes('#') ? QR_PREFIX + q : q)

// QR persis seperti yang DIGAMBAR WhatsApp Web (atribut data-ref di halaman), bukan susunan ulang wwebjs.
async function readDomQr(c) {
  try {
    return await c.pupPage?.evaluate(() => document.querySelector('[data-ref]')?.getAttribute('data-ref') || null)
  } catch {
    return null
  }
}

// Chromium berjalan sebagai browser BIASA (bukan headless) di layar virtual Xvfb (lihat Dockerfile),
// dan user-agent TIDAK ditimpa: UA, Client Hints (brands) & sidik lain asli Chrome desktop Linux.
// (Headless memperkenalkan diri sebagai "HeadlessChrome"; UA tiruan mengosongkan brands.)
const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
const HEADLESS = process.env.WA_HEADLESS === 'true' || !process.env.DISPLAY

function makeClient(pairDigits) {
  return new Client({
    authStrategy: new LocalAuth({ dataPath: DATA_DIR, clientId: 'dentiva' }),
    puppeteer: {
      headless: HEADLESS,
      executablePath: CHROMIUM,
      // Tanpa penanda otomasi (navigator.webdriver / --enable-automation).
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
             '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio',
             '--disable-blink-features=AutomationControlled', '--lang=id-ID,id', '--window-size=1280,800'],
    },
    // Cache versi WhatsApp Web harus di lokasi yang bisa ditulis user `node` (bawaan ./.wwebjs_cache
    // di /app milik root → EACCES diam-diam setelah "authenticated" sehingga "ready" tak pernah datang).
    webVersionCache: { type: 'local', path: path.join(path.dirname(DATA_DIR), 'wwebjs-cache') },
    authTimeoutMs: 120_000,
    takeoverOnConflict: true, // bila WhatsApp Web dibuka di tempat lain, Dentiva mengambil alih kembali
    takeoverTimeoutMs: 15_000,
    userAgent: false, // jangan timpa — pakai UA asli Chromium
    ...(pairDigits ? { pairWithPhoneNumber: { phoneNumber: pairDigits, showNotification: true, intervalMs: 180_000 } } : {}),
  })
}

async function start({ fresh = false, pairDigits = null } = {}) {
  const myGen = ++gen
  clearTimeout(readyWatchdog)
  const old = client
  client = null
  if (old) await old.destroy().catch(() => {})
  if (fresh) await rm(DATA_DIR, { recursive: true, force: true })
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 })
  // Kunci profil Chromium dari container/proses sebelumnya (SingletonLock menyimpan hostname-pid)
  // membuat Chromium menolak start ("profile appears to be in use by another Chromium process").
  // Di container ini hanya ada satu Chromium dan klien lama sudah dimatikan → aman dihapus.
  for (const f of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    await rm(path.join(DATA_DIR, 'session-dentiva', f), { force: true }).catch(() => {})
  }
  setStatus('starting', { qr: null, code: null })

  const c = makeClient(pairDigits)
  client = c
  const mine = (fn) => (...args) => { if (myGen === gen) return fn(...args) }

  let qrPoll = null
  let compared = false
  let consoleHooked = false
  const stopQrPoll = () => { clearInterval(qrPoll); qrPoll = null }
  c.on('qr', mine(async (qr) => {
    setStatus('qr', { qr: qrBaru(qr) })
    log('menunggu scan QR')
    if (!consoleHooked && c.pupPage) {
      consoleHooked = true
      c.pupPage.evaluate(() => ({
        webdriver: navigator.webdriver, ua: navigator.userAgent.replace(/\s+Safari.*$/, ''),
        brands: (navigator.userAgentData?.brands || []).map((b) => b.brand + ' ' + b.version).join(' / '),
      })).then((f) => log('sidik browser:', JSON.stringify(f))).catch(() => {})
      // Pesan galat WhatsApp Web selama penautan (belum ada data chat pada tahap ini).
      c.pupPage.on('console', (m) => {
        if (myGen !== gen || state.status === 'connected') return
        const t = m.text()
        if (m.type() === 'error' || /pair|link|companion|adv|device|logout|ban/i.test(t)) log('[waweb]', m.type(), t.slice(0, 200))
      })
    }
    if (qrPoll) return
    // Selama menunggu scan: tampilkan QR asli dari halaman WhatsApp Web, bukan susunan wwebjs.
    qrPoll = setInterval(mine(async () => {
      if (state.status !== 'qr') return stopQrPoll()
      const dom = await readDomQr(c)
      if (!dom) return
      if (!compared) {
        compared = true
        log('QR asli WA Web:', qrShape(dom), '| QR tampil:', qrShape(state.qr), dom === state.qr ? '(sama)' : '(BERBEDA — dipakai yang asli)')
      }
      if (dom !== state.qr) setStatus('qr', { qr: dom })
    }), 1500)
  }))
  c.on('code', mine((code) => { setStatus('pairing_code', { code, qr: null }); log('kode tautan siap') }))
  c.on('authenticated', mine(() => {
    stopQrPoll()
    setStatus('authenticating', { qr: null, code: null })
    log('penautan diterima, memuat WhatsApp Web…')
    // Kadang "ready" tidak pernah datang setelah "authenticated" (isu wwebjs) → muat ulang.
    readyWatchdog = setTimeout(mine(() => {
      if (state.status === 'authenticating') { log('ready tidak datang dalam 120 dtk — muat ulang'); restartLater(1_000) }
    }), 120_000)
  }))
  c.on('ready', mine(() => {
    clearTimeout(readyWatchdog)
    retry = 0
    pairing = null
    setStatus('connected', { qr: null, code: null, me: c.info?.wid?.user ?? null, lastError: null })
    log('tersambung sebagai', mask(state.me))
  }))
  c.on('auth_failure', mine((msg) => {
    state.lastError = `penautan gagal: ${msg}`
    log(state.lastError, '— sesi dihapus')
    restartLater(3_000, { fresh: true })
  }))
  c.on('disconnected', mine((reason) => {
    state.lastError = `terputus (${reason})`
    const loggedOut = ['LOGOUT', 'UNPAIRED', 'UNPAIRED_IDLE'].includes(String(reason))
    log(state.lastError, loggedOut ? '— dikeluarkan dari HP, sesi dihapus' : '— sambung ulang')
    restartLater(loggedOut ? 3_000 : undefined, { fresh: loggedOut })
  }))
  c.on('change_state', mine((s) => log('status WhatsApp Web:', s)))

  try {
    await c.initialize()
  } catch (err) {
    if (myGen !== gen) return
    state.lastError = String(err?.message || err).slice(0, 200)
    log('gagal memulai WhatsApp Web:', state.lastError)
    restartLater()
  }
}

function restartLater(delayMs, opts) {
  const wait = delayMs ?? Math.min(120_000, 5_000 * 2 ** Math.min(retry++, 5))
  const at = gen
  setTimeout(() => { if (at === gen) start(opts).catch((e) => log('restart gagal:', e?.message)) }, wait)
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

// Token halaman QR: dibuat lewat API ber-kunci, berlaku 10 menit.
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
ol{text-align:left;line-height:1.6;padding-left:20px}.ok{color:#0a7d3b;font-size:22px;font-weight:700}small{color:#667}
.code{font:700 34px ui-monospace,monospace;letter-spacing:4px}</style></head>
<body><main><h2>Tautkan WhatsApp ke Dentiva</h2>
<div id="qr">Menyiapkan WhatsApp Web…</div><p id="st"><small>memuat…</small></p>
<ol><li>Buka <b>WhatsApp</b> di HP nomor klinik</li><li><b>⋮ / Setelan → Perangkat tertaut → Tautkan perangkat</b></li><li>Scan QR di atas <b>dari layar itu</b> (bukan kamera biasa)</li></ol>
<small>QR berganti otomatis. Halaman ini hanya bisa dibuka lewat terowongan SSH.</small></main>
<script>const t=new URLSearchParams(location.search).get('t');let last='';
async function tick(){try{const r=await fetch('/pair/state?t='+encodeURIComponent(t));const d=await r.json();
const q=document.getElementById('qr'),st=document.getElementById('st');
if(!r.ok){q.textContent='';st.innerHTML='<b>'+(d.error||'Token tidak berlaku')+'</b>';return}
if(d.status==='connected'){q.innerHTML='<div class="ok">✓ Tersambung</div>';st.innerHTML='WhatsApp '+(d.me||'')+' siap dipakai Dentiva. Halaman ini boleh ditutup.';return}
if(d.code){q.innerHTML='<div><div>Kode tautan</div><div class="code">'+d.code+'</div></div>';last=''}
else if(d.svg&&d.svg!==last){q.innerHTML=d.svg;last=d.svg}
else if(!d.svg){q.textContent=d.status==='authenticating'?'Penautan diterima, memuat…':'Menunggu QR…'}
st.innerHTML='<small>status: '+d.status+'</small>'}catch(e){}setTimeout(tick,2000)}tick()</script></body></html>`

const pairRoutes = {
  '/pair': async () => [200, PAIR_PAGE, 'text/html; charset=utf-8'],
  '/pair/state': async () => {
    if (state.status === 'connected') return [200, { status: state.status, me: state.me ? mask(state.me) : null }]
    if (state.status === 'pairing_code') return [200, { status: state.status, code: state.code }]
    const svg = state.status === 'qr' && state.qr ? await QRCode.toString(state.qr, { type: 'svg', margin: 2 }) : null
    return [200, { status: state.status, svg }]
  },
}

const routes = {
  'GET /status': async () => [200, {
    status: state.status, me: state.me ? mask(state.me) : null, since: state.since, lastError: state.lastError,
    code: state.status === 'pairing_code' ? state.code : null,
  }],

  'GET /qr': async (req, url) => {
    if (state.status !== 'qr' || !state.qr) return [200, { status: state.status, qr: null }]
    const qr = url.searchParams.get('format') === 'terminal'
      ? await QRCode.toString(state.qr, { type: 'terminal', small: true })
      : state.qr
    return [200, { status: state.status, qr }]
  },

  'POST /pair-token': async () => {
    const token = randomBytes(24).toString('hex')
    pairTokens.set(token, Date.now() + 10 * 60_000)
    return [200, { token, expiresInSec: 600 }]
  },

  'POST /pairing-code': async (req) => {
    const { phone } = await readJson(req)
    const digits = normalizeTo(phone)
    if (!digits) return [400, { error: 'Nomor tidak valid' }]
    if (state.status === 'connected') return [409, { error: 'Sudah tersambung' }]
    // Nomor sama & masih aktif → kode yang sedang berlaku (kode baru membatalkan kode lama di HP).
    if (pairing && pairing.digits === digits && pairing.gen === gen && state.code) {
      return [200, { code: state.code, reused: true }]
    }
    pairing = { digits, gen: gen + 1 }
    start({ fresh: true, pairDigits: digits }).catch((e) => log('gagal memulai:', e?.message))
    for (let i = 0; i < 180 && !state.code; i++) await sleep(500)
    if (!state.code) return [503, { error: 'WhatsApp Web belum memberi kode — coba lagi sebentar' }]
    log('kode tautan dibuat untuk', mask(digits))
    return [200, { code: state.code, validForSec: 180 }]
  },

  'POST /send': async (req) => {
    const body = await readJson(req)
    const to = normalizeTo(body.to)
    const text = cleanText(body.text)
    if (!to) return [400, { ok: false, error: 'Nomor tujuan tidak valid' }]
    if (!text) return [400, { ok: false, error: 'Isi pesan kosong atau terlalu panjang' }]
    if (state.status !== 'connected' || !client) return [503, { ok: false, error: `WhatsApp belum tersambung (status: ${state.status})` }]
    const c = client
    const id = await send(async () => {
      const wid = await c.getNumberId(to)
      if (!wid) throw Object.assign(new Error('Nomor tidak terdaftar di WhatsApp'), { status: 422 })
      const chatId = wid._serialized || (wid.user && wid.server ? `${wid.user}@${wid.server}` : `${to}@c.us`)
      const msg = await c.sendMessage(chatId, text, { linkPreview: false, sendSeen: false })
      return msg?.id?.id ?? null
    })
    log('terkirim ke', mask(to))
    return [200, { ok: true, id }]
  },

  'POST /logout': async () => {
    if (client && state.status === 'connected') await client.logout().catch(() => {})
    pairing = null
    await start({ fresh: true })
    return [200, { ok: true }]
  },
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (req.method === 'GET' && url.pathname === '/health') {
    // Tidak sehat bila macet memulai/menyambung > 3 menit (mis. Chromium gagal start) — terlihat di Docker.
    const macet = ['starting', 'reconnecting'].includes(state.status) && Date.now() - Date.parse(state.since) > 180_000
    return reply(res, macet ? 503 : 200, { ok: !macet, status: state.status, since: state.since, lastError: macet ? state.lastError?.slice(0, 160) : null })
  }
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
    if (status >= 500) log('galat', req.method, url.pathname, String(err?.message || err).slice(0, 200))
    reply(res, status, { ok: false, error: String(err?.message || 'Galat internal').slice(0, 300) })
  }
})

// Galat async yang tertelan (mis. di dalam fungsi yang di-expose ke halaman) tetap tercatat.
process.on('unhandledRejection', (e) => log('galat async:', String(e?.message || e).slice(0, 300)))

server.listen(PORT, '0.0.0.0', () => log(`sidecar WhatsApp Dentiva (WhatsApp Web, ${HEADLESS ? 'headless' : 'layar virtual ' + process.env.DISPLAY}) siap di :${PORT}`))
start().catch((e) => log('gagal memulai:', e?.message))

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    log('berhenti')
    server.close()
    gen++
    await client?.destroy().catch(() => {})
    process.exit(0)
  })
}
