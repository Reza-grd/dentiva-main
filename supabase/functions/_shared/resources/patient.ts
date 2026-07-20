import { fhirRequest } from '../fhirClient.ts';
import { decryptBatch } from '../decryptionHelper.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function syncPatient(supabaseAdmin: any, patientId: string, existingOutboxId?: string) {
  // 1. Fetch the latest consent record for the patient
  const { data: consent, error: consentErr } = await supabaseAdmin
    .from('satusehat_consents')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (consentErr) {
    throw new Error('Failed to query patient SatuSehat consent status: ' + consentErr.message);
  }

  if (!consent || !consent.consent_given) {
    throw new Error('Sinkronisasi SatuSehat diblokir: Pasien belum memberikan persetujuan (Consent) aktif.');
  }

  // 2. Fetch the patient record
  const { data: patient, error: patientErr } = await supabaseAdmin
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .maybeSingle();

  if (patientErr || !patient) {
    throw new Error('Failed to find patient profile: ' + (patientErr?.message || 'Not found'));
  }

  // 3. Decrypt confidential fields
  const ciphertexts = [
    patient.nik || '',
    patient.nik_ibu || '',
    patient.nama_lengkap || '',
    patient.no_wa || ''
  ];
  const decrypted = await decryptBatch(supabaseAdmin, ciphertexts);
  
  const decryptedNik = decrypted[0];
  const decryptedNikIbu = decrypted[1];
  const decryptedName = decrypted[2];
  const decryptedPhone = decrypted[3];

  // 4. Validate identity
  const idType = patient.identitas_alternatif_jenis || 'NIK';
  
  if (idType === 'NIK') {
    if (!decryptedNik || !/^\d{16}$/.test(decryptedNik)) {
      throw new Error('Validasi Gagal: NIK wajib diisi dan harus berupa 16 digit angka.');
    }
  } else if (idType === 'NIK_IBU') {
    if (!decryptedNikIbu || !/^\d{16}$/.test(decryptedNikIbu)) {
      throw new Error('Validasi Gagal: NIK Ibu Kandung wajib diisi dan harus berupa 16 digit angka untuk metode pencocokan bayi.');
    }
  } else if (idType === 'PASPOR') {
    if (!decryptedNik) {
      throw new Error('Validasi Gagal: Nomor Paspor wajib diisi.');
    }
  }

  let systemUri = 'https://fhir.kemkes.go.id/id/nik';
  let identifierValue = decryptedNik;

  if (idType === 'NIK_IBU') {
    systemUri = 'https://fhir.kemkes.go.id/id/nik-ibu';
    identifierValue = decryptedNikIbu;
  } else if (idType === 'PASPOR') {
    systemUri = 'https://fhir.kemkes.go.id/id/pasport';
    identifierValue = decryptedNik;
  }

  const fhirPayload = {
    resourceType: 'Patient',
    active: true,
    identifier: [
      {
        use: 'official',
        system: systemUri,
        value: identifierValue
      }
    ],
    name: [
      {
        use: 'official',
        text: decryptedName
      }
    ],
    gender: patient.jenis_kelamin === 'Laki-laki' ? 'male' : (patient.jenis_kelamin === 'Perempuan' ? 'female' : 'other'),
    birthDate: patient.tanggal_lahir,
    telecom: decryptedPhone ? [
      {
        system: 'phone',
        value: decryptedPhone,
        use: 'mobile'
      }
    ] : [],
    address: [
      {
        use: 'home',
        text: patient.alamat_detail || patient.alamat || ''
      }
    ]
  };

  // Record Outbox Start
  const outboxId = await recordOutboxStart(supabaseAdmin, {
    clinicId: patient.clinic_id,
    resourceType: 'Patient',
    relatedPatientId: patientId,
    payload: fhirPayload,
    outboxId: existingOutboxId
  });

  // 5. Search-before-create: GET Patient?identifier=...
  const query = `Patient?identifier=${systemUri}|${identifierValue}`;
  console.log(`Searching for Patient on SatuSehat Sandbox: GET ${query}...`);
  const searchRes = await fhirRequest(supabaseAdmin, 'GET', query);

  if (searchRes.ok && searchRes.data && searchRes.data.entry && searchRes.data.entry.length > 0) {
    const patientSatuSehatId = searchRes.data.entry[0].resource.id;
    console.log(`Found existing Patient ID ${patientSatuSehatId} on SatuSehat Sandbox.`);
    
    // Save to patients table
    const { error: updateErr } = await supabaseAdmin
      .from('patients')
      .update({
        satusehat_patient_id: patientSatuSehatId,
        satusehat_last_synced_at: new Date().toISOString()
      })
      .eq('id', patientId);

    if (updateErr) {
      console.error('Warning: Failed to save SatuSehat Patient ID to local database:', updateErr);
    }

    await recordOutboxSuccess(supabaseAdmin, outboxId, patientSatuSehatId);

    return { success: true, patientId: patientSatuSehatId, name: decryptedName };
  }

  // 6. If not found, create (POST) Patient resource on SatuSehat Sandbox
  console.log(`Patient not found. Creating new Patient resource on SatuSehat Sandbox...`);
  const createRes = await fhirRequest(supabaseAdmin, 'POST', 'Patient', fhirPayload);
  if (!createRes.ok) {
    const errText = JSON.stringify(createRes.data);
    await recordOutboxFailure(supabaseAdmin, outboxId, createRes.status, errText);
    throw new Error(`Failed to create Patient on SatuSehat: HTTP ${createRes.status} - ${errText}`);
  }

  const newPatientSatuSehatId = createRes.data.id;

  // 7. Update database record with new SatuSehat Patient ID and last sync date
  const { error: updateErr } = await supabaseAdmin
    .from('patients')
    .update({
      satusehat_patient_id: newPatientSatuSehatId,
      satusehat_last_synced_at: new Date().toISOString()
    })
    .eq('id', patientId);

  if (updateErr) {
    console.error('Warning: Failed to save SatuSehat Patient ID to database:', updateErr);
  }

  await recordOutboxSuccess(supabaseAdmin, outboxId, newPatientSatuSehatId);

  return { success: true, patientId: newPatientSatuSehatId, name: decryptedName };
}
