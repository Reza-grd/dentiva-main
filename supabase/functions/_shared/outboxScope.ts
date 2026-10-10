// Service workers may process the global queue; user requests always have a tenant.
// deno-lint-ignore no-explicit-any
export function scopedOutbox(query: any, clinicId: string|null, service: boolean) {
  if (service) return query;
  if (!clinicId) throw new Error('Forbidden: clinic scope required');
  return query.eq('clinic_id',clinicId);
}
// Payload IDs have no FK. Validate their tenant before calling service-only resource helpers.
// deno-lint-ignore no-explicit-any
export async function checkOutboxTarget(db:any,item:any) {
  const target = item.resource_type==='Location' ? ['satusehat_locations',item.payload?.locationId]
    : item.resource_type==='Practitioner' ? ['users',item.payload?.userId] : null;
  if (!target) return;
  if (!target[1]) throw new Error('Outbox target missing');
  const {data,error}=await db.from(target[0]).select('id').eq('id',target[1]).eq('clinic_id',item.clinic_id).maybeSingle();
  if (error || !data) throw new Error('Outbox target is outside clinic scope');
}
