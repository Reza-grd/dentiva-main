import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {instansSvg} from './instans-svg.mjs';
const deps=process.env.DENTIVA_NODE_DEPS||'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require=createRequire(deps+'/package.json');const {chromium}=require('playwright');
const out=new URL('./bukti/',import.meta.url);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});const proof=[];
for (const theme of ['light','dark']) for (const dpr of [1,2]) for (const width of [375,1440]) {
 let serial=0;let content='';
 for(const lod of ['mini','standar','hero']){
  content+=`<section><h2>${lod} — lebar ${lod==='mini'?58:lod==='standar'?120:220} CSS px</h2><div class="row">`;
  for (const state of ['idle','happy','talk','think','wave','sorry']){
   const text=readFileSync(new URL(`./svg/${state}.${lod}.svg`,import.meta.url),'utf8').replace(/^<\?xml.*?\?>/,'');
   const id=++serial;let svg=instansSvg(text,n=>`preview${id}-${n}`).replace('<svg ',`<svg data-theme="${theme}" `);
   // Styles internes se recouvrent seulement pour les mêmes poses; scoper chaque instantané.
   svg=svg.replace(/<style>([\s\S]*?)<\/style>/,(_,css)=>`<style>${css.replace(/\.denti/g,`.preview-${id}`)}</style>`).replace('class="denti"',`class="denti preview-${id}"`);
   content+=`<figure style="--size:${lod==='mini'?58:lod==='standar'?120:220}px">${svg}<figcaption>${state}</figcaption></figure>`;
  }content+='</div></section>';
 }
 const html=`<!doctype html><html lang="id" class="${theme}"><meta charset="utf-8"><title>G1 — Bukti aset statis</title><style>body{margin:0;padding:16px;background:${theme==='dark'?'#0B1220':'#FFFFFF'};color:${theme==='dark'?'#F8FAFC':'#163047'};font:14px system-ui}h1{font-size:20px}h2{font-size:16px}.row{display:flex;flex-wrap:wrap;gap:16px}figure{margin:8px;padding:16px;border:1px solid ${theme==='dark'?'#475569':'#CBD5E1'};border-radius:12px}figure>svg{width:var(--size);height:auto}figcaption{text-align:center;margin-top:12px}</style><h1>Denti G1 — ${theme} · ${width}px · DPR ${dpr}</h1><p>Pose statis; bukti ini tidak menguji animasi aplikasi.</p>${content}</html>`;
 const ctx=await browser.newContext({viewport:{width,height:960},deviceScaleFactor:dpr,colorScheme:theme==='dark'?'dark':'light'});const page=await ctx.newPage();await page.setContent(html);await page.screenshot({path:fileURLToPath(new URL(`render-${width}-${theme}-dpr${dpr}.png`,out)),fullPage:true});
 proof.push({width,theme,dpr,svgCount:await page.locator('figure>svg').count(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 if(width===1440&&dpr===1)writeFileSync(new URL(`pratinjau-${theme}.html`,out),html);
 await ctx.close();
}
await browser.close();writeFileSync(new URL('render.json',out),JSON.stringify(proof,null,2));console.log('8 tangkapan layar dihasilkan (375/1440, terang/gelap, DPR 1/2).');
