import { fhirRequest } from '../fhirClient.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function syncLocation(
  supabaseAdmin: any, 
  locationId: string, 
  existingOutboxId?: string,
  triggeredBy?: string | null
) {
  // 1. Get the local location data
  const { data: localLoc, error: fetchErr } = await supabaseAdmin
    .from('satusehat_locations')
    .select('*')
    .eq('id', locationId)
    .maybeSingle();

  if (fetchErr || !localLoc) {
    throw new Error('Failed to find local location metadata: ' + (fetchErr?.message || 'Not found'));
  }

  // 2. Fetch the SatuSehat Organization ID for the clinic
  const { data: localOrg, error: orgErr } = await supabaseAdmin
    .from('satusehat_organizations')
    .select('satusehat_organization_id')
    .eq('clinic_id', localLoc.clinic_id)
    .maybeSingle();

  if (orgErr || !localOrg || !localOrg.satusehat_organization_id) {
    throw new Error('Clinic SatuSehat Organization must be synced first before syncing locations.');
  }

  const orgId = localOrg.satusehat_organization_id;

  // Verified: SATUSEHAT Location Profile specifies http://terminology.hl7.org/CodeSystem/location-physical-type for physicalType
  // Source: SATUSEHAT FHIR Implementation Guide - Location Profile (fhir.kemkes.go.id)
  const physicalTypeUri = 'http://terminology.hl7.org/CodeSystem/location-physical-type';

  const fhirPayload = {
    resourceType: 'Location',
    status: 'active',
    name: localLoc.nama_unit,
    mode: 'instance',
    managingOrganization: {
      reference: `Organization/${orgId}`
    },
    physicalType: {
      coding: [
        {
          system: physicalTypeUri,
          code: 'ro',
          display: 'Room'
        }
      ]
    }
  };

  // Record Outbox Start with audit trail
  const outboxId = await recordOutboxStart(supabaseAdmin, {
    clinicId: localLoc.clinic_id,
    resourceType: 'Location',
    payload: { ...fhirPayload, locationId },
    outboxId: existingOutboxId,
    triggeredBy: triggeredBy
  });

  // 3. Search-before-create: If we already have a location ID, verify it exists
  if (localLoc.satusehat_location_id) {
    console.log(`Verifying existing Location ID ${localLoc.satusehat_location_id}...`);
    const res = await fhirRequest(supabaseAdmin, 'GET', `Location/${localLoc.satusehat_location_id}`);
    if (res.ok) {
      await recordOutboxSuccess(supabaseAdmin, outboxId, localLoc.satusehat_location_id);
      return { success: true, locationId: localLoc.satusehat_location_id, name: res.data.name };
    }
    console.warn(`Previously cached Location ID was invalid or deleted. Re-syncing...`);
  }

  // 4. Search by organization reference and name
  // Verified: SATUSEHAT Location search parameters organization & name query syntax
  const searchQuery = `Location?organization=Organization/${orgId}&name=${encodeURIComponent(localLoc.nama_unit)}`;
  console.log(`Searching for existing Location on SatuSehat Sandbox: ${searchQuery}...`);
  const searchRes = await fhirRequest(supabaseAdmin, 'GET', searchQuery);
  
  if (searchRes.ok && searchRes.data && searchRes.data.entry && searchRes.data.entry.length > 0) {
    const matchedLoc = searchRes.data.entry[0].resource;
    console.log(`Found existing Location ${matchedLoc.id} matching organization and name.`);
    
    // Save to database
    await supabaseAdmin
      .from('satusehat_locations')
      .update({ satusehat_location_id: matchedLoc.id })
      .eq('id', locationId);

    await recordOutboxSuccess(supabaseAdmin, outboxId, matchedLoc.id);

    return { success: true, locationId: matchedLoc.id, name: matchedLoc.name };
  }

  // 5. Create new Location resource on SatuSehat
  console.log(`No existing Location found. Creating new Location resource...`);
  const createRes = await fhirRequest(supabaseAdmin, 'POST', 'Location', fhirPayload);
  if (!createRes.ok) {
    const errText = JSON.stringify(createRes.data);
    await recordOutboxFailure(supabaseAdmin, outboxId, createRes.status, errText);
    throw new Error(`Failed to create Location on SatuSehat: HTTP ${createRes.status} - ${errText}`);
  }

  const newLocId = createRes.data.id;
  
  // 6. Update database record with new SatuSehat Location ID
  const { error: updateErr } = await supabaseAdmin
    .from('satusehat_locations')
    .update({ satusehat_location_id: newLocId })
    .eq('id', locationId);

  if (updateErr) {
    console.error('Warning: Failed to save SatuSehat Location ID to local database:', updateErr);
  }

  await recordOutboxSuccess(supabaseAdmin, outboxId, newLocId);

  return { success: true, locationId: newLocId, name: localLoc.nama_unit };
}
