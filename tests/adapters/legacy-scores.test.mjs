import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCipheriv } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { legacyVerification } from '../../.local-setup/build/modules/src/services/legacy-verification.js';
import { LegacyScoreClient, LegacySessionRefresher, externalScoreRequest, memberScoreRequest, sessionRefreshRequest } from '../../.local-setup/build/modules/src/services/legacy-scores.js';

// Independent source oracle: retain the original algorithm, changing only AS2
// class declaration syntax to JavaScript for this offline test. No SWF runtime.
const source = readFileSync(new URL('../../reference/decompiled/extended/clean/scripts/__Packages/Rijndael.as', import.meta.url), 'utf8');
const reference = runInNewContext(source
  .replace(/^   var (\w+)(.*);$/gm, '   $1$2;')
  .replace(/^   function Rijndael\(/m, '   constructor(')
  .replace(/^   function (\w+)\(/gm, '   $1(') + '\nnew Rijndael(128,128);');
const frame6 = readFileSync(new URL('../../reference/decompiled/extended/clean/scripts/frame_6/DoAction.as', import.meta.url), 'utf8');
const publicSwfKey = frame6.match(/var _loc6_ = "([^"]+)";/)[1];

test('legacy verification matches decompiled source including UTF16 quirks, exact blocks and zero padding', () => {
  for (const text of ['', 'a', '1234567890123456', '12345678901234567', '0|noname|madrasidhaba', '246| Test &+|Name |madrasidhaba', '10|éă漢😀|madrasidhaba', 'nul\0name', '\uffff'.repeat(35)]) {
    assert.equal(legacyVerification(text), String(reference.encrypt(text, publicSwfKey)), text);
  }
  // OpenSSL AES independently confirms normal single-byte input handling.
  for (const text of ['0|noname|madrasidhaba', '1234567890123456', '246|3|40105']) {
    const bytes = Buffer.alloc(Math.ceil(text.length / 16) * 16); bytes.write(text, 'latin1');
    const cipher = createCipheriv('aes-128-ecb', Buffer.from(publicSwfKey.slice(0,16), 'latin1'), null); cipher.setAutoPadding(false);
    assert.equal(legacyVerification(text), Buffer.concat([cipher.update(bytes), cipher.final()]).toString('hex'));
  }
});

test('score request fixtures preserve original fields, whitespace, empty names and tournament routing', () => {
  assert.deepEqual(externalScoreRequest({name:'noname',score:0}).fields, {
    playerName:'noname',playerScore:'0',gameName:'madrasidhaba',verify:'ef36b6c9921249079cf6430ca11f70d7b999f547d8e1d5349a48317ea73ef084',
  });
  const punctuation = externalScoreRequest({name:' Test &+|Name ',score:246});
  assert.equal(new URLSearchParams(punctuation.body).get('playerName'), ' Test &+|Name ');
  assert.equal(punctuation.fields.verify, '637ec5b674da9aa018853b4ccb0aee84350d528ce458059f40c6b790383b0bb7');
  assert.equal(externalScoreRequest({name:'',score:10}).fields.playerName, '');
  const member = {gameId:40105,tourId:0,score:246,points:3};
  assert.equal(memberScoreRequest(member).path, '/member/setscore.php');
  assert.equal(memberScoreRequest(member).fields.verify, 'b40bb8acc32d4c82731ec71520fe6c30');
  assert.equal(memberScoreRequest({...member,tourId:9}).path, '/member/tournamentscore.php');
  assert.equal(memberScoreRequest({...member,tourId:9}).fields.verify, memberScoreRequest(member).fields.verify);
  assert.deepEqual(sessionRefreshRequest('abc').fields, {gameID:'abc'});
});

test('unconfigured adapter never posts, configured receipt does not invent server acceptance', async () => {
  let calls = 0;
  const transport = async (url, options) => { calls++; assert.equal(url,'https://scores.example.test/submit'); assert.equal(options.method,'POST'); assert.equal(options.credentials,'same-origin'); assert.equal(options.headers['Content-Type'],'application/x-www-form-urlencoded'); assert.equal(new URLSearchParams(options.body).get('playerName'),'noname'); return new Response('postResult=unknown&rank=3',{headers:{'content-type':'application/x-www-form-urlencoded'}}); };
  const disabled = new LegacyScoreClient({}, transport);
  await assert.rejects(disabled.submitExternal({name:'noname',score:0}), error => error.code === 'unavailable');
  assert.equal(calls,0);
  const client = new LegacyScoreClient({endpoints:{external:'https://scores.example.test/submit'}}, transport);
  assert.deepEqual(await client.submitExternal({name:'noname',score:0}), {status:'received',postResult:'unknown',fields:{postResult:'unknown',rank:'3'}});
  assert.equal(calls,1);
});

test('transport errors are explicit and never silently redirected into local storage', async () => {
  const config = {endpoints:{external:'https://scores.example.test/submit'},timeoutMs:5};
  for (const [transport, code] of [
    [async()=>new Response('unavailable',{status:503}), 'http'],
    [async()=>new Response('<html>parked domain</html>',{headers:{'content-type':'text/html'}}), 'response'],
    [async()=>{throw new TypeError('failed fetch');}, 'network'],
    [async(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('abort')))), 'timeout'],
  ]) await assert.rejects(new LegacyScoreClient(config,transport).submitExternal({name:'noname',score:0}), error=>error.code===code);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(new LegacyScoreClient(config,async()=>{throw Error('must not send');}).submitExternal({name:'noname',score:0},abort.signal), error=>error.code==='cancelled');
});

test('session adapter preserves ten-minute cadence and next-day refresh with explicit host context', async () => {
  const requests = [];
  const client = new LegacyScoreClient({endpoints:{session:'https://scores.example.test/session'}}, async (_,options)=>{requests.push(new URLSearchParams(options.body).get('gameID'));return new Response('alive=1');});
  const session = new LegacySessionRefresher(client,40105);
  session.advance(599999); assert.equal(requests.length,0);
  session.advance(1); assert.deepEqual(requests,['40105']);
  session.nextDay(); assert.equal(requests.length,2);
  session.advance(600000); assert.equal(requests.length,3);
  new LegacySessionRefresher(client).advance(600000); assert.equal(requests.length,3);
  assert.throws(()=>session.advance(-1),RangeError);
});
