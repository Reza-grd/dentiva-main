/**
 * Pengirim WhatsApp Dentiva — satu pintu untuk semua penyedia.
 *
 *   sidecar : layanan Node.js milik Dentiva di VPS (whatsapp-web.js, nomor ditautkan lewat QR) — TIDAK resmi.
 *             WA_SIDECAR_URL (mis. http://wa-sidecar:3000) + WA_SIDECAR_KEY.
 *   meta    : WhatsApp Cloud API RESMI. META_WA_TOKEN + META_WA_PHONE_NUMBER_ID
 *             (+ META_WA_API_VERSION, bawaan v26.0). Di luar jendela 24 jam sejak pasien terakhir
 *             membalas, Meta hanya mengizinkan template yang sudah disetujui — pengingat memakai
 *             META_WA_TEMPLATE_PENGINGAT (lihat docs/whatsapp-cloud-api.md).
 *   whapi   : Whapi.cloud (lama). WHAPI_TOKEN.
 *
 * Pilih lewat WA_PROVIDER; bila kosong dipakai yang pertama terkonfigurasi: sidecar → meta → whapi.
 * Per jenis pesan bisa ditimpa: WA_PROVIDER_REMINDER, WA_PROVIDER_RECEIPT, WA_PROVIDER_EDUCATION, WA_PROVIDER_MANUAL
 * (mis. pengingat lewat Meta, struk & edukasi tetap lewat sidecar sampai template-nya disetujui).
 */
export type WaProviderName = 'sidecar' | 'meta' | 'whapi'
/** Jenis pesan — menentukan penyedia (WA_PROVIDER_<JENIS>) dan syarat template Meta. */
export type WaKind = 'reminder' | 'receipt' | 'education' | 'manual'

export interface WaTemplate {
  name: string
  language: string
  params: string[]
}

export interface WaSendInput {
  to: string
  text: string
  /** Hanya dipakai penyedia `meta` (penyedia lain mengirim `text`). */
  template?: WaTemplate
  /** Kunci peristiwa+jenis pesan: sidecar tidak mengirim dua kali untuk kunci yang sama. */
  idempotencyKey?: string
  /** Jenis pesan; tanpa jenis dipakai WA_PROVIDER. */
  kind?: WaKind
}

export interface WaSendResult {
  ok: boolean
  provider: WaProviderName | null
  id?: string
  error?: string
  /** true = gangguan sementara (belum tersambung, batas kirim, jaringan) → boleh dicoba lagi nanti. */
  retryable?: boolean
  /** Kode galat Meta (mis. 131047 = di luar jendela 24 jam). */
  errorCode?: number
  detail?: unknown
}

interface Env {
  get(key: string): string | undefined
}

interface Options {
  env?: Env
  fetch?: typeof fetch
  /** Paksa penyedia tertentu (mis. balasan otomatis webhook Meta harus lewat Meta). */
  provider?: WaProviderName
}

const PROVIDERS: WaProviderName[] = ['sidecar', 'meta', 'whapi']

/** 08xx → 628xx; hanya digit. */
export function normalizePhone(phone: string): string {
  let d = String(phone ?? '').replace(/[^0-9]/g, '')
  if (d.startsWith('0')) d = '62' + d.slice(1)
  return d
}

export function pickProvider(env: Env = Deno.env, kind?: WaKind): WaProviderName | null {
  const perKind = (kind ? env.get(`WA_PROVIDER_${kind.toUpperCase()}`) ?? '' : '').trim().toLowerCase() as WaProviderName
  if (PROVIDERS.includes(perKind)) return perKind
  const explicit = (env.get('WA_PROVIDER') ?? '').trim().toLowerCase() as WaProviderName
  if (PROVIDERS.includes(explicit)) return explicit
  if (env.get('WA_SIDECAR_URL')) return 'sidecar'
  if (env.get('META_WA_TOKEN') && env.get('META_WA_PHONE_NUMBER_ID')) return 'meta'
  if (env.get('WHAPI_TOKEN')) return 'whapi'
  return null
}

