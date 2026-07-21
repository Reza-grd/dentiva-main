import { fhirRequest } from '../fhirClient.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function buildAndSyncMedicationRequests(
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

  // FIX E: Fetch clinic's SATUSEHAT Organization ID for sys-ids.kemkes.go.id namespace
  const { data: org, error: orgErr } = await supabaseAdmin
    .from('satusehat_organizations')
    .select('satusehat_organization_id')
    .eq('clinic_id', visit.clinic_id)
    .maybeSingle();

  if (orgErr || !org?.satusehat_organization_id) {
    throw new Error('Cannot build MedicationRequest identifier: clinic has no synced SATUSEHAT Organization ID yet.');
  }

  // 2. Fetch visit prescriptions from visit_obat with master_bahan metadata
  const { data: voList, error: voErr } = await supabaseAdmin
    .from('visit_obat')
    .select(`
      id,
      nama_obat,
      dosis,
      frekuensi,
      qty,
      master_bahan(nama_bahan, kode_kfa, kode_bentuk_sediaan)
    `)
    .eq('visit_id', visitId);

  if (voErr) {
    throw new Error('Failed to query visit prescriptions: ' + voErr.message);
  }

  const medicationRequestIds: string[] = [];
  const orgIhs = org.satusehat_organization_id;
  const prescriptionIdentifierSystem = `http://sys-ids.kemkes.go.id/prescription/${orgIhs}`;

  for (const vo of (voList || [])) {
    const mb: any = vo.master_bahan;
    const code = mb?.kode_kfa;
    const bentukSediaanCode = mb?.kode_bentuk_sediaan || 'BS066';
    const name = vo.nama_obat || mb?.nama_bahan || 'Obat';

    if (!code) {
      console.warn(`[WARNING] Prescription item ID ${vo.id} (${name}) has no kode_kfa. Skipping MedicationRequest sync.`);
      continue;
    }

    const dosageText = `${vo.frekuensi || '1x'} ${vo.dosis || '1 tablet'}`.trim();
    const kfaSystemUri = 'http://sys-ids.kemkes.go.id/kfa';
    const identifierValue = `${visitId}-${vo.id}`;

    // FIX C & E: Contained Medication pairing + Stable Organization-scoped identifier for reliable search-before-create
    // Verified Source: SATUSEHAT Platform Docs - MedicationRequest & Medication Resource Profile (satusehat.kemkes.go.id/platform/docs/id/fhir/resources/medicationrequest/)
    // "Pengiriman data peresepan obat akan menggunakan 2 resources yaitu Medication dan MedicationRequest... Kedua data ini dikirimkan secara bersamaan sebagai 1 paket"
    const fhirPayload = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      identifier: [
        {
          system: prescriptionIdentifierSystem,
          value: identifierValue
        }
      ],
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
      contained: [
        {
          resourceType: 'Medication',
          id: 'med-1',
          status: 'active',
          code: {
            coding: [
              {
                system: kfaSystemUri,
                code: code,
                display: name
              }
            ]
          },
          form: {
            coding: [
              {
                system: 'http://terminology.kemkes.go.id/CodeSystem/medication-form',
                code: bentukSediaanCode,
                display: 'Tablet / Sediaan Obat'
              }
            ]
          }
        }
      ],
      medicationReference: {
        reference: '#med-1',
        display: name
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

    // Record Outbox Start with audit logging
    const outboxId = await recordOutboxStart(supabaseAdmin, {
      clinicId: visit.clinic_id,
      resourceType: 'MedicationRequest',
      relatedVisitId: visitId,
      relatedPatientId: visit.patient_id,
      payload: fhirPayload,
      outboxId: existingOutboxIds?.[code],
      triggeredBy: triggeredBy
    });

    // FIX E: Robust search-before-create strategy using identifier system + encounter fallback
    let existingId: string | null = null;

    // Strategy 1: Search by stable identifier (http://sys-ids.kemkes.go.id/prescription/{orgIhs}|{visitId}-{voId})
    const identifierSearchQuery = `MedicationRequest?identifier=${prescriptionIdentifierSystem}|${identifierValue}`;
    console.log(`Checking existing MedicationRequest on SATUSEHAT via identifier: GET ${identifierSearchQuery}...`);
    const idSearchRes = await fhirRequest(supabaseAdmin, 'GET', identifierSearchQuery);

    if (idSearchRes.ok && idSearchRes.data && idSearchRes.data.entry && idSearchRes.data.entry.length > 0) {
      existingId = idSearchRes.data.entry[0].resource.id;
      console.log(`Found existing MedicationRequest ID ${existingId} via identifier search.`);
    } else {
      // Strategy 2: Search by encounter reference and filter in-memory for matching contained medication KFA code
      const encounterSearchQuery = `MedicationRequest?encounter=Encounter/${encounterId}`;
      console.log(`Fallback checking MedicationRequest by encounter: GET ${encounterSearchQuery}...`);
      const encSearchRes = await fhirRequest(supabaseAdmin, 'GET', encounterSearchQuery);

      if (encSearchRes.ok && encSearchRes.data && encSearchRes.data.entry) {
        for (const entry of encSearchRes.data.entry) {
          const res = entry.resource;
          const containedMeds = res?.contained || [];
          const matchesKfa = containedMeds.some((m: any) =>
            m.resourceType === 'Medication' &&
            m.code?.coding?.some((c: any) => c.code === code)
          );
          if (matchesKfa) {
            existingId = res.id;
            console.log(`Found existing MedicationRequest ID ${existingId} matching KFA code ${code} under Encounter ${encounterId}.`);
            break;
          }
        }
      }
    }

    if (existingId) {
      await recordOutboxSuccess(supabaseAdmin, outboxId, existingId);
      medicationRequestIds.push(existingId);
      continue;
    }

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
