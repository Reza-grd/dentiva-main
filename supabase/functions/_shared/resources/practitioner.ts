import { fhirRequest } from '../fhirClient.ts';
import { decryptBatch } from '../decryptionHelper.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function syncPractitioner(supabaseAdmin: any, userId: string, existingOutboxId?: string) {
  // 1. Fetch user profile from database
  const { data: user, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (fetchErr || !user) {
    throw new Error('Failed to find user profile: ' + (fetchErr?.message || 'Not found'));
  }

  // 2. Decrypt the NIK field
  let decryptedNik = '';
  if (user.nik) {
    const decrypted = await decryptBatch(supabaseAdmin, [user.nik]);
    decryptedNik = decrypted[0] || '';
  }

  // 3. Validation
  const errors: string[] = [];
  if (!decryptedNik || !/^\d{16}$/.test(decryptedNik)) {
    errors.push('NIK (16 digit angka)');
  }
  if (!user.no_str) {
    errors.push('Nomor STR');
  }
  if (!user.str_berlaku_hingga) {
    errors.push('Tanggal STR Berlaku Hingga');
  } else {
    const expiry = new Date(user.str_berlaku_hingga);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiry < today) {
      errors.push('STR (sudah kedaluwarsa)');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Kelengkapan profil dokter kurang atau tidak valid: ${errors.join(', ')}`);
  }

  const systemNikUri = 'https://fhir.kemkes.go.id/id/nik';

  const fhirPayload = {
    resourceType: 'Practitioner',
    active: true,
    identifier: [
      {
        use: 'official',
        system: systemNikUri, // TODO: verifikasi URI resmi NIK
        value: decryptedNik
      }
    ],
    name: [
      {
        use: 'official',
        text: user.full_name
      }
    ],
    qualification: [
      {
        identifier: [
          {
            // TODO: verifikasi URI resmi STR
            system: 'https://fhir.kemkes.go.id/id/str',
            value: user.no_str
          }
        ],
        code: {
          coding: [
            {
              // TODO: verifikasi URI resmi CodeSystem qualification
              system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
              code: 'MD',
              display: 'Doctor of Medicine'
            }
          ]
        }
      }
    ]
  };

  // Record Outbox Start
  const outboxId = await recordOutboxStart(supabaseAdmin, {
    clinicId: user.clinic_id,
    resourceType: 'Practitioner',
    payload: fhirPayload,
    outboxId: existingOutboxId
  });

  // 4. Search-before-create: GET Practitioner?identifier=https://fhir.kemkes.go.id/id/nik|<nik>
  const query = `Practitioner?identifier=${systemNikUri}|${decryptedNik}`;
  console.log(`Searching for Practitioner on SatuSehat Sandbox: GET ${query}...`);
  const searchRes = await fhirRequest(supabaseAdmin, 'GET', query);

  if (searchRes.ok && searchRes.data && searchRes.data.entry && searchRes.data.entry.length > 0) {
    const practitionerId = searchRes.data.entry[0].resource.id;
    console.log(`Found existing Practitioner ID ${practitionerId} on SatuSehat Sandbox.`);
    
    // Save to users table
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ satusehat_practitioner_id: practitionerId })
      .eq('id', userId);

    if (updateErr) {
      console.error('Warning: Failed to save SatuSehat Practitioner ID to user profile:', updateErr);
    }

    await recordOutboxSuccess(supabaseAdmin, outboxId, practitionerId);

    return { success: true, practitionerId, name: user.full_name };
  }

  // 5. If not found, create (POST) the practitioner on SatuSehat Sandbox
  console.log(`Practitioner not found. Creating new Practitioner resource on SatuSehat Sandbox...`);
  const createRes = await fhirRequest(supabaseAdmin, 'POST', 'Practitioner', fhirPayload);
  if (!createRes.ok) {
    const errText = JSON.stringify(createRes.data);
    await recordOutboxFailure(supabaseAdmin, outboxId, createRes.status, errText);
    throw new Error(`Failed to create Practitioner on SatuSehat: HTTP ${createRes.status} - ${errText}`);
  }

  const newPractitionerId = createRes.data.id;

  // 6. Update database record with new SatuSehat Practitioner ID
  const { error: updateErr } = await supabaseAdmin
    .from('users')
    .update({ satusehat_practitioner_id: newPractitionerId })
    .eq('id', userId);

  if (updateErr) {
    console.error('Warning: Failed to save SatuSehat Practitioner ID to database:', updateErr);
  }

  await recordOutboxSuccess(supabaseAdmin, outboxId, newPractitionerId);

  return { success: true, practitionerId: newPractitionerId, name: user.full_name };
}
