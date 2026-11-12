"""Rebuild native assets and symbol inventory from the pinned extended SWF.

Requires Python 3 and Java/JPEXS installed by tools/setup-ffdec.ps1.
No Flash code is shipped: JPEXS is an offline asset conversion tool only.
"""
from __future__ import annotations
import argparse
import collections
import copy
import functools
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SWF = ROOT / 'reference/swf/extended.swf'
EXPECTED = '9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a'
CACHE = ROOT / '.local-setup/asset-export'
OUT = ROOT / 'assets'
XML = ROOT / 'analysis/dumps/extended.xml'
PROFILE = ROOT / '.local-setup/logs/ffdec-profile'
LOSSLESS_WEBP = False

def digest(data):
    return hashlib.sha256(data).hexdigest()

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def ffdec(*args):
    PROFILE.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, APPDATA=str(PROFILE))
    command = ['java', '-Duser.home=' + str(PROFILE), '-jar', str(ROOT / '.local-setup/ffdec/ffdec.jar'), *map(str, args)]
    result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, errors='replace')
    if result.returncode or 'FAIL' in result.stdout:
        # Diagnostic output stays local; it can contain absolute personal paths.
        (PROFILE / 'export-error.txt').write_text(result.stdout + result.stderr, encoding='utf-8')
        raise RuntimeError('JPEXS export failed; local diagnostic saved under .local-setup/logs/.')

def export_all():
    exports = [('shape','svg'), ('morphshape','svg'), ('sprite','png'), ('button','png'), ('sound','mp3_wav'), ('font','woff'), ('text','svg'), ('frame','png')]
    for kind, fmt in exports:
        dest = CACHE / kind
        stamp = dest / '.complete'
        if not stamp.exists() or stamp.read_text(encoding='ascii').strip()!=EXPECTED:
            print(f'Exporting {kind} ({fmt})...', flush=True)
            ffdec('-config','parallelSpeedUp=0','-format',f'{kind}:{fmt}','-export',kind,dest,SWF)
            stamp.write_text(EXPECTED, encoding='ascii')

def exact_bounds():
    path=CACHE/'bounds.json'
    if not path.exists():
        env=dict(os.environ,APPDATA=str(PROFILE))
        PROFILE.mkdir(parents=True,exist_ok=True)
        subprocess.run(['java','-Duser.home='+str(PROFILE),'-cp',str(ROOT/'.local-setup/ffdec/lib/*'),str(ROOT/'scripts/assets/export-bounds.java'),str(SWF),str(path)],env=env,cwd=ROOT,check=True,capture_output=True)
    return json.loads(path.read_text(encoding='utf-8'))

def number(s):
    if s in ('true','false'): return s == 'true'
    try: return int(s)
    except (ValueError,TypeError):
        try: return float(s)
        except (ValueError,TypeError): return s

def attrs(node):
    return {k:number(v) for k,v in node.attrib.items() if k not in ('type','forceWriteAsLong') and len(v)<1000}

def symbol_id(node):
    for key in ('spriteId','shapeId','characterID','characterId','fontID','buttonId','soundId'):
        if node.get(key) is not None: return int(node.get(key))
    return None

def kind_of(node):
    t=node.get('type','')
    if 'MorphShape' in t:return 'morphshape'
    if 'Shape' in t:return 'shape'
    if 'Sprite' in t:return 'sprite'
    if 'Button' in t:return 'button'
    if 'Sound' in t:return 'sound'
    if 'Font' in t:return 'font'
    if 'Text' in t:return 'text'
    return 'other'

def matrix(node):
    if node is None:return {'a':1,'b':0,'c':0,'d':1,'tx':0,'ty':0}
    return {'a':float(node.get('scaleX','1')), 'b':float(node.get('rotateSkew0','0')), 'c':float(node.get('rotateSkew1','0')), 'd':float(node.get('scaleY','1')), 'tx':int(node.get('translateX','0'))/20, 'ty':int(node.get('translateY','0'))/20}

def rect(node):
    if node is None:return None
    x,y=float(node.get('Xmin','0'))/20,float(node.get('Ymin','0'))/20
    return {'x':x,'y':y,'width':float(node.get('Xmax','0'))/20-x,'height':float(node.get('Ymax','0'))/20-y}

