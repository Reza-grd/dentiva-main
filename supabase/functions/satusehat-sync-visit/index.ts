import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { buildAndSyncEncounter } from "../_shared/resources/encounter.ts";
import { buildAndSyncConditions } from "../_shared/resources/condition.ts";
import { buildAndSyncProcedures } from "../_shared/resources/procedure.ts";
import { buildAndSyncMedicationRequests } from "../_shared/resources/medicationRequest.ts";
import { buildAndSyncComposition } from "../_shared/resources/composition.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { visitId } = body;
    if (!visitId) {
      return new Response(JSON.stringify({ error: 'visitId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting SatuSehat Clinical Sync for Visit ID: ${visitId}...`);

    // 1. Sync Encounter (Step 1)
    const encounterId = await buildAndSyncEncounter(supabaseAdmin, visitId);

    // 2. Fetch updated visit to retrieve patientSId, practitionerSId and date details
    const { data: visit, error: visitErr } = await supabaseAdmin
      .from('visits')
      .select(`
        *,
        patient:patients(satusehat_patient_id),
        doctor:users(satusehat_practitioner_id)
      `)
      .eq('id', visitId)
      .single();

    if (visitErr || !visit) {
      throw new Error('Failed to retrieve updated visit data: ' + (visitErr?.message || 'Not found'));
    }

    const patientSId = visit.patient.satusehat_patient_id;
    const practitionerSId = visit.doctor.satusehat_practitioner_id;

    const datePart = visit.tanggal_kunjungan || new Date().toISOString().split('T')[0];
    const timePart = visit.jam_kunjungan || '08:00';
    const isoTimestamp = `${datePart}T${timePart.substring(0, 5)}:00+07:00`;

    // 3. Sync Conditions (Step 2)
    const conditionIds = await buildAndSyncConditions(
      supabaseAdmin,
      visitId,
      patientSId,
      encounterId,
      isoTimestamp
    );

    // 4. Sync Procedures (Step 3)
    const procedureIds = await buildAndSyncProcedures(
      supabaseAdmin,
      visitId,
      patientSId,
      encounterId,
      isoTimestamp
    );

    // 5. Sync MedicationRequests (Step 4)
    const medicationRequestIds = await buildAndSyncMedicationRequests(
      supabaseAdmin,
      visitId,
      patientSId,
      encounterId,
      isoTimestamp
    );

    // Save mapping list of successfully synced resources
    const resourceIds = {
      conditions: conditionIds,
      procedures: procedureIds,
      medicationRequests: medicationRequestIds
    };
    
    await supabaseAdmin
      .from('visits')
      .update({ satusehat_resource_ids: resourceIds })
      .eq('id', visitId);

    // 6. Sync Composition (Step 5)
    // Composition only runs if Encounter succeeded and at least one Condition is synced successfully.
    let compositionId = null;
    if (conditionIds.length > 0) {
      compositionId = await buildAndSyncComposition(
        supabaseAdmin,
        visitId,
        patientSId,
        practitionerSId,
        encounterId,
        isoTimestamp,
        conditionIds,
        procedureIds,
        medicationRequestIds
      );
    } else {
      console.warn('Skipping Composition sync: A medical resume requires at least one successfully synced Condition/Diagnosis.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          encounterId,
          conditionIds,
          procedureIds,
          medicationRequestIds,
          compositionId
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error during clinical sync execution:', err);
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
