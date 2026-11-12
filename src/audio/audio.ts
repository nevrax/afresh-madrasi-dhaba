import type { GameEvent } from '../core/game.js';
import type { Assets } from '../render/assets.js';
import { resourceUrl } from '../render/resources.js';

/** Native sample-buffer playback with finite loops and cancellation generations. */
export class GameAudio {
  private decodedBytes=0;
  get memoryBytes():number{return this.decodedBytes;}
  get activeSources():number{return this.active.size;}
  get playbackState():string{return this.context?.state??'not-started';}
  async diagnosticSuspend(suspended:boolean):Promise<void>{if(this.context){if(suspended)await this.context.suspend();else await this.context.resume();}}
  async dispose():Promise<void>{this.handle([{type:'stop-sounds'}]);const context=this.context;this.context=null;this.buffers.clear();this.decodedBytes=0;if(context){context.onstatechange=null;await context.close();}}
  private context: AudioContext | null = null;
  private active = new Map<AudioBufferSourceNode, boolean>();
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private pending: GameEvent[] = [];
  private generation = 0;
  private musicGeneration = 0;
  readonly missing = new Set<string>();
  constructor(private readonly assets: Assets, private readonly onAvailability: (running: boolean) => void = () => undefined) {}
  activate(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.context.onstatechange = () => this.onAvailability(this.context?.state === 'running');
    }
    this.onAvailability(this.context.state === 'running');
    if (this.context.state !== 'running') void this.context.resume().then(() => this.onAvailability(this.context?.state === 'running')).catch(() => this.onAvailability(false));
    const events = this.pending; this.pending = []; this.handle(events);
  }
  handle(events: GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'stop-sounds' || event.type === 'stop-music') {
        const all = event.type === 'stop-sounds';
        if (all) this.generation++; this.musicGeneration++;
        for (const [source, music] of this.active) if (all || music) { source.stop(); this.active.delete(source); }
        this.pending = all ? [] : this.pending.filter(e => e.type !== 'sound' || !e.name.startsWith('bgMusic'));
      } else if (event.type === 'sound') {
        if (!this.context) { this.pending.push(event); continue; }
        const resource = this.assets.names.get(event.name);
        const url = resource?.preview?.type === 'audio' ? resource.preview.url : undefined;
        if (!url) { this.missing.add(event.name); continue; }
        const ctx = this.context, generation = this.generation, musicGeneration = this.musicGeneration;
        const music = event.name.startsWith('bgMusic');
        let buffer = this.buffers.get(url);
        if (!buffer) {
          buffer = fetch(resourceUrl(url)).then(r => { if (!r.ok) throw new Error('Audio load failed'); return r.arrayBuffer(); }).then(data => ctx.decodeAudioData(data)).then(decoded=>{if(this.context===ctx)this.decodedBytes+=decoded.length*decoded.numberOfChannels*4;return decoded;});
          this.buffers.set(url, buffer);
        }
        void buffer.then(decoded => {
          if (generation !== this.generation || music && musicGeneration !== this.musicGeneration) return;
          const source = ctx.createBufferSource(), gain = ctx.createGain();
          source.buffer = decoded; gain.gain.value = (event.volume ?? 100) / 100;
          const loops = Math.max(1, event.loop ?? 1); source.loop = loops > 1;
          source.connect(gain); gain.connect(ctx.destination); this.active.set(source, music);
          source.onended = () => { this.active.delete(source); source.disconnect(); gain.disconnect(); };
          source.start(); if (source.loop) source.stop(ctx.currentTime + decoded.duration * loops);
        }).catch(() => { this.buffers.delete(url); this.missing.add(event.name); });
      }
    }
  }
}
