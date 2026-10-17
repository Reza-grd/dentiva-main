"""Reproduksi aset dokumentasi dari rig acuan; Python stdlib, tanpa dependensi."""
from pathlib import Path
import json,re,xml.etree.ElementTree as ET, hashlib
P=Path(__file__).resolve().parent
S=json.loads((P/'bukti/sumber.json').read_text(encoding='utf-8'))
NS='http://www.w3.org/2000/svg'; ET.register_namespace('',NS)
def tag(n): return n.tag.split('}')[-1]
def luminance(c):
    v=[int(c[i:i+2],16)/255 for i in (1,3,5)]
    v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v]
    return sum(x*y for x,y in zip(v,[.2126,.7152,.0722]))
def ratio(a,b):
    x,y=sorted([luminance(a),luminance(b)]);return (y+.05)/(x+.05)
palette={'backgroundLight':'#FFFFFF','backgroundDark':'#0B1220','enamel':'#F8FAFC','enamelShade':'#CBD5E1','outline':'#163047','visor':'#0B1220','face':'#5EEAD4','tealLight':'#0F766E','tealDark':'#5EEAD4','warmDecoration':'#E7C98B'}
pal={'version':'1.0','method':'WCAG relative luminance sRGB; hasil dibulatkan 4 desimal setelah perhitungan','colors':{k:{'hex':v,'againstWhite':round(ratio(v,'#FFFFFF'),4),'againstDark':round(ratio(v,'#0B1220'),4),'role':'dekoratif; bukan teks' if k in ['enamel','enamelShade','warmDecoration'] else 'lihat pasangan penggunaan'} for k,v in palette.items()},'pairs':[]}
for a,b,threshold in [('outline','enamel',4.5),('face','visor',4.5),('tealLight','backgroundLight',4.5),('tealDark','backgroundDark',4.5),('outline','backgroundLight',3),('enamel','backgroundDark',3)]:
    r=ratio(palette[a],palette[b]);pal['pairs'].append({'foreground':a,'background':b,'ratio':round(r,4),'minimum':threshold,'pass':r>=threshold})
