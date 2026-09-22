export interface PerformanceSample {
  now: number;
  elapsedMs: number;
  simulationMs: number;
  renderMs: number;
  audioMs: number;
  snapshotMs: number;
}
export interface ManagedMemory { tiles: number; pool: number; filters: number; audio: number; scene?: number }
export interface PerformanceHud {
  readonly element: HTMLDetailsElement;
  readonly enabled: boolean;
  setEnabled(value: boolean): void;
  sample(value: PerformanceSample): void;
}

const CAPACITY = 256, UPDATE_MS = 1000, GAP_MS = 2000;
const duration = (value: number): number => Number.isFinite(value) && value >= 0 ? value : 0;
const memoryText = (bytes: number | undefined): string => bytes !== undefined && Number.isFinite(bytes) && bytes >= 0 ? `${(bytes / 1048576).toFixed(1)} MiB` : 'unavailable';

/** A local, opt-in display. The caller supplies nonoverlapping timed regions and byte accounting.
 * No frame arrays grow, no timers run, and disabled samples do not read clocks or touch the DOM.
 * Self-time covers completed synchronous sample calls; it excludes subsequent browser paint/GPU work.
 */
export function createPerformanceHud(canvas: HTMLCanvasElement, readMemory: () => ManagedMemory, readRenderer: () => string): PerformanceHud {
  const doc = canvas.ownerDocument;
  const clock = doc.defaultView?.performance ?? performance;
  const element = doc.createElement('details');
  element.id = 'performance-hud'; element.hidden = true;
  element.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:10;max-width:min(350px,calc(100vw - 16px));box-sizing:border-box;padding:6px 8px;border:1px solid #ffffff35;border-radius:5px;background:#101713ed;color:#eff8ee;font:11px/1.4 ui-monospace,Consolas,monospace;';
  const summary = doc.createElement('summary');
  summary.style.cssText = 'cursor:pointer;white-space:nowrap;';
  summary.textContent = 'FPS — · 0 measured frames';
  summary.title = 'Frames sampled since enabled. Expand for timings and memory.';
  const detail = doc.createElement('div'); detail.style.cssText = 'padding-top:6px;white-space:normal;overflow-wrap:anywhere;';
  const frame = doc.createElement('div'), cpu = doc.createElement('div'), timings = doc.createElement('div');
  const overhead = doc.createElement('div'), heap = doc.createElement('div'), managed = doc.createElement('div');
  const renderer = doc.createElement('div'), reset = doc.createElement('div'), limits = doc.createElement('div');
  limits.textContent = 'Timed work ÷ elapsed: estimate for one main-thread core, not total CPU. Excludes browser/GPU/audio-worker work. Memory is accounting, not process RAM or VRAM.';
  limits.style.cssText = 'margin-top:5px;opacity:.75;';
  detail.append(frame, cpu, timings, overhead, heap, managed, renderer, reset, limits);
  element.append(summary, detail); doc.body.append(element);

  const intervals = new Float64Array(CAPACITY), sorted = new Float64Array(CAPACITY);
  let active = false, totalFrames = 0, count = 0, cursor = 0, windowFrames = 0;
  let start = Number.NaN, previous = Number.NaN, lastUpdate = Number.NaN;
  let simulation = 0, rendering = 0, audio = 0, snapshots = 0;
  let selfMs = 0, selfCount = 0, note = '';
  const write = (target: HTMLElement, text: string): void => { if (target.textContent !== text) target.textContent = text; };
  const resetWindow = (now: number): void => {
    start = now; count = cursor = windowFrames = 0;
    simulation = rendering = audio = snapshots = 0;
  };
  const publish = (now: number): void => {
    const elapsed = Math.max(0, now - start);
    const fps = elapsed > 0 && windowFrames > 0 ? (windowFrames * 1000 / elapsed).toFixed(1) : '—';
    write(summary, `${fps} FPS · ${totalFrames} measured frames`);
    if (element.open) {
      // Fixed scratch storage, sorted only at the display refresh, never per sample.
      sorted.fill(Infinity);
      for (let index = 0; index < count; index++) sorted[index] = intervals[index];
      sorted.sort();
      const p95 = count ? `${sorted[Math.ceil(count * .95) - 1].toFixed(1)} ms` : '—';
      write(frame, `Window ${(elapsed / 1000).toFixed(2)} s / ${windowFrames} frames · p95 ${p95} (latest ${count}, up to 256)`);
      const measured = simulation + rendering + audio + snapshots;
      write(cpu, `Measured main-thread work: ${elapsed > 0 && windowFrames ? (measured / elapsed * 100).toFixed(1) + '%' : '—'} of one core (estimate)`);
      const average = (ms: number): string => windowFrames ? (ms / windowFrames).toFixed(2) : '—';
      write(timings, `ms/frame: simulation ${average(simulation)} · render ${average(rendering)} · audio ${average(audio)} · snapshot ${average(snapshots)}`);
      // The current call ends after this text is painted into the DOM. Its cost appears next refresh.
      const selfTotal = selfMs > 0 ? `${selfMs.toFixed(3)} ms` : 'below timer resolution';
      const selfAverage = selfCount && selfMs > 0 ? `${(selfMs / selfCount).toFixed(3)} ms/sample` : 'mean unavailable';
      write(overhead, `HUD self-work: ${selfTotal} / ${selfCount} completed samples (${selfAverage}). Timer-resolution estimate; excludes paint.`);
      try {
        const value = (clock as Performance & { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number } }).memory;
        write(heap, value ? `JS heap: ${memoryText(value.usedJSHeapSize)} used / ${memoryText(value.totalJSHeapSize)} allocated (shared, approximate)` : 'JS heap: unavailable in this browser');
      } catch { write(heap, 'JS heap: unavailable in this browser'); }
      try {
        const value = readMemory();
        write(managed, `Managed memory: tiles ${memoryText(value.tiles)} · pool ${memoryText(value.pool)} · scene ${memoryText(value.scene ?? 0)} · filter backing ${memoryText(value.filters)} · decoded audio ${memoryText(value.audio)}`);
      } catch { write(managed, 'Managed memory: unavailable'); }
      try { write(renderer, `Renderer: ${readRenderer()}`); } catch { write(renderer, 'Renderer: unavailable'); }
      write(reset, note || 'Frame count is since enabled. Expand/collapse changes display only.');
    }
    lastUpdate = now;
  };

  return {
    element,
    get enabled() { return active; },
    setEnabled(value) {
      if (active === value) return;
      active = value; element.hidden = !value;
      if (value) {
        totalFrames = 0; previous = lastUpdate = Number.NaN; resetWindow(Number.NaN);
        selfMs = selfCount = 0; note = '';
        write(summary, 'FPS — · 0 measured frames');
        for (const target of [frame, cpu, timings, overhead, heap, managed, renderer, reset]) write(target, '');
      }
    },
    sample(value) {
      if (!active) return;
      const began = clock.now();
      try {
        if (!Number.isFinite(value.now) || !Number.isFinite(value.elapsedMs) || value.elapsedMs < 0) return;
        totalFrames++;
        const backwards = Number.isFinite(previous) && value.now < previous;
        if (value.elapsedMs > GAP_MS || backwards) {
          resetWindow(value.now);
          note = backwards ? 'Sampling clock moved backwards; window reset.' : `Last gap ${(value.elapsedMs / 1000).toFixed(2)} s; window reset, catch-up sample excluded.`;
          previous = value.now; publish(value.now); return;
        }
        if (!Number.isFinite(start)) { start = value.now - value.elapsedMs; lastUpdate = start; }
        previous = value.now;
        intervals[cursor] = value.elapsedMs; cursor = (cursor + 1) % CAPACITY; count = Math.min(CAPACITY, count + 1);
        windowFrames++;
        simulation += duration(value.simulationMs); rendering += duration(value.renderMs);
        audio += duration(value.audioMs); snapshots += duration(value.snapshotMs);
        if (value.now - lastUpdate >= UPDATE_MS) {
          publish(value.now);
          start = value.now; windowFrames = 0; simulation = rendering = audio = snapshots = 0;
        }
      } finally { selfMs += Math.max(0, clock.now() - began); selfCount++; }
    },
  };
}
