import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTo, mask, safeEqual, createSender, cleanText } from './lib.mjs'

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
