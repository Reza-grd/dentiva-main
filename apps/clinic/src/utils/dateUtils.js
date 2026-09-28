/**
 * Utilitas tanggal yang aman terhadap timezone (WIB = UTC+7).
 *
 * Masalah: new Date("2026-05-28") diparsing sebagai UTC midnight.
 * Di WIB (UTC+7) itu berarti 07:00 pagi, tapi toLocaleDateString() tetap benar.
 * Namun di timezone UTC-X, tanggal bisa mundur 1 hari.
 *
 * Solusi: selalu tambahkan 'T00:00:00' agar diparsing sebagai local time,
 * atau gunakan helper ini secara konsisten.
 */

/**
 * Parse string "YYYY-MM-DD" sebagai local date (bukan UTC).
 * @param {string} dateStr — format "YYYY-MM-DD"
 * @returns {Date}
 */
export const parseDateLocal = (dateStr) => {
  if (!dateStr) return null;
  const datePart = String(dateStr).split('T')[0];
  return new Date(datePart + 'T00:00:00');
};

/**
 * Format tanggal ke string lokal Indonesia ("28 Mei 2026").
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateID = (date, options = { day: 'numeric', month: 'long', year: 'numeric' }) => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseDateLocal(date) : date;
  if (!d || isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', options);
};

/**
 * Format tanggal pendek ("28 Mei '26").
 */
export const formatDateShortID = (date) =>
  formatDateID(date, { day: 'numeric', month: 'short', year: '2-digit' });

/**
 * Hitung umur dari tanggal lahir (string "YYYY-MM-DD").
 */
export const calcAge = (tanggalLahir) => {
  if (!tanggalLahir) return null;
  const birth = parseDateLocal(tanggalLahir);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

/**
 * Format angka ke format Rupiah Indonesia.
 * @param {number} number
 * @returns {string} contoh: "Rp 1.500.000"
 */
export const formatRupiah = (number) => {
  if (number === null || number === undefined || isNaN(number)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

/**
 * Sapaan berdasarkan jam saat ini.
 * @returns {string} "Selamat Pagi" | "Selamat Siang" | "Selamat Sore" | "Selamat Malam"
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
};

/**
 * Format tanggal lengkap dengan nama hari dalam Bahasa Indonesia.
 * @param {string|Date} dateStr
 * @returns {string} contoh: "Kamis, 28 Mei 2026"
 */
export const formatDateFull = (dateStr) => {
  if (!dateStr) return '-';
  const d = typeof dateStr === 'string' ? parseDateLocal(dateStr) : dateStr;
  if (!d || isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Waktu relatif dari sebuah tanggal/waktu.
 * @param {string|Date} dateStr
 * @returns {string} contoh: "2 jam lalu", "kemarin", "3 hari lalu"
 */
export const getRelativeTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (!d || isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay === 1) return 'kemarin';
  if (diffDay < 7) return `${diffDay} hari lalu`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu lalu`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} bulan lalu`;
  return `${Math.floor(diffDay / 365)} tahun lalu`;
};

/**
 * Format nama lengkap dokter dengan gelar depan dan belakang.
 * @param {object} profile - Objek profil user dari AuthContext
 * @returns {string}
 */
export const formatDoctorName = (profile) => {
  if (!profile) return '';
  if (profile.role !== 'dokter') return profile.full_name || '';
  
  const gDepan = profile.gelar_depan ? `${profile.gelar_depan.trim()} ` : '';
  const gBelakang = profile.gelar_belakang ? `, ${profile.gelar_belakang.trim()}` : '';
  return `${gDepan}${profile.full_name || ''}${gBelakang}`;
};

/**
 * Dapatkan string tanggal hari ini ("YYYY-MM-DD") secara lokal (WIB), bukan UTC.
 */
/**
 * Format Date object to "YYYY-MM-DD" in local time.
 */
export const formatLocalISO = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Dapatkan string tanggal hari ini ("YYYY-MM-DD") secara lokal (WIB), bukan UTC.
 */
export const getTodayLocal = () => formatLocalISO(new Date());

/**
 * Dapatkan rentang tanggal (start, end) secara lokal berdasarkan periode, untuk query database.
 * @param {'today' | 'week' | 'month' | number} period 
 * @returns {{ start: string, end: string }}
 */
export const getLocalDateRange = (period) => {
  const endD = new Date();
  let startD = new Date();

  if (period === 'week') {
    startD.setDate(endD.getDate() - 7);
  } else if (period === 'month') {
    startD.setDate(1); // Tanggal 1 bulan ini
  } else if (typeof period === 'number') {
    startD.setDate(endD.getDate() - period);
  }
  // jika 'today', startD dan endD sama

  return { start: formatLocalISO(startD), end: formatLocalISO(endD) };
};
