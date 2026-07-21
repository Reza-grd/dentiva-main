import { fhirRequest } from '../fhirClient.ts';
import { decryptBatch } from '../decryptionHelper.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function buildAndSyncConditions(
  supabaseAdmin: any,
  visitId: string,
  patientSId: string,
  encounterId: string,
  isoTimestamp: string,
  existingOutboxIds?: Record<string, string>,
  triggeredBy?: string | null
): Promise<string[]> {
  // 1. Fetch the visit details
  const { data: visit, error: fetchErr } = await supabaseAdmin
    .from('visits')
    .select('clinic_id, patient_id, kode_icd10, diagnosa')
    .eq('id', visitId)
    .maybeSingle();

  if (fetchErr || !visit) {
    throw new Error('Failed to fetch diagnosis for conditions sync: ' + (fetchErr?.message || 'Not found'));
  }

  if (!visit.kode_icd10) {
    console.log(`No ICD-10 code found for visit ${visitId}. Skipping condition sync.`);
    return [];
  }

  // 2. Decrypt diagnosa (will throw error on failure, preventing ciphertext leakage)
  let decryptedDiagnosa = '';
  if (visit.diagnosa) {
    const decrypted = await decryptBatch(supabaseAdmin, [visit.diagnosa]);
    decryptedDiagnosa = decrypted[0] || '';
  }

  const codes = visit.kode_icd10.split(',').map((c: string) => c.trim()).filter(Boolean);
  const conditionIds: string[] = [];

  for (const code of codes) {
    // Verified: SATUSEHAT Condition Profile specifies http://hl7.org/fhir/sid/icd-10 for ICD-10 diagnosis codes
    // Source: SATUSEHAT FHIR Implementation Guide - Condition Resource Profile (fhir.kemkes.go.id)
    const icd10SystemUri = 'http://hl7.org/fhir/sid/icd-10';

    const fhirPayload = {
      resourceType: 'Condition',
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active',
            display: 'Active'
          }
        ]
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'confirmed',
            display: 'Confirmed'
          }
        ]
      },
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-category',
              code: 'encounter-diagnosis',
              display: 'Encounter Diagnosis'
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: icd10SystemUri,
            code: code,
            display: decryptedDiagnosa || `Diagnosis ${code}`
          }
        ]
      },
      subject: {
        reference: `Patient/${patientSId}`
      },
      encounter: {
        reference: `Encounter/${encounterId}`
      },
      recordedDate: isoTimestamp
    };

    // Record Outbox Start with audit logging
    const outboxId = await recordOutboxStart(supabaseAdmin, {
      clinicId: visit.clinic_id,
      resourceType: 'Condition',
      relatedVisitId: visitId,
      relatedPatientId: visit.patient_id,
      payload: fhirPayload,
      outboxId: existingOutboxIds?.[code],
      triggeredBy: triggeredBy
    });

    // Search-before-create for idempotency during retries
    const searchQuery = `Condition?encounter=Encounter/${encounterId}&code=${code}`;
    console.log(`Checking existing Condition on SATUSEHAT: GET ${searchQuery}...`);
    const searchRes = await fhirRequest(supabaseAdmin, 'GET', searchQuery);

    if (searchRes.ok && searchRes.data && searchRes.data.entry && searchRes.data.entry.length > 0) {
      const existingId = searchRes.data.entry[0].resource.id;
      console.log(`Found existing Condition ID ${existingId} on SATUSEHAT Sandbox.`);
      await recordOutboxSuccess(supabaseAdmin, outboxId, existingId);
      conditionIds.push(existingId);
      continue;
    }

    console.log(`Syncing Condition ${code} to SatuSehat Sandbox...`);
    const res = await fhirRequest(supabaseAdmin, 'POST', 'Condition', fhirPayload);
    
    if (res.ok) {
      const conditionId = res.data.id;
      console.log(`Condition ${code} created successfully with ID ${conditionId}`);
      await recordOutboxSuccess(supabaseAdmin, outboxId, conditionId);
      conditionIds.push(conditionId);
    } else {
      const errText = JSON.stringify(res.data);
      console.error(`Failed to create Condition for code ${code}: HTTP ${res.status} - ${errText}`);
      await recordOutboxFailure(supabaseAdmin, outboxId, res.status, errText);
    }
  }

  return conditionIds;
}
