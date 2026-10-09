// Harus sama dengan EXPENSE_CATEGORIES di supabase/functions/ai-assistant/index.ts
export const EXPENSE_CATEGORIES = [
  'Bahan & Alat Habis Pakai', 'Alat Medis', 'Lab Gigi', 'Gaji', 'Sewa',
  'Utilitas', 'Pemeliharaan', 'Marketing', 'Administrasi', 'Lainnya',
];

const DAY_MS = 24 * 60 * 60 * 1000;
const norm = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Cari pengeluaran yang kemungkinan sama dengan draf (nota dicatat dua kali):
 * nomor nota sama, atau jumlah sama dengan tanggal berselisih ≤ 3 hari.
 * @param {{ id?: string, tanggal_expense: string, jumlah: number|string, nomor_nota?: string }} draft
 * @param {Array} existing  daftar pengeluaran yang sudah tersimpan
 */
export function findDuplicateExpenses(draft, existing = []) {
  const amount = Number(draft?.jumlah);
  const nota = norm(draft?.nomor_nota);
  const t = Date.parse(`${draft?.tanggal_expense}T00:00:00Z`);
  return existing.filter((e) => {
    if (draft?.id && e.id === draft.id) return false;
    if (nota && norm(e.nomor_nota) === nota) return true;
    if (!(amount > 0) || Number(e.jumlah) !== amount || Number.isNaN(t)) return false;
    const te = Date.parse(`${e.tanggal_expense}T00:00:00Z`);
    return !Number.isNaN(te) && Math.abs(te - t) <= 3 * DAY_MS;
  });
}
