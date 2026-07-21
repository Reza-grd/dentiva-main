import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { getCorsHeaders } from "../_shared/corsHelper.ts";
import { syncOrganization } from "../_shared/resources/organization.ts";
import { syncLocation } from "../_shared/resources/location.ts";
import { syncPractitioner } from "../_shared/resources/practitioner.ts";
import { syncPatient } from "../_shared/resources/patient.ts";
import { buildAndSyncEncounter } from "../_shared/resources/encounter.ts";
import { buildAndSyncConditions } from "../_shared/resources/condition.ts";
import { buildAndSyncProcedures } from "../_shared/resources/procedure.ts";
import { buildAndSyncMedicationRequests } from "../_shared/resources/medicationRequest.ts";
import { buildAndSyncComposition } from "../_shared/resources/composition.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Item 6 Fix: Strict Role-Based Access Control (RBAC) & Service Role check
    let callingUserId: string | null = null;
    let callingUserRole: string | null = null;
    let isServiceRole = false;

    if (authHeader === `Bearer ${supabaseServiceKey}`) {
      isServiceRole = true;
    } else {
      const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid credentials' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      callingUserId = user.id;

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      callingUserRole = profile?.role || null;
    }

    // Role check: Only admin, dokter, or automated service role can process outbox queue
    const ALLOWED_ROLES = ['admin', 'dokter'];
    if (!isServiceRole && (!callingUserRole || !ALLOWED_ROLES.includes(callingUserRole))) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Insufficient role privileges to execute outbox processing queue.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
            await syncOrganization(supabaseAdmin, item.clinic_id, item.id, callingUserId);
            break;
          case 'Location':
            if (item.payload?.locationId) {
              await syncLocation(supabaseAdmin, item.payload.locationId, item.id, callingUserId);
            }
            break;
          case 'Practitioner':
            if (item.payload?.userId) {
              await syncPractitioner(supabaseAdmin, item.payload.userId, item.id, callingUserId);
            }
            break;
          case 'Patient':
            if (item.related_patient_id) {
              await syncPatient(supabaseAdmin, item.related_patient_id, item.id, callingUserId);
            }
            break;
          case 'Encounter':
            if (item.related_visit_id) {
              await buildAndSyncEncounter(supabaseAdmin, item.related_visit_id, item.id, callingUserId);
            }
            break;

          // Item 5 Fix: Add auto-retry handlers for Condition, Procedure, MedicationRequest, and Composition
          case 'Condition':
          case 'Procedure':
          case 'MedicationRequest':
          case 'Composition': {
            if (!item.related_visit_id) {
              console.warn(`Outbox item ${item.id} of type ${item.resource_type} missing related_visit_id. Cannot auto-retry.`);
              break;
            }

            const { data: visit, error: vErr } = await supabaseAdmin
              .from('visits')
              .select(`
                *,
                patient:patients(satusehat_patient_id),
                doctor:users(satusehat_practitioner_id)
              `)
              .eq('id', item.related_visit_id)
              .maybeSingle();

            if (vErr || !visit || !visit.satusehat_encounter_id || !visit.patient?.satusehat_patient_id) {
              console.warn(`Outbox item ${item.id}: Visit or prerequisite Encounter not ready for ${item.resource_type} retry.`);
              break;
            }

            const patientSId = visit.patient.satusehat_patient_id;
            const practitionerSId = visit.doctor?.satusehat_practitioner_id;
            const encounterId = visit.satusehat_encounter_id;
            const datePart = visit.tanggal_kunjungan || new Date().toISOString().split('T')[0];
            const timePart = visit.jam_kunjungan || '08:00';
            const isoTimestamp = `${datePart}T${timePart.substring(0, 5)}:00+07:00`;

            if (item.resource_type === 'Condition') {
              const code = item.payload?.code?.coding?.[0]?.code;
              const existingOutboxIds = code ? { [code]: item.id } : undefined;
              await buildAndSyncConditions(supabaseAdmin, visit.id, patientSId, encounterId, isoTimestamp, existingOutboxIds, callingUserId);
            } else if (item.resource_type === 'Procedure') {
              const code = item.payload?.code?.coding?.[0]?.code;
              const existingOutboxIds = code ? { [code]: item.id } : undefined;
              await buildAndSyncProcedures(supabaseAdmin, visit.id, patientSId, encounterId, isoTimestamp, existingOutboxIds, callingUserId);
            } else if (item.resource_type === 'MedicationRequest') {
              const code = item.payload?.medicationCodeableConcept?.coding?.[0]?.code;
              const existingOutboxIds = code ? { [code]: item.id } : undefined;
              await buildAndSyncMedicationRequests(supabaseAdmin, visit.id, patientSId, encounterId, isoTimestamp, existingOutboxIds, callingUserId);
            } else if (item.resource_type === 'Composition') {
              const syncedIds = visit.satusehat_resource_ids || {};
              const conditionIds = syncedIds.conditions || [];
              const procedureIds = syncedIds.procedures || [];
              const medicationRequestIds = syncedIds.medicationRequests || [];
              if (practitionerSId && conditionIds.length > 0) {
                await buildAndSyncComposition(
                  supabaseAdmin, visit.id, patientSId, practitionerSId, encounterId, isoTimestamp,
                  conditionIds, procedureIds, medicationRequestIds, item.id, callingUserId
                );
              }
            }
            break;
          }

          default:
            console.log(`Outbox item ${item.id} of type ${item.resource_type} is unhandled.`);
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
