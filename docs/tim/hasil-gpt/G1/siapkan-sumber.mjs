// Baca sumber milik worktree ini; tidak mengubah implementasi aplikasi.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dentiSvg, DENTI_STATES } from '../../../../apps/clinic/src/components/mascot/dentiSvg.js';
const out = new URL('./bukti/', import.meta.url); mkdirSync(out, {recursive:true});
const css=readFileSync(new URL('../../../../apps/clinic/src/components/mascot/denti.css',import.meta.url),'utf8');
writeFileSync(new URL('sumber.json',out),JSON.stringify({states:DENTI_STATES,css,markup:Object.fromEntries(['mini','standar','hero'].map(lod=>[lod,dentiSvg('SUMBER',lod)]))},null,2));
