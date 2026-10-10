/** Historical BEFORE-FIX audit reproductions (migration cutoff 20261009170624). Uses a disposable synthetic PGlite DB. */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const db = new PGlite();
const A = 'd0000000-0000-0000-0000-000000000000';
const B = 'bbbbbbbb-0000-4000-8000-000000000002';
const U = 'a0000000-0000-4000-8000-00000000000a';
const P = 'b0000000-0000-4000-8000-00000000000b';
const query = async (sql, params) => (await db.query(sql, params)).rows;
await db.exec(readFileSync(root + 'supabase/tests/smoke/legacy-baseline.sql', 'utf8'));
// The synthetic baseline omits visits INSERT/UPDATE. Add the exact legacy
// admin policy from archive/dentiva_schema_backup.sql:860 before migrations.
await db.exec(`create policy "Admins have full access to visits" on public.visits for all using (public.get_user_role() = 'admin')`);
await db.exec(`
  insert into public.clinics(id,name,slug) values ('${B}','Synthetic B','synthetic-b');
  insert into auth.users(id,email,raw_app_meta_data) values ('${U}','audit@example.test','{"clinic_id":"${A}"}');
  insert into public.users(id,email,full_name,role,clinic_id) values ('${U}','audit@example.test','Synthetic Admin','admin','${A}');
  insert into public.patients(id,no_rm,nama_lengkap,clinic_id) values ('${P}','B-1','Synthetic Patient','${B}');
`);
for (const f of readdirSync(root + 'supabase/migrations').filter(f => f.endsWith('.sql') && !f.includes('_baseline') && f.slice(0,14) <= '20261009170624').sort()) {
  await db.exec(readFileSync(root + 'supabase/migrations/' + f, 'utf8').replace(/create extension if not exists pg_cron with schema extensions;/gi, '-- pg_cron stub'));
}
const login = async () => {
  await query("select set_config('request.jwt.claims',$1,false),set_config('request.jwt.claim.sub',$2,false)", [JSON.stringify({sub:U,role:'authenticated',app_metadata:{clinic_id:A}}), U]);
  await db.exec('set role authenticated');
};
const reset = async () => { await db.exec('reset role'); await db.exec("select set_config('request.jwt.claims','',false),set_config('request.jwt.claim.sub','',false)"); };
await login();
const cross = await query(`insert into public.visits(patient_id,clinic_id) values ($1,$2) returning id,clinic_id,patient_id`, [P,A]);
console.log('F03 EXPLICIT clinic_id allows foreign patient_id:', cross.length === 1);
await query(`update public.visits set patient_id=$1 where id=$2 returning id`, [P,cross[0].id]);
console.log('F03 UPDATE also accepted (parent tenant is not checked)');
await reset();
await db.exec(`insert into storage.objects(bucket_id,name) values ('radiologi','${A}/synthetic-medical-image.png')`);
await login();
console.log('F02 admin can SELECT own-clinic radiology object:', (await query("select name from storage.objects where bucket_id='radiologi'")).length === 1);
await reset();
const [usage] = await query(`insert into public.ai_usage(clinic_id,user_id,feature,model,question,question_norm,answer,tools_used,data_fingerprint,status)
  values ($1,$2,'finance_chat','synthetic','Bagaimana pendapatan bulan ini?','bagaimana pendapatan bulan ini','Pendapatan Rp 100.000','{}','old-snapshot','ok') returning id`, [A,U]);
await login();
console.log('F07 data answer classified by feedback:', (await query('select public.ai_answer_feedback($1,true,null) as result',[usage.id]))[0].result);
await reset();
// Test role gate without pretending to test real pgcrypto. Identity stubs let the exact
// deployed decrypt_field body run, but ONLY demonstrate authorization branching.
await db.exec(`create or replace function private.get_encryption_key() returns bytea language sql as $$ select decode('00','hex') $$;
  create or replace function public.pgp_sym_decrypt(bytea,text) returns text language sql as $$ select convert_from($1,'UTF8') $$;
  grant execute on function public.decrypt_field(text) to authenticated;`);
await login();
const [plain] = await query(`select public.decrypt_field('PGPM:'||encode(convert_to('SYNTHETIC MEDICAL','UTF8'),'base64')) as original,
  public.decrypt_field('PGP:'||encode(convert_to('SYNTHETIC MEDICAL','UTF8'),'base64')) as relabeled`);
console.log('F01 exact SQL authorization branches (crypto stub):', plain);
await reset();
// Install the CURRENT medical trigger after adding SOAP columns omitted by the
// smoke baseline. Presealed dummy values avoid testing encryption with stubs.
await db.exec(`alter table public.visits add column pemeriksaan_fisik text, add column diagnosa text,
  add column kode_icd10 text, add column terapi text, add column catatan_dokter text,
  add column is_locked boolean not null default false;
  create trigger a_protect_visit_medical_fields before insert or update on public.visits
    for each row execute function public.protect_visit_medical_fields();
  update public.users set role='dokter' where id='${U}';
  create policy "Dokter can update visits" on public.visits for update using (public.get_user_role()='dokter');
  update public.visits set is_locked=true where id='${cross[0].id}';`);
await login();
console.log('F12 locked visit accepts medical UPDATE:', (await query(`update public.visits set diagnosa='PGPM:U1lOVEhFVElD' where id=$1 returning is_locked,diagnosa`,[cross[0].id]))[0]);
await reset();
await db.close();

// Midtrans proof is about fields covered by the signature, not access to a real
// notification. Exploitation requires possession of a valid notification.
const syntheticKey = 'SYNTHETIC-NOT-A-REAL-SECRET';
const originalNotification = {order_id:'SYNTHETIC-ORDER',status_code:'201',gross_amount:'599000.00',transaction_status:'pending'};
const sign = n => createHash('sha512').update(n.order_id+n.status_code+n.gross_amount+syntheticKey).digest('hex');
const changed = {...originalNotification,transaction_status:'settlement'};
console.log('Conditional Midtrans risk: unsigned status changed, signature unchanged:', sign(originalNotification)===sign(changed));

const markdownUrl = new URL('../../../apps/clinic/src/utils/miniMarkdown.js', import.meta.url).href;
const markdownResult = await new Promise(resolve => {
  const worker = new Worker(`const {parentPort}=require('node:worker_threads'); import(${JSON.stringify(markdownUrl)}).then(({miniMarkdown})=>{parentPort.postMessage('ready'); parentPort.postMessage(miniMarkdown('| orphan |'));});`, {eval:true});
  let timer;
  worker.on('message', msg => {
    if (msg === 'ready') timer = setTimeout(async () => { await worker.terminate(); resolve('HUNG: terminated after 500 ms'); },500);
    else { clearTimeout(timer); worker.terminate(); resolve(msg); }
  });
  worker.on('error', err => { clearTimeout(timer); resolve(err.message); });
});
console.log('F06 miniMarkdown standalone pipe row:', markdownResult);
