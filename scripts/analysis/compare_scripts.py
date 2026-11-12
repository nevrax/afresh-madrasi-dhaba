import pathlib,hashlib,difflib,re
root=pathlib.Path(__file__).resolve().parents[2]
a=root/'reference/decompiled/original/clean/scripts';b=root/'reference/decompiled/extended/clean/scripts'
left={p.relative_to(a).as_posix():p.read_text(encoding='utf8') for p in a.rglob('*.as')}
right={p.relative_to(b).as_posix():p.read_text(encoding='utf8') for p in b.rglob('*.as')}
norm=lambda s:re.sub(r'\s+','',s)
matched=0
for name,src in left.items():
 exact=[n for n,t in right.items() if norm(t)==norm(src)]
 if exact: matched+=1;continue
 nearest=max(right,key=lambda n:difflib.SequenceMatcher(None,src,right[n]).ratio())
 score=difflib.SequenceMatcher(None,src,right[nearest]).ratio()
 print('\nCHANGED',name,'closest',nearest,'similarity',round(score,3))
 if not name.startswith('frame_'):
  print(''.join(difflib.unified_diff(src.splitlines(True),right[nearest].splitlines(True)))[:9000])
print('Small script files:',len(left),'Large script files:',len(right),'Exact matches ignoring whitespace:',matched)
(root/'analysis/reports/main-code.diff').write_text(''.join(''.join(difflib.unified_diff(left.get(f'frame_{n}/DoAction.as','').splitlines(True),right.get(f'frame_{n}/DoAction.as','').splitlines(True),fromfile=f'original/frame_{n}',tofile=f'extended/frame_{n}')) for n in range(2,8)),encoding='utf8')
