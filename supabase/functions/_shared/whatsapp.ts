/**
 * Pengirim WhatsApp Dentiva — satu pintu untuk semua penyedia.
 *
 *   sidecar : layanan Node.js milik Dentiva di VPS (Baileys, nomor ditautkan lewat QR) — TIDAK resmi.
 *             WA_SIDECAR_URL (mis. http://wa-sidecar:3000) + WA_SIDECAR_KEY.
 *   meta    : WhatsApp Cloud API RESMI. META_WA_TOKEN + META_WA_PHONE_NUMBER_ID
 *             (+ META_WA_API_VERSION, bawaan v22.0). Di luar jendela 24 jam sejak pasien terakhir
 *             membalas, Meta hanya mengizinkan template yang sudah disetujui — pengingat memakai
 *             META_WA_TEMPLATE_PENGINGAT (lihat infra/vps/README.md).
 *   whapi   : Whapi.cloud (lama). WHAPI_TOKEN.
 *
 * Pilih lewat WA_PROVIDER; bila kosong dipakai yang pertama terkonfigurasi: sidecar → meta → whapi.
 */
export type WaProviderName = 'sidecar' | 'meta' | 'whapi'

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
}

export interface WaSendResult {
  ok: boolean
  provider: WaProviderName | null
  id?: string
  error?: string
  /** true = gangguan sementara (belum tersambung, batas kirim, jaringan) → boleh dicoba lagi nanti. */
  retryable?: boolean
  detail?: unknown
}

interface Env {
  get(key: string): string | undefined
}

interface Options {
  env?: Env
  fetch?: typeof fetch
}

const PROVIDERS: WaProviderName[] = ['sidecar', 'meta', 'whapi']

/** 08xx → 628xx; hanya digit. */
export function normalizePhone(phone: string): string {
  let d = String(phone ?? '').replace(/[^0-9]/g, '')
  if (d.startsWith('0')) d = '62' + d.slice(1)
  return d
}

export function pickProvider(env: Env = Deno.env): WaProviderName | null {
  const explicit = (env.get('WA_PROVIDER') ?? '').trim().toLowerCase() as WaProviderName
  if (PROVIDERS.includes(explicit)) return explicit
  if (env.get('WA_SIDECAR_URL')) return 'sidecar'
  if (env.get('META_WA_TOKEN') && env.get('META_WA_PHONE_NUMBER_ID')) return 'meta'
  if (env.get('WHAPI_TOKEN')) return 'whapi'
  return null
}

/** Pesan kesalahan konfigurasi, atau null bila penyedia siap dipakai. */
export function configProblem(env: Env = Deno.env): string | null {
  const p = pickProvider(env)
  if (!p) return 'Pengirim WhatsApp belum dikonfigurasi (isi WA_PROVIDER beserta kuncinya)'
  const need: Record<WaProviderName, string[]> = {
    sidecar: ['WA_SIDECAR_URL', 'WA_SIDECAR_KEY'],
    meta: ['META_WA_TOKEN', 'META_WA_PHONE_NUMBER_ID'],
    whapi: ['WHAPI_TOKEN'],
  }
  const missing = need[p].filter((k) => !env.get(k))
  return missing.length ? `WhatsApp (${p}): ${missing.join(', ')} belum diisi` : null
}

/** Template pengingat Meta bila dikonfigurasi (urutan parameter: nama, tanggal, jam, dokter, klinik, telepon). */
export function reminderTemplate(params: string[], env: Env = Deno.env): WaTemplate | undefined {
  const name = env.get('META_WA_TEMPLATE_PENGINGAT')?.trim()
  if (!name) return undefined
  return { name, language: env.get('META_WA_TEMPLATE_LANG')?.trim() || 'id', params }
}

export async function sendWhatsApp(input: WaSendInput, opts: Options = {}): Promise<WaSendResult> {
  const env = opts.env ?? Deno.env
  const f = opts.fetch ?? fetch
  const provider = pickProvider(env)
  const problem = configProblem(env)
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

const temporary = (status: number) => status === 429 || status >= 500

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
  const version = env.get('META_WA_API_VERSION')?.trim() || 'v22.0'
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
    return { ok: false, provider: 'meta', retryable: temporary(res.status), error: data?.error?.message || `Meta HTTP ${res.status}`, detail: data }
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
