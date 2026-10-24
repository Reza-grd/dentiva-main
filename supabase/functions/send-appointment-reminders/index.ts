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
 * Duplikat dicegah dengan klaim atomik di notification_logs (indeks unik 'sending'/'sent' per kunjungan+jenis).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { decryptBatch } from "../_shared/decryptionHelper.ts"
import { configProblem, reminderTemplate, sendWhatsApp, sentLogFields } from "../_shared/whatsapp.ts"
import { DEFAULT_REMINDER_DAY, DEFAULT_REMINDER_HOUR, renderTemplate } from "../_shared/visitMessages.ts"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

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

  const waProblem = configProblem(Deno.env, 'reminder')
  if (waProblem) return json(500, { error: waProblem })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  try {
    // 0. Klaim 'sending' pengingat yang macet (> 10 menit): hasil tidak pasti → 'uncertain' (tidak dikirim ulang, agar tidak dobel).
    const { error: staleErr } = await supabase.from('notification_logs')
      .update({ status: 'uncertain', gateway_response: '[macet] klaim kedaluwarsa — hasil tidak pasti' })
      .in('message_type', ['reminder_day', 'reminder_hour']).eq('status', 'sending')
      .lt('timestamp', new Date(Date.now() - 10 * 60_000).toISOString())
    if (staleErr) throw staleErr

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
        tplDay: s['wa_template_reminder_day'] || '',
        tplHour: s['wa_template_reminder_hour'] || '',
      }
    }

    // 3. Waktu WIB (UTC+7) — tanggal & jam dihitung pada "jam dinding" WIB
    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const todayStr = wib.toISOString().split('T')[0]
    const tomorrowStr = new Date(wib.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const wibHour = wib.getUTCHours()
    const dayWindowOpen = wibHour >= 8 && wibHour < 20

    // Teks untuk sidecar/Whapi; penyedia Meta memakai template resmi bila dikonfigurasi.
    const sendReminder = async (phone: string, text: string, params: string[], key: string) => {
      const r = await sendWhatsApp({ to: phone, text, template: reminderTemplate(params), idempotencyKey: key, kind: 'reminder' })
      if (!r.ok) throw Object.assign(new Error(r.error || 'Pengiriman WhatsApp gagal'), { retryable: r.retryable === true })
      return { resp: { provider: r.provider, id: r.id }, fields: await sentLogFields(r, phone) }
    }

    const fetchVisits = async (date: string) => {
      const { data, error } = await supabase
        .from('visits')
        .select(`id, clinic_id, patient_id, tanggal_kunjungan, jam_kunjungan,
                 patient:patients (nama_lengkap, no_wa, wa_consent),
                 dokter:users!visits_dokter_id_fkey (full_name, gelar_depan, gelar_belakang)`)
        .eq('tanggal_kunjungan', date)
        .eq('status', 'scheduled')
        .is('deleted_at', null)
        .in('clinic_id', [...eligible.keys()])
      if (error) throw error
      return data ?? []
    }

    const results: Array<Record<string, unknown>> = []

    const process = async (visit: any, type: 'reminder_day' | 'reminder_hour', build: (p: any, c: ReturnType<typeof cfg>) => { text: string; params: string[] }) => {
      // Riwayat log kunjungan+jenis ini. 'sending'/'sent'/'failed' = final; 'skipped_*' hanya mencegah log ganda
      // (persetujuan/nomor yang diperbaiki kemudian tetap dinilai ulang selama jendela pengingat masih terbuka).
      const { data: logs, error: logErr } = await supabase
        .from('notification_logs')
        .select('status')
        .eq('visit_id', visit.id)
        .eq('message_type', type)
      if (logErr) throw logErr
      const statuses = (logs ?? []).map((l: any) => l.status as string)
      if (statuses.some((st) => ['sending', 'sent', 'failed', 'uncertain'].includes(st))) return
      const alreadySkipped = statuses.some((st) => st.startsWith('skipped_'))

      const logSkip = async (status: string, why: string) => {
        if (alreadySkipped) return
        const { error } = await supabase.from('notification_logs').insert([{
          visit_id: visit.id, patient_id: visit.patient_id, clinic_id: visit.clinic_id, message_type: type, status, gateway_response: why,
        }])
        if (error) console.error('send-appointment-reminders: log skip gagal:', error.message)
      }

      if (!visit.patient) return
      if (visit.patient.wa_consent !== true) {
        await logSkip('skipped_no_consent', 'Patient wa_consent is false or null')
        results.push({ visitId: visit.id, type, status: 'skipped_no_consent' })
        return
      }
      const [nama, wa] = await decryptBatch(supabase, [visit.patient.nama_lengkap || '', visit.patient.no_wa || ''])
      if (!wa) {
        await logSkip('skipped_no_phone', 'Nomor WA kosong')
        results.push({ visitId: visit.id, type, status: 'skipped_no_phone' })
        return
      }

      // Klaim atomik (indeks unik per kunjungan+jenis untuk 'sending'/'sent'): hanya satu pemanggil yang mengirim.
      const { data: claim, error: claimErr } = await supabase.from('notification_logs').insert([{
        visit_id: visit.id, patient_id: visit.patient_id, clinic_id: visit.clinic_id, message_type: type, status: 'sending', gateway_response: '',
      }]).select('id').single()
      if (claimErr) {
        if (claimErr.code !== '23505') console.error('send-appointment-reminders: klaim gagal:', claimErr.code, claimErr.message)
        results.push({ visitId: visit.id, type, status: claimErr.code === '23505' ? 'already_in_progress' : 'error' })
        return
      }
      const setStatus = async (status: string, why: string, extra: Record<string, unknown> = {}) => {
        const { error } = await supabase.from('notification_logs').update({ status, gateway_response: why.slice(0, 500), ...extra }).eq('id', claim.id)
        if (error) console.error('send-appointment-reminders: status log gagal diperbarui:', status, error.message)
        return !error
      }

      try {
        const { text, params } = build({ ...visit.patient, nama_lengkap: nama }, cfg(visit.clinic_id))
        const { resp, fields } = await sendReminder(wa, text, params, `${type}:${visit.id}`)
        // Pesan sudah terkirim; bila log gagal diperbarui, klaim tetap 'sending' (tidak dikirim ulang; sweep menandai 'uncertain').
        const ok = await setStatus('sent', JSON.stringify(resp), fields)
        results.push({ visitId: visit.id, type, status: ok ? 'sent' : 'sent_log_failed' })
      } catch (err: any) {
        // Gangguan sementara (WA belum tersambung, batas kirim, jaringan): klaim dilepas agar dicoba lagi di putaran
        // cron berikutnya selama jendela masih terbuka. Galat permanen dicatat 'failed' (tidak diulang).
        if (err.retryable) {
          const { error } = await supabase.from('notification_logs').delete().eq('id', claim.id)
          if (error) console.error('send-appointment-reminders: klaim gagal dilepas:', error.message)
          results.push({ visitId: visit.id, type, status: 'deferred', error: err.message })
          return
        }
        await setStatus('failed', err.message || 'gagal')
        results.push({ visitId: visit.id, type, status: 'failed', error: err.message })
      }
    }

    const message = (visit: any, patient: any, c: ReturnType<typeof cfg>, type: 'reminder_day' | 'reminder_hour') => {
      const dateFormatted = new Date(`${visit.tanggal_kunjungan}T00:00:00+07:00`).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
      })
      const time = visit.jam_kunjungan ? visit.jam_kunjungan.slice(0, 5) : '--:--'
      const params = [patient.nama_lengkap, dateFormatted, `${time} WIB`, getDocName(visit.dokter), c.name, c.phone]
      const text = renderTemplate(type === 'reminder_day' ? c.tplDay : c.tplHour, {
        nama: patient.nama_lengkap || 'Bapak/Ibu', klinik: c.name, tanggal: dateFormatted, jam: time,
        dokter: getDocName(visit.dokter), telepon: c.phone,
      }, type === 'reminder_day' ? DEFAULT_REMINDER_DAY : DEFAULT_REMINDER_HOUR)
      return { text, params }
    }

    // 4. H-1 hari (jam kerja saja)
    if (dayWindowOpen) {
      for (const visit of await fetchVisits(tomorrowStr)) {
        if (!cfg(visit.clinic_id).day) continue
        await process(visit, 'reminder_day', (p, c) => message(visit, p, c, 'reminder_day'))
      }
    }

    // 5. H-1 jam: kunjungan hari ini yang mulai dalam 0–60 menit
    const nowMin = wib.getUTCHours() * 60 + wib.getUTCMinutes()
    for (const visit of await fetchVisits(todayStr)) {
      if (!cfg(visit.clinic_id).hour || !visit.jam_kunjungan) continue
      const [h, m] = String(visit.jam_kunjungan).split(':').map(Number)
      const diff = h * 60 + m - nowMin
      if (diff < 0 || diff > 60) continue
      await process(visit, 'reminder_hour', (p, c) => message(visit, p, c, 'reminder_hour'))
    }

    return json(200, { success: true, clinics: eligible.size, dayWindowOpen, processed: results })
  } catch (error: any) {
    console.error('send-appointment-reminders error:', error?.message)
    return json(500, { error: error?.message ?? 'Internal error' })
  }
})
