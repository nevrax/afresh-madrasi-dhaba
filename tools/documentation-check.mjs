// Local documentation/privacy checks. Findings contain paths and rule names, never secret values.
import {execFileSync} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {inflateSync} from 'node:zlib';
const root=path.resolve(import.meta.dirname,'..');
const names=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean))];
const contents=new Map(),failures=[];let bytes=0,swfs=0;
const rules=[
 ['personal-path',/(?:[A-Z]:[\\/]+Users[\\/]+[^\s"'<>]+|\/(?:home|Users)\/[^\s"'<>]+)/gi],
 ['private-address',/(?<![\d.])(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?![\d.])/g],
 ['credential',/(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16})/g],
 ['saved-private-identifier',/"(?:browserId|sessionId|targetId|hostId|deviceId|serialNumber|machineId|username|hostname)"\s*:\s*"[^"\n]+"/g],
];
for(const file of names){let data;try{data=await readFile(path.join(root,file));}catch(e){if(e.code==='ENOENT')continue;throw e;}
 bytes+=data.length;const text=data.toString('utf8');contents.set(file,text);
 const views=[text,data.toString('utf16le')];
 if(data.subarray(0,3).toString()==='CWS'){views.push(inflateSync(data.subarray(8)).toString('utf8'));swfs++;}
 for(const [rule,re] of rules){if(views.some(s=>{re.lastIndex=0;return [...s.matchAll(re)].some(m=>rule!=='private-address'||m[0].split('.').every(n=>+n<=255));}))failures.push({file,rule});}
}
const slug=s=>s.replace(/<[^>]*>/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[`*_~]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').trim().replace(/\s/g,'-');
const anchors=s=>{const result=new Set(),counts=new Map();for(const m of s.matchAll(/^#{1,6}\s+(.+)$/gm)){const id=slug(m[1]),count=counts.get(id)??0;counts.set(id,count+1);result.add(id+(count?'-'+count:''));}for(const m of s.matchAll(/\bid=["']([^"']+)["']/g))result.add(m[1]);return result;};
let links=0,documents=0;
for(const [file,text] of contents){if(!file.endsWith('.md'))continue;documents++;
 if(/\bExtra\b/.test(text))failures.push({file,rule:'obsolete-profile-name'});
 if(/\b(?:pentru|trebuie|foloseste|copiilor|Verificare|Ambele|decompilat)\b|[ășțĂȘȚşţ]/u.test(text))failures.push({file,rule:'romanian-prose'});
 const targets=[...text.matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)\)/g),...text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)];
 for(const m of targets){
  const target=m[1];if(/^[a-z][a-z0-9+.-]*:/i.test(target))continue;links++;
  const [base,fragment]=target.split('#');let decoded;try{decoded=decodeURIComponent(base);}catch{failures.push({file,rule:'invalid-link-encoding'});continue;}
  const resolved=base?path.posix.normalize(path.posix.join(path.posix.dirname(file),decoded)):file;
  if(resolved.startsWith('../')||path.posix.isAbsolute(resolved)){failures.push({file,rule:'outside-repository-link',target});continue;}
  if(!contents.has(resolved)){try{await stat(path.join(root,resolved));}catch{failures.push({file,rule:'missing-link',target});continue;}}
  if(fragment&&resolved.endsWith('.md')&&!anchors(contents.get(resolved)??'').has(decodeURIComponent(fragment)))failures.push({file,rule:'missing-anchor',target});
 }
}
// Guard the published headline against accidental transcription or optimistic rounding.
const evidence=JSON.parse(contents.get('tests/reference/batter-scale.json'));
const summary=contents.get('docs/performance/README.md')??'';
for(const row of evidence.pi)for(const value of [row.fps,row.warm.fps,row.warmCpu.singleCorePercent])if(!summary.includes(value.toFixed(2)))failures.push({file:'docs/performance/README.md',rule:'headline-does-not-match-evidence'});
console.log(JSON.stringify({files:contents.size,bytes,compressedSwfs:swfs,documents,localLinks:links,failures},null,2));
if(failures.length)process.exitCode=1;
