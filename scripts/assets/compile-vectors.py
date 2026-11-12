"""Compile preserved SVG geometry and authored display lists into native drawing data.

No raster input, ActionScript bytecode or emulator is included in the result.
Run after export-assets.py; regenerates ignored XML through the pinned exporter if absent.
"""
from pathlib import Path
import copy
import hashlib
import importlib.util
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
IDENTITY = [1, 0, 0, 1, 0, 0]
NUM = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?')
NS = '{http://www.w3.org/2000/svg}'
XLINK = '{http://www.w3.org/1999/xlink}'
FFDEC = '{https://www.free-decompiler.com/flash}'
paths, path_ids, gradients, symbols = [], {}, {}, {}
source_sprites = {}

def path_id(value):
    if value not in path_ids:
        path_ids[value] = len(paths)
        paths.append(value)
    return path_ids[value]

def matrix(value):
    if not value: return IDENTITY[:]
    values = [float(x) for x in NUM.findall(value)]
    if not value.startswith('matrix(') or len(values) != 6: raise ValueError('Unsupported SVG transform')
    return values

def combine(p, q):
    a,b,c,d,x,y=p; A,B,C,D,X,Y=q
    return [a*A+c*B,b*A+d*B,a*C+c*D,b*C+d*D,a*X+c*Y+x,b*X+d*Y+y]

def source_matrix(node):
    if node is None:return IDENTITY[:]
    return [float(node.get(k, default)) for k,default in [('scaleX','1'),('rotateSkew0','0'),('rotateSkew1','0'),('scaleY','1')]] + [float(node.get(k,'0'))/20 for k in ['translateX','translateY']]

def animations(node):
    result={}
    for e in node.findall(NS+'animate'):
        values=e.get('values','').split(';')
        if len(values)!=2:raise ValueError('Unsupported morph key count')
        result[e.get('attributeName')]=values
    return result

def paint(value, sid):
    return f'@{sid}-{value[5:-1]}' if value.startswith('url(#') else value

def svg_symbol(item):
    sid=item['symbolId']; file=next(f for f in item['files'] if f['url'].endswith('.svg'))
    data=(ROOT/file['url']).read_bytes()
    if hashlib.sha256(data).hexdigest()!=file['sha256']:raise ValueError('SVG checksum mismatch')
    root=ET.fromstring(data); defs={e.get('id'):e for e in root.iter() if e.get('id')}
    for name,e in defs.items():
        tag=e.tag.removeprefix(NS)
        if tag not in ['linearGradient','radialGradient']:continue
        g={'type':tag,'matrix':matrix(e.get('gradientTransform')), 'spread':e.get('spreadMethod','pad'), 'stops':[]}
        for key in ['x1','x2','y1','y2','cx','cy','r','fx','fy']:
            if e.get(key) is not None:g[key]=float(e.get(key))
        for stop in e.findall(NS+'stop'):
            g['stops'].append({'offset':float(stop.get('offset','0')), 'color':stop.get('stop-color','#000000'), 'opacity':float(stop.get('stop-opacity','1')), 'animations':animations(stop)})
        g['animations']=animations(e)
        g['transforms']=[{'type':a.get('type'),'from':[float(x) for x in NUM.findall(a.get('from',''))],'to':[float(x) for x in NUM.findall(a.get('to',''))],'replace':a.get('additive')=='replace'} for a in e.findall(NS+'animateTransform')]
        gradients[f'{sid}-{name}']=g
    draws=[]
    def visit(e, transform, inherited):
        tag=e.tag.removeprefix(NS)
        if tag in ['defs','animate']:return
        transform=combine(transform,matrix(e.get('transform')))
        style={**inherited,**{k:v for k,v in e.attrib.items() if k in ['fill','stroke','fill-rule','fill-opacity','stroke-opacity','stroke-width','stroke-linecap','stroke-linejoin']}}
        if tag=='use':
            visit(defs[e.get(XLINK+'href')[1:]],transform,style);return
        if tag=='path':
            anim=animations(e)
            draw={'path':path_id(e.get('d','')), 'matrix':transform, 'fill':paint(style.get('fill','#000000'),sid), 'stroke':paint(style.get('stroke','none'),sid), 'rule':style.get('fill-rule','nonzero'), 'width':float(e.get(FFDEC+'original-stroke-width',style.get('stroke-width','1'))), 'cap':style.get('stroke-linecap','butt'), 'join':style.get('stroke-linejoin','miter'), 'fillOpacity':float(style.get('fill-opacity','1')), 'strokeOpacity':float(style.get('stroke-opacity','1'))}
            if 'd' in anim:
                a,b=anim.pop('d')
                if NUM.sub('#',a)!=NUM.sub('#',b):raise ValueError(f'Morph {sid} has incompatible path topology')
                draw['path']=path_id(a);draw['endPath']=path_id(b)
            if anim:draw['animations']=anim
            if e.get(FFDEC+'has-small-stroke')=='true':draw['hairline']=True
            draws.append(draw)
        elif tag=='g':
            for child in e:visit(child,transform,style)
        else:raise ValueError(f'Unsupported SVG node {tag}')
    # The outer translation normalizes an exported image to its crop. Geometry is
    # already in original symbol coordinates; do not add the raster crop again.
    for e in root:
        if e.tag==NS+'g':
            for child in e:visit(child,IDENTITY,{})
    return {'kind':'shape','draws':draws}