def union(rs):
    rs=[r for r in rs if r]
    if not rs:return None
    x=min(r['x'] for r in rs); y=min(r['y'] for r in rs)
    return {'x':x,'y':y,'width':max(r['x']+r['width'] for r in rs)-x,'height':max(r['y']+r['height'] for r in rs)-y}

def transformed(r,m):
    if not r:return None
    points=[(m['a']*x+m['c']*y+m['tx'],m['b']*x+m['d']*y+m['ty']) for x in [r['x'],r['x']+r['width']] for y in [r['y'],r['y']+r['height']]]
    x=min(p[0] for p in points); y=min(p[1] for p in points)
    return {'x':x,'y':y,'width':max(p[0] for p in points)-x,'height':max(p[1] for p in points)-y}

def timeline(tags):
    frame=1; display={}; frames=[]; events=[]; labels=[]
    for index,t in enumerate(tags):
        ty=t.get('type','')
        if ty.startswith('PlaceObject'):
            depth=int(t.get('depth')); moved=t.get('placeFlagMove')=='true'
            p=copy.deepcopy(display.get(depth,{})) if moved else {}
            p['depth']=depth
            if t.get('characterId') is not None:p['symbolId']=int(t.get('characterId'))
            if t.get('name') is not None:p['name']=t.get('name')
            if t.find('matrix') is not None:p['matrix']=matrix(t.find('matrix'))
            p.setdefault('matrix',matrix(None))
            for key in ('ratio','clipDepth','blendMode','cacheAsBitmap','visible'):
                if t.get(key) is not None:p[key]=number(t.get(key))
            for key in ('colorTransform','filters'):
                if t.find(key) is not None:p[key]=xml_data(t.find(key))
            if t.find('clipActions') is not None:p['hasClipActions']=True
            display[depth]=p
            events.append({'frame':frame,'tagIndex':index,'type':'place','move':moved,**copy.deepcopy(p)})
        elif ty.startswith('RemoveObject'):
            depth=int(t.get('depth')); display.pop(depth,None)
            events.append({'frame':frame,'tagIndex':index,'type':'remove','depth':depth})
        elif ty=='FrameLabelTag':labels.append({'frame':frame,'name':t.get('name')})
        elif ty=='ShowFrameTag':
            frames.append({'frame':frame,'instances':copy.deepcopy(sorted(display.values(),key=lambda p:p['depth']))}); frame+=1
        elif ty in ('DoActionTag','StartSoundTag','SoundStreamBlockTag'):
            values=attrs(t)
            for key in ('actionBytes','soundData','streamSoundData'):
                if t.get(key):
                    data=bytes.fromhex(t.get(key));values.pop(key,None);values[key+'Length']=len(data);values[key+'Sha256']=digest(data)
            events.append({'frame':frame,'tagIndex':index,'type':ty,'attributes':values})
    return frames,events,labels

def xml_data(node):
    return {'tag':node.tag,**attrs(node),**({'text':node.text.strip()} if node.text and node.text.strip() else {}),'children':[xml_data(c) for c in node]}

def xml_restore(data):
    node=ET.Element(data['tag'])
    for k,v in data.items():
        if k not in ('tag','children','text'):node.set(k,str(v).lower() if isinstance(v,bool) else str(v))
    if 'text'in data:node.text=data['text']
    for child in data.get('children',[]):node.append(xml_restore(child))
    return node

