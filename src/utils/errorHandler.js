/**
 * Translates raw backend database errors into user-friendly messages.
 * @param {Object} error - The error object from Supabase or fetch
 * @returns {string} User-friendly error message
 */
export const translateDbError = (error) => {
  if (!error) return "Terjadi kesalahan yang tidak diketahui.";
  
  const msg = error.message || error.details || error.hint || error.toString();
  const lowerMsg = msg.toLowerCase();

  if (lowerMsg.includes('duplicate key value')) {
    return 'Data sudah ada di dalam sistem (Duplikat).';
  }
  if (lowerMsg.includes('violates foreign key constraint')) {
    return 'Data ini tidak dapat dihapus karena masih terhubung dengan data lain (misal: Rekam medis atau Pembayaran).';
  }
  if (lowerMsg.includes('violates check constraint')) {
    return 'Input tidak memenuhi syarat atau aturan sistem.';
  }
  if (lowerMsg.includes('not found') || lowerMsg.includes('no rows')) {
    return 'Data tidak ditemukan.';
  }
  if (lowerMsg.includes('fetch') || lowerMsg.includes('network')) {
    return 'Gangguan jaringan. Periksa koneksi internet Anda.';
  }
  if (lowerMsg.includes('jwt expired') || lowerMsg.includes('unauthorized')) {
    return 'Sesi Anda telah berakhir. Silakan login kembali.';
  }
  if (lowerMsg.includes('permission denied')) {
    return 'Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.';
  }

  // Fallback for unhandled raw errors
  return `Kesalahan sistem: ${msg}`;
};
