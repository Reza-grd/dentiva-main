import { fhirRequest } from '../fhirClient.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

export async function syncOrganization(
  supabaseAdmin: any, 
  clinicId: string, 
  existingOutboxId?: string,
  triggeredBy?: string | null
) {
  // 1. Get local satusehat_organizations mapping
  const { data: localOrg, error: fetchErr } = await supabaseAdmin
    .from('satusehat_organizations')
    .select('*')
    .eq('clinic_id', clinicId)
    .maybeSingle();
  
  if (fetchErr) {
    throw new Error('Failed to query local organization: ' + fetchErr.message);
  }
  
  if (!localOrg || !localOrg.satusehat_organization_id) {
    throw new Error('SatuSehat Organization ID is not configured. Please enter it manually in settings.');
  }
  
  const orgId = localOrg.satusehat_organization_id;

  // Record Outbox Start with audit logging
  const outboxId = await recordOutboxStart(supabaseAdmin, {
    clinicId,
    resourceType: 'Organization',
    payload: { action: 'GET', path: `Organization/${orgId}` },
    outboxId: existingOutboxId,
    triggeredBy: triggeredBy
  });

  // 2. Verification / Search: GET Organization/<id>
  // Verified: SATUSEHAT Organization Profile specifies Organization/<id> or GET Organization?identifier=...
  // Source: SATUSEHAT FHIR Implementation Guide - Organization Resource Profile (fhir.kemkes.go.id)
  console.log(`Verifying Organization ID ${orgId} on SatuSehat Sandbox...`);
  const res = await fhirRequest(supabaseAdmin, 'GET', `Organization/${orgId}`);
  if (!res.ok) {
    const errText = JSON.stringify(res.data);
    await recordOutboxFailure(supabaseAdmin, outboxId, res.status, errText);
    throw new Error(`Invalid Organization ID on SatuSehat: HTTP ${res.status} - ${errText}`);
  }
  
  // 3. Save sync confirmation timestamp
  const { error: upsertErr } = await supabaseAdmin
    .from('satusehat_organizations')
    .upsert({
      clinic_id: clinicId,
      satusehat_organization_id: orgId,
      last_synced_at: new Date().toISOString()
    });

  if (upsertErr) {
    console.error('Warning: Failed to update last_synced_at for organization:', upsertErr);
  }

  await recordOutboxSuccess(supabaseAdmin, outboxId, orgId);
    
  return { success: true, organizationId: orgId, name: res.data.name };
}
