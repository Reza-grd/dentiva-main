import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
import {ALL_TOOLS} from '../../../../supabase/functions/ai-assistant/core.ts';
const P=new URL('./',import.meta.url),B=new URL('./bukti/',P);mkdirSync(B,{recursive:true});
const source=readFileSync(new URL('skenario.js',P),'utf8');
const ast=ts.createSourceFile('skenario.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
if(ast.parseDiagnostics.length)throw new Error(ts.formatDiagnosticsWithColorAndContext(ast.parseDiagnostics,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>'.',getNewLine:()=> '\n'}));
if(ast.statements.length!==1||!ts.isExpressionStatement(ast.statements[0])||!ts.isArrayLiteralExpression(ast.statements[0].expression))throw new Error('Harus array tunggal tanpa import/export');
// Import hanya artefak kode tepercaya yang baru dibuat, tanpa eval/new Function.
writeFileSync(new URL('scenarios.mjs',B),'export const SCENARIOS = '+source+';\n');
const {SCENARIOS}=await import(new URL('scenarios.mjs',B));
const toolNames=new Set(ALL_TOOLS.map(x=>x.name));const ids=new Set();const tags=new Set(['briefing','analitik','pembelian','pengeluaran','bahan','tarif','keselamatan','obrolan']);
const kinds=new Set(['bahan_tambah','bahan_tambah_banyak','bahan_ubah','stok_masuk','stok_masuk_banyak','stok_opname','batch_buang','pengeluaran_catat','pengeluaran_ubah','pengeluaran_hapus','overhead_atur','overhead_target','tindakan_harga','tindakan_harga_massal','tindakan_tambah','tindakan_ubah','resep_atur','resep_hapus']);
for(const s of SCENARIOS){
 if(ids.has(s.id)||!/^g6-[a-z0-9-]+$/.test(s.id)||!tags.has(s.tag)||!s.say?.trim()||!s.expect||!s.script?.length)throw new Error('Skema '+s.id);ids.add(s.id);
 for(const name of [...(s.expect.tools??[]),...(s.expect.notTools??[]),...s.script.flatMap(x=>(x.calls??[]).map(c=>c.name))])if(!toolNames.has(name))throw new Error('Alat tidak dikenal '+name);
 for(const k of [...(s.expect.kinds??[]),...(s.expect.kindsInclude??[]),...(s.expect.kindsOnly??[])])if(!kinds.has(k))throw new Error('Jenis tidak dikenal '+k);
 if(s.setup&&!s.teardown)throw new Error('Setup tanpa teardown '+s.id);
}
const micro=JSON.parse(readFileSync(new URL('mikrocopy.json',P),'utf8'));
for(const [k,v]of Object.entries(micro))if(v.length<5||new Set(v).size!==v.length||v.some(s=>[...s].length>220))throw new Error('Mikrocopy '+k);
// Salinan harness hanya di docs; import sumber produksi tetap menunjuk worktree sendiri.
const original=new URL('../../../../supabase/tests/agent/eval/run.mjs',P);
let harness=readFileSync(original,'utf8').replace(/^import .*? from "(.+?)";/gm,(line,spec)=>{
 const resolved=spec==='./scenarios.mjs'?new URL('scenarios.mjs',B):spec.startsWith('.')?new URL(spec,original):null;
 return resolved?line.replace('"'+spec+'"','"'+resolved.href+'"'):line;
});
writeFileSync(new URL('harness.mjs',B),harness);
const stats={syntax:'TypeScript AST parse sungguhan; satu array',scenarios:SCENARIOS.length,uniqueIds:ids.size,composition:JSON.parse(readFileSync(new URL('komposisi.json',P),'utf8')).groups,toolsValid:true,proposalKindsValid:true,injectionScenarios:SCENARIOS.filter(s=>s.setup).length,microcopySituations:Object.keys(micro).length,microcopyVariations:Object.values(micro).reduce((n,v)=>n+v.length,0),maximumCharacters:Math.max(...Object.values(micro).flat().map(s=>[...s].length)),scope:'Struktur dan oracle skrip; jalankan harness untuk alat/database, evaluasi model belum dijalankan.'};
writeFileSync(new URL('bukti-validasi.json',P),JSON.stringify(stats,null,2));console.log(JSON.stringify(stats,null,2));
