import zlib, struct, pathlib, collections, hashlib, json
ROOT=pathlib.Path(__file__).resolve().parents[2]/'reference/swf'
NAMES={2:'Shape',6:'JPEG',7:'Button',10:'Font',11:'Text',12:'Action',14:'Sound',20:'LosslessImage',21:'JPEG2',22:'Shape2',26:'PlaceObject2',32:'Shape3',33:'Text2',34:'Button2',35:'JPEG3',36:'LosslessImage2',37:'EditText',39:'Sprite',48:'Font2',59:'InitAction',75:'Font3',83:'Shape4',90:'JPEG4'}
def tags(name):
 b=(ROOT/(name+'.swf')).read_bytes(); body=zlib.decompress(b[8:]); p=(5+4*(body[0]>>3)+7)//8+4; result=[]
 while p+2<=len(body):
  h=struct.unpack_from('<H',body,p)[0];p+=2;c=h>>6;n=h&63
  if n==63:n=struct.unpack_from('<I',body,p)[0];p+=4
  d=body[p:p+n];p+=n;result.append((c,d))
  if c==0:break
 return result
a=tags('original');b=tags('extended')
for label,ts in [('SMALL',a),('LARGE',b)]:
 names={}
 for c,d in ts:
  if c==56:
   p=2
   for _ in range(struct.unpack_from('<H',d,0)[0]):
    cid=struct.unpack_from('<H',d,p)[0];p+=2;e=d.index(0,p);names[cid]=d[p:e].decode('latin1');p=e+1
 print(label,'SOUND NAMES',[(struct.unpack_from('<H',d,0)[0],names.get(struct.unpack_from('<H',d,0)[0]),len(d)) for c,d in ts if c==14])
for code in sorted(set(c for c,d in a+b)):
 x=[d for c,d in a if c==code];y=[d for c,d in b if c==code]
 sa=sum(map(len,x));sb=sum(map(len,y))
 if sa!=sb:print(f'{NAMES.get(code,code):18} small {len(x):4} {sa:8} large {len(y):4} {sb:8} delta {sb-sa:+8}')
for code in [6,14,20,21,35,36,90]:
 x=[d[2:] for c,d in a if c==code];y=[d[2:] for c,d in b if c==code]
 if x or y:
  common=collections.Counter(x)&collections.Counter(y)
  print('RESOURCE',NAMES.get(code,code),'small',len(x),'large',len(y),'identical payloads',sum(common.values()),'smallBytes',sum(map(len,x)),'largeBytes',sum(map(len,y)))