/** Pesan kesalahan konfigurasi, atau null bila penyedia siap dipakai. */
export function configProblem(env: Env = Deno.env, kind?: WaKind, forced?: WaProviderName): string | null {
  const p = forced ?? pickProvider(env, kind)
  if (!p) return 'Pengirim WhatsApp belum dikonfigurasi (isi WA_PROVIDER beserta kuncinya)'
  const need: Record<WaProviderName, string[]> = {
    sidecar: ['WA_SIDECAR_URL', 'WA_SIDECAR_KEY'],
    meta: ['META_WA_TOKEN', 'META_WA_PHONE_NUMBER_ID'],
    whapi: ['WHAPI_TOKEN'],
  }
  const missing = need[p].filter((k) => !env.get(k))
  if (missing.length) return `WhatsApp (${p}): ${missing.join(', ')} belum diisi`
  // Meta menolak teks bebas di luar jendela 24 jam: pesan yang dimulai klinik wajib template yang disetujui.
  if (p === 'meta' && kind === 'reminder' && !env.get('META_WA_TEMPLATE_PENGINGAT')?.trim()) {
    return 'WhatsApp (meta): pengingat butuh template yang disetujui — isi META_WA_TEMPLATE_PENGINGAT'
  }
  if (p === 'meta' && (kind === 'receipt' || kind === 'education')) {
    return `WhatsApp (meta): ${kind === 'receipt' ? 'struk' : 'edukasi'} belum punya template Meta — atur WA_PROVIDER_${kind.toUpperCase()}=sidecar`
  }
  return null
}

/** Template pengingat Meta bila dikonfigurasi (urutan parameter: nama, tanggal, jam, dokter, klinik, telepon). */
export function reminderTemplate(params: string[], env: Env = Deno.env): WaTemplate | undefined {
  const name = env.get('META_WA_TEMPLATE_PENGINGAT')?.trim()
  if (!name) return undefined
  return { name, language: env.get('META_WA_TEMPLATE_LANG')?.trim() || 'id', params }
}

/**
 * Sidik nomor penerima (HMAC-SHA256) — mencocokkan balasan pasien di webhook dengan pesan yang pernah dikirim
 * tanpa menyimpan nomornya. Kunci: WA_HASH_KEY, cadangan SUPABASE_SERVICE_ROLE_KEY.
 */
export async function recipientHash(phone: string, env: Env = Deno.env): Promise<string | null> {
  const to = normalizePhone(phone)
  const secret = env.get('WA_HASH_KEY') || env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!to || !secret) return null
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(to))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Kolom notification_logs untuk pesan yang berhasil dikirim: penyedia, ID pesan penyedia (dicocokkan dengan
 * status dari webhook Meta) dan sidik nomor penerima.
 */
export async function sentLogFields(r: WaSendResult, phone: string, env: Env = Deno.env) {
  return {
    provider: r.provider,
    provider_message_id: r.id ?? null,
    recipient_hash: await recipientHash(phone, env),
    delivery_status: r.provider === 'meta' ? 'accepted' : null,
  }
}

// Kode galat Meta yang umum → [boleh dicoba lagi nanti, keterangan untuk staf].
// https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
const META_ERRORS: Record<number, [boolean, string]> = {
  1: [true, 'Layanan Meta sedang bermasalah'],
  2: [true, 'Layanan Meta sedang bermasalah'],
  4: [true, 'Batas panggilan API Meta tercapai'],
  80007: [true, 'Batas kirim akun WhatsApp tercapai'],
  130429: [true, 'Batas kecepatan kirim tercapai'],
  131000: [true, 'Galat sementara di Meta'],
  131016: [true, 'Layanan WhatsApp sedang tidak tersedia'],
  131056: [true, 'Terlalu banyak pesan ke nomor yang sama dalam waktu singkat'],
  133004: [true, 'Server WhatsApp sementara tidak tersedia'],
  10: [false, 'Izin token Meta tidak cukup'],
  100: [false, 'Parameter permintaan tidak valid'],
  190: [false, 'Token Meta kedaluwarsa atau dicabut'],
  200: [false, 'Izin token Meta tidak cukup'],
  368: [false, 'Akun diblokir sementara oleh Meta karena pelanggaran kebijakan'],
  131026: [false, 'Pesan tidak dapat dikirim ke nomor ini (bukan pengguna WhatsApp atau aplikasinya terlalu lama)'],
  131030: [false, 'Nomor penerima belum ada di daftar uji Meta'],
  131031: [false, 'Akun WhatsApp Business terkunci'],
  131042: [false, 'Masalah pembayaran akun WhatsApp Business'],
  131047: [false, 'Di luar jendela 24 jam — pesan harus memakai template yang disetujui'],
  131049: [false, 'Meta memutuskan tidak mengirim pesan ini'],
  131051: [false, 'Jenis pesan tidak didukung'],
  132000: [false, 'Jumlah parameter template tidak cocok'],
  132001: [false, 'Template tidak ada atau belum disetujui untuk bahasa ini'],
  132005: [false, 'Teks template terlalu panjang'],
  132007: [false, 'Isi template melanggar kebijakan Meta'],
  132012: [false, 'Format parameter template tidak cocok'],
  132015: [false, 'Template dijeda karena kualitas rendah'],
  132016: [false, 'Template dinonaktifkan'],
  133010: [false, 'Nomor pengirim belum terdaftar di Cloud API'],
}

