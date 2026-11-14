/**
 * Jembatan WhatsApp → Eira (dipanggil HANYA oleh fungsi whatsapp-webhook dengan kunci service role).
 *
 * Webhook sudah mengenali pengirim lewat nomor yang ditautkan (wa_akun_pengirim). Di sini dibuat token
 * sesi berumur 5 menit untuk pengguna tersebut (ditandatangani JWT_SECRET server), sehingga semua RPC
 * ai_* tetap berjalan dengan hak akses & klinik pengguna itu sendiri — persis seperti di aplikasi.
 */

const enc = new TextEncoder();
const b64url = (data: Uint8Array | string) => {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export interface PenggunaWa {
  id: string;
  email: string | null;
  clinic_id: string;
}

/** JWT HS256 setara sesi Supabase Auth (role authenticated + klaim klinik), berlaku `detik`. */
export async function buatTokenPengguna(u: PenggunaWa, secret: string, detik = 300, sekarang = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    aud: "authenticated",
    role: "authenticated",
    sub: u.id,
    email: u.email ?? undefined,
    app_metadata: { clinic_id: u.clinic_id, provider: "whatsapp" },
    user_metadata: {},
    aal: "aal1",
    amr: [{ method: "whatsapp", timestamp: sekarang }],
    is_anonymous: false,
    iat: sekarang,
    exp: sekarang + detik,
  };
  const isi = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(isi)));
  return `${isi}.${b64url(sig)}`;
}

/** Permintaan dari webhook → badan permintaan internal ai-assistant (atau null bila tidak valid). */
// deno-lint-ignore no-explicit-any
export function permintaanInternal(body: any): { userId: string; inner: Record<string, unknown> } | null {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const userId = typeof body?.user_id === "string" && UUID.test(body.user_id) ? body.user_id : "";
  if (!userId) return null;
  const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string" && UUID.test(x)).slice(0, 60) : [];
  if (body.aksi === "setujui") return ids.length ? { userId, inner: { mode: "agent_apply", ids } } : null;
  if (body.aksi === "tolak") return ids.length ? { userId, inner: { mode: "agent_reject", ids } } : null;
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
  if (!question) return null;
  const history = Array.isArray(body.history) ? body.history.slice(-20) : [];
  return { userId, inner: { mode: "chat", question, history } };
}
