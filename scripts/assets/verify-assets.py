"""Validate source provenance, complete exports, frame counts and asset checksums."""
import collections
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
c=json.loads((ROOT/'assets/catalog.json').read_text(encoding='utf-8'))
errors=[]
def require(condition,message):
    if not condition:errors.append(message)

require(hashlib.sha256((ROOT/c['source']['file']).read_bytes()).hexdigest()==c['source']['sha256'],'Source checksum mismatch')
require(not c['unresolvedSymbolIds'],'Unresolved symbol IDs')
items={i['id']:i for i in c['items']}
require(len(items)==636,'Expected 628 symbols plus seven scenes and native order shell')
files={}
for item in items.values():
    for dep in item['dependencies']:require(dep in items,f'{item["id"]}: missing dependency {dep}')
    if item['id'] not in ('font-107','font-423','sprite-628'):require(bool(item['files']),f'{item["id"]}: missing export')
    if item['kind']=='sprite' and item['symbolId']!=628:
        require(len(item.get('frameFiles',[]))==item['frameCount'],f'{item["id"]}: incomplete frame sequence')
    if item['kind']=='button':require(len(item.get('frameFiles',[]))==4,f'{item["id"]}: missing button state')
    for f in item['files']:files[f['url']]=f
    preview=item.get('preview') or {}
    for url in preview.get('frames',[]):require(any(f['url']==url for f in item['files']),f'{item["id"]}: frame not in files')
for value in c.get('backdrops',{}).values():files[value['file']['url']]=value['file']
for url,info in files.items():
    path=(ROOT/url).resolve()
    require(path.is_relative_to((ROOT/'assets').resolve()),f'Asset path outside assets: {url}')
    if not path.is_file():errors.append(f'Missing file: {url}');continue
    data=path.read_bytes()
    require(len(data)==info['bytes'],f'Size mismatch: {url}')
    require(hashlib.sha256(data).hexdigest()==info['sha256'],f'Checksum mismatch: {url}')
summary={'items':len(items),'kinds':dict(collections.Counter(i['kind'] for i in items.values())),'uniqueFiles':len(files),'mediaBytes':sum(i['bytes'] for i in files.values()),'errors':errors}
print(json.dumps(summary,indent=2))
raise SystemExit(1 if errors else 0)
