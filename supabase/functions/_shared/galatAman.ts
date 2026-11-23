// Galat aman untuk respons fungsi edge (OWASP A10 / ASVS V16): detail teknis (pesan database, stack, nama tabel)
// hanya ditulis ke log server; pengguna menerima pesan umum + kode rujukan agar operator bisa mencocokkan log.

/** Kode rujukan pendek, mis. "G-7K3Q9X2A". */
export function kodeRujukan(): string {
  const huruf = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const acak = crypto.getRandomValues(new Uint8Array(8));
  return "G-" + Array.from(acak, (b) => huruf[b % huruf.length]).join("");
}

/**
 * Catat galat lengkap ke log server dan kembalikan isi respons yang aman ditampilkan.
 * @param konteks nama fungsi/langkah untuk log, mis. "admin-create-user"
 * @param galat apa pun yang tertangkap
 * @param pesan pesan umum untuk pengguna
 */
export function galatAman(konteks: string, galat: unknown, pesan = "Terjadi kesalahan di server. Silakan coba lagi."): { error: string; kode: string } {
  const kode = kodeRujukan();
  console.error(`[${konteks}] ${kode}`, galat);
  return { error: `${pesan} (kode ${kode})`, kode };
}
