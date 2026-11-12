import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../../.local-setup/build/modules/src/audio/audio.js';

test('queued startup music survives blocked autoplay and gesture retry does not duplicate it', async () => {
  const oldContext = globalThis.AudioContext, oldFetch = globalThis.fetch;
  const availability = [], sources = [], contexts = [];
  let allowSound;
  class Context {
    state = 'suspended'; currentTime = 0; destination = {};
    constructor() { contexts.push(this); }
    resume() { return new Promise(resolve => { allowSound = () => { this.state = 'running'; this.onstatechange?.(); resolve(); }; }); }
    decodeAudioData() { return Promise.resolve({ duration: 2, length: 96000, numberOfChannels: 2 }); }
    close() { this.state='closed';return Promise.resolve(); }
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
    createBufferSource() { const source = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() {} }; sources.push(source); return source; }
  }
  globalThis.AudioContext = Context;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  try {
    const audio = new GameAudio({ names: new Map([['bgMusic2', { preview: { type: 'audio', url: 'menu.mp3' } }]]) }, running => availability.push(running));
    audio.handle([{ type: 'sound', name: 'bgMusic2' }]);
    assert.equal(contexts.length, 0);
    audio.activate(); await flush();
    assert.equal(availability.at(-1), false);
    assert.equal(sources.length, 1);
    audio.activate(); allowSound(); await flush();
    assert.equal(availability.at(-1), true);
    assert.equal(contexts.length, 1);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].started, true);
    assert.equal(audio.memoryBytes,768000);
    await audio.dispose();
    assert.equal(audio.memoryBytes,0);assert.equal(audio.activeSources,0);assert.equal(contexts[0].state,'closed');
  } finally { globalThis.AudioContext = oldContext; globalThis.fetch = oldFetch; }
});

test('audio cancellation prevents delayed decode from resurrecting stopped sound; finite loops retain their end time', async () => {
  const previousContext = globalThis.AudioContext, previousFetch = globalThis.fetch;
  const sources = [], decodes = [];
  class Context {
    currentTime = 7; destination = {};
    resume() { return Promise.resolve(); }
    decodeAudioData() { return new Promise(resolve => decodes.push(resolve)); }
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
    createBufferSource() { const source = { connect() {}, disconnect() {}, start() { this.started = true; }, stop(time) { this.stopped = time ?? 'now'; } }; sources.push(source); return source; }
  }
  globalThis.AudioContext = Context;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  try {
    const assets = { names: new Map([['bgMusic1', { preview: { type: 'audio', url: 'music.mp3' } }]]) };
    const audio = new GameAudio(assets); audio.activate();
    audio.handle([{ type: 'sound', name: 'bgMusic1', loop: 3, volume: 50 }]);
    await flush(); audio.handle([{ type: 'stop-sounds' }]);
    decodes[0]({ duration: 2, length: 96000, numberOfChannels: 2 }); await flush(); assert.equal(sources.length, 0);
    audio.handle([{ type: 'sound', name: 'bgMusic1', loop: 3 }]); await flush();
    assert.equal(sources.length, 1); assert.equal(sources[0].started, true); assert.equal(sources[0].loop, true); assert.equal(sources[0].stopped, 13);
    audio.handle([{ type: 'stop-music' }]); assert.equal(sources[0].stopped, 'now');
    audio.handle([{ type: 'sound', name: 'serve' }]); assert.equal(audio.missing.has('serve'), true);
  } finally { globalThis.AudioContext = previousContext; globalThis.fetch = previousFetch; }
});
