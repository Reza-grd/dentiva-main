// Log transaksi API SATUSEHAT (poin 15 Security Self-Assessment): waktu, endpoint, client, status — tanpa data sensitif.
// Gagal mencatat TIDAK boleh menggagalkan panggilan SATUSEHAT itu sendiri.

export interface CatatanApi {
  lingkungan: string;
  metode: string;
  url: string;
  status: number;
  percobaan?: number;
  durasiMs: number;
  kodeGalat?: string | null;
}

/** Pisahkan URL menjadi endpoint tanpa host & query, serta NAMA parameter query (nilai dibuang: bisa berisi NIK). */
export function ringkasUrl(url: string): { endpoint: string; parameter: string[] } {
  try {
    const u = new URL(url);
    const parameter = [...new Set([...u.searchParams.keys()])].sort();
    return { endpoint: u.pathname.replace(/^\/+/, ""), parameter };
  } catch {
    return { endpoint: url.split("?")[0], parameter: [] };
  }
}

/** Kode galat singkat dari OperationOutcome FHIR (tanpa teks diagnostik yang bisa memuat data pasien). */
export function kodeGalatFhir(data: unknown): string | null {
  const issue = (data as { issue?: Array<{ code?: string; details?: { coding?: Array<{ code?: string }> } }> } | null)?.issue?.[0];
  if (!issue) return null;
  const detail = issue.details?.coding?.[0]?.code;
  return [issue.code, detail].filter(Boolean).join(":").slice(0, 80) || null;
}

/** Baca env tanpa pernah melempar (mis. izin env tidak diberikan di uji). */
function envAman(nama: string): string | null {
  try { return Deno.env.get(nama) ?? null; } catch { return null; }
}

export async function catatApiSatusehat(supabaseAdmin: any, c: CatatanApi): Promise<void> {
  const { endpoint, parameter } = ringkasUrl(c.url);
  const baris = {
    lingkungan: c.lingkungan,
    metode: c.metode,
    endpoint,
    parameter,
    client_id: envAman("SATUSEHAT_CLIENT_ID"),
    organization_id: envAman("SATUSEHAT_ORGANIZATION_ID"),
    status: c.status,
    percobaan: c.percobaan ?? 1,
    durasi_ms: Math.max(0, Math.round(c.durasiMs)),
    kode_galat: c.kodeGalat ?? null,
  };
  // Baris log terstruktur juga ke log fungsi (terkumpul di logging server).
  console.log(JSON.stringify({ jenis: "satusehat_api", waktu: new Date().toISOString(), ...baris }));
  try {
    const { error } = await supabaseAdmin.from("satusehat_log_api").insert(baris);
    if (error) console.warn("satusehat_log_api: gagal mencatat", error.message);
  } catch (e) {
    console.warn("satusehat_log_api: gagal mencatat", e instanceof Error ? e.message : e);
  }
}
