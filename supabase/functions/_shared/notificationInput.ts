export type Kind = "receipt" | "education"
export const KINDS: Kind[] = ["receipt", "education"]

/** undefined/null → semua jenis; selain itu hanya array enum tanpa duplikat. Mengembalikan null bila tidak valid. */
export function parseTypes(v: unknown): Kind[] | null {
  if (v === undefined || v === null) return KINDS
  if (!Array.isArray(v) || v.length === 0 || v.length > KINDS.length) return null
  if (!v.every((x) => KINDS.includes(x as Kind))) return null
  return [...new Set(v as Kind[])]
}
