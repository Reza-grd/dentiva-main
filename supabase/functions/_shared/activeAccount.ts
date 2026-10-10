// Use the caller's JWT for the same tenant/status checks as database RLS.
// Never look up authorization with a service-role client.
export async function requireActiveAccount(client: any, roles: string[]) {
  const { data, error } = await client.rpc('get_my_account_status').maybeSingle();
  const { data: clinicId, error: tenantError } = await client.rpc('get_user_clinic_id');
  if (error || tenantError || !data?.has_access || !clinicId || clinicId !== data.clinic_id || !roles.includes(data.role)) {
    throw new Error('Forbidden: akun atau klinik tidak aktif');
  }
  return data as { user_id: string; role: string; clinic_id: string; has_access: boolean };
}
