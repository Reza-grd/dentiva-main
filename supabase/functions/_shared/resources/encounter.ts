import { fhirRequest } from '../fhirClient.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function buildAndSyncEncounter(
  supabaseAdmin: any, 
  visitId: string, 
  existingOutboxId?: string,
  triggeredBy?: string | null
) {
  // 1. Fetch visit details with patient and doctor details
  const { data: visit, error: visitErr } = await supabaseAdmin
    .from('visits')
    .select(`
      *,
      patient:patients(nama_lengkap, satusehat_patient_id),
      doctor:users(full_name, satusehat_practitioner_id)
    `)
    .eq('id', visitId)
    .maybeSingle();

  if (visitErr || !visit) {
    throw new Error('Failed to find visit detail: ' + (visitErr?.message || 'Not found'));
  }

  // 2. Fetch default location for this clinic
  const { data: location, error: locErr } = await supabaseAdmin
    .from('satusehat_locations')
    .select('satusehat_location_id, nama_unit')
    .eq('clinic_id', visit.clinic_id)
    .eq('is_default', true)
    .maybeSingle();

  if (locErr) {
    throw new Error('Failed to query default location: ' + locErr.message);
  }

  // 3. Validation
  const missingFields: string[] = [];
  if (!visit.patient?.satusehat_patient_id) {
    missingFields.push('SatuSehat Patient ID (sinkronkan pasien terlebih dahulu)');
  }
  if (!visit.doctor?.satusehat_practitioner_id) {
    missingFields.push('SatuSehat Practitioner ID (sinkronkan profil dokter terlebih dahulu)');
  }
  if (!location?.satusehat_location_id) {
    missingFields.push('SatuSehat Location ID default klinik (sinkronkan lokasi klinik terlebih dahulu)');
  }

  if (missingFields.length > 0) {
    throw new Error(`Prasyarat integrasi SatuSehat klinis belum terpenuhi: ${missingFields.join(', ')}`);
  }

  const patientSId = visit.patient.satusehat_patient_id;
  const practitionerSId = visit.doctor.satusehat_practitioner_id;
  const locationSId = location.satusehat_location_id;

  const datePart = visit.tanggal_kunjungan || new Date().toISOString().split('T')[0];
  const timePart = visit.jam_kunjungan || '08:00';
  const isoTimestamp = `${datePart}T${timePart.substring(0, 5)}:00+07:00`;

  // Verified: SATUSEHAT Outpatient Encounter Profile specifies serviceType and identifier
  // Source: SATUSEHAT FHIR Implementation Guide - Encounter Profile (fhir.kemkes.go.id)
  const encounterIdentifierSystem = `http://sys-ids.kemkes.go.id/encounter/${visit.clinic_id}`;

  const fhirPayload = {
    resourceType: 'Encounter',
    status: 'finished',
    identifier: [
      {
        system: encounterIdentifierSystem,
        value: visitId
      }
    ],
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory'
    },
    // Item 3 Fix: Added required serviceType for Dental Clinic Outpatient care
    serviceType: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/service-type',
          code: '124',
          display: 'Dental'
        }
      ]
    },
    subject: {
      reference: `Patient/${patientSId}`,
      display: visit.patient.nama_lengkap
    },
    participant: [
      {
        type: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'PPRF',
                display: 'primary performer'
              }
            ]
          }
        ],
        individual: {
          reference: `Practitioner/${practitionerSId}`,
          display: visit.doctor.full_name
        }
      }
    ],
    period: {
      start: isoTimestamp,
      end: isoTimestamp
    },
    location: [
      {
        location: {
          reference: `Location/${locationSId}`,
          display: location.nama_unit
        }
      }
    ],
    statusHistory: [
      {
        status: 'finished',
        period: {
          start: isoTimestamp,
          end: isoTimestamp
        }
      }
    ]
  };

  // Record Outbox Start with audit logging
  const outboxId = await recordOutboxStart(supabaseAdmin, {
    clinicId: visit.clinic_id,
    resourceType: 'Encounter',
    relatedVisitId: visitId,
    relatedPatientId: visit.patient_id,
    payload: fhirPayload,
    outboxId: existingOutboxId,
    triggeredBy: triggeredBy
  });

  // Search-before-create for idempotency during retries
  const searchQuery = `Encounter?identifier=${encounterIdentifierSystem}|${visitId}`;
  console.log(`Checking existing Encounter on SATUSEHAT: GET ${searchQuery}...`);
  const searchRes = await fhirRequest(supabaseAdmin, 'GET', searchQuery);

  if (searchRes.ok && searchRes.data && searchRes.data.entry && searchRes.data.entry.length > 0) {
    const existingId = searchRes.data.entry[0].resource.id;
    console.log(`Found existing Encounter ID ${existingId} on SATUSEHAT Sandbox.`);

    await supabaseAdmin
      .from('visits')
      .update({ satusehat_encounter_id: existingId })
      .eq('id', visitId);

    await recordOutboxSuccess(supabaseAdmin, outboxId, existingId);
    return existingId;
  }

  console.log(`Syncing Encounter for Visit ID ${visitId} to SatuSehat Sandbox...`);
  const res = await fhirRequest(supabaseAdmin, 'POST', 'Encounter', fhirPayload);
  if (!res.ok) {
    const errText = JSON.stringify(res.data);
    await recordOutboxFailure(supabaseAdmin, outboxId, res.status, errText);
    throw new Error(`Failed to create Encounter: HTTP ${res.status} - ${errText}`);
  }

  const encounterId = res.data.id;
  console.log(`Encounter created successfully with ID ${encounterId}`);

  // Save satusehat_encounter_id to local visits table
  const { error: updateErr } = await supabaseAdmin
    .from('visits')
    .update({ satusehat_encounter_id: encounterId })
    .eq('id', visitId);

  if (updateErr) {
    console.error('Warning: Failed to save satusehat_encounter_id to local database:', updateErr);
  }

  await recordOutboxSuccess(supabaseAdmin, outboxId, encounterId);

  return encounterId;
}
