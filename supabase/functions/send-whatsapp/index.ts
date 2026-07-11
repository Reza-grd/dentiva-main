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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment variables not configured in Edge Function' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const whapiToken = Deno.env.get('WHAPI_TOKEN')

    if (!whapiToken) {
      return new Response(JSON.stringify({ error: 'Whapi.cloud Token (WHAPI_TOKEN) is not configured in Supabase Secrets' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine final phone and patient ID
    let finalPhone = target || targetPhone
    let finalPatientId = patientId

    if (!finalPhone && visitId) {
      const { data: visit, error: visitErr } = await supabase
        .from('visits')
        .select(`patient_id, patient:patients(no_wa, wa_consent)`)
        .eq('id', visitId)
        .maybeSingle();

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

    const jidPhone = normalizePhoneForWhapi(finalPhone) + "@s.whatsapp.net";

    let msgType = messageType;
    if (isTest) msgType = 'test';
    if (!msgType) msgType = 'manual';

    console.log(`[WHAPI] Sending to ${jidPhone}`);

    let response;
    let responseText = '';
    try {
      response = await fetch('https://gate.whapi.cloud/messages/text', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${whapiToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ to: jidPhone, body: message }),
      })
      responseText = await response.text()
    } catch (e: any) {
      console.error(`[WHAPI] Network error: ${e.message}`)
      
      if (!isTest && (finalPatientId || visitId)) {
          await supabase.from('notification_logs').insert({
              patient_id: finalPatientId || null,
              visit_id: visitId || null,
              message_type: msgType,
              status: 'failed',
              gateway_response: `Network error: ${e.message}`,
              triggered_by: triggeredBy || null
          });
      }

      return new Response(JSON.stringify({ error: 'Network error calling Whapi.cloud: ' + e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[WHAPI] HTTP status: ${response.status} ${response.statusText}`)
    
    let data;
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error(`[WHAPI] Failed to parse response: ${responseText}`)
      if (!isTest && (finalPatientId || visitId)) {
        await supabase.from('notification_logs').insert({
            patient_id: finalPatientId || null,
            visit_id: visitId || null,
            message_type: msgType,
            status: 'failed',
            gateway_response: `Failed to parse response: ${responseText}`,
            triggered_by: triggeredBy || null
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to parse response from Whapi', rawResponse: responseText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isSuccess = response.ok && (!data.error);

    if (!isTest && (finalPatientId || visitId)) {
        await supabase.from('notification_logs').insert({
            patient_id: finalPatientId || null,
            visit_id: visitId || null,
            message_type: msgType,
            status: isSuccess ? 'sent' : 'failed',
            gateway_response: JSON.stringify(data).slice(0, 500),
            triggered_by: triggeredBy || null
        });
    }

    if (!isSuccess) {
      console.error(`[WHAPI] API failure: ${JSON.stringify(data)}`)
      return new Response(JSON.stringify({ error: data.message || data.error || 'Whapi send failure', detail: data }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[WHAPI] Success. Gateway response: ${JSON.stringify(data)}`)
    return new Response(JSON.stringify({ success: true, detail: data }), {
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
