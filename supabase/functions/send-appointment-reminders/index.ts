import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function normalizePhoneForWhapi(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '')
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1)
  }
  return clean
}

// In-memory rate limiting per client IP
const rateLimitMap = new Map<string, number[]>()

function isRateLimited(ip: string, limit = 100, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) || []
  const activeTimestamps = timestamps.filter(t => now - t < windowMs)
  
  if (activeTimestamps.length >= limit) {
    return true
  }
  
  activeTimestamps.push(now)
  rateLimitMap.set(ip, activeTimestamps)
  return false
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Rate Limiting Check
  const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || '127.0.0.1'
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too Many Requests: Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!

    if (!authHeader || authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Service role key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('clinic_settings')
      .select('key, value')

    if (settingsError) throw settingsError

    const settings: Record<string, string> = {}
    settingsData.forEach((s) => {
      settings[s.key] = s.value
    })

    const clinicName = settings['clinic_name'] || 'Dentiva Dental Clinic'
    const clinicPhone = settings['clinic_phone'] || '-'
    const whapiToken = Deno.env.get('WHAPI_TOKEN')
    const h1DayEnabled = settings['wa_reminder_h1_day_enabled'] !== 'false'
    const h1HourEnabled = settings['wa_reminder_h1_hour_enabled'] !== 'false'

    if (!whapiToken) {
      throw new Error('Whapi.cloud Token is not configured')
    }

    // Helper to format Doctor Name
    const getDocName = (doc: any) => {
      if (!doc) return 'Dokter Gigi'
      const gDepan = doc.gelar_depan ? `${doc.gelar_depan.trim()} ` : ''
      const gBelakang = doc.gelar_belakang ? `, ${doc.gelar_belakang.trim()}` : ''
      return `${gDepan}${doc.full_name || ''}${gBelakang}`
    }

    // 2. Setup Timezones (WIB = UTC+7)
    const now = new Date()
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
    const todayStr = wibTime.toISOString().split('T')[0]

    const tomorrow = new Date(wibTime.getTime() + (24 * 60 * 60 * 1000))
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const results = []

    // Helper to send message via Whapi.cloud
    const sendWhapi = async (phone: string, text: string) => {
      const jidPhone = normalizePhoneForWhapi(phone) + "@s.whatsapp.net";
      const response = await fetch('https://gate.whapi.cloud/messages/text', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whapiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: jidPhone,
          body: text,
        }),
      })
      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.message || data.error || 'Whapi send failure')
      }
      return data
    }

    // 3. Process H-1 Day Reminders
    if (h1DayEnabled) {
      const { data: tomorrowVisits, error: tomorrowErr } = await supabase
        .from('visits')
        .select(`
          id,
          patient_id,
          tanggal_kunjungan,
          jam_kunjungan,
          patient:patients (nama_lengkap, no_wa, wa_consent),
          dokter:users (full_name, gelar_depan, gelar_belakang)
        `)
        .eq('tanggal_kunjungan', tomorrowStr)
        .eq('status', 'scheduled')

      if (tomorrowErr) throw tomorrowErr

      for (const visit of (tomorrowVisits || [])) {
        const patient = visit.patient
        if (!patient?.no_wa) continue

        // Check logs to prevent duplicate H-1 Day sends
        const { data: existingLog, error: logErr } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('visit_id', visit.id)
          .eq('message_type', 'reminder_day')
          .maybeSingle()

        if (logErr) continue
        if (existingLog) continue // Skip if already logged (sent, failed, or skipped)

        if (patient.wa_consent !== true) {
            await supabase.from('notification_logs').insert([{
                visit_id: visit.id,
                patient_id: visit.patient_id,
                message_type: 'reminder_day',
                status: 'skipped_no_consent',
                gateway_response: 'Patient wa_consent is false or null'
            }]);
            results.push({ visitId: visit.id, type: 'reminder_day', status: 'skipped_no_consent' })
            continue;
        }

        // Compile H-1 Day Message
        const dateFormatted = new Date(visit.tanggal_kunjungan).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        const timeFormatted = visit.jam_kunjungan ? visit.jam_kunjungan.slice(0, 5) : '--:--'
        const docName = getDocName(visit.dokter)

        const message = `🦷 *PENGINGAT JADWAL*\n${clinicName}\n━━━━━━━━━━━━━━━━━━\nHalo ${patient.nama_lengkap},\nAnda memiliki jadwal kunjungan:\n📅 ${dateFormatted} jam ${timeFormatted} WIB\n👨‍⚕️ Dokter: ${docName}\n📍 ${clinicName}\n━━━━━━━━━━━━━━━━━━\nMohon hadir tepat waktu. Hubungi kami jika perlu reschedule: ${clinicPhone}`

        try {
          const respData = await sendWhapi(patient.no_wa, message)
          // Log success
          await supabase.from('notification_logs').insert([{
            visit_id: visit.id,
            patient_id: visit.patient_id,
            message_type: 'reminder_day',
            status: 'sent',
            gateway_response: JSON.stringify(respData).slice(0, 500)
          }])
          results.push({ visitId: visit.id, type: 'reminder_day', status: 'sent' })
        } catch (err: any) {
          // Log failure
          await supabase.from('notification_logs').insert([{
            visit_id: visit.id,
            patient_id: visit.patient_id,
            message_type: 'reminder_day',
            status: 'failed',
            gateway_response: err.message
          }])
          results.push({ visitId: visit.id, type: 'reminder_day', status: 'failed', error: err.message })
        }
      }
    }

    // 4. Process H-1 Hour Reminders
    if (h1HourEnabled) {
      const { data: todayVisits, error: todayErr } = await supabase
        .from('visits')
        .select(`
          id,
          patient_id,
          tanggal_kunjungan,
          jam_kunjungan,
          patient:patients (nama_lengkap, no_wa, wa_consent),
          dokter:users (full_name, gelar_depan, gelar_belakang)
        `)
        .eq('tanggal_kunjungan', todayStr)
        .eq('status', 'scheduled')

      if (todayErr) throw todayErr

      const nowMs = wibTime.getTime()
      const oneHourLaterMs = nowMs + (60 * 60 * 1000)

      const h1HourVisits = (todayVisits || []).filter((v) => {
        if (!v.jam_kunjungan) return false
        const [h, m] = v.jam_kunjungan.split(':').map(Number)
        const visitTime = new Date(wibTime)
        visitTime.setHours(h, m, 0, 0)
        const visitMs = visitTime.getTime()
        // Send if appointment is starting within the next 0 to 60 minutes
        return visitMs >= nowMs && visitMs <= oneHourLaterMs
      })

      for (const visit of h1HourVisits) {
        const patient = visit.patient
        if (!patient?.no_wa) continue

        // Check logs to prevent duplicate H-1 Hour sends
        const { data: existingLog, error: logErr } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('visit_id', visit.id)
          .eq('message_type', 'reminder_hour')
          .maybeSingle()

        if (logErr) continue
        if (existingLog) continue // Skip if sent

        if (patient.wa_consent !== true) {
            await supabase.from('notification_logs').insert([{
                visit_id: visit.id,
                patient_id: visit.patient_id,
                message_type: 'reminder_hour',
                status: 'skipped_no_consent',
                gateway_response: 'Patient wa_consent is false or null'
            }]);
            results.push({ visitId: visit.id, type: 'reminder_hour', status: 'skipped_no_consent' })
            continue;
        }

        // Compile H-1 Hour Message
        const dateFormatted = new Date(visit.tanggal_kunjungan).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        const timeFormatted = visit.jam_kunjungan ? visit.jam_kunjungan.slice(0, 5) : '--:--'
        const docName = getDocName(visit.dokter)

        const message = `🦷 *PENGINGAT JADWAL*\n${clinicName}\n━━━━━━━━━━━━━━━━━━\nHalo ${patient.nama_lengkap},\nAnda memiliki jadwal kunjungan:\n📅 ${dateFormatted} jam ${timeFormatted} WIB\n👨‍⚕️ Dokter: ${docName}\n📍 ${clinicName}\n━━━━━━━━━━━━━━━━━━\nMohon hadir tepat waktu. Hubungi kami jika perlu reschedule: ${clinicPhone}`

        try {
          const respData = await sendWhapi(patient.no_wa, message)
          // Log success
          await supabase.from('notification_logs').insert([{
            visit_id: visit.id,
            patient_id: visit.patient_id,
            message_type: 'reminder_hour',
            status: 'sent',
            gateway_response: JSON.stringify(respData).slice(0, 500)
          }])
          results.push({ visitId: visit.id, type: 'reminder_hour', status: 'sent' })
        } catch (err: any) {
          // Log failure
          await supabase.from('notification_logs').insert([{
            visit_id: visit.id,
            patient_id: visit.patient_id,
            message_type: 'reminder_hour',
            status: 'failed',
            gateway_response: err.message
          }])
          results.push({ visitId: visit.id, type: 'reminder_hour', status: 'failed', error: err.message })
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Error in send-appointment-reminders function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