def placement(p, born):
    m=p.get('matrix',dict(zip(['a','b','c','d','tx','ty'],IDENTITY)))
    result={'id':p['symbolId'],'depth':p['depth'],'matrix':[m[k] for k in ['a','b','c','d','tx','ty']], 'born':born}
    for key in ['ratio','clipDepth','visible','colorTransform']:
        if key in p:result[key]=p[key]
    if p.get('filters') or p.get('blendMode',0) not in [0,1]:raise ValueError('Unsupported source filter/blend must be implemented')
    return result

def sprite(item):
    sid=item['symbolId']; src=json.loads((ROOT/f'assets/timelines/{sid}.json').read_text())
    tags=list(source_sprites[sid].find('subTags'))
    display={}; frames=[]; events=iter(src['events']); event=next(events,None)
    for frame in range(1,src['frameCount']+1):
        while event and event['frame']<=frame:
            depth=event.get('depth')
            if event['type']=='place':
                old=display.get(depth); born=old['born'] if old and event['move'] and old['id']==event['symbolId'] else frame
                display[depth]=placement(event,born)
                filters=tags[event['tagIndex']].find('surfaceFilterList')
                if filters is not None:
                    display[depth]['filters']=[{**f.attrib,'children':[c.attrib for c in f]} for f in filters]
                elif old and event['move'] and old.get('filters'):
                    display[depth]['filters']=copy.deepcopy(old['filters'])
            elif event['type']=='remove':display.pop(depth,None)
            event=next(events,None)
        frames.append([copy.deepcopy(display[k]) for k in sorted(display)])
    return {'kind':'sprite','frames':frames}

def main():
    manifest=json.loads((ROOT/'assets/catalog.json').read_text(encoding='utf-8'))
    source=manifest['source']
    if hashlib.sha256((ROOT/source['file']).read_bytes()).hexdigest()!=source['sha256']:raise ValueError('SWF checksum mismatch')
    xml=ROOT/'analysis/dumps/extended.xml'
    if not xml.exists():
        spec=importlib.util.spec_from_file_location('asset_export',ROOT/'scripts/assets/export-assets.py'); exporter=importlib.util.module_from_spec(spec);spec.loader.exec_module(exporter)
        xml.parent.mkdir(parents=True,exist_ok=True);exporter.ffdec('-swf2xml',ROOT/source['file'],xml)
    tree=ET.parse(xml)
    source_sprites.update({int(e.get('spriteId')):e for e in tree.iter() if e.get('type')=='DefineSpriteTag'})
    for item in manifest['items']:
        sid=item.get('symbolId');kind=item['kind']
        if not sid or sid<0 or kind in ['scene','sound','font']:continue
        if kind in ['shape','morphshape','text']:symbol=svg_symbol(item)
        elif kind=='sprite':symbol=sprite(item)
        elif kind=='button':continue
        else:raise ValueError(f'Unrecognized source kind {kind}')
        symbol['bounds']=item['bounds'];symbols[str(sid)]=symbol
    for e in tree.iter():
        if e.get('type')!='DefineButton2Tag':continue
        sid=int(e.get('buttonId'));frames=[]
        for state in ['Up','Over','Down','HitTest']:
            records=[]
            for r in e.findall('./characters/item'):
                if r.get('buttonState'+state)!='true':continue
                p={'id':int(r.get('characterId')),'depth':int(r.get('placeDepth')),'matrix':source_matrix(r.find('placeMatrix')),'born':1}
                ct=r.find('colorTransform')
                if ct is not None:p['colorTransform']={k:(v=='true' if v in ['true','false'] else float(v) if NUM.fullmatch(v) else v) for k,v in ct.attrib.items()}
                records.append(p)
            frames.append(sorted(records,key=lambda p:p['depth']))
        item=next(i for i in manifest['items'] if i.get('symbolId')==sid)
        symbols[str(sid)]={'kind':'button','frames':frames,'bounds':item['bounds']}
    clean=copy.deepcopy(symbols['363'])
    for frame in clean['frames']:frame[:]=[p for p in frame if p['id'] not in [351,357]]
    symbols['-363']=clean
    for sid,s in symbols.items():
        for frame in s.get('frames',[]):
            for p in frame:
                if str(p['id']) not in symbols:raise ValueError(f'Missing vector dependency {sid}->{p["id"]}')
    root_filters={}; filter_frames=[]
    for tag in tree.getroot().find('tags'):
        kind=tag.get('type','');depth=int(tag.get('depth','0'))
        if kind.startswith('PlaceObject'):
            if tag.get('placeFlagMove')!='true':root_filters.pop(depth,None)
            filters=tag.find('surfaceFilterList')
            if filters is not None:root_filters[depth]=[{**f.attrib,'children':[c.attrib for c in f]} for f in filters]
        elif kind.startswith('RemoveObject'):root_filters.pop(depth,None)
        elif kind=='ShowFrameTag':filter_frames.append(copy.deepcopy(root_filters))
    for scene in manifest['scenes']:
        placements=[placement(p,1) for p in scene['instances']]
        for p in placements:
            filters=filter_frames[scene['frame']-1].get(p['depth'])
            if filters:p['filters']=filters
        symbols[str(-1000-scene['frame'])]={'kind':'sprite','frames':[placements],'bounds':{'x':0,'y':0,'width':550,'height':400}}
    output={'version':1,'sourceSha256':source['sha256'],'paths':paths,'gradients':gradients,'symbols':symbols}
    dest=ROOT/'assets/vector/scene.json';dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes((json.dumps(output,separators=(',',':'),ensure_ascii=False)+'\n').encode('utf-8'))
    print(f'Native vectors: {len(symbols)} symbols, {len(paths)} unique paths, {len(gradients)} gradients; {dest.stat().st_size:,} bytes')

if __name__=='__main__':main()
