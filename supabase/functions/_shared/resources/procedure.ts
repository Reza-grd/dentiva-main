import { fhirRequest } from '../fhirClient.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function buildAndSyncProcedures(
  supabaseAdmin: any,
  visitId: string,
  patientSId: string,
  encounterId: string,
  isoTimestamp: string,
  existingOutboxIds?: Record<string, string>,
  triggeredBy?: string | null
): Promise<string[]> {
  // 1. Fetch visit details for clinic_id and patient_id
  const { data: visit } = await supabaseAdmin
    .from('visits')
    .select('clinic_id, patient_id')
    .eq('id', visitId)
    .single();

  // 2. Fetch visit treatments with treatment codes (ICD-9-CM and SNOMED-CT)
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
    const icd9Code = vt.treatment?.kode_icd9cm;
    const snomedCode = vt.treatment?.kode_snomed_ct;
    const name = vt.treatment?.nama_tindakan || 'Tindakan Gigi';

    if (!icd9Code && !snomedCode) {
      console.warn(`[WARNING] Treatment ID ${vt.id} (${name}) has neither kode_icd9cm nor kode_snomed_ct. Skipping procedure sync.`);
      continue;
    }

    // Build CodeableConcept codings array supporting ICD-9-CM, SNOMED CT, or both
    // Verified: SATUSEHAT Procedure Profile accepts http://hl7.org/fhir/sid/icd-9-cm and http://snomed.info/sct
    // Source: SATUSEHAT FHIR Implementation Guide - Procedure Resource Profile (fhir.kemkes.go.id)
    const codings: any[] = [];
    
    if (icd9Code) {
      codings.push({
        system: 'http://hl7.org/fhir/sid/icd-9-cm',
        code: icd9Code,
        display: name
      });
    }

    if (snomedCode) {
      codings.push({
        system: 'http://snomed.info/sct',
        code: snomedCode,
        display: name
      });
    }

    const primaryCodeKey = icd9Code || snomedCode || 'proc';

    const fhirPayload = {
      resourceType: 'Procedure',
      status: 'completed',
      code: {
        coding: codings
      },
      subject: {
        reference: `Patient/${patientSId}`
      },
      encounter: {
        reference: `Encounter/${encounterId}`
      },
      performedDateTime: isoTimestamp
    };

    // Record Outbox Start with audit trail
    const outboxId = await recordOutboxStart(supabaseAdmin, {
      clinicId: visit.clinic_id,
      resourceType: 'Procedure',
      relatedVisitId: visitId,
      relatedPatientId: visit.patient_id,
      payload: fhirPayload,
      outboxId: existingOutboxIds?.[primaryCodeKey],
      triggeredBy: triggeredBy
    });

    // Search-before-create for idempotency
    const searchCodeParam = icd9Code || snomedCode;
    const searchQuery = `Procedure?encounter=Encounter/${encounterId}&code=${searchCodeParam}`;
    console.log(`Checking existing Procedure on SATUSEHAT: GET ${searchQuery}...`);
    const searchRes = await fhirRequest(supabaseAdmin, 'GET', searchQuery);

    if (searchRes.ok && searchRes.data && searchRes.data.entry && searchRes.data.entry.length > 0) {
      const existingId = searchRes.data.entry[0].resource.id;
      console.log(`Found existing Procedure ID ${existingId} on SATUSEHAT Sandbox.`);
      await recordOutboxSuccess(supabaseAdmin, outboxId, existingId);
      procedureIds.push(existingId);
      continue;
    }

    console.log(`Syncing Procedure ${primaryCodeKey} (${name}) to SatuSehat Sandbox...`);
    const res = await fhirRequest(supabaseAdmin, 'POST', 'Procedure', fhirPayload);

    if (res.ok) {
      const procedureId = res.data.id;
      console.log(`Procedure ${primaryCodeKey} created successfully with ID ${procedureId}`);
      await recordOutboxSuccess(supabaseAdmin, outboxId, procedureId);
      procedureIds.push(procedureId);
    } else {
      const errText = JSON.stringify(res.data);
      console.error(`Failed to create Procedure for code ${primaryCodeKey}: HTTP ${res.status} - ${errText}`);
      await recordOutboxFailure(supabaseAdmin, outboxId, res.status, errText);
    }
  }

  return procedureIds;
}
