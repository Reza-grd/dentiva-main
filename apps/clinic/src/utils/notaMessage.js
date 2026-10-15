/**
 * Menyusun pesan untuk Denti Agen dari hasil pindai nota (draf AI), supaya Denti memeriksa duplikat lalu menyiapkan
 * usulan pengeluaran + stok masuk. Dibatasi ≤ 1000 karakter (batas pertanyaan di server).
 */
const MAX = 1000;
const rp = (n) => `Rp ${Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

export function notaMessage(d) {
  const head = [
    'Saya pindai nota.',
    d.pemasok && `Pemasok: ${clean(d.pemasok, 60)}.`,
    d.tanggal && `Tanggal: ${d.tanggal}.`,
    d.nomor_nota && `Nomor nota: ${clean(d.nomor_nota, 40)}.`,
    d.total > 0 && `Total ${rp(d.total)}.`,
  ].filter(Boolean).join(' ');
  const tail = 'Tolong periksa dulu apakah nota ini sudah tercatat, lalu siapkan usulan: catat sebagai pengeluaran dan, bila barangnya bahan klinik, masukkan ke stok. Tanyakan bila ada yang meragukan.';
  const items = Array.isArray(d.items) ? d.items : [];
  let list = '';
  let used = 0;
  for (const it of items) {
    const piece = `${clean(it.nama, 60)}${it.jumlah ? ` ×${it.jumlah}` : ''}${it.harga ? ` (${rp(it.harga)})` : ''}`;
    if (head.length + tail.length + list.length + piece.length + 40 > MAX) break;
    list += `${list ? '; ' : ''}${piece}`;
    used += 1;
  }
  const more = items.length > used ? ` …dan ${items.length - used} barang lain (tidak semua tercantum di sini; tanyakan bila perlu).` : '';
  const body = list ? ` Barang: ${list}.${more}` : '';
  return `${head}${body} ${tail}`.slice(0, MAX);
}
