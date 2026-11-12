import test from 'node:test';
import assert from 'node:assert/strict';
import { connectLegacyScoreForm } from '../../.local-setup/build/modules/src/ui/legacy-score-form.js';

function elements() {
  const form = new EventTarget(); form.hidden = true;
  return { form, input: { value:'', required:true, autocomplete:'', removeAttribute(name) { this.removed = name; } }, submit:{textContent:'',disabled:false}, status:{textContent:'',setAttribute(){}} };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('original name form defaults to noname, accepts verbatim text and hides immediately after sending', async () => {
  const ui = elements(); let resolve; let payload;
  const client = {available:()=>true,submitExternal:(value)=>{payload=value;return new Promise(done=>{resolve=done;});}};
  const controller = connectLegacyScoreForm(ui,client);
  controller.show(12);
  assert.equal(ui.input.value,'noname'); assert.equal(ui.input.required,false); assert.equal(ui.input.removed,'maxlength');
  ui.input.value='  '; ui.form.dispatchEvent(new Event('submit',{cancelable:true}));
  assert.deepEqual(payload,{score:12,name:'  '}); assert.equal(controller.state(),'sending'); assert.equal(ui.form.hidden,true);
  resolve({status:'received',postResult:null,fields:{}}); await flush();
  assert.equal(controller.state(),'received'); assert.match(ui.status.textContent,/acceptance is unconfirmed/);
  controller.dispose();
});

test('unconfigured score form clearly reports unavailability and never submits', () => {
  const ui = elements(); const client={available:()=>false,submitExternal:()=>{throw Error('must not send');}};
  const controller=connectLegacyScoreForm(ui,client);controller.show(8);
  assert.equal(controller.state(),'unavailable'); assert.equal(ui.submit.disabled,true); assert.match(ui.status.textContent,/has not been sent/);
  ui.form.dispatchEvent(new Event('submit',{cancelable:true})); assert.equal(controller.state(),'unavailable'); controller.dispose();
});

test('late response from an abandoned run cannot hide or overwrite the next game-over form', async () => {
  const ui=elements();let resolve;
  const client={available:()=>true,submitExternal:()=>new Promise(done=>{resolve=done;})};
  const controller=connectLegacyScoreForm(ui,client);controller.show(8);ui.form.dispatchEvent(new Event('submit',{cancelable:true}));
  controller.hide();controller.show(20);resolve({status:'received',postResult:'old response',fields:{}});await flush();
  assert.equal(controller.state(),'ready');assert.equal(ui.form.hidden,false);assert.equal(ui.status.textContent,'');controller.dispose();
});

test('failed request keeps name and score for explicit manual retry without an automatic second POST', async () => {
  const ui=elements();let calls=0;
  const client={available:()=>true,submitExternal:async()=>{calls++;throw Error('offline');}};
  const controller=connectLegacyScoreForm(ui,client);controller.show(8);ui.input.value='name';ui.form.dispatchEvent(new Event('submit',{cancelable:true}));await flush();
  assert.equal(calls,1);assert.equal(controller.state(),'failed');assert.equal(ui.form.hidden,false);assert.equal(ui.input.value,'name');assert.match(ui.status.textContent,/retry manually/);
  controller.dispose();
});
