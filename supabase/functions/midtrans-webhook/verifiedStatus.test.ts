import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { verifiedStatus } from './verifiedStatus.ts';
Deno.test('uses authoritative status and encodes order ID', async () => {
  const request = (async (url, options) => {
    assertEquals(url, 'https://api.sandbox.midtrans.com/v2/order%2Ftest/status');
    assertEquals((options?.headers as Record<string,string>).Authorization, `Basic ${btoa('synthetic:')}`);
    return Response.json({order_id:'order/test',gross_amount:'100.00',transaction_status:'pending'});
  }) as typeof fetch;
  assertEquals((await verifiedStatus('order/test','100','synthetic',false,request)).transaction_status,'pending');
});
Deno.test('rejects amount/order mismatch and provider failure', async () => {
  await assertRejects(() => verifiedStatus('A','100','synthetic',true, (async () => Response.json({order_id:'B',gross_amount:'100',transaction_status:'settlement'})) as typeof fetch));
  await assertRejects(() => verifiedStatus('A','100','synthetic',true, (async () => Response.json({order_id:'A',gross_amount:'101',transaction_status:'settlement'})) as typeof fetch));
  await assertRejects(() => verifiedStatus('A','100','synthetic',true, (async () => new Response('',{status:503})) as typeof fetch));
});
