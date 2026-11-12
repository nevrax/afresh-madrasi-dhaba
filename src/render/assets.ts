import { VectorArt } from './vector.js';
import { resourceJson, resourceUrl } from './resources.js';

export interface Matrix { a: number; b: number; c: number; d: number; tx: number; ty: number }
export interface Bounds { x: number; y: number; width: number; height: number }
export interface Placement { depth: number; symbolId: number; assetId: string; name?: string; matrix: Matrix }
export interface Asset {
  id: string; symbolId: number; kind: string; name: string; exportNames: string[];
  bounds: Bounds | null; frameCount: number;
  preview: { type: string; url?: string; frames?: string[]; fps?: number } | null;
  files: { url: string }[];
  metadata?: { fontId?: number; fontHeight?: number; align?: number; children?: { tag: string; red?: number; green?: number; blue?: number; alpha?: number }[] };
}
export interface Scene { frame: number; instances: Placement[] }
export const identity = (x = 0, y = 0): Matrix => ({ a: 1, b: 0, c: 0, d: 1, tx: x, ty: y });

/** Loads native exports only. No SWF parser, scripts or timeline actions are loaded. */
export class Assets {
  vector: VectorArt | null = null;
  readonly symbols = new Map<number, Asset>();
  readonly names = new Map<string, Asset>();
  scenes: Scene[] = [];
  private images = new Map<string, HTMLImageElement>();
  private pixels = new Map<string, ImageData>();
  private lastFrames = new Map<number, HTMLImageElement>();
  private pinnedImages = new Set<string>();
  readonly failures = new Set<string>();
  async load(filterPowerPreference:WebGLPowerPreference='default'): Promise<void> {
    const data = await resourceJson<{ source: { sha256: string }; items: Asset[]; scenes: Scene[] }>('assets/catalog.json');
    const vectors = await resourceJson<ConstructorParameters<typeof VectorArt>[0]>('assets/vector/scene.json');
    if (vectors.sourceSha256 !== data.source.sha256) throw new Error('Vector source does not match the selected edition.');
    this.vector = new VectorArt(vectors,filterPowerPreference);
    for (const item of data.items) {
      this.symbols.set(item.symbolId, item);
      for (const name of [item.id, item.name, ...item.exportNames]) this.names.set(name, item);
      if (item.kind === 'button') for (const url of item.preview?.frames || []) this.pinnedImages.add(url);
    }
    await Promise.all(data.items.filter(item => item.preview?.type === 'font' && item.preview.url).map(async item => {
      const font = new FontFace(`madrasi-${item.symbolId}`, `url("${resourceUrl(item.preview!.url!)}")`);
      try { await font.load(); document.fonts.add(font); } catch { this.failures.add(item.preview!.url!); }
    }));
    this.scenes = data.scenes || (await resourceJson<{scenes:Scene[]}>('assets/scenes.json')).scenes;
  }
  placement(name: string, frame = 5): Placement | undefined { return this.scenes.find(s => s.frame === frame)?.instances.find(i => i.name === name); }
  image(url: string): HTMLImageElement | undefined {
    let img = this.images.get(url);
    if (!img) {
      img = new Image(); img.decoding = 'async'; img.src = resourceUrl(url);
      img.onerror = () => this.failures.add(url);
      this.images.set(url, img);
    }
    // Keep a bounded working set; the tutorial alone has hundreds of large frames.
    this.images.delete(url); this.images.set(url, img);
    let bytes = 0;
    for (const value of this.images.values()) bytes += value.naturalWidth * value.naturalHeight * 4;
    while (this.images.size > 96 || bytes > 64 * 1024 * 1024 && this.images.size > 1) {
      const oldest = [...this.images.entries()].find(([key]) => key !== url && !this.pinnedImages.has(key));
      if (!oldest) break;
      bytes -= oldest[1].naturalWidth * oldest[1].naturalHeight * 4;
      this.images.delete(oldest[0]); this.pixels.delete(oldest[0]); oldest[1].src = '';
    }
    return img.complete && img.naturalWidth > 0 ? img : undefined;
  }
  async preload(symbols: number[]): Promise<void> {
    const urls = new Set(symbols.flatMap(id => {
      if (this.vector?.has(id)) return [];
      const p = this.symbols.get(id)?.preview;
      return p?.frames?.length ? p.frames.slice(0, this.symbols.get(id)?.kind === 'button' ? 4 : 1) : p?.url && ['image', 'sequence'].includes(p.type) ? [p.url] : [];
    }));
    await Promise.all([...urls].map(url => new Promise<void>(resolve => {
      this.image(url); const img = this.images.get(url)!;
      if (img.complete) resolve(); else { img.addEventListener('load', () => resolve(), { once: true }); img.addEventListener('error', () => resolve(), { once: true }); }
    })));
  }
  draw(ctx: CanvasRenderingContext2D, id: number, matrix: Matrix, frame = 1, alpha = 1): boolean {
    if (this.vector?.has(id)) return this.vector.draw(ctx, id, matrix, frame, alpha);
    const item = this.symbols.get(id); if (!item) return false;
    const p = item.preview;
    if (!p) return false;
    const url = p.frames?.length ? p.frames[(Math.max(1, Math.floor(frame)) - 1) % p.frames.length] : p.type === 'image' ? p.url : undefined;
    if (!url) return false;
    let img = this.image(url);
    if (img) this.lastFrames.set(id, img);
    if (p.frames && item.kind !== 'button') {
      for (let ahead = 1; ahead <= 4; ahead++) this.image(p.frames[(Math.max(1, Math.floor(frame)) - 1 + ahead) % p.frames.length]!);
    }
    img ??= this.lastFrames.get(id);
    if (!img?.complete || !img.naturalWidth) return false;
    const b = item.bounds || { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
    ctx.save(); ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty); ctx.globalAlpha *= alpha;
    ctx.drawImage(img, b.x, b.y); ctx.restore(); return true;
  }
  contains(id: number, m: Matrix, x: number, y: number, pixel = false, frame = 1): boolean {
    const b = this.symbols.get(id)?.bounds; if (!b) return false;
    const det = m.a * m.d - m.b * m.c; if (!det) return false;
    const dx = x - m.tx, dy = y - m.ty;
    const lx = (m.d * dx - m.c * dy) / det, ly = (-m.b * dx + m.a * dy) / det;
    const inside = lx >= b.x && lx <= b.x + b.width && ly >= b.y && ly <= b.y + b.height;
    if (!inside || !pixel) return inside;
    if (this.vector?.has(id)) return this.vector.contains(id, lx, ly, frame);
    const p = this.symbols.get(id)?.preview;
    const url = p?.frames?.[(frame - 1) % p.frames.length] || p?.url;
    if (!url) return inside;
    const image = this.image(url); if (!image) return false;
    let data = this.pixels.get(url);
    if (!data) {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return inside;
      ctx.drawImage(image, 0, 0); data = ctx.getImageData(0, 0, canvas.width, canvas.height); this.pixels.set(url, data);
    }
    const px = Math.floor(lx - b.x), py = Math.floor(ly - b.y);
    return px >= 0 && px < data.width && py >= 0 && py < data.height && (data.data[(py * data.width + px) * 4 + 3] ?? 0) > 0;
  }
}
