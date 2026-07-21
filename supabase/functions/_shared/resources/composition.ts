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
  existingOutboxId?: string,
  triggeredBy?: string | null
) {
  // Fetch visit details for clinic_id and patient_id
  const { data: visit } = await supabaseAdmin
    .from('visits')
    .select('clinic_id, patient_id')
    .eq('id', visitId)
    .single();

  // Verified: SATUSEHAT Composition Profile specifies http://loinc.org for document type and section coding
  // Source: SATUSEHAT FHIR Implementation Guide - Composition Resource Profile (fhir.kemkes.go.id)
  const loincSystemUri = 'http://loinc.org';

  // 1. Build sections dynamically. Only include sections if they contain synced entries.
  const sections = [];

  if (conditionIds.length > 0) {
    sections.push({
      title: "Diagnosis",
      code: {
        coding: [
          {
            system: loincSystemUri,
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
            system: loincSystemUri,
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
            system: loincSystemUri,
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
          system: loincSystemUri,
          code: "11488-4",
          display: "Consultation note"
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: loincSystemUri,
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

  // Record Outbox Start with audit logging
  const outboxId = await recordOutboxStart(supabaseAdmin, {
    clinicId: visit.clinic_id,
    resourceType: 'Composition',
    relatedVisitId: visitId,
    relatedPatientId: visit.patient_id,
    payload: fhirPayload,
    outboxId: existingOutboxId,
    triggeredBy: triggeredBy
  });

  // Search-before-create for idempotency
  const searchQuery = `Composition?encounter=Encounter/${encounterId}`;
  console.log(`Checking existing Composition on SATUSEHAT: GET ${searchQuery}...`);
  const searchRes = await fhirRequest(supabaseAdmin, 'GET', searchQuery);

  if (searchRes.ok && searchRes.data && searchRes.data.entry && searchRes.data.entry.length > 0) {
    const existingId = searchRes.data.entry[0].resource.id;
    console.log(`Found existing Composition ID ${existingId} on SATUSEHAT Sandbox.`);

    await supabaseAdmin
      .from('visits')
      .update({ satusehat_composition_id: existingId })
      .eq('id', visitId);

    await recordOutboxSuccess(supabaseAdmin, outboxId, existingId);
    return existingId;
  }

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