def export_backdrops(root, scenes):
    """Bake static authoring placements, keeping native actors separate."""
    result={}
    for scene in scenes:
        frame=scene['frame']
        layers=['static']+(['background','foreground'] if frame==5 else [])
        for layer in layers:
            name=f'scene-{frame}-{layer}'; dest=CACHE/name
            if not (dest/'1.png').exists():
                layer_root=ET.Element('swf',root.attrib);layer_root.set('frameCount','1');layer_root.append(copy.deepcopy(root.find('displayRect')))
                tags=ET.SubElement(layer_root,'tags')
                for t in root.find('tags'):
                    if t.get('type','').startswith('Define') or t.get('type') in ('ExportAssetsTag','FileAttributesTag'):
                        tags.append(copy.deepcopy(t))
                for p in scene['instances']:
                    n=p.get('name','')
                    if n and n!='mcBG' and not re.fullmatch(r'table\d+',n):continue
                    if layer=='background' and p['depth']>=111:continue
                    if layer=='foreground' and p['depth']<111 and not p.get('clipDepth'):continue
                    a={'type':'PlaceObject2Tag','characterId':str(p['symbolId']),'depth':str(p['depth']),'placeFlagHasCharacter':'true','placeFlagHasMatrix':'true','placeFlagMove':'false','placeFlagHasClipActions':'false','placeFlagHasName':'false','placeFlagHasRatio':'false','placeFlagHasColorTransform':str('colorTransform'in p).lower(),'placeFlagHasClipDepth':str('clipDepth'in p).lower()}
                    if 'clipDepth'in p:a['clipDepth']=str(p['clipDepth'])
                    node=ET.SubElement(tags,'item',a);m=p['matrix']
                    ET.SubElement(node,'matrix',{'type':'MATRIX','hasScale':'true','hasRotate':'true','scaleX':str(m['a']),'scaleY':str(m['d']),'rotateSkew0':str(m['b']),'rotateSkew1':str(m['c']),'translateX':str(round(m['tx']*20)),'translateY':str(round(m['ty']*20))})
                    if 'colorTransform'in p:
                        cx=xml_restore(p['colorTransform']);cx.set('type','CXFORMWITHALPHA');node.append(cx)
                ET.SubElement(tags,'item',{'type':'ShowFrameTag'})
                xml=CACHE/f'{name}.xml';swf=CACHE/f'{name}.swf';ET.ElementTree(layer_root).write(xml,encoding='utf-8',xml_declaration=True)
                ffdec('-xml2swf',xml,swf)
                ffdec('-ignorebackground','-export','frame',dest,swf)
            if (dest/'1.png').exists():
                file=copy_asset(dest/'1.png','scene',frame)
                result[name]={'file':file,'bounds':{'x':0,'y':0,'width':550,'height':400},'sourceFrame':frame,'layer':layer}
    return result

def export_order_shell(root, items):
    """Keep the animated original bubble; remove values rendered by the native UI."""
    dest=CACHE/'order-shell'
    frame_dir=dest/'DefineSprite_363'
    if not (frame_dir/'47.png').exists():
        derived=copy.deepcopy(root)
        sprite=next(t for t in derived.find('tags') if t.get('spriteId')=='363')
        hidden_depths=set()
        for tag in sprite.find('subTags'):
            if tag.get('type','').startswith('PlaceObject'):
                depth=tag.get('depth')
                if tag.get('characterId') is not None:
                    if tag.get('characterId') in ('351','357'):hidden_depths.add(depth)
                    else:hidden_depths.discard(depth)
                if depth in hidden_depths:
                    old=tag.find('colorTransform')
                    if old is not None:tag.remove(old)
                    tag.set('placeFlagHasColorTransform','true')
                    ET.SubElement(tag,'colorTransform',{'type':'CXFORMWITHALPHA','hasAddTerms':'false','hasMultTerms':'true','redMultTerm':'256','greenMultTerm':'256','blueMultTerm':'256','alphaMultTerm':'0'})
        xml=CACHE/'order-shell.xml';swf=CACHE/'order-shell.swf'
        ET.ElementTree(derived).write(xml,encoding='utf-8',xml_declaration=True)
        ffdec('-xml2swf',xml,swf)
        ffdec('-selectid','363','-export','sprite',dest,swf)
    original=next(i for i in items if i['id']=='sprite-363')
    fs=[copy_asset(p,'sprite',363) for p in sorted(frame_dir.glob('*.png'),key=natural)]
    item=copy.deepcopy(original)
    item.update({'id':'sprite-363-clean','symbolId':-363,'sourceSymbolId':363,'name':'Order bubble without count or patience meter','derivedFrom':'sprite-363','derivation':{'hiddenChildSymbolIds':[351,357],'method':'Alpha-zero offline export preserves source bounds and timing.'},'files':list({f['url']:f for f in fs}.values()),'frameFiles':[f['url'] for f in fs]})
    item['preview']={'type':'sequence','url':fs[0]['url'],'frames':item['frameFiles'],'fps':12}
    items.append(item)

