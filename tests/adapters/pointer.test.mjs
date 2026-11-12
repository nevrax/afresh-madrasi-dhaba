import test from 'node:test';
import assert from 'node:assert/strict';
import { connectPointer } from '../../.local-setup/build/modules/src/input/pointer.js';

function harness(hit = x => ({ type: 'click-slot', slot: x < 200 ? 0 : 1 })) {
  const canvas = new EventTarget(), window = new EventTarget();
  canvas.ownerDocument = { defaultView: window };
  let bounds = { left: 100, top: 50, width: 1100, height: 800 };
  const captured = new Set(); const captureCalls = []; const commands = []; let activations = 0;
  canvas.getBoundingClientRect = () => bounds;
  canvas.setPointerCapture = id => { captured.add(id); captureCalls.push(['set', id]); };
  canvas.hasPointerCapture = id => captured.has(id);
  canvas.releasePointerCapture = id => {
    captured.delete(id); captureCalls.push(['release', id]);
    const event = new Event('lostpointercapture'); Object.assign(event, { pointerId: id }); canvas.dispatchEvent(event);
  };
  const renderer = { canvas, hit, pressedCommand: null };
  connectPointer(renderer, command => commands.push(command), () => activations++);
  const fire = (type, fields = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, clientX: 120, clientY: 70 }, fields);
    canvas.dispatchEvent(event);
    return event;
  };
  return { fire, window, commands, renderer, captured, captureCalls, setBounds(value) { bounds = value; }, activations: () => activations, actions: () => commands.filter(command => command.type !== 'move-pointer') };
}

test('input uses current CSS bounds for stage coordinates, independent of backing resolution', () => {
  const ui = harness();
  ui.fire('pointermove', { clientX: 650, clientY: 450 });
  assert.deepEqual(ui.commands.at(-1), { type: 'move-pointer', x: 275, y: 200 });
  ui.setBounds({ left: 20, top: 10, width: 275, height: 200 });
  ui.fire('pointermove', { clientX: 157.5, clientY: 110 });
  assert.deepEqual(ui.commands.at(-1), { type: 'move-pointer', x: 275, y: 200 });
  assert.equal(ui.activations(), 0);
});

test('captured primary press activates only its originating target on a matching release', () => {
  const ui = harness();
  ui.fire('pointerdown');
  assert.deepEqual(ui.actions(), []); assert.ok(ui.captured.has(1)); assert.equal(ui.activations(), 1);
  ui.fire('pointermove', { clientX: 180 });
  ui.fire('pointerup', { clientX: 180 });
  assert.deepEqual(ui.actions(), [{ type: 'click-slot', slot: 0 }]);
  assert.deepEqual(ui.captureCalls, [['set', 1], ['release', 1]]);
  assert.equal(ui.renderer.pressedCommand, null);
  ui.fire('pointerup'); assert.equal(ui.actions().length, 1, 'a repeated release cannot activate twice');
});

test('release over a different target or outside the stage does not activate and releases capture', () => {
  for (const position of [{ clientX: 650, clientY: 70 }, { clientX: 90, clientY: 70 }, { clientX: 120, clientY: 860 }]) {
    const ui = harness(); ui.fire('pointerdown'); ui.fire('pointerup', position);
    assert.deepEqual(ui.actions(), []); assert.equal(ui.captured.size, 0); assert.equal(ui.renderer.pressedCommand, null);
  }
});

test('another pointer cannot move, release or cancel the active primary gesture', () => {
  const ui = harness(); ui.fire('pointerdown'); const pending = ui.renderer.pressedCommand;
  const commandsBefore = ui.commands.length;
  for (const type of ['pointermove', 'pointerdown', 'pointerup', 'pointercancel']) ui.fire(type, { pointerId: 2, isPrimary: false, clientX: 900 });
  assert.equal(ui.commands.length, commandsBefore); assert.equal(ui.renderer.pressedCommand, pending);
  assert.ok(ui.captured.has(1)); assert.equal(ui.activations(), 1);
  // A different device can also report a primary pointer while touch capture belongs to pointer 1.
  ui.fire('pointermove', { pointerId: 3, isPrimary: true, clientX: 900 });
  ui.fire('pointercancel', { pointerId: 3, isPrimary: true });
  assert.equal(ui.commands.length, commandsBefore); assert.equal(ui.renderer.pressedCommand, pending);
  ui.fire('pointerup'); assert.deepEqual(ui.actions(), [{ type: 'click-slot', slot: 0 }]);
});

test('nonprimary idle touches and nonleft mouse presses do not start gameplay gestures', () => {
  const ui = harness();
  ui.fire('pointermove', { pointerId: 2, isPrimary: false });
  ui.fire('pointerdown', { pointerId: 2, isPrimary: false });
  ui.fire('pointercancel', { pointerId: 2, isPrimary: false });
  ui.fire('pointerdown', { button: 2 }); ui.fire('pointerup', { button: 2 });
  assert.deepEqual(ui.commands, []); assert.equal(ui.activations(), 0); assert.equal(ui.captured.size, 0);
});

test('primary cancellation clears capture and prevents a later release from activating', () => {
  const ui = harness(); ui.fire('pointerdown'); ui.fire('pointercancel'); ui.fire('pointerup');
  assert.deepEqual(ui.actions(), [{ type: 'background' }]);
  assert.equal(ui.renderer.pressedCommand, null); assert.equal(ui.captured.size, 0);
  ui.fire('pointerdown'); ui.fire('pointerup');
  assert.deepEqual(ui.actions().at(-1), { type: 'click-slot', slot: 0 });
});

test('Escape cancels a pending gesture as well as the carried item; unrelated keys do nothing', () => {
  const ui = harness(); ui.fire('pointerdown'); ui.fire('keydown', { key: 'Enter' });
  assert.deepEqual(ui.actions(), []);
  ui.fire('keydown', { key: 'Escape' }); ui.fire('pointerup');
  assert.deepEqual(ui.actions(), [{ type: 'background' }]);
  assert.equal(ui.renderer.pressedCommand, null); assert.equal(ui.captured.size, 0);
  ui.fire('keydown', { key: 'Escape' }); assert.deepEqual(ui.actions().at(-1), { type: 'background' });
});

test('window blur cancels only an active press, once, without discarding carried state when idle', () => {
  const ui = harness(); ui.window.dispatchEvent(new Event('blur')); assert.deepEqual(ui.commands, []);
  ui.fire('pointerdown'); ui.window.dispatchEvent(new Event('blur')); ui.window.dispatchEvent(new Event('blur'));
  ui.fire('pointerup'); assert.deepEqual(ui.actions(), [{ type: 'background' }]); assert.equal(ui.captured.size, 0);
  ui.fire('pointerdown'); ui.fire('pointerup'); assert.deepEqual(ui.actions().at(-1), { type: 'click-slot', slot: 0 });
});

test('unexpected loss of the owning capture cancels the press, but normal release and other IDs do not', () => {
  const ui = harness(); ui.fire('pointerdown'); ui.fire('lostpointercapture', { pointerId: 2 });
  assert.deepEqual(ui.actions(), []);
  ui.captured.delete(1); ui.fire('lostpointercapture'); ui.fire('pointerup');
  assert.deepEqual(ui.actions(), [{ type: 'background' }]); assert.equal(ui.renderer.pressedCommand, null);
  ui.fire('pointerdown'); ui.fire('pointerup');
  assert.deepEqual(ui.actions(), [{ type: 'background' }, { type: 'click-slot', slot: 0 }]);
});
