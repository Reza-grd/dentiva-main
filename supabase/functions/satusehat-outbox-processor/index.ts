import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { syncOrganization } from "../_shared/resources/organization.ts";
import { syncLocation } from "../_shared/resources/location.ts";
import { syncPractitioner } from "../_shared/resources/practitioner.ts";
import { syncPatient } from "../_shared/resources/patient.ts";
import { buildAndSyncEncounter } from "../_shared/resources/encounter.ts";
import { buildAndSyncConditions } from "../_shared/resources/condition.ts";
import { buildAndSyncProcedures } from "../_shared/resources/procedure.ts";
import { buildAndSyncMedicationRequests } from "../_shared/resources/medicationRequest.ts";
import { buildAndSyncComposition } from "../_shared/resources/composition.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment variables not configured in Edge Function' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify credentials
    let isAuthorized = false;
    if (authHeader === `Bearer ${supabaseServiceKey}`) {
      isAuthorized = true;
    } else {
      const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (!authError && user) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const nowIso = new Date().toISOString();

    // Query pending or ready-to-retry outbox items
    const { data: queue, error: queueErr } = await supabaseAdmin
      .from('satusehat_outbox')
      .select('*')
      .or(`status.eq.pending,and(status.eq.failed_retryable,next_retry_at.lte.${nowIso})`)
      .order('created_at', { ascending: true })
      .limit(20);

    if (queueErr) {
      throw new Error('Failed to query outbox queue: ' + queueErr.message);
    }

    console.log(`Outbox Processor: Processing ${queue?.length || 0} queued items...`);

    let successCount = 0;
    let failedCount = 0;

    for (const item of (queue || [])) {
      try {
        switch (item.resource_type) {
          case 'Organization':
            await syncOrganization(supabaseAdmin, item.clinic_id, item.id);
            break;
          case 'Location':
            if (item.payload?.locationId) {
              await syncLocation(supabaseAdmin, item.payload.locationId, item.id);
            }
            break;
          case 'Practitioner':
            if (item.payload?.userId) {
              await syncPractitioner(supabaseAdmin, item.payload.userId, item.id);
            }
            break;
          case 'Patient':
            if (item.related_patient_id) {
              await syncPatient(supabaseAdmin, item.related_patient_id, item.id);
            }
            break;
          case 'Encounter':
            if (item.related_visit_id) {
              await buildAndSyncEncounter(supabaseAdmin, item.related_visit_id, item.id);
            }
            break;
          default:
            console.log(`Outbox item ${item.id} of type ${item.resource_type} will be retried via visit sync or manual action.`);
            break;
        }
        successCount++;
      } catch (err: any) {
        console.error(`Error processing outbox item ${item.id} (${item.resource_type}):`, err.message);
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: queue?.length || 0,
        successCount,
        failedCount,
        timestamp: nowIso
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error during outbox processing execution:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
