import { fhirRequest } from '../fhirClient.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function buildAndSyncProcedures(
  supabaseAdmin: any,
  visitId: string,
  patientSId: string,
  encounterId: string,
  isoTimestamp: string,
  existingOutboxIds?: Record<string, string>
): Promise<string[]> {
  // 1. Fetch visit details for clinic_id and patient_id
  const { data: visit } = await supabaseAdmin
    .from('visits')
    .select('clinic_id, patient_id')
    .eq('id', visitId)
    .single();

  // 2. Fetch visit treatments with treatment codes
  const { data: vtList, error: vtErr } = await supabaseAdmin
    .from('visit_treatments')
    .select(`
      id,
      treatment:treatments(nama_tindakan, kode_icd9cm, kode_snomed_ct)
    `)
    .eq('visit_id', visitId);

  if (vtErr) {
    throw new Error('Failed to query visit treatments: ' + vtErr.message);
  }

  const procedureIds: string[] = [];

  for (const vt of (vtList || [])) {
    const code = vt.treatment?.kode_icd9cm;
    const name = vt.treatment?.nama_tindakan || 'Tindakan Gigi';

    if (!code) {
      console.warn(`[WARNING] Treatment ID ${vt.id} (${name}) has no kode_icd9cm. Skipping procedure sync.`);
      continue;
    }

    const fhirPayload = {
      resourceType: 'Procedure',
      status: 'completed',
      code: {
        coding: [
          {
            // TODO: verifikasi URI resmi CodeSystem ICD-9-CM SatuSehat
            system: 'http://hl7.org/fhir/sid/icd-9-cm',
            code: code,
            display: name
          }
        ]
      },
      subject: {
        reference: `Patient/${patientSId}`
      },
      encounter: {
        reference: `Encounter/${encounterId}`
      },
      performedDateTime: isoTimestamp
    };

    // Record Outbox Start
    const outboxId = await recordOutboxStart(supabaseAdmin, {
      clinicId: visit.clinic_id,
      resourceType: 'Procedure',
      relatedVisitId: visitId,
      relatedPatientId: visit.patient_id,
      payload: fhirPayload,
      outboxId: existingOutboxIds?.[code]
    });

    console.log(`Syncing Procedure ${code} (${name}) to SatuSehat Sandbox...`);
    const res = await fhirRequest(supabaseAdmin, 'POST', 'Procedure', fhirPayload);

    if (res.ok) {
      const procedureId = res.data.id;
      console.log(`Procedure ${code} created successfully with ID ${procedureId}`);
      await recordOutboxSuccess(supabaseAdmin, outboxId, procedureId);
      procedureIds.push(procedureId);
    } else {
      const errText = JSON.stringify(res.data);
      console.error(`Failed to create Procedure for code ${code}: HTTP ${res.status} - ${errText}`);
      await recordOutboxFailure(supabaseAdmin, outboxId, res.status, errText);
    }
  }

  return procedureIds;
}
