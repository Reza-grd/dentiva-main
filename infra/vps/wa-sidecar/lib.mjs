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
export function createSender({ minGapMs = 1500, jitterMs = 1500, perHour = 200, maxQueue = 30, maxWaitMs = 45_000,
                               now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
                               random = Math.random } = {}) {
  let chain = Promise.resolve()
  let last = 0
  let pending = 0
  const sentTimes = []
  return function enqueue(task) {
    // Antrean dibatasi: pemanggil (Edge Function) menyerah setelah 60 dtk, jadi pesan yang menunggu lebih lama dari
    // `maxWaitMs` dibuang SEBELUM dikirim (503 → dicoba lagi pemanggil) — tidak ada pesan "hantu" yang terkirim terlambat.
    if (pending >= maxQueue) {
      return Promise.reject(Object.assign(new Error('Antrean pengiriman penuh — coba lagi nanti'), { status: 503 }))
    }
    pending += 1
    const queuedAt = now()
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
      if (now() - queuedAt > maxWaitMs) {
        throw Object.assign(new Error('Antrean terlalu lama — pesan tidak dikirim, coba lagi'), { status: 503 })
      }
      try {
        return await task()
      } finally {
        last = now()
        sentTimes.push(last)
      }
    }).finally(() => { pending -= 1 })
    chain = run.catch(() => {})
    return run
  }
}

/**
 * Idempotensi dalam memori: kunci yang sama (peristiwa+jenis pesan) tidak dikirim dua kali selama `ttlMs`.
 * Pemanggilan kedua menunggu hasil yang sama (bila masih berjalan) atau mendapat hasil sukses terakhir.
 * Gagal → kunci dilepas agar boleh dicoba lagi. (Hanya melindungi satu proses; outbox persisten tetap disarankan.)
 */
export function createOnce({ ttlMs = 600_000, now = () => Date.now(), max = 2000 } = {}) {
  const seen = new Map() // key → { at, promise }
  return function once(key, fn) {
    if (!key) return fn()
    const t = now()
    for (const [k, v] of seen) if (t - v.at > ttlMs) seen.delete(k)
    const hit = seen.get(key)
    if (hit) return hit.promise.then((r) => ({ ...r, duplicate: true }))
    if (seen.size >= max) seen.delete(seen.keys().next().value)
    const promise = Promise.resolve().then(fn)
    seen.set(key, { at: t, promise })
    promise.catch(() => { if (seen.get(key)?.promise === promise) seen.delete(key) })
    return promise
  }
}

/** Kunci idempotensi dari klien: huruf/angka/:_- maks 120 karakter; selain itu diabaikan. */
export function cleanKey(k) {
  const s = String(k ?? '')
  return /^[A-Za-z0-9:_.-]{1,120}$/.test(s) ? s : null
}

/** Teks pesan: wajib, dibatasi 4096 karakter (batas WhatsApp). */
export function cleanText(text) {
  const t = String(text ?? '').trim()
  return t && t.length <= 4096 ? t : null
}
