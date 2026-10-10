// ─────────────────────────────────────────────
//  Denti di layar antrean — aturan keadaan (murni, mudah dites).
//  Data yang dipakai hanya yang dikirim get_queue_display: nomor, status,
//  jam, jam praktik hari ini, dan penanda `kid` (boolean, bukan tanggal lahir).
// ─────────────────────────────────────────────

/** Tips bergilir saat antrean senggang: aksi Denti + teks bar bawah. */
export const DENTI_TIPS = [
  { state: 'brush', text: 'Sikat gigi dua kali sehari: pagi setelah sarapan dan malam sebelum tidur.' },
  { state: 'tooth', text: 'Periksakan gigi setiap enam bulan agar masalah kecil tidak menjadi besar.' },
  { state: 'talk', text: 'Bersihkan sela gigi dengan benang gigi — sikat saja tidak menjangkau semuanya.' },
  { state: 'brush', text: 'Ganti sikat gigi setiap tiga bulan, atau lebih cepat bila bulunya sudah mekar.' },
  { state: 'tooth', text: 'Kurangi camilan dan minuman manis untuk mencegah gigi berlubang.' },
  { state: 'dance', text: 'Senyum sehat dimulai dari kebiasaan kecil setiap hari.' },
];

export const SORRY_TEXT = 'Mohon maaf atas waktu tunggunya. Dokter akan segera melayani Anda.';
export const SLEEP_TEXT = 'Klinik sedang di luar jam praktik. Sampai jumpa di jam praktik berikutnya.';
/** Keterlambatan (menit) dari jam janji pasien berikutnya sebelum Denti meminta maaf. */
export const SORRY_AFTER_MIN = 30;

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const minutesOf = (date) => date.getHours() * 60 + date.getMinutes();

/**
 * Di luar jam praktik? Jam praktik dari jadwal dokter hari ini (buka 30 mnt lebih awal,
 * tutup 30 mnt sesudahnya). Tanpa jadwal: dianggap tutup pukul 22.00–06.00.
 */
export function isClosed(hours, now) {
  const t = minutesOf(now);
  const open = toMinutes(hours?.open);
  const close = toMinutes(hours?.close);
  if (open == null || close == null) return t < 6 * 60 || t >= 22 * 60;
  return t < open - 30 || t >= close + 30;
}

/** Berapa menit pasien berikutnya sudah melewati jam janjinya (0 bila belum / tanpa jam). */
export function delayMinutes(next, now) {
  const at = toMinutes(next?.time);
  if (at == null) return 0;
  return Math.max(0, minutesOf(now) - at);
}

/**
 * Keadaan dasar Denti + teks yang ia "ucapkan" di bar bawah (null = pakai pesan klinik biasa).
 *   tidur (tutup & kosong) → maaf (antrean molor) → tips bergilir (belum ada yang diperiksa) → siaga
 */
export function dentiScene({ hours, now, primary, waiting = [], tick = 0 }) {
  const next = waiting[0];
  if (!primary && !next && isClosed(hours, now)) return { state: 'sleep', text: SLEEP_TEXT, kid: false };
  if (!primary && next && delayMinutes(next, now) >= SORRY_AFTER_MIN) return { state: 'sorry', text: SORRY_TEXT, kid: false };
  if (!primary) {
    const tip = DENTI_TIPS[((tick % DENTI_TIPS.length) + DENTI_TIPS.length) % DENTI_TIPS.length];
    return { state: tip.state, text: tip.text, kid: false };
  }
  return { state: 'idle', text: null, kid: Boolean(primary.kid) };
}
