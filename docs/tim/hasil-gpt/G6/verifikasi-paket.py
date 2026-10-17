"""Pemeriksaan artefak lintas paket, stdlib; tidak mengubah aplikasi."""
from pathlib import Path
import re,json,xml.etree.ElementTree as ET,hashlib
P=Path(__file__).resolve().parent;H=P.parent;ROOT=H.parents[2]
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
jsons=list(H.glob('G[1-6]/**/*.json'))
for p in jsons:load(p)
svgs=sorted((H/'G1/svg').glob('*.svg'));assert len(svgs)==18
baseline=load(H/'G1/bukti/sumber.json');classes=set(' '.join(re.findall(r'class="([^"]+)"',baseline['markup']['hero'])).split());assert len(baseline['states'])==len(set(baseline['states']))==93
for p in svgs:
 root=ET.parse(p).getroot();assert root.get('viewBox')=='0 0 400 480' and not root.get('width') and not root.get('height')
 tags=[e.tag.split('}')[-1] for e in root.iter()];assert not set(tags)&{'filter','feGaussianBlur','script','image'}
 assert root.find('{http://www.w3.org/2000/svg}title') is not None
 assert classes.issubset(set(' '.join(e.get('class','') for e in root.iter()).split()))
 ids=[e.get('id') for e in root.iter() if e.get('id')];assert len(ids)==len(set(ids))
 if '.mini.' in p.name:
  assert not any(t.endswith('Gradient') for t in tags)
  assert min(float(e.get('stroke-width')) for e in root.iter() if e.get('stroke-width'))>=13
 assert len(tags)<=500
sketches=re.findall(r'```svg\n(.*?)\n```',(H/'G1/ekspresi.md').read_text(encoding='utf-8'),re.S);assert len(sketches)==12
for s in sketches:ET.fromstring(s)
tokens=load(H/'G2/tokens.json');leaves={}
def walk(d,path=''):
 if isinstance(d,dict):
  if '$value' in d:leaves[path]=d
  else:
   for k,v in d.items():
    if not k.startswith('$'):walk(v,(path+'.'+k).strip('.'))
walk(tokens)
def refs(v):
 if isinstance(v,str):return re.findall(r'\{([^{}]+)\}',v)
 if isinstance(v,list):return sum((refs(x) for x in v),[])
 if isinstance(v,dict):return sum((refs(x) for x in v.values()),[])
 return []
for name,t in leaves.items():
 assert '$type' in t,(name,'tanpa tipe')
 for ref in refs(t['$value']):assert ref in leaves,(name,ref)
 typ=t['$type'];v=t['$value']
 if typ=='color':assert v['colorSpace']=='srgb' and len(v['components'])==3 and all(0<=c<=1 for c in v['components']) and 0<=v['alpha']<=1
 if typ=='dimension':assert v['unit'] in ['px','rem'] and isinstance(v['value'],(int,float))
 if typ=='duration':assert v['unit'] in ['ms','s'] and v['value']>=0
 if typ=='fontWeight':assert 1<=v<=1000
 if typ=='cubicBezier':assert len(v)==4 and 0<=v[0]<=1 and 0<=v[2]<=1
def lum(c):
 vals=[int(c[i:i+2],16)/255 for i in (1,3,5)];return sum((x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4)*w for x,w in zip(vals,[.2126,.7152,.0722]))
def ratio(a,b):x,y=sorted([lum(a),lum(b)]);return (y+.05)/(x+.05)
for c in load(H/'G1/palet.json')['colors'].values():
 assert abs(c['againstWhite']-ratio(c['hex'],'#FFFFFF'))<.0001
 assert abs(c['againstDark']-ratio(c['hex'],'#0B1220'))<.0001
for x in load(H/'G2/kontras.json'):
 fg=leaves[f"color.chart.{x['theme']}.c{x['foreground'].split('-')[-1]}" if x['foreground'].startswith('chart-') else f"color.{x['theme']}.{x['foreground']}"]['$value']['hex'];bg=leaves[f"color.{x['theme']}.{x['background']}"]['$value']['hex'];r=ratio(fg,bg);assert abs(r-x['ratio'])<.0001 and r>=x['minimum']
components=list((H/'G2/komponen').glob('*.md'));assert len(components)==25
for p in components:
 text=p.read_text(encoding='utf-8')
 for state in ['default','hover','fokus','aktif','nonaktif','memuat','galat']:assert '| '+state+' |' in text
screens=list((H/'G3').glob('layar-*.md'));assert len(screens)==10
for p in screens:
 text=p.read_text(encoding='utf-8');assert len(re.findall(r'^## [1-9]\.',text,re.M))==9
 for link in re.findall(r'\]\((\.\./G2/komponen/[^)]+)\)',text):assert (p.parent/link).exists(),link
register=load(H/'G4/iso27001-register.json');assert len(register)==93 and len(set(x['id'] for x in register))==93
for p in (H/'G4').rglob('*.md'):assert 'DRAF — perlu ditinjau advokat/DPO/auditor' in p.read_text(encoding='utf-8'),p
prices=load(H/'G5/model-harga.json')
for p in prices['plans']:
 assert p['annual']==p['monthly']*10
 assert p['totalCostIllustration']==p['fixedCost']+p['ai']*1450
 assert abs(p['grossMarginMonthlyIllustration']-(1-p['totalCostIllustration']/p['monthly']))<.0001
for n in range(1,7):assert (ROOT/'docs/tim/serah-terima'/f'G{n}.md').exists()
composition=load(H/'G6/komposisi.json');assert composition['total']==150 and composition['groups']=={'bahasa':60,'ambigu':25,'multi':25,'keselamatan':25,'analitik':15}
selftest=load(H/'G6/bukti/selftest-150.json');assert selftest['provider']=='scripted' and len(selftest['results'])==150 and all(x['pass'] for x in selftest['results'])
negative=load(H/'G6/bukti/negative-150.json');assert sum(not x['pass'] for x in negative['results'])>=119
report={'jsonFilesParsed':len(jsons),'svgXML':18,'expressionSketchXML':12,'sourceRigClasses':len(classes),'registeredSourceStates':93,'tokens':len(leaves),'contrastPairsG1':len(load(H/'G1/palet.json')['pairs']),'contrastPairsG2':58,'components':25,'screens':10,'isoControlRows':93,'agentScriptedPass':150,'negativeFailuresDetected':sum(not x['pass'] for x in negative['results']),'scope':'Artefak dokumentasi dan selftest sintetis; bukan sertifikasi, pengujian 93 animasi, atau evaluasi model.'}
(P/'bukti/verifikasi-paket.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
