import { assertEquals, assertThrows, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { scopedOutbox, checkOutboxTarget } from './outboxScope.ts';
Deno.test('user queue is always scoped; only service can use global query', () => {
  const q={eq:(column:string,value:string)=>({column,value})};
  assertEquals(scopedOutbox(q,'A',false),{column:'clinic_id',value:'A'});
  assertEquals(scopedOutbox(q,null,true),q);
  assertThrows(()=>scopedOutbox(q,null,false));
});
Deno.test('rejects outbox payload targets outside the row clinic', async () => {
  const calls: string[][]=[];
  const chain={select:()=>chain,eq:(key:string,value:string)=>{calls.push([key,value]);return chain;},maybeSingle:()=>Promise.resolve({data:null,error:null})};
  await assertRejects(()=>checkOutboxTarget({from:()=>chain},{resource_type:'Practitioner',clinic_id:'A',payload:{userId:'foreign'}}));
  assertEquals(calls,[['id','foreign'],['clinic_id','A']]);
});
