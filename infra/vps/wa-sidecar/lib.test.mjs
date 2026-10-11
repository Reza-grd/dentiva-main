import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTo, mask, safeEqual, createSender, createOnce, cleanKey, cleanText } from './lib.mjs'

test('normalizeTo: 08xx → 628xx, format bebas, tolak yang tidak valid', () => {
  assert.equal(normalizeTo('0812-3456-7890'), '6281234567890')
  assert.equal(normalizeTo('+62 812 3456 7890'), '6281234567890')
  assert.equal(normalizeTo('6281234567890'), '6281234567890')
  assert.equal(normalizeTo('123'), null)
  assert.equal(normalizeTo(''), null)
  assert.equal(normalizeTo(null), null)
  assert.equal(normalizeTo('1'.repeat(16)), null)
})

test('mask: nomor tidak pernah utuh di log', () => {
  assert.equal(mask('6281234567890'), '6281****90')
  assert.equal(mask('6281234567890@s.whatsapp.net'), '6281****90')
  assert.equal(mask('6281234567890:12@s.whatsapp.net'), '6281****90')
  assert.equal(mask('123'), '****')
})

test('safeEqual: cocok hanya bila sama persis dan tidak kosong', () => {
  assert.equal(safeEqual('rahasia', 'rahasia'), true)
  assert.equal(safeEqual('rahasia', 'rahasiA'), false)
  assert.equal(safeEqual('', ''), false)
  assert.equal(safeEqual(undefined, undefined), false)
})

test('cleanText: wajib & maks 4096 karakter', () => {
  assert.equal(cleanText('  halo  '), 'halo')
  assert.equal(cleanText('   '), null)
  assert.equal(cleanText('x'.repeat(4097)), null)
})

test('createSender: berurutan, ada jeda antar pesan, batas per jam', async () => {
  let t = 1_000_000
  const waits = []
  const send = createSender({
    minGapMs: 1000, jitterMs: 0, perHour: 3,
    now: () => t, sleep: async (ms) => { waits.push(ms); t += ms }, random: () => 0,
  })
  const order = []
  const r = await Promise.all([1, 2, 3].map((n) => send(async () => { order.push(n); return n })))
  assert.deepEqual(r, [1, 2, 3])
  assert.deepEqual(order, [1, 2, 3])
  assert.deepEqual(waits, [1000, 1000])
  await assert.rejects(send(async () => 4), (e) => e.status === 429)
  t += 3_600_001
  assert.equal(await send(async () => 5), 5)
})

test('createSender: kegagalan satu pesan tidak menghentikan antrean', async () => {
  const send = createSender({ minGapMs: 0, jitterMs: 0, sleep: async () => {} })
  await assert.rejects(send(async () => { throw new Error('gagal') }))
  assert.equal(await send(async () => 'lanjut'), 'lanjut')
})

test('createSender: antrean penuh ditolak (503) dan job kedaluwarsa tidak dikirim', async () => {
  let t = 1_000_000
  const sent = []
  const send = createSender({ minGapMs: 10_000, jitterMs: 0, maxQueue: 3, maxWaitMs: 15_000, now: () => t, sleep: async (ms) => { t += ms }, random: () => 0 })
  const jobs = [1, 2, 3].map((n) => send(async () => { sent.push(n); return n }).catch((e) => e))
  await assert.rejects(send(async () => 4), (e) => e.status === 503) // penuh
  const r = await Promise.all(jobs)
  // job 1 langsung, job 2 menunggu 10 dtk (ok), job 3 menunggu 20 dtk > 15 dtk → dibuang sebelum dikirim
  assert.deepEqual(sent, [1, 2])
  assert.equal(r[2].status, 503)
  // setelah antrean kosong, boleh lagi
  assert.equal(await send(async () => 9), 9)
})

test('createOnce: kunci sama tidak dijalankan dua kali; gagal melepas kunci', async () => {
  let t = 0
  const once = createOnce({ ttlMs: 1000, now: () => t })
  let calls = 0
  const job = async () => { calls += 1; return { ok: true, id: 'a' } }
  const [a, b] = await Promise.all([once('k1', job), once('k1', job)])
  assert.equal(calls, 1)
  assert.equal(a.duplicate, undefined)
  assert.equal(b.duplicate, true)
  t = 2000
  await once('k1', job) // lewat TTL → boleh lagi
  assert.equal(calls, 2)
  await assert.rejects(once('k2', async () => { throw new Error('x') }))
  assert.equal((await once('k2', job)).id, 'a') // kunci dilepas setelah gagal
  assert.equal((await once(null, job)).id, 'a') // tanpa kunci → selalu jalan
})

test('cleanKey: hanya karakter aman', () => {
  assert.equal(cleanKey('receipt:abc-123:uuid'), 'receipt:abc-123:uuid')
  assert.equal(cleanKey('a b'), null)
  assert.equal(cleanKey('x'.repeat(121)), null)
  assert.equal(cleanKey(undefined), null)
})
