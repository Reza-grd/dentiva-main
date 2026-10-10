import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { requireActiveAccount } from './activeAccount.ts';
const client = (access: boolean, tenant: string|null, role = 'admin') => ({
  rpc: (name:string) => name === 'get_my_account_status'
    ? {maybeSingle: async () => ({data:{has_access:access,clinic_id:'A',role},error:null})}
    : Promise.resolve({data:tenant,error:null}),
});
Deno.test('active account requires matching JWT tenant and allowed role', async () => {
  assertEquals((await requireActiveAccount(client(true,'A'),['admin'])).clinic_id,'A');
  await assertRejects(() => requireActiveAccount(client(false,'A'),['admin']));
  await assertRejects(() => requireActiveAccount(client(true,null),['admin']));
  await assertRejects(() => requireActiveAccount(client(true,'B'),['admin']));
  await assertRejects(() => requireActiveAccount(client(true,'A','dokter'),['admin']));
});
