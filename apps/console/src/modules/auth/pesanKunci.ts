/** Pesan "Terlalu banyak percobaan … Coba lagi dalam N menit/jam." dari kunci login bertingkat (hook server), bila ada. */
export function pesanKunci(err: { message?: string } | null | undefined): string | null {
  const m = err?.message ?? "";
  return /coba lagi dalam \d+ (menit|jam)/i.test(m) ? m : null;
}