/** Tafsir galat Graph API. Kode tak dikenal: HTTP 429/5xx dianggap sementara. */
export function metaErrorInfo(code: number | undefined, status: number, fallback: string): { retryable: boolean; message: string } {
  const known = code !== undefined ? META_ERRORS[code] : undefined
  if (known) return { retryable: known[0], message: `${known[1]} (Meta ${code})` }
  return { retryable: temporary(status), message: code !== undefined ? `${fallback} (Meta ${code})` : fallback }
}

export async function sendWhatsApp(input: WaSendInput, opts: Options = {}): Promise<WaSendResult> {
  const env = opts.env ?? Deno.env
  const f = opts.fetch ?? fetch
  const provider = opts.provider ?? pickProvider(env, input.kind)
  const problem = configProblem(env, input.kind, opts.provider)
  if (problem) return { ok: false, provider, error: problem }

  const to = normalizePhone(input.to)
  if (to.length < 9 || to.length > 15) return { ok: false, provider, error: 'Nomor WhatsApp tidak valid' }
  if (!input.text?.trim() && !(provider === 'meta' && input.template)) {
    return { ok: false, provider, error: 'Isi pesan kosong' }
  }

  try {
    if (provider === 'sidecar') return await viaSidecar(f, env, to, input.text, input.idempotencyKey)
    if (provider === 'meta') return await viaMeta(f, env, to, input)
    return await viaWhapi(f, env, to, input.text)
  } catch (e) {
    return { ok: false, provider, retryable: true, error: `Jaringan ke penyedia WhatsApp gagal: ${(e as Error).message}` }
  }
}

function temporary(status: number) {
  return status === 429 || status >= 500
}

async function readJson(res: Response): Promise<any> {
  const raw = await res.text()
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    return { raw: raw.slice(0, 300) }
  }
}

async function viaSidecar(f: typeof fetch, env: Env, to: string, text: string, key?: string): Promise<WaSendResult> {
  const base = env.get('WA_SIDECAR_URL')!.replace(/\/+$/, '')
  const res = await f(`${base}/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.get('WA_SIDECAR_KEY')! },
    body: JSON.stringify({ to, text, key }),
    signal: AbortSignal.timeout(60_000),
  })
  const data = await readJson(res)
  if (!res.ok || data.ok !== true) {
    return { ok: false, provider: 'sidecar', retryable: temporary(res.status), error: data.error || `Sidecar HTTP ${res.status}`, detail: data }
  }
  return { ok: true, provider: 'sidecar', id: data.id ?? undefined, detail: data }
}

async function viaMeta(f: typeof fetch, env: Env, to: string, input: WaSendInput): Promise<WaSendResult> {
  const version = env.get('META_WA_API_VERSION')?.trim() || 'v26.0'
  const phoneId = env.get('META_WA_PHONE_NUMBER_ID')!
  const t = input.template
  const body = t
    ? {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: t.name,
        language: { code: t.language },
        ...(t.params.length
          ? { components: [{ type: 'body', parameters: t.params.map((text) => ({ type: 'text', text: text || '-' })) }] }
          : {}),
      },
    }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body: input.text, preview_url: false } }

  const res = await f(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.get('META_WA_TOKEN')}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  const data = await readJson(res)
  const id = data?.messages?.[0]?.id
  if (!res.ok || !id) {
    const code = typeof data?.error?.code === 'number' ? data.error.code : undefined
    const info = metaErrorInfo(code, res.status, data?.error?.message || `Meta HTTP ${res.status}`)
    return { ok: false, provider: 'meta', retryable: info.retryable, error: info.message, errorCode: code, detail: data }
  }
  return { ok: true, provider: 'meta', id, detail: data }
}

async function viaWhapi(f: typeof fetch, env: Env, to: string, text: string): Promise<WaSendResult> {
  const res = await f('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.get('WHAPI_TOKEN')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ to: `${to}@s.whatsapp.net`, body: text }),
    signal: AbortSignal.timeout(30_000),
  })
  const data = await readJson(res)
  if (!res.ok || data.error) {
    return { ok: false, provider: 'whapi', retryable: temporary(res.status), error: data.message || data.error || `Whapi HTTP ${res.status}`, detail: data }
  }
  return { ok: true, provider: 'whapi', id: data?.message?.id ?? data?.id, detail: data }
}
