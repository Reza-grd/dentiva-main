/**
 * Edge Function: send-visit-notifications
 * Invoice (struk) & edukasi pasca-tindakan via WhatsApp — disusun di SERVER dari data tercatat
 * (pembayaran, tindakan, obat), dikirim SEKALI per kunjungan per jenis, dan dicoba ulang otomatis.
 *
 * Pemanggil:
 *   - Staf klinik (JWT) setelah pembayaran lunas:  { visitId }  atau kirim ulang struk: { visitId, resend: true }
 *   - Cron (service role) sebagai jaring pengaman: { sweep: true } — kunjungan lunas sejak WA_NOTIF_SINCE
 *     yang struk/edukasinya belum terkirim/diputuskan (dibatasi 20 per putaran, maks 5 percobaan).
 *   - Service role, uji tanpa kirim: { visitId, dryRun: true } → hanya keputusan & panjang pesan.
 *
 * Idempoten: "klaim" baris notification_logs status 'sending' dengan indeks unik
 * (visit_id, message_type) untuk status 'sending'/'sent' → dua pemanggilan bersamaan tidak mengirim dobel.
 * Gangguan sementara (WhatsApp belum tersambung, jaringan) → klaim dilepas, dicoba lagi oleh cron.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { requireActiveAccount } from "../_shared/activeAccount.ts"
import { decryptBatch } from "../_shared/decryptionHelper.ts"
import { configProblem, sendWhatsApp } from "../_shared/whatsapp.ts"
import { KINDS, parseTypes, type Kind } from "../_shared/notificationInput.ts"
import { buildEducation, buildReceipt, doctorDisplayName } from "../_shared/visitMessages.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

type Outcome = { type: Kind; status: string; detail?: string; length?: number }

const SINCE = Deno.env.get("WA_NOTIF_SINCE") || "2026-10-11T07:00:00Z" // jaring pengaman tidak menyentuh pembayaran lama
const MAX_ATTEMPTS = 5

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json(405, { error: "Method not allowed" })

  const url = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceKey
  const auth = req.headers.get("Authorization") || ""
  const isService = auth === `Bearer ${serviceKey}`
  const admin = createClient(url, serviceKey)

  let body: { visitId?: string; resend?: boolean; sweep?: boolean; dryRun?: boolean; types?: Kind[] }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: "Body JSON tidak valid" })
  }

  // ── Otorisasi ──
  let callerClinic: string | null = null
  let callerId: string | null = null
  if (!isService) {
    if (!auth) return json(401, { error: "Unauthorized" })
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } })
    try {
      // Struk berisi data transaksi pasien: hanya kasir (resepsionis) — sejalan dengan save_visit_payment (admin & dokter tidak
      // menerima pembayaran) — dan izin finance.payment/finance.update yang dicabut juga berlaku di sini.
      const acct = await requireActiveAccount(userClient, ["resepsionis"])
      for (const name of ["finance.payment", "finance.update"]) {
        const { data: revoked, error: permErr } = await userClient.rpc("is_permission_revoked", { p_name: name })
        if (permErr || revoked === true) return json(403, { error: "Forbidden: izin pembayaran dicabut" })
      }
      callerClinic = acct.clinic_id
      callerId = acct.user_id
    } catch {
      return json(403, { error: "Forbidden: akun atau klinik tidak aktif" })
    }
    if (body.sweep || body.dryRun) return json(403, { error: "Hanya untuk proses server" })
  }

  const problem = configProblem()
  if (problem && !body.dryRun) return json(500, { error: problem })

  try {
    if (body.sweep) {
      if (!isService) return json(403, { error: "Hanya untuk proses server" })
      return json(200, await sweep(admin))
    }
    if (typeof body.visitId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.visitId)) return json(400, { error: "visitId wajib" })
    if (body.resend !== undefined && typeof body.resend !== "boolean") return json(400, { error: "resend harus boolean" })
    const parsed = parseTypes(body.types)
    if (!parsed) return json(400, { error: "types hanya boleh berisi receipt/education" })
    const types: Kind[] = body.resend ? ["receipt"] : parsed
    const result = await processVisit(admin, body.visitId, types, {
      clinicId: callerClinic, resend: body.resend === true, dryRun: body.dryRun === true && isService, triggeredBy: callerId,
    })
    return json(result.httpStatus, result.body)
  } catch (e) {
    console.error("send-visit-notifications:", (e as Error).message)
    return json(500, { error: "Galat internal saat menyiapkan notifikasi" })
  }
})

// ── Satu kunjungan ──────────────────────────────────────────────────────────
async function processVisit(
  db: any, visitId: string, types: Kind[],
  opt: { clinicId: string | null; resend: boolean; dryRun: boolean; triggeredBy: string | null },
): Promise<{ httpStatus: number; body: unknown }> {
  const { data: visit, error: vErr } = await db
    .from("visits")
    .select(`id, clinic_id, patient_id, deleted_at,
             patient:patients (nama_lengkap, no_rm, no_wa, wa_consent),
             dokter:users!visits_dokter_id_fkey (full_name, gelar_depan, gelar_belakang)`)
    .eq("id", visitId)
    .maybeSingle()
  if (vErr) throw vErr
  if (!visit || visit.deleted_at) return { httpStatus: 404, body: { error: "Kunjungan tidak ditemukan" } }
  if (opt.clinicId && visit.clinic_id !== opt.clinicId) return { httpStatus: 403, body: { error: "Forbidden: data bukan milik klinik Anda" } }

  const { data: payment } = await db
    .from("payments")
    .select("id, invoice_number, tanggal_pembayaran, total_bayar, biaya_tambahan, keterangan_tambahan, diskon, jumlah_bayar, metode_pembayaran, status_pembayaran")
    .eq("visit_id", visitId)
    .maybeSingle()
  if (!payment || payment.status_pembayaran !== "paid") {
    return { httpStatus: 409, body: { error: "Kunjungan belum lunas — invoice & edukasi dikirim setelah pembayaran lunas" } }
  }

  const settings = await clinicSettings(db, visit.clinic_id)
  const outcomes: Outcome[] = []
  const log = (type: Kind | "receipt_resend", status: string, gateway: string) =>
    opt.dryRun ? Promise.resolve() : db.from("notification_logs").insert([{
      visit_id: visitId, patient_id: visit.patient_id, clinic_id: visit.clinic_id, message_type: type,
      status, gateway_response: gateway.slice(0, 500), triggered_by: opt.triggeredBy,
    }])

  // Keputusan yang sama untuk semua jenis: paket, persetujuan pasien, nomor WA.
  const planOk = await hasWhatsAppFeature(db, visit.clinic_id)
  const consent = visit.patient?.wa_consent === true
  const [nama, noWa] = await decryptBatch(db, [visit.patient?.nama_lengkap || "", visit.patient?.no_wa || ""])

  for (const type of types) {
    // Sudah final (terkirim / sedang dikirim / sengaja dilewati)? → tidak dikirim lagi, kecuali kirim ulang struk.
    if (!opt.resend) {
      const final = await finalLog(db, visitId, type)
      if (final) { outcomes.push({ type, status: "already_" + final }); continue }
    }
    const enabled = type === "receipt"
      ? settings.wa_payment_confirmation_enabled !== "false"
      : settings.wa_post_treatment_education_enabled === "true"
    const skip = !planOk ? "skipped_plan" : !consent ? "skipped_no_consent" : !enabled ? "skipped_disabled" : !noWa ? "skipped_no_phone" : null
    if (skip) {
      if (!opt.resend) await log(type, skip, skip)
      outcomes.push({ type, status: skip })
      continue
    }

    const message = type === "receipt"
      ? await composeReceipt(db, visitId, payment, settings, nama, visit)
      : await composeEducation(db, visitId, visit.clinic_id, settings, nama)
    if (!message) {
      if (!opt.resend) await log(type, "skipped_no_template", "Tidak ada edukasi yang cocok untuk tindakan/obat tercatat")
      outcomes.push({ type, status: "skipped_no_template" })
      continue
    }
    if (opt.dryRun) { outcomes.push({ type, status: "would_send", length: message.length }); continue }

    // Kirim ulang struk dibatasi: satu per kunjungan per 5 menit, dan maks. 30 per klinik per jam (cegah spam ke pasien).
    if (opt.resend) {
      const limited = await resendLimited(db, visitId, visit.clinic_id)
      if (limited) { outcomes.push({ type, status: "rate_limited", detail: limited }); continue }
    }
    // Klaim (unik per kunjungan+jenis) agar tidak terkirim dobel bila dipanggil bersamaan.
    const logType = opt.resend ? "receipt_resend" : type
    const { data: claim, error: claimErr } = await db.from("notification_logs").insert([{
      visit_id: visitId, patient_id: visit.patient_id, clinic_id: visit.clinic_id, message_type: logType,
      status: "sending", gateway_response: "", triggered_by: opt.triggeredBy,
    }]).select("id").single()
    if (claimErr) {
      // Hanya pelanggaran unik (23505) yang berarti "sudah ada yang mengirim"; galat lain jangan disamarkan.
      if (claimErr.code === "23505") { outcomes.push({ type, status: "already_in_progress" }); continue }
      console.error("send-visit-notifications klaim gagal:", claimErr.code, claimErr.message)
      outcomes.push({ type, status: "error", detail: "Gagal mencatat klaim pengiriman" })
      continue
    }

    // Kunci per klaim: percobaan ulang untuk klaim yang sama tidak mengirim dobel; kirim ulang manual = klaim baru.
    const r = await sendWhatsApp({ to: noWa, text: message, idempotencyKey: `${logType}:${visitId}:${claim.id}` })
    if (r.ok) {
      // Pesan SUDAH terkirim: kegagalan mencatat tidak boleh memicu kirim ulang. Klaim dibiarkan 'sending' (lalu
      // ditandai 'uncertain' oleh sweep, yang tidak dicoba lagi) dan kegagalan dicatat di log server.
      const { error: upErr } = await db.from("notification_logs").update({ status: "sent", gateway_response: JSON.stringify({ provider: r.provider, id: r.id }) }).eq("id", claim.id)
      if (upErr) console.error("send-visit-notifications: pesan terkirim tetapi log gagal diperbarui:", upErr.message)
      if (type === "receipt") {
        const { error: wErr } = await db.from("payments").update({ wa_sent: true }).eq("id", payment.id)
        if (wErr) console.error("send-visit-notifications: wa_sent gagal diperbarui:", wErr.message)
      }
      outcomes.push({ type, status: upErr ? "sent_log_failed" : "sent" })
    } else if (r.retryable) {
      // Sementara (WhatsApp belum tersambung, batas kirim, jaringan) → klaim dilepas, TIDAK dihitung
      // sebagai percobaan; cron mencoba lagi selama jendela 48 jam.
      const { error: delErr } = await db.from("notification_logs").delete().eq("id", claim.id)
      if (delErr) console.error("send-visit-notifications: klaim gagal dilepas:", delErr.message)
      outcomes.push({ type, status: "deferred", detail: r.error })
    } else {
      // Permanen (mis. nomor tidak terdaftar di WhatsApp) → dicatat gagal; dihitung untuk batas percobaan.
      const { error: failErr } = await db.from("notification_logs").update({ status: "failed", gateway_response: r.error || "gagal" }).eq("id", claim.id)
      if (failErr) console.error("send-visit-notifications: status gagal tidak tercatat:", failErr.message)
      outcomes.push({ type, status: "failed", detail: r.error })
    }
  }
  return { httpStatus: 200, body: { success: true, results: outcomes } }
}

async function resendLimited(db: any, visitId: string, clinicId: string): Promise<string | null> {
  const since5 = new Date(Date.now() - 5 * 60_000).toISOString()
  const { count: recent, error: e1 } = await db.from("notification_logs").select("id", { count: "exact", head: true })
    .eq("visit_id", visitId).eq("message_type", "receipt_resend").gte("timestamp", since5)
  if (e1) throw e1
  if ((recent ?? 0) > 0) return "Struk baru saja dikirim ulang — tunggu 5 menit"
  const since1h = new Date(Date.now() - 3600_000).toISOString()
  const { count: hourly, error: e2 } = await db.from("notification_logs").select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId).eq("message_type", "receipt_resend").gte("timestamp", since1h)
  if (e2) throw e2
  if ((hourly ?? 0) >= 30) return "Batas kirim ulang struk per jam tercapai"
  return null
}

async function finalLog(db: any, visitId: string, type: Kind): Promise<string | null> {
  const { data } = await db.from("notification_logs").select("status")
    .eq("visit_id", visitId).eq("message_type", type)
    .in("status", ["sending", "sent", "skipped_no_consent", "skipped_disabled", "skipped_no_phone", "skipped_no_template", "skipped_plan", "uncertain"])
    .limit(1)
  return data?.[0]?.status ?? null
}

async function clinicSettings(db: any, clinicId: string): Promise<Record<string, string>> {
  const { data } = await db.from("clinic_settings").select("key, value").eq("clinic_id", clinicId)
  const s: Record<string, string> = {}
  for (const r of data ?? []) s[r.key] = String(r.value ?? "")
  return s
}

async function hasWhatsAppFeature(db: any, clinicId: string): Promise<boolean> {
  const { data } = await db.from("clinic_subscriptions")
    .select("status, plan:subscription_plans(features)")
    .eq("clinic_id", clinicId).in("status", ["trialing", "active"])
    .order("current_period_end", { ascending: false }).limit(1).maybeSingle()
  return data?.plan?.features?.whatsapp_reminders === true
}

async function composeReceipt(db: any, visitId: string, p: any, s: Record<string, string>, nama: string, visit: any) {
  const [{ data: vt, error: e1 }, { data: vo, error: e2 }] = await Promise.all([
    db.from("visit_treatments").select("quantity, subtotal, tooth_number, treatment:treatments(nama_treatment)").eq("visit_id", visitId).order("created_at"),
    db.from("visit_obat").select("nama_obat, qty, subtotal").eq("visit_id", visitId).order("created_at"),
  ])
  // Fail-closed: kuitansi sebagian (tanpa rincian) lebih buruk daripada ditunda.
  if (e1 || e2) throw new Error("Gagal membaca rincian tindakan/obat untuk kuitansi")
  return buildReceipt({
    clinicName: s.clinic_name || "Klinik Gigi",
    clinicPhone: s.clinic_phone || null,
    invoiceNumber: p.invoice_number,
    patientName: nama,
    noRm: visit.patient?.no_rm ?? null,
    doctorName: doctorDisplayName(visit.dokter),
    paidAt: p.tanggal_pembayaran,
    treatments: (vt ?? []).map((t: any) => ({ name: t.treatment?.nama_treatment || "Tindakan", qty: Number(t.quantity) || 1, subtotal: Number(t.subtotal) || 0, tooth: t.tooth_number })),
    medicines: (vo ?? []).map((o: any) => ({ name: o.nama_obat || "Obat", qty: Number(o.qty) || 1, subtotal: Number(o.subtotal) || 0 })),
    extraFee: Number(p.biaya_tambahan) || 0,
    extraFeeNote: p.keterangan_tambahan,
    discount: Number(p.diskon) || 0,
    total: Number(p.total_bayar) || 0,
    amountPaid: p.jumlah_bayar == null ? null : Number(p.jumlah_bayar),
    method: p.metode_pembayaran,
  })
}

async function composeEducation(db: any, visitId: string, clinicId: string, s: Record<string, string>, nama: string) {
  const [{ data: vt, error: e1 }, { data: vo, error: e2 }, { data: templates, error: e3 }] = await Promise.all([
    db.from("visit_treatments").select("treatment_id, treatment:treatments(nama_treatment)").eq("visit_id", visitId).order("created_at"),
    db.from("visit_obat").select("nama_obat, dosis, frekuensi").eq("visit_id", visitId).order("created_at"),
    db.from("treatment_education_templates").select("treatment_type, keywords, education_text, medication_instructions").or(`clinic_id.eq.${clinicId},clinic_id.is.null`),
  ])
  if (e1 || e2 || e3) throw new Error("Gagal membaca data edukasi")
  const ids = [...new Set((vt ?? []).map((t: any) => t.treatment_id).filter(Boolean))]
  const { data: linked, error: e4 } = ids.length
    ? await db.from("treatment_education").select("treatment_id, judul, isi_edukasi, edukasi_obat, is_active").in("treatment_id", ids).eq("is_active", true)
    : { data: [] }
  if (e4) throw new Error("Gagal membaca edukasi tindakan")
  return buildEducation({
    clinicName: s.clinic_name || "Klinik Gigi",
    clinicPhone: s.clinic_phone || null,
    patientName: nama,
    treatments: (vt ?? []).map((t: any) => ({ treatmentId: t.treatment_id, name: t.treatment?.nama_treatment || "" })).filter((t: any) => t.name),
    medicines: (vo ?? []).map((o: any) => ({ name: o.nama_obat || "", dosis: o.dosis, frekuensi: o.frekuensi })),
    templates: templates ?? [],
    linked: linked ?? [],
  }).message
}

// ── Jaring pengaman (cron) ──────────────────────────────────────────────────
async function sweep(db: any) {
  // Klaim 'sending' yang macet (> 10 menit) dianggap gagal agar bisa dicoba ulang.
  // Hasilnya tidak pasti (pesan bisa saja sudah terkirim) → 'uncertain' dan TIDAK dicoba lagi otomatis, agar tidak dobel.
  const { error: staleErr } = await db.from("notification_logs").update({ status: "uncertain", gateway_response: "[macet] klaim kedaluwarsa — hasil tidak pasti, kirim ulang manual bila perlu" })
    .eq("status", "sending").lt("timestamp", new Date(Date.now() - 10 * 60_000).toISOString())
  if (staleErr) throw staleErr

  // Kandidat dipilih per halaman (kursor tanggal) sampai terkumpul 20 yang benar-benar butuh diproses —
  // 200 pembayaran terawal yang sudah final tidak lagi menutupi pembayaran yang lebih baru.
  const processed: unknown[] = []
  let checked = 0
  let cursor = new Date(Math.max(Date.parse(SINCE), Date.now() - 48 * 3600_000)).toISOString()
  for (let page = 0; page < 5 && processed.length < 20; page += 1) {
    const { data: paid, error } = await db.from("payments")
      .select("visit_id, tanggal_pembayaran")
      .eq("status_pembayaran", "paid").gt("tanggal_pembayaran", cursor)
      .order("tanggal_pembayaran", { ascending: true }).limit(200)
    if (error) throw error
    if (!paid?.length) break
    checked += paid.length
    for (const p of paid) {
      if (processed.length >= 20) break
      cursor = p.tanggal_pembayaran
      try {
        const pending: Kind[] = []
        for (const type of KINDS) {
          if (await finalLog(db, p.visit_id, type)) continue
          const { count, error: cErr } = await db.from("notification_logs").select("id", { count: "exact", head: true })
            .eq("visit_id", p.visit_id).eq("message_type", type).eq("status", "failed")
          if (cErr) throw cErr
          if ((count ?? 0) < MAX_ATTEMPTS) pending.push(type)
        }
        if (!pending.length) continue
        const r = await processVisit(db, p.visit_id, pending, { clinicId: null, resend: false, dryRun: false, triggeredBy: null })
        processed.push({ visitId: p.visit_id, ...(r.body as object) })
      } catch (e) {
        console.error("send-visit-notifications sweep:", p.visit_id, (e as Error).message)
        processed.push({ visitId: p.visit_id, error: "gagal diproses, dicoba lagi putaran berikutnya" })
      }
    }
    if (paid.length < 200) break
  }
  return { success: true, checked, processed }
}
