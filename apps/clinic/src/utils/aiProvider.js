/** Teks pemrosesan data sesuai penyedia AI yang aktif. */
export function providerNotice(info) {
  if (!info?.configured) return 'Data diproses oleh penyedia AI di luar Indonesia.';
  if (info.provider === 'gemini') {
    return info.free_tier
      ? 'Data diproses oleh Google Gemini versi gratis (di luar Indonesia). Pada versi gratis, Google dapat memakai data yang dikirim untuk meningkatkan layanannya dan dapat dibaca peninjau manusia. Disarankan hanya untuk uji coba.'
      : 'Data diproses oleh Google Gemini (layanan berbayar, di luar Indonesia); data tidak dipakai Google untuk melatih modelnya.';
  }
  if (info.provider === 'groq') {
    return info.free_tier
      ? 'Data diproses oleh Groq versi gratis (di luar Indonesia). Disarankan hanya untuk uji coba; mutu jawaban dan pembacaan nota dapat lebih rendah.'
      : 'Data diproses oleh Groq (layanan berbayar, di luar Indonesia).';
  }
  return 'Data diproses oleh Anthropic Claude (di luar Indonesia); data tidak dipakai untuk melatih model.';
}
