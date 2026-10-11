// Fungsi murni sidecar WhatsApp Dentiva (diuji di lib.test.mjs).
import { timingSafeEqual, createHash } from 'node:crypto'

/** Nomor → digit internasional (08xx → 628xx). null bila tidak valid. */
export function normalizeTo(raw) {
  let d = String(raw ?? '').replace(/[^0-9]/g, '')
  if (d.startsWith('0')) d = '62' + d.slice(1)
  return d.length >= 9 && d.length <= 15 ? d : null
}

/** 6281234567890 → 6281****90 (untuk log; nomor pasien tidak pernah dicatat utuh). */
export function mask(digits) {
  const d = String(digits ?? '').split('@')[0].split(':')[0]
  return d.length > 6 ? `${d.slice(0, 4)}****${d.slice(-2)}` : '****'
}

/** Bandingkan kunci API tanpa bocor lewat waktu eksekusi. */
export function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a ?? '')).digest()
  const hb = createHash('sha256').update(String(b ?? '')).digest()
  return timingSafeEqual(ha, hb) && String(a ?? '').length > 0
}

/**
 * Antrean kirim berurutan dengan jeda acak (meniru ketikan manusia, mengurangi risiko blokir)
 * dan batas per jam. `now`/`sleep`/`random` bisa diganti untuk pengujian.
 */
export function createSender({ minGapMs = 1500, jitterMs = 1500, perHour = 200,
                               now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
                               random = Math.random } = {}) {
  let chain = Promise.resolve()
  let last = 0
  const sentTimes = []
  return function enqueue(task) {
    const run = chain.then(async () => {
      const t = now()
      while (sentTimes.length && t - sentTimes[0] > 3_600_000) sentTimes.shift()
      if (sentTimes.length >= perHour) {
        const err = new Error(`Batas ${perHour} pesan/jam tercapai — coba lagi nanti`)
        err.status = 429
        throw err
      }
      const wait = last ? Math.max(0, last + minGapMs + Math.floor(random() * jitterMs) - t) : 0
      if (wait) await sleep(wait)
      try {
        return await task()
      } finally {
        last = now()
        sentTimes.push(last)
      }
    })
    chain = run.catch(() => {})
    return run
  }
}

/** Teks pesan: wajib, dibatasi 4096 karakter (batas WhatsApp). */
export function cleanText(text) {
  const t = String(text ?? '').trim()
  return t && t.length <= 4096 ? t : null
}