(P/'palet.json').write_text(json.dumps(pal,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
states=['idle','happy','talk','think','wave','sorry'];lods=['mini','standar','hero']
colors={'shell':'#F8FAFC','edge':'var(--d-outline, #163047)','visor':'#0B1220','eye':'#5EEAD4','blue':'#0F766E','fin':'#0F766E','gold':'#E7C98B','core':'#5EEAD4','halo':'#CBD5E1','scan':'#5EEAD4'}
poses={'idle':'','happy':'.d-head{transform:rotate(-3deg)}','talk':'.d-arm-r{transform:rotate(-38deg)}','think':'.d-head{transform:rotate(-6deg)}.d-arm-l{transform:rotate(-143deg)}','wave':'.d-head{transform:rotate(4deg)}.d-arm-r{transform:rotate(-118deg)}','sorry':'.d-head{transform:rotate(-4deg) translateY(6px)}.d-arm-l{transform:rotate(-10deg)}.d-arm-r{transform:rotate(10deg)}'}
report={'sourceStates':S['states'],'sourceStateCount':len(S['states']),'assets':[],'scope':'Validasi struktur dan pose statis; belum membuktikan animasi 93 state dalam aplikasi.'}
source_classes=set(re.findall(r'class="([^"]+)"',S['markup']['hero']))
source_classes=set(' '.join(source_classes).split())
(P/'svg').mkdir(exist_ok=True)
for lod in lods:
 for state in states:
    prefix={'mini':'dm','standar':'ds','hero':'dh'}[lod]+'-'+state+'-INSTANCE'
    root=ET.fromstring(f'<svg xmlns="{NS}" viewBox="0 0 400 480" class="denti" data-state="{state}" data-lod="{lod}" data-kid="false" role="img">'+S['markup'][lod]+'</svg>')
    title=ET.Element(f'{{{NS}}}title');title.text=f'Denti — {state}';root.insert(0,title)
    defs=next(x for x in root if tag(x)=='defs')
    keep=set() if lod=='mini' else ({'shell'} if lod=='standar' else {'shell','visor','blue'})
    for e in list(defs):
      if tag(e) in ['linearGradient','radialGradient']:
        name=e.get('id','').removeprefix('SUMBER-')
        if name not in keep: defs.remove(e)
        else:
          stops=list(e)
          shades={'shell':['#FFFFFF','#F8FAFC','#CBD5E1'],'visor':['#163047','#0B1220','#0B1220'],'blue':['#5EEAD4','#0F766E','#0F766E']}[name]
          for stop,col in zip(stops,shades):stop.set('stop-color',col)
    for e in root.iter():
      for attr,val in list(e.attrib.items()):
        m=re.fullmatch(r'url\(#SUMBER-(.*?)\)',val)
        if m and m[1] not in keep and m[1] in colors:e.set(attr,colors[m[1]])
        elif 'SUMBER-' in val:e.set(attr,val.replace('SUMBER-',prefix+'-'))
      if 'stroke-width' in e.attrib:
        minimum={'mini':13,'standar':7,'hero':4}[lod]
        e.set('stroke-width',str(max(minimum,float(e.get('stroke-width')))))
      # Mata dan mulut tetap terang karena berada DI ATAS VISOR gelap.
      if e.get('stroke')=='#9ee6ff':e.set('stroke','#5EEAD4')
      if e.get('fill')=='#9ee6ff':e.set('fill','#5EEAD4')
      if lod=='mini':
        for a in ['opacity','fill-opacity','stroke-opacity']:
          if a in e.attrib and float(e.get(a))>0:e.attrib.pop(a)
    # Hilangkan geometri dekoratif sambil mempertahankan semua kait kelas.
    for e in root.iter():
      cls=set(e.get('class','').split())
      if lod=='mini' and cls.intersection({'d-orbit','d-sparks','d-shadow','d-brackets'}):
        for c in e.iter():
          if c is not e and tag(c) in ['path','circle','ellipse','rect','text']:
            c.attrib.pop('d',None);c.set('display','none')
      if lod=='mini' and cls.intersection({'d-body','d-head','d-visor','d-ear-l','d-ear-r'}):
        # Pantulan berupa garis kecil tidak diperlukan di mini.
        for c in list(e):
          if not c.get('class') and tag(c)=='path' and c.get('fill')=='none' and c.get('stroke')=='#fff':e.remove(c)
    for e in root.iter():
      if 'd-mouth-smile' in e.get('class','').split():e.set('d','M178 196 Q200 216 222 196')
    style=ET.Element(f'{{{NS}}}style')
    # CSS internal dibutuhkan agar berkas mandiri menampilkan satu ekspresi yang benar.
    # Integrasi runtime mengambil defs dan rig, bukan style snapshot ini.
    scoped_pose=re.sub(r'(\.d-[\w-]+\{)',lambda m:'.denti[data-state="'+state+'"] '+m[1],poses[state])
    style.text=S['css']+'\n.denti{--d-outline:#163047}.dark .denti,.denti[data-theme="dark"]{--d-outline:#F8FAFC}\n.denti,.denti *{animation:none!important;transition:none!important}\n'+scoped_pose+'\n'
    if lod=='mini':style.text+='\n.denti .d-orbit,.denti .d-sparks,.denti .d-shadow,.denti .d-brackets,.denti .d-bubble{display:none!important}\n'
    root.insert(1,style)
    file=P/'svg'/f'{state}.{lod}.svg';ET.indent(root,space='  ');ET.ElementTree(root).write(file,encoding='utf-8',xml_declaration=True)
    actual=set(' '.join(e.get('class','') for e in root.iter()).split());missing=sorted(source_classes-actual)
    assert not missing,missing
    assert not any(tag(e) in ['filter','feGaussianBlur','script','image'] for e in root.iter())
    assert lod!='mini' or not any(tag(e).endswith('Gradient') for e in root.iter())
    ids={e.get('id') for e in root.iter() if e.get('id')}
    for e in root.iter():
      for v in e.attrib.values():
        for ref in re.findall(r'url\(#(.*?)\)',v):assert ref in ids,ref
    report['assets'].append({'file':str(file.relative_to(P)).replace('\\','/'),'elements':sum(1 for _ in root.iter()),'rigClasses':len(actual),'missingClasses':missing,'gradients':sum(tag(e).endswith('Gradient') for e in root.iter()),'minimumStroke':min(float(e.get('stroke-width')) for e in root.iter() if e.get('stroke-width')),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(P/'bukti/validasi-struktur.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('18 SVG XML valid; seluruh kelas sumber dipertahankan; palet dihitung.')
