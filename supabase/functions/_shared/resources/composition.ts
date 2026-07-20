import { fhirRequest } from '../fhirClient.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function buildAndSyncComposition(
  supabaseAdmin: any,
  visitId: string,
  patientSId: string,
  practitionerSId: string,
  encounterId: string,
  isoTimestamp: string,
  conditionIds: string[],
  procedureIds: string[],
  medicationRequestIds: string[],
  existingOutboxId?: string
) {
  // Fetch visit details for clinic_id and patient_id
  const { data: visit } = await supabaseAdmin
    .from('visits')
    .select('clinic_id, patient_id')
    .eq('id', visitId)
    .single();

  // 1. Build sections dynamically. Only include sections if they contain synced entries.
  const sections = [];

  if (conditionIds.length > 0) {
    sections.push({
      title: "Diagnosis",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "29548-5",
            display: "Diagnosis Narrative"
          }
        ]
      },
      entry: conditionIds.map(id => ({ reference: `Condition/${id}` }))
    });
  }

  if (procedureIds.length > 0) {
    sections.push({
      title: "Tindakan / Prosedur",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "29554-3",
            display: "Procedure Narrative"
          }
        ]
      },
      entry: procedureIds.map(id => ({ reference: `Procedure/${id}` }))
    });
  }

  if (medicationRequestIds.length > 0) {
    sections.push({
      title: "Resep Obat",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "10160-0",
            display: "History of Medication use"
          }
        ]
      },
      entry: medicationRequestIds.map(id => ({ reference: `MedicationRequest/${id}` }))
    });
  }

  if (sections.length === 0) {
    throw new Error('Composition sync failed: A medical resume must have at least one synced Diagnosis (Condition).');
  }

  // 2. Construct FHIR Composition payload
  const fhirPayload = {
    resourceType: 'Composition',
    status: 'final',
    type: {
      coding: [
        {
          // TODO: verifikasi LOINC Code resmi Resume Medis Elektronik SatuSehat
          system: "http://loinc.org",
          code: "11488-4",
          display: "Consultation note"
        }
      ]
    },
    category: [
      {
        coding: [
          {
            // TODO: verifikasi LOINC Category resmi SatuSehat
            system: "http://loinc.org",
            code: "18842-5",
            display: "Discharge summary"
          }
        ]
      }
    ],
    subject: {
      reference: `Patient/${patientSId}`
    },
    encounter: {
      reference: `Encounter/${encounterId}`
    },
    date: isoTimestamp,
    author: [
      {
        reference: `Practitioner/${practitionerSId}`
      }
    ],
    title: "Resume Medis Elektronik",
    confidentiality: "N",
    section: sections
  };

  // Record Outbox Start
  const outboxId = await recordOutboxStart(supabaseAdmin, {
    clinicId: visit.clinic_id,
    resourceType: 'Composition',
    relatedVisitId: visitId,
    relatedPatientId: visit.patient_id,
    payload: fhirPayload,
    outboxId: existingOutboxId
  });

  console.log(`Syncing Composition for Visit ID ${visitId} to SatuSehat Sandbox...`);
  const res = await fhirRequest(supabaseAdmin, 'POST', 'Composition', fhirPayload);
  
  if (!res.ok) {
    const errText = JSON.stringify(res.data);
    await recordOutboxFailure(supabaseAdmin, outboxId, res.status, errText);
    throw new Error(`Failed to create Composition: HTTP ${res.status} - ${errText}`);
  }

  const compositionId = res.data.id;
  console.log(`Composition created successfully with ID ${compositionId}`);

  // Save satusehat_composition_id to local visits table
  const { error: updateErr } = await supabaseAdmin
    .from('visits')
    .update({ satusehat_composition_id: compositionId })
    .eq('id', visitId);

  if (updateErr) {
    console.error('Warning: Failed to save satusehat_composition_id to local database:', updateErr);
  }

  await recordOutboxSuccess(supabaseAdmin, outboxId, compositionId);

  return compositionId;
}
