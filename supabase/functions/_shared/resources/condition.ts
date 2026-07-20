import { fhirRequest } from '../fhirClient.ts';
import { decryptBatch } from '../decryptionHelper.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function buildAndSyncConditions(
  supabaseAdmin: any,
  visitId: string,
  patientSId: string,
  encounterId: string,
  isoTimestamp: string,
  existingOutboxIds?: Record<string, string>
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

  // 2. Decrypt diagnosa
  let decryptedDiagnosa = '';
  if (visit.diagnosa) {
    const decrypted = await decryptBatch(supabaseAdmin, [visit.diagnosa]);
    decryptedDiagnosa = decrypted[0] || '';
  }

  const codes = visit.kode_icd10.split(',').map((c: string) => c.trim()).filter(Boolean);
  const conditionIds: string[] = [];

  for (const code of codes) {
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
            // TODO: verifikasi URI resmi CodeSystem ICD-10 SatuSehat
            system: 'http://hl7.org/fhir/sid/icd-10',
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

    // Record Outbox Start
    const outboxId = await recordOutboxStart(supabaseAdmin, {
      clinicId: visit.clinic_id,
      resourceType: 'Condition',
      relatedVisitId: visitId,
      relatedPatientId: visit.patient_id,
      payload: fhirPayload,
      outboxId: existingOutboxIds?.[code]
    });

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
