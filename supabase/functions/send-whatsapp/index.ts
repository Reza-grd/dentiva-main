import { requireActiveAccount } from "../_shared/activeAccount.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { decryptBatch } from "../_shared/decryptionHelper.ts"
import { configProblem, sendWhatsApp } from "../_shared/whatsapp.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment variables not configured in Edge Function' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify credentials
    let isAuthorized = false
    if (authHeader === `Bearer ${supabaseServiceKey}`) {
      isAuthorized = true
    } else {
      const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user }, error: authError } = await userClient.auth.getUser()
      if (!authError && user) {
        try { await requireActiveAccount(userClient, ['admin','dokter','resepsionis']); }
        catch { return new Response(JSON.stringify({error:'Forbidden: akun atau klinik tidak aktif'}), {status:403,headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Server-Side SaaS Feature Gating: whatsapp_reminders
    let callingClinicId: string | null = null;
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('clinic_id')
          .eq('id', user.id)
          .maybeSingle()
        callingClinicId = profile?.clinic_id || null
      }
    }

    if (callingClinicId) {
      const { data: sub } = await supabase
        .from('clinic_subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('clinic_id', callingClinicId)
        // Klinik trial boleh mencoba fitur paketnya (dulu hanya 'active' → trial selalu 403).
        .in('status', ['trialing', 'active'])
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle()

      const hasWaFeature = sub?.plan?.features?.whatsapp_reminders === true
      if (!hasWaFeature) {
        return new Response(
          JSON.stringify({
            error: "Forbidden: WhatsApp Reminders feature is not included in your clinic's subscription plan. Please upgrade to Pro or Enterprise.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    let body;
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { visitId, patientId, isTest, targetPhone, target, message, messageType, triggeredBy } = body

    // Isolasi klinik: data dibaca dengan service role, jadi pastikan kunjungan/pasien
    // milik klinik pemanggil (dulu staf klinik A bisa memicu pesan ke pasien klinik B).
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      const forbidden = () => new Response(JSON.stringify({ error: 'Forbidden: data bukan milik klinik Anda' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
      if (!callingClinicId) return forbidden()
      if (visitId) {
        const { data: v } = await supabase.from('visits').select('clinic_id').eq('id', visitId).maybeSingle()
        if (!v || v.clinic_id !== callingClinicId) return forbidden()
      }
      if (patientId) {
        const { data: p } = await supabase.from('patients').select('clinic_id').eq('id', patientId).maybeSingle()
        if (!p || p.clinic_id !== callingClinicId) return forbidden()
      }
    }

    const waProblem = configProblem()
    if (waProblem) {
      return new Response(JSON.stringify({ error: waProblem }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine final phone and patient ID
    let finalPhone = target || targetPhone
    let finalPatientId = patientId

    if (!finalPhone && visitId) {
      const { data: visitRow, error: visitErr } = await supabase
        .from('visits')
        .select(`patient_id, patient:patients(no_wa, wa_consent)`)
        .eq('id', visitId)
        .maybeSingle();
      // deno-lint-ignore no-explicit-any
      const visit = visitRow as any;

      if (!visitErr && visit) {
        if (!finalPatientId) finalPatientId = visit.patient_id;
        if (!finalPhone && visit.patient?.no_wa) finalPhone = visit.patient.no_wa;
        
        // Consent check for normal messages
        if (!isTest && visit.patient && visit.patient.wa_consent !== true) {
            console.log(`[SKIP] Patient ${finalPatientId} did not give WA consent.`);
            if (finalPatientId || visitId) {
                await supabase.from('notification_logs').insert({
                    patient_id: finalPatientId,
                    visit_id: visitId,
                    message_type: messageType || 'manual',
                    status: 'skipped_no_consent',
                    gateway_response: 'Patient wa_consent is false or null',
                    triggered_by: triggeredBy || null
                });
            }
            return new Response(JSON.stringify({ success: false, reason: 'skipped_no_consent' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
      }
    } else if (!isTest && finalPatientId) {
      const { data: patient, error: patientErr } = await supabase
        .from('patients')
        .select(`wa_consent, no_wa`)
        .eq('id', finalPatientId)
        .maybeSingle();

      if (!patientErr && patient) {
        if (!finalPhone && patient.no_wa) finalPhone = patient.no_wa;
        
        if (patient.wa_consent !== true) {
            console.log(`[SKIP] Patient ${finalPatientId} did not give WA consent.`);
            await supabase.from('notification_logs').insert({
                patient_id: finalPatientId,
                visit_id: visitId || null,
                message_type: messageType || 'manual',
                status: 'skipped_no_consent',
                gateway_response: 'Patient wa_consent is false or null',
                triggered_by: triggeredBy || null
            });
            return new Response(JSON.stringify({ success: false, reason: 'skipped_no_consent' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
      }
    }

    // no_wa dari tabel patients tersimpan terenkripsi (PGP:…).
    if (finalPhone && finalPhone.startsWith('PGP:')) {
      [finalPhone] = await decryptBatch(supabase, [finalPhone]);
    }

    if (!finalPhone) {
      return new Response(JSON.stringify({ error: 'Recipient phone number is missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let msgType = messageType;
    if (isTest) msgType = 'test';
    if (!msgType) msgType = 'manual';

    const result = await sendWhatsApp({ to: finalPhone, text: message })
    console.log(`[WA] ${result.provider ?? '-'} type=${msgType} ok=${result.ok}`)

    if (!isTest && (finalPatientId || visitId)) {
      await supabase.from('notification_logs').insert({
        patient_id: finalPatientId || null,
        visit_id: visitId || null,
        message_type: msgType,
        status: result.ok ? 'sent' : 'failed',
        gateway_response: JSON.stringify(result.ok ? { provider: result.provider, id: result.id } : { provider: result.provider, error: result.error }).slice(0, 500),
        triggered_by: triggeredBy || null
      });
    }

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error || 'Pengiriman WhatsApp gagal', detail: result.detail ?? null }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, detail: { provider: result.provider, id: result.id } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Fatal Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
