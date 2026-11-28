import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { barisIdentitas, beriIdentitas, formatRm, identitasPasien, namaSingkat } from './tandaPesan.ts'

Deno.test('namaSingkat: nama depan + inisial, sapaan diabaikan', () => {
  assertEquals(namaSingkat('budi  SANTOSO'), 'Budi S.')
  assertEquals(namaSingkat('Siti'), 'Siti')
  assertEquals(namaSingkat('Ny. Ani Kusuma Dewi'), 'Ani D.')
  assertEquals(namaSingkat("  o'neil  "), "O'neil")
  assertEquals(namaSingkat(''), '')
  assertEquals(namaSingkat(null), '')
})

Deno.test('formatRm', () => {
  assertEquals(formatRm('RM-000123'), 'RM-000123')
  assertEquals(formatRm('rm 000123'), 'RM-000123')
  assertEquals(formatRm('000123'), 'RM-000123')
  assertEquals(formatRm(''), '')
})

Deno.test('barisIdentitas: tanpa emoji, bagian kosong dilewati', () => {
  assertEquals(barisIdentitas({ kode: 'smle', noRm: 'RM-000123', nama: 'Budi Santoso' }), 'SMLE · RM-000123 · Budi S.')
  assertEquals(barisIdentitas({ kode: 'SMLE', noRm: 'RM-000123', nama: '' }), 'SMLE · RM-000123')
  assertEquals(barisIdentitas({ kode: null, noRm: null, nama: 'Budi' }), '')
  assertEquals(/\p{Extended_Pictographic}/u.test(barisIdentitas({ kode: 'SMLE', noRm: '1', nama: 'A B' })), false)
})

Deno.test('beriIdentitas: sekali saja, pesan kosong tidak diubah', () => {
  const b = 'SMLE · RM-000123 · Budi S.'
  assertEquals(beriIdentitas('Halo Budi', b), `${b}\n\nHalo Budi`)
  assertEquals(beriIdentitas(`${b}\n\nHalo Budi`, b), `${b}\n\nHalo Budi`)
  assertEquals(beriIdentitas('Halo', ''), 'Halo')
  assertEquals(beriIdentitas('', b), '')
})

Deno.test('identitasPasien: membaca pasien + kode klinik; galat → kosong', async () => {
  // deno-lint-ignore no-explicit-any
  const db = (row: any, err: any = null) => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: err }) }) }) }),
    rpc: () => Promise.resolve({ data: ['Budi Santoso'], error: null }),
  })
  assertEquals(await identitasPasien(db({ no_rm: 'RM-000123', nama_lengkap: 'Budi Santoso', clinic: { kode_wa: 'SMLE' } }), 'p1'), 'SMLE · RM-000123 · Budi S.')
  assertEquals(await identitasPasien(db(null, { message: 'x' }), 'p1'), '')
  assertEquals(await identitasPasien(db(null), null), '')
})