def natural(path):
    return [int(x) if x.isdigit() else x for x in re.split(r'(\d+)',str(path))]

@functools.lru_cache(maxsize=None)
def index_source_files(kind):
    folder=CACHE/kind
    found=collections.defaultdict(list)
    for p in folder.rglob('*'):
        if not p.is_file() or p.name.startswith('.'):continue
        rel=p.relative_to(folder)
        first=rel.parts[0]
        match=re.match(r'(?:Define\w+_)?(\d+)(?:[._\s-]|$)',first)
        if match:found[int(match.group(1))].append(p)
    return {sid:sorted(paths,key=natural) for sid,paths in found.items()}

def source_files(kind, sid):
    return index_source_files(kind).get(sid,[])

def copy_asset(src,kind,sid):
    data=src.read_bytes(); sha=digest(data)
    if src.suffix=='.png':
        extension='.png'
        dimensions=struct.unpack('>II',data[16:24])
        if LOSSLESS_WEBP:
            from PIL import Image
            converted=CACHE/'webp'/f'{sha}.webp'
            if not converted.exists():
                original=Image.open(io.BytesIO(data)).convert('RGBA')
                converted.parent.mkdir(parents=True,exist_ok=True)
                original.save(converted,'WEBP',lossless=True,exact=True,method=4)
                if Image.open(converted).convert('RGBA').tobytes()!=original.tobytes():raise RuntimeError('Lossless pixel validation failed')
            optimized=converted.read_bytes()
            if len(optimized)<len(data):data=optimized;sha=digest(data);extension='.webp'
        # Repeated held frames share the same physical PNG across every clip.
        dest=OUT/'frames'/f'{sha[:24]}{extension}'
    else:
        dest=OUT/kind/f'{sid}-{sha[:12]}{src.suffix.lower()}'
    dest.parent.mkdir(parents=True,exist_ok=True)
    if not dest.exists():dest.write_bytes(data)
    f={'url':dest.relative_to(ROOT).as_posix(),'sha256':sha,'bytes':len(data)}
    if src.suffix=='.png':f['width'],f['height']=dimensions
    return f

