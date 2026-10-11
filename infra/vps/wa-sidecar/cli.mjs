// Alat baris perintah sidecar (dijalankan DI DALAM container):
//   node cli.mjs login              tampilkan QR di terminal sampai tersambung
//   node cli.mjs login 0812xxxxxxx  pakai kode tautan (tanpa scan QR)
//   node cli.mjs pair-link          buat tautan halaman QR (dibuka lewat terowongan SSH)
//   node cli.mjs status | logout
const KEY = process.env.WA_SIDECAR_KEY || ''
const BASE = `http://127.0.0.1:${process.env.PORT || 3000}`
const call = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [cmd, arg] = process.argv.slice(2)

if (cmd === 'pair-link') {
  const { token } = await call('POST', '/pair-token')
  console.log(`http://localhost:3002/pair?t=${token}`)
} else if (cmd === 'status') {
  console.log(await call('GET', '/status'))
} else if (cmd === 'logout') {
  console.log(await call('POST', '/logout'))
} else if (cmd === 'login') {
  let lastQr = null
  let codeShown = false
  let lastCode = null
  for (let i = 0; i < 200; i++) {
    const st = await call('GET', '/status')
    if (st.status === 'connected') {
      console.log(`\n✓ WhatsApp tersambung sebagai ${st.me}. Dentiva siap mengirim pesan.\n`)
      process.exit(0)
    }
    if (arg && codeShown && st.code && st.code !== lastCode) {
      lastCode = st.code
      console.log(`Kode tautan BARU (yang lama tidak berlaku): ${st.code}`)
    }
    if (arg && !codeShown) {
      const r = await call('POST', '/pairing-code', { phone: arg })
      if (r.code) {
        lastCode = r.code
        console.log(`\nKode tautan: ${r.code}   (masukkan dalam ±${r.validForSec ?? 150} detik)\n` +
          'Di HP: WhatsApp → Perangkat tertaut → Tautkan perangkat → "Tautkan dengan nomor telepon saja" → masukkan kode di atas.\n' +
          'Gunakan HANYA kode terakhir yang tampil. Menunggu tersambung…\n')
        codeShown = true
      } else {
        console.log('Gagal membuat kode tautan:', r.error, '— tunggu 1 menit lalu jalankan lagi.')
        process.exit(1)
      }
    } else if (!arg) {
      const { qr } = await call('GET', '/qr?format=terminal')
      if (qr && qr !== lastQr) {
        lastQr = qr
        console.clear()
        console.log('Scan QR ini dari HP yang nomornya dipakai Dentiva:')
        console.log('WhatsApp → ⋮ / Setelan → Perangkat tertaut → Tautkan perangkat\n')
        console.log(qr)
        console.log('(QR berganti otomatis tiap ±20 detik; tunggu sampai muncul "tersambung")')
      }
    }
    await sleep(2000)
  }
  console.log('Waktu habis — jalankan lagi.')
  process.exit(1)
} else {
  console.log('Pakai: node cli.mjs login [nomor] | status | logout')
}
