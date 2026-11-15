/**
 * Edge Function: admin-atur-password-staf — manajer klinik menetapkan password baru untuk staf kliniknya
 * (dipakai selama/karena email reset belum tersedia, atau staf lupa password).
 *
 * POST { user_id, password }  (Authorization: Bearer <JWT manajer klinik>)
 *   - Pemanggil: role admin, status aktif/diundang, klinik yang sama dengan staf target.
 *   - Target: bukan diri sendiri (ganti password sendiri lewat profil), bukan operator Dentiva,
 *     status tidak 'suspended' (penangguhan dikelola tim Dentiva).
 *   - Password minimal 8 karakter, memuat huruf dan angka.
 *   - Semua sesi aktif staf dicabut, sehingga staf wajib masuk ulang dengan password baru.
 *   - Tercatat di audit_logs (tanpa password).
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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Aturan password: ≥ 8 karakter, ada huruf & angka, ≤ 72 (batas bcrypt). */
export function cekPassword(pw: string): string | null {
  if (pw.length < 8) return "Password minimal 8 karakter."
  if (pw.length > 72) return "Password maksimal 72 karakter."
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password harus memuat huruf dan angka."
  return null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) })
  if (req.method !== "POST") return json(req, 405, { error: "Metode tidak didukung" })

  const url = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const authHeader = req.headers.get("Authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) return json(req, 401, { error: "Silakan masuk kembali." })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: me, error: meErr } = await admin.auth.getUser(authHeader.slice(7))
  if (meErr || !me?.user) return json(req, 401, { error: "Sesi tidak valid. Silakan masuk kembali." })

  // deno-lint-ignore no-explicit-any
  let body: any
  try { body = await req.json() } catch { return json(req, 400, { error: "Permintaan tidak valid" }) }
  const targetId = String(body?.user_id ?? "")
  const password = String(body?.password ?? "")
  if (!UUID.test(targetId)) return json(req, 400, { error: "Staf tidak valid." })
  const salahPw = cekPassword(password)
  if (salahPw) return json(req, 400, { error: salahPw })
  if (targetId === me.user.id) return json(req, 400, { error: "Ganti password Anda sendiri lewat halaman Profil." })

  const { data: pemanggil } = await admin.from("users").select("id, role, status, clinic_id").eq("id", me.user.id).maybeSingle()
  if (!pemanggil || pemanggil.role !== "admin" || !["active", "invited"].includes(pemanggil.status) || !pemanggil.clinic_id) {
    return json(req, 403, { error: "Hanya manajer klinik yang dapat mengatur password staf." })
  }
  const { data: target } = await admin.from("users").select("id, full_name, role, status, clinic_id").eq("id", targetId).maybeSingle()
  if (!target || target.clinic_id !== pemanggil.clinic_id) return json(req, 404, { error: "Staf tidak ditemukan di klinik Anda." })
  if (target.status === "suspended") return json(req, 403, { error: "Akun ini ditangguhkan oleh tim Dentiva." })
  const { data: operator } = await admin.rpc("akun_adalah_operator", { p_user: targetId })
  if (operator === true) return json(req, 403, { error: "Akun ini dikelola tim Dentiva." })

  const { error: updErr } = await admin.auth.admin.updateUserById(targetId, { password, email_confirm: true })
  if (updErr) {
    console.error("[admin-atur-password-staf] auth:", updErr.message)
    return json(req, 500, { error: "Password gagal diatur. Coba lagi." })
  }
  // Keluarkan staf dari semua perangkat agar password lama tidak bisa dipakai lagi.
  const { error: sesiErr } = await admin.rpc("staf_cabut_sesi", { p_user: targetId })
  if (sesiErr) console.error("[admin-atur-password-staf] cabut sesi:", sesiErr.message)

  const { error: auditErr } = await admin.from("audit_logs").insert([{
    user_id: me.user.id, user_role: "admin", clinic_id: pemanggil.clinic_id, module: "USER_MANAGEMENT", action: "RESET_PASSWORD",
    previous_value: null, new_value: { staf_id: targetId, staf: target.full_name, role: target.role }, risk_level: "HIGH",
  }])
  if (auditErr) console.error("[admin-atur-password-staf] audit:", auditErr.message)

  return json(req, 200, { ok: true })
})
