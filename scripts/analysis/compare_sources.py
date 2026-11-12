import concurrent.futures, urllib.request, hashlib, json, pathlib, zlib, re, struct, zipfile, io, argparse
ROOT=pathlib.Path(__file__).resolve().parents[2]
SWF=ROOT/'reference/swf'
METADATA=ROOT/'analysis/metadata'
REPORT=ROOT/'analysis/reports/source-comparison.json'
parser=argparse.ArgumentParser(description='Check canonical SWFs and maintain the source index without storing mirror binaries.')
parser.add_argument('--download',action='store_true',help='Recheck remote sources in memory; do not save mirror binaries')
args=parser.parse_args()
previous={r['name']:r for r in json.loads(REPORT.read_text(encoding='utf-8-sig'))} if REPORT.exists() else {}
for directory in (METADATA,REPORT.parent): directory.mkdir(parents=True,exist_ok=True)
SOURCES={
 'gatoconbota':'https://www.gatoconbota.com/mm/go/swf/restaurant-madrasi-dhaba.swf',
 'kidzsearch':'https://games.kidzsearch.com/computer/flashgame_data/4/ksff_34447_40105.swf',
 'gamesflow':'https://www.gamesflow.com/jeux/game-1253751005.swf',
 'flashgames_it':'https://www.flashgames.it/giochi/abilita/madrasi.dhaba/game.swf',
 'fastgames':'https://fastgames.com/swf/madrasidhaba.swf',
 'y8':'https://img.y8.com/cloud/y8-flash-game/contents/item_versions/flash_games/5660/original/madrasi_dhaba.swf?1521307632',
 'divertissez_vous':'https://www.divertissez-vous.com/hsalf/madrasi-dhaba.swf',
 'games68':'https://www.games68.com/games/game-1253751005.swf',
 'azeri':'https://oyun.azeri.net/oyunswf/7070.swf',
 'game_game':'https://cdn.game-game.com.ua/games/44690.swf',
 'oneonline_business':'https://oneonlinegames.com/sites/default/files/flash2/madrasi-dhaba.swf',
 'oneonline_cooking':'https://oneonlinegames.com/sites/default/files/flash/madrasidhaba.swf',
 'girlsgames123':'https://www.girlsgames123.com//misc-games/10227/madrasidhaba.swf',
 'flashmuseum':'https://games.flashmuseum.net/2aa1d176-6925-4404-a87f-03bc9f3de30e.zip',
 'box10':'https://www.box10.com/games/madrasi-dhaba.swf',
 'gamepuma':'https://www.gamepuma.com/games/07/madrasidhaba.swf',
}
def inspect(item):
 name,url=item
 try:
  headers={}
  if not args.download:
   if name not in ('gatoconbota','fastgames'):
    return previous.get(name,dict(name=name,url=url,error='Not previously verified; use --download to check'))
   cached=SWF/('original.swf' if name=='gatoconbota' else 'extended.swf')
   b=cached.read_bytes()
  else:
   with urllib.request.urlopen(url,timeout=25) as r: b=r.read(); headers=dict(r.headers)
  if b[:2]==b'PK':
   with zipfile.ZipFile(io.BytesIO(b)) as archive:
    names=[n for n in archive.namelist() if n.lower().endswith('.swf')]
    if len(names)!=1: return dict(name=name,url=url,error='Multiple SWFs',members=names)
    b=archive.read(names[0])
  if b[:3] not in (b'CWS',b'FWS'): return dict(name=name,url=url,error='not SWF',bytes=len(b))
  body=zlib.decompress(b[8:]) if b[:3]==b'CWS' else b[8:]
  strings=[s.decode('latin1') for s in re.findall(rb'[\x20-\x7e]{6,}',body)]
  (METADATA/(name+'.strings.txt')).write_text('\n'.join(strings),encoding='utf8')
  p=(5+4*(body[0]>>3)+7)//8
  fps=struct.unpack_from('<H',body,p)[0]/256; frames=struct.unpack_from('<H',body,p+2)[0]; p+=4
  tags=[]; meta=[]
  while p+2<=len(body):
   n=struct.unpack_from('<H',body,p)[0]; p+=2; code=n>>6; size=n&63
   if size==63: size=struct.unpack_from('<I',body,p)[0]; p+=4
   data=body[p:p+size]; p+=size
   tags.append(dict(code=code,size=size,sha256=hashlib.sha256(data).hexdigest()))
   if code in (41,77): meta.append(dict(code=code,text=data.decode('latin1')))
   if code==0: break
  (METADATA/(name+'.tags.json')).write_text(json.dumps(tags,indent=2))
  return dict(name=name,url=url,bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),swfVersion=b[3],uncompressed=len(body)+8,bodyHash=hashlib.sha256(body).hexdigest(),fps=fps,frames=frames,metadata=meta,lastModified=headers.get('Last-Modified'),hints=[s for s in strings if re.search(r'https?://|gamezindia|version|copyright|200[0-9]|201[0-9]|madrasi|dhaba',s,re.I)][:40])
 except Exception as e:
  # A failed recheck must not erase a previously verified checksum.
  if 'sha256' in previous.get(name,{}): return dict(previous[name],last_attempt_error=str(e))
  return dict(name=name,url=url,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=7) as ex: results=list(ex.map(inspect,SOURCES.items()))
REPORT.write_text(json.dumps(results,indent=2),encoding='utf8')
manifest=json.loads((SWF/'manifest.json').read_text(encoding='utf-8-sig'))
variants={entry['sha256']:entry['file'] for entry in manifest.values() if isinstance(entry,dict)}
verified=[dict(source=r['name'],url=r['url'],sha256=r['sha256'],bytes=r['bytes'],local_file=variants.get(r['sha256'])) for r in results if 'sha256' in r]
index=dict(note='Checksums and sizes refer to the SWF payload. These are recorded observations, not a claim that every URL was re-fetched on index generation. Mirror binaries are not retained.',verified=verified,unverified=[dict(source=r['name'],url=r['url'],error=r.get('error')) for r in results if 'sha256' not in r])
(SWF/'sources.json').write_text(json.dumps(index,indent=2)+'\n',encoding='utf8')
lines=['# SWF source index','','Mirror binaries are not retained. Each verified SWF matches one of the two canonical files below. URL checksums describe the recorded downloads; remote files may subsequently change.','','| Source | SWF URL | Bytes | SHA-256 | Local file |','|---|---|---:|---|---|']
lines += [f"| {r['source']} | [SWF]({r['url']}) | {r['bytes']:,} | `{r['sha256']}` | {r['local_file'] or 'No matching canonical file'} |" for r in verified]
lines += ['','See [sources.json](sources.json) for the machine-readable index and sources that could not be verified.','']
(SWF/'sources.md').write_text('\n'.join(lines),encoding='utf8')
print(json.dumps(results,indent=2))