def main():
    global LOSSLESS_WEBP
    parser=argparse.ArgumentParser(); parser.add_argument('--inventory-only',action='store_true');parser.add_argument('--lossless-webp',action='store_true',help='Use Pillow 12.3.0 for pixel-verified lossless WebP; retain PNG when smaller.'); args=parser.parse_args()
    LOSSLESS_WEBP=args.lossless_webp
    if LOSSLESS_WEBP:
        import PIL
        if PIL.__version__!='12.3.0':raise RuntimeError('The pinned lossless export requires Pillow 12.3.0.')
    if digest(SWF.read_bytes())!=EXPECTED:raise RuntimeError('Baseline SWF checksum mismatch')
    CACHE.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
    if not XML.exists():
        XML.parent.mkdir(parents=True,exist_ok=True); ffdec('-swf2xml',SWF,XML)
    tree=ET.parse(XML); root=tree.getroot(); tags=root.find('tags')
    symbols={symbol_id(t):t for t in tags if t.get('type','').startswith('Define') and t.get('type')!='DefineFontAlignZonesTag' and symbol_id(t) is not None}
    exports=collections.defaultdict(list)
    for t in tags:
        if t.get('type')=='ExportAssetsTag':
            for i,n in zip(t.find('tags'),t.find('names')):exports[int(i.text)].append(n.text)
    timelines={0:timeline(tags)}
    for sid,t in symbols.items():
        if kind_of(t)=='sprite':timelines[sid]=timeline(t.find('subTags'))
    names=collections.defaultdict(set); usage=collections.defaultdict(list); deps=collections.defaultdict(set)
    for parent,(_,events,_) in timelines.items():
        for e in events:
            if 'symbolId' not in e:continue
            sid=e['symbolId']; deps[parent].add(sid)
            if e.get('name'):names[sid].add(e['name'])
            usage[sid].append({'parentSymbolId':parent,'frame':e['frame'],'depth':e['depth'],'name':e.get('name')})
    for sid,t in symbols.items():
        for e in t.iter():
            for key in ('characterId','fontId','bitmapId','buttonSoundChar0','buttonSoundChar1','buttonSoundChar2','buttonSoundChar3'):
                if e is not t and e.get(key) and int(e.get(key)) not in (0,65535):deps[sid].add(int(e.get(key)))
        if t.get('fontId'):deps[sid].add(int(t.get('fontId')))
    def descendants(seed):
        found=set();pending=list(seed)
        while pending:
            sid=pending.pop()
            if sid in found:continue
            found.add(sid);pending.extend(deps[sid]-found)
        return found
    scene_reach={s['frame']:descendants(p['symbolId'] for p in s['instances'] if 'symbolId'in p) for s in timelines[0][0]}
    bounds={}
    def get_bounds(sid,stack=()):
        if sid in bounds:return bounds[sid]
        if sid in stack or sid not in symbols:return None
        t=symbols[sid]; rs=[]
        for key in ('shapeBounds','bounds','textBounds','startBounds','endBounds'):
            if t.find(key) is not None:rs.append(rect(t.find(key)))
        if not rs and sid in timelines:
            for _,events,_ in [timelines[sid]]:
                rs += [transformed(get_bounds(e['symbolId'],stack+(sid,)),e['matrix']) for e in events if 'symbolId'in e]
        if not rs and kind_of(t)=='button':
            rs += [transformed(get_bounds(int(e.get('characterId')),stack+(sid,)),matrix(e.find('placeMatrix'))) for e in t.iter() if e.get('characterId')]
        bounds[sid]=union(rs);return bounds[sid]
    if not args.inventory_only:export_all()
    native_bounds=exact_bounds()
    items=[]
    for sid,t in sorted(symbols.items()):
        kind=kind_of(t); b=native_bounds.get(str(sid),get_bounds(sid)); source=source_files(kind,sid)
        fs=[copy_asset(p,kind,sid) for p in source]
        frames=[f['url'] for f in fs if f['url'].endswith(('.png','.webp'))]
        item={'id':f'{kind}-{sid}','symbolId':sid,'kind':kind,'name':', '.join(sorted(names[sid])) or ', '.join(exports[sid]) or f'{kind} {sid}', 'sourceTag':t.get('type'),'exportNames':exports[sid],'instanceNames':sorted(names[sid]),'bounds':b,'origin':{'x':-b['x'],'y':-b['y']} if b else {'x':0,'y':0},'dependencies':[f'{kind_of(symbols[d])}-{d}' if d in symbols else f'unresolved-{d}' for d in sorted(deps[sid])], 'frameCount':int(t.get('frameCount','1')), 'labels':timelines[sid][2] if sid in timelines else [],'instances':usage[sid], 'files':list({f['url']:f for f in fs}.values())}
        item['sceneFrames']=[f for f,ids in scene_reach.items() if sid in ids]
        item['usageClass']='scene-reachable' if item['sceneFrames'] else 'exported-only' if exports[sid] else 'unreferenced-definition'
        if frames:item['preview']={'type':'sequence' if len(frames)>1 else 'image','url':frames[0],'frames':frames,'fps':12};item['frameFiles']=frames
        elif fs:item['preview']={'type':'audio' if kind=='sound' else 'font' if kind=='font' else 'image','url':fs[0]['url']}
        else:item['preview']=None;item['previewNote']='No separate export; inspect symbol metadata and dependencies.'
        if sid in timelines:
            path=OUT/'timelines'/f'{sid}.json';write_json(path,{'symbolId':sid,'frameCount':item['frameCount'],'labels':item['labels'],'firstFrame':timelines[sid][0][0] if timelines[sid][0] else None,'events':timelines[sid][1]});item['timelineUrl']=path.relative_to(ROOT).as_posix()
        if kind=='sound':
            rate=[5512.5,11025,22050,44100][int(t.get('soundRate'))];item['audio']={'sampleRate':rate,'sampleCount':int(t.get('soundSampleCount')),'channels':2 if t.get('soundType')=='true' else 1};item['durationMs']=1000*item['audio']['sampleCount']/rate
        elif kind in ('text','font'):
            item['metadata']=xml_data(t) if kind=='text' else attrs(t)
            if kind=='font':
                item['name']=t.get('fontName','').replace('\\u0000','')
                item['glyphCount']=len(t.find('glyphShapeTable')) if t.find('glyphShapeTable') is not None else 0
                item['metadata']['codePoints']=[int(e.text) for e in t.find('codeTable')] if t.find('codeTable') is not None else []
                for key in ('fontAdvanceTable','fontKerningTable'):
                    if t.find(key) is not None:item['metadata'][key]=xml_data(t.find(key))
                if not item['glyphCount']:item['previewNote']='Device font reference with no embedded glyph outlines in the source SWF.'
        elif kind=='button':
            item['buttonStates']=[xml_data(r) for r in t.find('characters')]
            item['stateNames']=['up','over','down','hit-test']
        if sid==628:item['previewNote']='Code-only exported Rijndael package; empty display list. No visual resource exists.'
        items.append(item)
    idmap={i['symbolId']:i['id'] for i in items}
    scenes=timelines[0][0]
    for scene in scenes:
        for p in scene['instances']:p['assetId']=idmap.get(p.get('symbolId'))
    backdrops=export_backdrops(root,scenes) if not args.inventory_only else {}
    if not args.inventory_only:export_order_shell(root,items)
    for frame in range(1,8):
        source=list((CACHE/'frame').glob(f'{frame}.png'))
        if source:
            f=copy_asset(source[0],'scene',frame);items.append({'id':f'scene-{frame}','symbolId':0,'kind':'scene','name':['Loading A','Loading B','Menu','Instructions selection','Gameplay','Game over','Day complete'][frame-1], 'bounds':{'x':0,'y':0,'width':550,'height':400},'origin':{'x':0,'y':0},'dependencies':sorted({p['assetId'] for p in scenes[frame-1]['instances'] if p['assetId']}),'frameCount':1,'labels':[],'exportNames':[],'instanceNames':[],'files':[f],'preview':{'type':'image','url':f['url']},'sourceFrame':frame})
    write_json(OUT/'scenes.json',{'source':'reference/swf/extended.swf','sha256':EXPECTED,'fps':12,'scenes':scenes,'events':timelines[0][1],'backdrops':backdrops})
    unresolved=sorted({d for ds in deps.values() for d in ds if d not in symbols})
    result={'schemaVersion':1,'source':{'file':'reference/swf/extended.swf','sha256':EXPECTED,'fps':12,'width':550,'height':400,'jpexsVersion':'26.3.0','conversion':{'shape':'svg','sprite':'png','button':'png','sound':'mp3_wav','font':'woff','text':'svg','zoom':1,'losslessWebp':LOSSLESS_WEBP,'pillowVersion':'12.3.0' if LOSSLESS_WEBP else None}},'items':items,'scenes':scenes,'backdrops':backdrops,'unresolvedSymbolIds':unresolved,'notes':['Offline JPEXS timeline exports do not execute ActionScript. Preview timelines are reference material, not proof of runtime behavior.','Frame arrays are one-based SWF frame order; array offset is frame minus one. Identical frame images share URLs.','All matrix translations and bounds are pixels; the original SWF uses 20 twips per pixel. Raster bounds include exporter filter padding; draw at x/y with natural pixel dimensions.','Scene snapshots show the authoring display list before ActionScript visibility and positioning changes.']}
    write_json(OUT/'catalog.json',result)
    retained={f['url'] for i in items for f in i['files']} | {b['file']['url'] for b in backdrops.values()}
    for path in (OUT/'frames').glob('*'):
        if path.is_file() and path.resolve().is_relative_to((OUT/'frames').resolve()) and path.relative_to(ROOT).as_posix() not in retained:path.unlink()
    print(json.dumps({'symbols':len(symbols),'items':len(items),'unresolved':unresolved,'kinds':dict(collections.Counter(i['kind'] for i in items)),'assetBytes':sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())}),flush=True)

if __name__=='__main__':main()
