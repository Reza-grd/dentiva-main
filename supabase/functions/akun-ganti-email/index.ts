/**
 * Edge Function: akun-ganti-email — pengguna klinik mengganti email masuknya sendiri.
 *
 * POST { email_baru, password }  (Authorization: Bearer <JWT pengguna>)
 *   1. Token pengguna diverifikasi (getUser). Akun operator Dentiva ditolak (dikelola di Console).
 *   2. Password SAAT INI diverifikasi ke Auth (grant_type=password); sesi tambahan yang
 *      tercipta langsung ditutup (scope=local) agar tidak menumpuk.
 *   3. Email baru harus valid, berbeda, dan belum dipakai akun lain.
 *   4. Permintaan ganti email diteruskan ke Auth ATAS NAMA PENGGUNA (PUT /auth/v1/user). Auth mengirim
 *      tautan konfirmasi ke email LAMA dan email BARU (secure email change); email baru berlaku setelah
 *      kedua tautan diklik. public.users.email disamakan saat login berikutnya (record_login).
 * Password tidak pernah dicatat. Batas percobaan password mengikuti pembatas Auth (rate limit token).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const ALLOWED_ORIGINS = [
  "http://localhost:3000", "http://localhost:3001", "http://localhost:5173",
  "https://dentiva-main.vercel.app", "https://dentiva.id", "https://app.dentiva.id",
  "http://tauri.localhost", "https://tauri.localhost", "tauri://localhost",
]
const cors = (req: Request) => {
  const origin = req.headers.get("Origin") ?? ""
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[3],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}
const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) })
  if (req.method !== "POST") return json(req, 405, { error: "Metode tidak didukung" })

  const url = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const authHeader = req.headers.get("Authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) return json(req, 401, { error: "Silakan masuk kembali." })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.slice(7))
  const user = userData?.user
  if (userErr || !user?.email) return json(req, 401, { error: "Sesi tidak valid. Silakan masuk kembali." })

  // deno-lint-ignore no-explicit-any
  let body: any
  try { body = await req.json() } catch { return json(req, 400, { error: "Permintaan tidak valid" }) }
  const emailBaru = String(body?.email_baru ?? "").trim().toLowerCase()
  const password = String(body?.password ?? "")
  if (!EMAIL_RE.test(emailBaru) || emailBaru.length > 254) return json(req, 400, { error: "Format email baru tidak valid." })
  if (!password) return json(req, 400, { error: "Masukkan password Anda saat ini." })
  if (emailBaru === user.email.toLowerCase()) return json(req, 400, { error: "Email baru sama dengan email saat ini." })

  const { data: operator } = await admin.rpc("akun_adalah_operator", { p_user: user.id })
  if (operator === true) return json(req, 403, { error: "Email akun operator Dentiva diubah dari Console." })

  const { data: profil } = await admin.from("users").select("id, status").eq("id", user.id).maybeSingle()
  if (!profil || !["active", "invited"].includes(profil.status)) return json(req, 403, { error: "Akun tidak aktif." })

  // Verifikasi password saat ini lewat Auth.
  const cek = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password }),
  })
  if (cek.status === 429) return json(req, 429, { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." })
  if (!cek.ok) return json(req, 403, { error: "Password saat ini salah." })
  const sesiCek = await cek.json().catch(() => null)
  if (sesiCek?.user?.id !== user.id) return json(req, 403, { error: "Password saat ini salah." })
  if (sesiCek?.access_token) {
    // Tutup sesi tambahan dari pengecekan password (hanya sesi itu).
    await fetch(`${url}/auth/v1/logout?scope=local`, {
      method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${sesiCek.access_token}` },
    }).catch(() => {})
  }

  const { data: terpakai, error: cekErr } = await admin.rpc("akun_email_terpakai", { p_email: emailBaru })
  if (cekErr) return json(req, 500, { error: "Email baru belum bisa diperiksa. Coba lagi." })
  if (terpakai === true) return json(req, 409, { error: "Email baru sudah dipakai akun lain." })

  // Minta Auth mengirim tautan konfirmasi (ke email lama & baru) memakai token pengguna sendiri.
  const asal = req.headers.get("Origin") ?? ""
  // Hanya alamat web yang terdaftar di daftar redirect Auth; aplikasi desktop memakai alamat web.
  const appUrl = ["https://dentiva-main.vercel.app", "https://app.dentiva.id", "https://dentiva.id"].includes(asal) ? asal : "https://dentiva-main.vercel.app"
  const minta = await fetch(`${url}/auth/v1/user?redirect_to=${encodeURIComponent(`${appUrl}/profil?email=dikonfirmasi`)}`, {
    method: "PUT",
    headers: { apikey: anonKey, Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailBaru }),
  })
  if (!minta.ok) {
    const isi = await minta.json().catch(() => ({}))
    console.error("[akun-ganti-email] auth:", minta.status, isi?.error_code ?? isi?.msg ?? "")
    if (minta.status === 429) return json(req, 429, { error: "Terlalu banyak permintaan email. Coba lagi beberapa menit lagi." })
    return json(req, 502, { error: "Email konfirmasi gagal dikirim. Coba lagi sebentar lagi." })
  }

  return json(req, 200, { ok: true, menunggu_konfirmasi: true, email: emailBaru })
})
