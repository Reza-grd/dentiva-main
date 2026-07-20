export function calculateNextRetry(attemptCount: number): string | null {
  const now = new Date();
  let delayMinutes = 0;

  switch (attemptCount) {
    case 1:
      delayMinutes = 1; // 1 min
      break;
    case 2:
      delayMinutes = 5; // 5 mins
      break;
    case 3:
      delayMinutes = 30; // 30 mins
      break;
    case 4:
      delayMinutes = 120; // 2 hours
      break;
    default:
      return null; // Stop automatic retries after 4 attempts
  }

  const nextRetry = new Date(now.getTime() + delayMinutes * 60 * 1000);
  return nextRetry.toISOString();
}

export interface OutboxParams {
  clinicId: string;
  resourceType: 'Organization' | 'Location' | 'Practitioner' | 'Patient' | 'Encounter' | 'Condition' | 'Procedure' | 'MedicationRequest' | 'Composition';
  relatedVisitId?: string;
  relatedPatientId?: string;
  payload: any;
  outboxId?: string;
}

export async function recordOutboxStart(supabaseAdmin: any, params: OutboxParams): Promise<string> {
  const { clinicId, resourceType, relatedVisitId, relatedPatientId, payload, outboxId } = params;

  if (outboxId) {
    // Fetch current attempt count
    const { data: existing } = await supabaseAdmin
      .from('satusehat_outbox')
      .select('attempt_count')
      .eq('id', outboxId)
      .maybeSingle();

    const newAttempt = (existing?.attempt_count || 0) + 1;

    await supabaseAdmin
      .from('satusehat_outbox')
      .update({
        status: 'processing',
        payload: payload,
        attempt_count: newAttempt,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', outboxId);

    return outboxId;
  }

  // Create new outbox entry
  const { data, error } = await supabaseAdmin
    .from('satusehat_outbox')
    .insert({
      clinic_id: clinicId,
      resource_type: resourceType,
      related_visit_id: relatedVisitId || null,
      related_patient_id: relatedPatientId || null,
      payload: payload,
      status: 'processing',
      attempt_count: 1,
      last_attempt_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create satusehat_outbox entry:', error);
    throw new Error('Outbox creation failed: ' + error.message);
  }

  return data.id;
}

export async function recordOutboxSuccess(
  supabaseAdmin: any,
  outboxId: string,
  resourceId: string
) {
  const { error } = await supabaseAdmin
    .from('satusehat_outbox')
    .update({
      status: 'success',
      satusehat_resource_id: resourceId,
      next_retry_at: null,
      last_error: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', outboxId);

  if (error) {
    console.error(`Failed to update outbox ${outboxId} status to success:`, error);
  }
}

export async function recordOutboxFailure(
  supabaseAdmin: any,
  outboxId: string,
  httpStatus: number,
  errorMsg: string
) {
  const { data: existing } = await supabaseAdmin
    .from('satusehat_outbox')
    .select('attempt_count')
    .eq('id', outboxId)
    .maybeSingle();

  const attemptCount = existing?.attempt_count || 1;
  const isTransient = httpStatus === 429 || httpStatus >= 500;
  const maxAttempts = isTransient ? 5 : 3;

  let newStatus: 'failed_retryable' | 'failed_permanent' = 'failed_retryable';
  let nextRetryAt: string | null = null;

  if (attemptCount >= maxAttempts) {
    newStatus = 'failed_permanent';
  } else {
    nextRetryAt = calculateNextRetry(attemptCount);
    if (!nextRetryAt) {
      newStatus = 'failed_permanent';
    }
  }

  const { error } = await supabaseAdmin
    .from('satusehat_outbox')
    .update({
      status: newStatus,
      next_retry_at: nextRetryAt,
      last_error: `[HTTP ${httpStatus}] ${errorMsg}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', outboxId);

  if (error) {
    console.error(`Failed to update outbox ${outboxId} status to failure:`, error);
  }
}
