import { fhirRequest } from '../fhirClient.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function buildAndSyncMedicationRequests(
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

  // 2. Fetch visit prescriptions from visit_obat
  const { data: voList, error: voErr } = await supabaseAdmin
    .from('visit_obat')
    .select(`
      id,
      nama_obat,
      dosis,
      frekuensi,
      qty,
      master_bahan(nama_bahan, kode_kfa)
    `)
    .eq('visit_id', visitId);

  if (voErr) {
    throw new Error('Failed to query visit prescriptions: ' + voErr.message);
  }

  const medicationRequestIds: string[] = [];

  for (const vo of (voList || [])) {
    const mb: any = vo.master_bahan;
    const code = mb?.kode_kfa;
    const name = vo.nama_obat || mb?.nama_bahan || 'Obat';

    if (!code) {
      console.warn(`[WARNING] Prescription item ID ${vo.id} (${name}) has no kode_kfa. Skipping MedicationRequest sync.`);
      continue;
    }

    const dosageText = `${vo.frekuensi || '1x'} ${vo.dosis || '1 tablet'}`.trim();

    const fhirPayload = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
              code: 'outpatient',
              display: 'Outpatient'
            }
          ]
        }
      ],
      medicationCodeableConcept: {
        coding: [
          {
            // TODO: verifikasi URI resmi CodeSystem KFA SatuSehat
            system: 'https://fhir.kemkes.go.id/id/kfa',
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
      authoredOn: isoTimestamp,
      dosageInstruction: [
        {
          text: dosageText || 'Sesuai petunjuk dokter'
        }
      ]
    };

    // Record Outbox Start
    const outboxId = await recordOutboxStart(supabaseAdmin, {
      clinicId: visit.clinic_id,
      resourceType: 'MedicationRequest',
      relatedVisitId: visitId,
      relatedPatientId: visit.patient_id,
      payload: fhirPayload,
      outboxId: existingOutboxIds?.[code]
    });

    console.log(`Syncing MedicationRequest ${code} (${name}) to SatuSehat Sandbox...`);
    const res = await fhirRequest(supabaseAdmin, 'POST', 'MedicationRequest', fhirPayload);

    if (res.ok) {
      const medReqId = res.data.id;
      console.log(`MedicationRequest ${code} created successfully with ID ${medReqId}`);
      await recordOutboxSuccess(supabaseAdmin, outboxId, medReqId);
      medicationRequestIds.push(medReqId);
    } else {
      const errText = JSON.stringify(res.data);
      console.error(`Failed to create MedicationRequest for code ${code}: HTTP ${res.status} - ${errText}`);
      await recordOutboxFailure(supabaseAdmin, outboxId, res.status, errText);
    }
  }

  return medicationRequestIds;
}
