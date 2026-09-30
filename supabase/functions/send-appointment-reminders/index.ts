/**
 * Edge Function: send-appointment-reminders
 * Pengingat WhatsApp H-1 hari & H-1 jam, dijalankan cron `send-appointment-reminders`
 * (tiap 15 menit, lihat migration 20260930000100). Hanya service role.
 *
 * Per klinik (dulu pengaturan semua klinik dicampur → nama/telepon klinik tertukar):
 *   - klinik berstatus trial/active dengan langganan trialing/active yang paketnya
 *     memuat features.whatsapp_reminders;
 *   - sakelar wa_reminder_h1_day_enabled / wa_reminder_h1_hour_enabled milik klinik itu;
 *   - pasien dengan wa_consent = true; nama & no WA didekripsi di server.
 * H-1 hari hanya dikirim 08.00–20.00 WIB agar pasien tidak menerima pesan tengah malam.
 * Duplikat dicegah lewat notification_logs (satu log per kunjungan per jenis).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { decryptBatch } from "../_shared/decryptionHelper.ts"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function normalizePhoneForWhapi(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '')
  if (clean.startsWith('0')) clean = '62' + clean.slice(1)
  return clean
}

const getDocName = (doc: any) => {
  if (!doc) return 'Dokter Gigi'
  const gDepan = doc.gelar_depan ? `${doc.gelar_depan.trim()} ` : ''
  const gBelakang = doc.gelar_belakang ? `, ${doc.gelar_belakang.trim()}` : ''
  return `${gDepan}${doc.full_name || ''}${gBelakang}`
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) {
    return json(401, { error: 'Unauthorized: Service role key required' })
  }

  const whapiToken = Deno.env.get('WHAPI_TOKEN')
  if (!whapiToken) return json(500, { error: 'WHAPI_TOKEN belum dikonfigurasi' })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  try {
    // 1. Klinik yang berhak (status & paket)
    const { data: subs, error: subErr } = await supabase
      .from('clinic_subscriptions')
      .select('clinic_id, status, plan:subscription_plans(features), clinic:clinics(status, name)')
      .in('status', ['trialing', 'active'])
    if (subErr) throw subErr

    const eligible = new Map<string, string>() // clinic_id → nama (fallback)
    for (const s of subs ?? []) {
      const c: any = (s as any).clinic
      if (c && ['trial', 'active'].includes(c.status) && (s as any).plan?.features?.whatsapp_reminders === true) {
        eligible.set((s as any).clinic_id, c.name)
      }
    }
    if (eligible.size === 0) return json(200, { success: true, processed: [], note: 'Tidak ada klinik dengan fitur pengingat WA' })

    // 2. Pengaturan per klinik
    const { data: settingsRows, error: settingsErr } = await supabase
      .from('clinic_settings')
      .select('clinic_id, key, value')
      .in('clinic_id', [...eligible.keys()])
    if (settingsErr) throw settingsErr
    const settings = new Map<string, Record<string, string>>()
    for (const r of settingsRows ?? []) {
      if (!settings.has(r.clinic_id)) settings.set(r.clinic_id, {})
      settings.get(r.clinic_id)![r.key] = r.value
    }
    const cfg = (clinicId: string) => {
      const s = settings.get(clinicId) ?? {}
      return {
        name: s['clinic_name'] || eligible.get(clinicId) || 'Klinik Gigi',
        phone: s['clinic_phone'] || '-',
        day: s['wa_reminder_h1_day_enabled'] !== 'false',
        hour: s['wa_reminder_h1_hour_enabled'] !== 'false',
      }
    }

    // 3. Waktu WIB (UTC+7) — tanggal & jam dihitung pada "jam dinding" WIB
    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const todayStr = wib.toISOString().split('T')[0]
    const tomorrowStr = new Date(wib.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const wibHour = wib.getUTCHours()
    const dayWindowOpen = wibHour >= 8 && wibHour < 20

    const sendWhapi = async (phone: string, text: string) => {
      const response = await fetch('https://gate.whapi.cloud/messages/text', {
        method: 'POST',
        headers: { Authorization: `Bearer ${whapiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: normalizePhoneForWhapi(phone) + '@s.whatsapp.net', body: text }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.error) throw new Error(data.message || data.error || `Whapi HTTP ${response.status}`)
      return data
    }

    const fetchVisits = async (date: string) => {
      const { data, error } = await supabase
        .from('visits')
        .select(`id, clinic_id, patient_id, tanggal_kunjungan, jam_kunjungan,
                 patient:patients (nama_lengkap, no_wa, wa_consent),
                 dokter:users (full_name, gelar_depan, gelar_belakang)`)
        .eq('tanggal_kunjungan', date)
        .eq('status', 'scheduled')
        .is('deleted_at', null)
        .in('clinic_id', [...eligible.keys()])
      if (error) throw error
      return data ?? []
    }

    const results: Array<Record<string, unknown>> = []

    const process = async (visit: any, type: 'reminder_day' | 'reminder_hour', build: (p: any, c: ReturnType<typeof cfg>) => string) => {
      const { data: existing, error: logErr } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('visit_id', visit.id)
        .eq('message_type', type)
        .maybeSingle()
      if (logErr || existing) return

      const log = (status: string, gateway_response: string) =>
        supabase.from('notification_logs').insert([{
          visit_id: visit.id, patient_id: visit.patient_id, clinic_id: visit.clinic_id,
          message_type: type, status, gateway_response: gateway_response.slice(0, 500),
        }])

      if (!visit.patient) return
      if (visit.patient.wa_consent !== true) {
        await log('skipped_no_consent', 'Patient wa_consent is false or null')
        results.push({ visitId: visit.id, type, status: 'skipped_no_consent' })
        return
      }
      const [nama, wa] = await decryptBatch(supabase, [visit.patient.nama_lengkap || '', visit.patient.no_wa || ''])
      if (!wa) return

      try {
        const resp = await sendWhapi(wa, build({ ...visit.patient, nama_lengkap: nama }, cfg(visit.clinic_id)))
        await log('sent', JSON.stringify(resp))
        results.push({ visitId: visit.id, type, status: 'sent' })
      } catch (err: any) {
        await log('failed', err.message)
        results.push({ visitId: visit.id, type, status: 'failed', error: err.message })
      }
    }

    const message = (visit: any, patient: any, c: ReturnType<typeof cfg>) => {
      const dateFormatted = new Date(`${visit.tanggal_kunjungan}T00:00:00+07:00`).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
      })
      const time = visit.jam_kunjungan ? visit.jam_kunjungan.slice(0, 5) : '--:--'
      return `🦷 *PENGINGAT JADWAL*\n${c.name}\n━━━━━━━━━━━━━━━━━━\nHalo ${patient.nama_lengkap},\nAnda memiliki jadwal kunjungan:\n📅 ${dateFormatted} jam ${time} WIB\n👨‍⚕️ Dokter: ${getDocName(visit.dokter)}\n📍 ${c.name}\n━━━━━━━━━━━━━━━━━━\nMohon hadir tepat waktu. Hubungi kami jika perlu reschedule: ${c.phone}`
    }

    // 4. H-1 hari (jam kerja saja)
    if (dayWindowOpen) {
      for (const visit of await fetchVisits(tomorrowStr)) {
        if (!cfg(visit.clinic_id).day) continue
        await process(visit, 'reminder_day', (p, c) => message(visit, p, c))
      }
    }

    // 5. H-1 jam: kunjungan hari ini yang mulai dalam 0–60 menit
    const nowMin = wib.getUTCHours() * 60 + wib.getUTCMinutes()
    for (const visit of await fetchVisits(todayStr)) {
      if (!cfg(visit.clinic_id).hour || !visit.jam_kunjungan) continue
      const [h, m] = String(visit.jam_kunjungan).split(':').map(Number)
      const diff = h * 60 + m - nowMin
      if (diff < 0 || diff > 60) continue
      await process(visit, 'reminder_hour', (p, c) => message(visit, p, c))
    }

    return json(200, { success: true, clinics: eligible.size, dayWindowOpen, processed: results })
  } catch (error: any) {
    console.error('send-appointment-reminders error:', error?.message)
    return json(500, { error: error?.message ?? 'Internal error' })
  }
})
