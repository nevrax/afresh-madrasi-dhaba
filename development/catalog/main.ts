import { connectFullscreen } from '../../src/ui/fullscreen.js';
import { VectorArt } from '../../src/render/vector.js';
import { identity } from '../../src/render/assets.js';
import { resourceJson, resourceUrl } from '../../src/render/resources.js';

interface Preview {
  type: 'image' | 'sequence' | 'audio' | 'font' | 'text';
  url?: string;
  frames?: string[];
  fps?: number;
  text?: string;
}

interface Resource {
  id: string;
  symbolId?: number;
  kind: string;
  name: string;
  exportNames?: string[];
  instanceNames?: string[];
  bounds?: { x: number; y: number; width: number; height: number } | null;
  origin?: { x: number; y: number };
  dependencies?: string[];
  frameCount?: number;
  labels?: { frame: number; name: string }[];
  preview?: Preview | null;
  files?: { url: string; sha256?: string; bytes?: number }[];
  [key: string]: unknown;
}

interface Catalogue {
  schemaVersion: number;
  source: { file: string; sha256: string; fps: number; width: number; height: number };
  items: Resource[];
  [key: string]: unknown;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  result.className = className;
  if (text) result.textContent = text;
  return result;
}

function button(text: string, action: () => void): HTMLButtonElement {
  const result = element('button', '', text);
  result.type = 'button';
  result.addEventListener('click', action);
  return result;
}

// The page's base URL points to the repository root for native resource paths.
function assetUrl(path: string): string {
  const embedded=resourceUrl(path);if(embedded!==path)return embedded;
  const url = new URL(path, document.baseURI);
  if(location.protocol==='file:'&&url.href.startsWith(new URL('assets/',document.baseURI).href))return url.href;
  if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('The catalogue accepts only local resource URLs.');
  }
  return url.href;
}

function format(value: unknown): string {
  if (value === undefined || value === null) return 'Not recorded';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function coordinates(values: Record<string, number> | undefined | null): string {
  if (!values) return 'Not recorded';
  return Object.entries(values).map(([key, value]) => `${key}: ${Number(value.toFixed(3))}`).join(' · ') + ' px';
}

function thumbnailUrl(item: Resource): string | undefined {
  const preview = item.preview;
  if (preview?.type === 'image') return preview.url;
  if (preview?.type === 'sequence') return preview.frames?.[0];
  return undefined;
}

const icons: Record<string, string> = {
  shape: '◇', sprite: '▶', image: '▧', sound: '♫', button: '▣', font: 'Aa', text: 'Tt', scene: '▤',
};

class ResourceCatalogue {
  private readonly lookup = new Map<string, Resource>();
  private readonly parents = new Map<string, Resource[]>();
  private readonly search = element('input');
  private readonly kind = element('select');
  private readonly list = element('nav', 'resource-list');
  private readonly detail = element('section', 'detail');
  private readonly count = element('div', 'result-count');
  private readonly workspace = element('div', 'workspace');
  private readonly inspector = element('aside', 'resource-details');
  private readonly autoplay = element('input');
  private readonly splitter = element('div', 'gallery-splitter');
  private galleryWidth = 280;
  private selectedId = '';
  private disposePreview: () => void = () => undefined;
  private setPreviewAutoplay: (enabled: boolean) => void = () => undefined;

  constructor(private readonly manifest: Catalogue, private readonly vectors: VectorArt, app: HTMLElement) {
    for (const item of manifest.items) this.lookup.set(item.id, item);
    for (const item of manifest.items) {
      for (const dependency of item.dependencies ?? []) {
        const parents = this.parents.get(dependency) ?? [];
        parents.push(item);
        this.parents.set(dependency, parents);
      }
    }
    const toolbar = element('div', 'toolbar');
    this.search.type = 'search';
    this.search.id = 'resource-search';
    this.search.placeholder = 'Name, symbol ID, export or instance…';
    this.search.autocomplete = 'off';
    this.search.addEventListener('input', () => this.renderList());
    this.kind.id = 'resource-kind';
    this.kind.append(new Option('All resource types', ''));
    for (const kind of [...new Set(manifest.items.map(item => item.kind))].sort()) {
      const count = manifest.items.filter(item => item.kind === kind).length;
      this.kind.append(new Option(`${kind} · ${count}`, kind));
    }
    this.kind.addEventListener('change', () => this.renderList());
    this.count.setAttribute('role', 'status');
    this.autoplay.type = 'checkbox';
    this.autoplay.checked = true;
    try { this.autoplay.checked = localStorage.getItem('madrasi-catalog-autoplay') !== 'false'; } catch { /* Preferences are optional. */ }
    const autoplayLabel = element('label', 'autoplay-toggle');
    autoplayLabel.append(this.autoplay, document.createTextNode('Autoplay'));
    this.autoplay.addEventListener('change', () => {
      try { localStorage.setItem('madrasi-catalog-autoplay', String(this.autoplay.checked)); } catch { /* Keep the session preference. */ }
      this.setPreviewAutoplay(this.autoplay.checked);
    });
    const galleryToggle = button('Gallery', () => {
      this.list.hidden = !this.list.hidden;
      this.splitter.hidden = this.list.hidden;
      galleryToggle.setAttribute('aria-expanded', String(!this.list.hidden));
      this.resizeGallery(this.galleryWidth);
    });
    this.list.id = 'resource-gallery';
    this.list.hidden = matchMedia('(max-width: 700px)').matches;
    this.splitter.hidden = this.list.hidden;
    galleryToggle.setAttribute('aria-controls', this.list.id);
    galleryToggle.setAttribute('aria-expanded', String(!this.list.hidden));
    const detailsToggle = button('Details', () => {
      this.inspector.hidden = !this.inspector.hidden;
      detailsToggle.setAttribute('aria-expanded', String(!this.inspector.hidden));
      this.resizeGallery(this.galleryWidth);
    });
    this.inspector.id = 'resource-details';
    detailsToggle.setAttribute('aria-controls', this.inspector.id);
    detailsToggle.setAttribute('aria-expanded', 'true');
    toolbar.append(galleryToggle, this.field('Search resources', this.search, 'search'), this.field('Resource type', this.kind), this.count, autoplayLabel, detailsToggle);
    this.list.setAttribute('aria-label', 'Resources');
    this.detail.setAttribute('aria-label', 'Selected resource');
    this.inspector.setAttribute('aria-label', 'Resource details');
    this.workspace.append(this.list, this.splitter, this.detail, this.inspector);
    app.replaceChildren(toolbar, this.workspace);
    this.setupSplitter();
    window.addEventListener('hashchange', () => this.selectFromHash());
    this.renderList();
    this.selectFromHash();
  }

  private resizeGallery(width: number): void {
    const available = this.workspace.clientWidth;
    const inspectorWidth = this.inspector.hidden ? 0 : this.inspector.getBoundingClientRect().width;
    const maximum = Math.max(140, Math.min(available * .6, available - inspectorWidth - 220));
    this.galleryWidth = Math.round(Math.max(140, Math.min(width, maximum)));
    this.workspace.style.setProperty('--gallery-width', `${this.galleryWidth}px`);
    this.splitter.setAttribute('aria-valuemin', '140');
    this.splitter.setAttribute('aria-valuemax', String(Math.round(maximum)));
    this.splitter.setAttribute('aria-valuenow', String(this.galleryWidth));
  }

  private setupSplitter(): void {
    const splitter = this.splitter;
    splitter.tabIndex = 0;
    splitter.setAttribute('role', 'separator');
    splitter.setAttribute('aria-label', 'Resize gallery');
    splitter.setAttribute('aria-orientation', 'vertical');
    splitter.setAttribute('aria-controls', this.list.id);
    splitter.title = 'Drag to resize gallery. Arrow keys also resize; double-click to reset.';
    let pointer: number | null = null;
    let startX = 0;
    let startWidth = 0;
    splitter.addEventListener('pointerdown', event => {
      if (event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startWidth = this.list.getBoundingClientRect().width;
      splitter.setPointerCapture(pointer);
      splitter.classList.add('dragging');
      event.preventDefault();
    });
    splitter.addEventListener('pointermove', event => {
      if (pointer === event.pointerId) this.resizeGallery(startWidth + event.clientX - startX);
    });
    const stop = (): void => { pointer = null; splitter.classList.remove('dragging'); };
    splitter.addEventListener('pointerup', stop);
    splitter.addEventListener('pointercancel', stop);
    splitter.addEventListener('lostpointercapture', stop);
    splitter.addEventListener('dblclick', () => this.resizeGallery(280));
    splitter.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      this.resizeGallery(event.key === 'Home' ? 140 : event.key === 'End' ? Infinity : this.galleryWidth + (event.key === 'ArrowLeft' ? -20 : 20));
    });
    new ResizeObserver(() => this.resizeGallery(this.galleryWidth)).observe(this.workspace);
    this.resizeGallery(this.galleryWidth);
  }

  private field(labelText: string, input: HTMLInputElement | HTMLSelectElement, extra = ''): HTMLElement {
    const wrapper = element('div', `field ${extra}`);
    const label = element('label', '', labelText);
    label.htmlFor = input.id;
    wrapper.append(label, input);
    return wrapper;
  }

  private selectFromHash(): void {
    let requested = '';
    try { requested = decodeURIComponent(location.hash.slice(1)); } catch { /* Invalid hash: show first resource. */ }
    const item = this.lookup.get(requested) ?? this.manifest.items[0];
    if (item) this.select(item);
    else this.detail.replaceChildren(element('p', 'empty', 'No resources are available in this index.'));
  }

  private navigate(item: Resource): void {
    if (this.selectedId === item.id) return;
    const url = new URL(location.href); url.hash = encodeURIComponent(item.id);
    history.pushState(null, '', url);
    this.select(item);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  private renderList(): void {
    const query = this.search.value.toLocaleLowerCase().trim();
    const resources = this.manifest.items.filter(item => {
      if (this.kind.value && item.kind !== this.kind.value) return false;
      const text = [item.id, item.symbolId, item.name, ...(item.exportNames ?? []), ...(item.instanceNames ?? [])].join(' ').toLocaleLowerCase();
      return !query || text.includes(query);
    });
    this.count.textContent = `${resources.length} / ${this.manifest.items.length} resources`;
    const fragment = document.createDocumentFragment();
    for (const item of resources) {
      const card = button('', () => this.navigate(item));
      card.className = 'resource-card';
      card.title = item.name || item.id;
      card.dataset.resourceId = item.id;
      card.setAttribute('aria-current', String(this.selectedId === item.id));
      const thumbnail = element('span', 'thumbnail');
      const url = thumbnailUrl(item);
      if (url) {
        const image = element('img');
        image.src = assetUrl(url);
        image.alt = '';
        image.loading = 'lazy';
        image.addEventListener('error', () => thumbnail.replaceChildren(element('span', 'kind-icon', '—')), { once: true });
        thumbnail.append(image);
      } else thumbnail.append(element('span', 'kind-icon', icons[item.kind] ?? '·'));
      const copy = element('span', 'card-copy');
      copy.append(element('span', 'resource-name', item.name || item.id), element('span', 'resource-caption', `${item.kind} · ${item.symbolId === undefined ? item.id : `#${item.symbolId}`}`));
      card.append(thumbnail, copy);
      fragment.append(card);
    }
    if (!resources.length) fragment.append(element('p', 'empty', 'No matching resources. Try a different name, ID or type.'));
    this.list.replaceChildren(fragment);
  }

  private select(item: Resource): void {
    this.disposePreview();
    this.disposePreview = () => undefined;
    this.setPreviewAutoplay = () => undefined;
    this.selectedId = item.id;
    for (const card of this.list.querySelectorAll<HTMLButtonElement>('[data-resource-id]')) {
      card.setAttribute('aria-current', String(card.dataset.resourceId === item.id));
    }
    const heading = element('div', 'detail-top');
    const title = element('div');
    title.title = item.name || item.id;
    title.append(element('span', 'badge', `${item.kind} / ${item.id}`), element('h2', '', item.name || item.id));
    const inspectorHeader = element('div', 'inspector-header');
    inspectorHeader.append(element('h2', '', item.name || item.id), element('span', 'badge', item.id));
    const info = element('div', 'inspector-content');
    if (item.preview?.type === 'sequence') {
      info.append(element('p', 'hint', 'Preview follows authored frames. ActionScript stops, jumps, interaction and sound triggers are not executed.'));
    }
    this.inspector.replaceChildren(inspectorHeader, info);
    heading.append(title);
    this.detail.replaceChildren(heading);
    this.renderPreview(item);
    const metadata = element('dl', 'details-grid');
    const rows: [string, unknown][] = [
      ['Source symbol', item.symbolId ?? item.id],
      ['Exports', item.exportNames?.join(', ') || 'No exported name'],
      ['Instances', item.instanceNames?.join(', ') || 'No named instance recorded'],
      ['Bounds', coordinates(item.bounds)],
      ['Origin', coordinates(item.origin)],
      ['Source frames', item.frameCount],
      ['Frame labels', item.labels?.length ? item.labels.map(label => `${label.frame}: ${label.name}`).join(' · ') : 'No frame labels'],
    ];
    for (const [name, value] of rows) metadata.append(element('dt', '', name), element('dd', '', format(value)));
    info.append(element('h3', '', 'Source information'), metadata);
    this.dependencies(info, 'Nested resources', item.dependencies ?? []);
    this.dependencies(info, 'Used by', (this.parents.get(item.id) ?? []).map(parent => parent.id));
    if (item.files?.length) {
      const links = element('div', 'source-links');
      const moreLinks = element('div', 'source-links');
      for (const [index, file] of item.files.entries()) {
        const link = element('a', '', `${item.files.length === 1 ? 'Open exported file' : `Export ${index + 1}`} (${file.url.split('.').pop() ?? 'file'})`);
        link.href = assetUrl(file.url);
        link.target = '_blank';
        link.rel = 'noopener';
        link.title = `${file.url}${file.bytes === undefined ? '' : ` · ${file.bytes.toLocaleString()} bytes`}${file.sha256 ? ` · SHA-256 ${file.sha256}` : ''}`;
        (index < 8 ? links : moreLinks).append(link);
      }
      info.append(links);
      if (item.files.length > 8) {
        const remaining = element('details');
        remaining.append(element('summary', '', `All exported files · ${item.files.length}`), moreLinks);
        info.append(remaining);
      }
    }
    const raw = element('details');
    raw.append(element('summary', '', 'Complete resource metadata'), element('pre', '', JSON.stringify(item, null, 2)));
    info.append(raw, element('p', 'hint', `Source: ${this.manifest.source.file} · ${this.manifest.source.width} × ${this.manifest.source.height} · ${this.manifest.source.fps} fps · SHA-256 ${this.manifest.source.sha256}`));
  }

  private dependencies(container: HTMLElement, title: string, ids: string[]): void {
    container.append(element('h3', '', `${title} · ${ids.length}`));
    if (!ids.length) {
      container.append(element('p', 'muted', title === 'Used by' ? 'No parent recorded. This does not prove the resource is unused by scripts.' : 'No nested resources recorded.'));
      return;
    }
    const wrapper = element('div', 'dependency-list');
    for (const id of ids) {
      const target = this.lookup.get(id);
      const link = button(target ? `${target.name || id} · ${id}` : `${id} · not indexed`, () => { if (target) this.navigate(target); });
      link.disabled = !target;
      wrapper.append(link);
    }
    container.append(wrapper);
  }

  private renderPreview(item: Resource): void {
    const preview = item.preview;
    const stage = element('div', 'preview');
    this.detail.append(stage);
    const missing = (message: string): void => { stage.replaceChildren(element('p', 'no-preview', message)); };
    if (!preview) {
      missing('No browser preview exported for this resource. Open Details for source information and related resources.');
      return;
    }
    if (preview.type === 'text' && item.kind !== 'text') {
      missing(preview.text ?? 'No visual or audio preview exported for this resource. Open Details for source information.');
      return;
    }
    if (preview.type === 'audio' && preview.url) {
      stage.classList.add('audio-preview');
      const audio = element('audio');
      audio.controls = true;
      audio.preload = 'none';
      audio.src = assetUrl(preview.url);
      audio.setAttribute('aria-label', `${item.name} sound preview`);
      audio.addEventListener('error', () => missing('This audio export could not be loaded or decoded by the browser. Open Details for the exported file.'));
      const hint = element('p', 'hint', 'Autoplay follows the checkbox above.');
      stage.append(element('span', 'kind-icon', '♫'), audio, hint);
      let active = true;
      const startAudio = (): void => {
        void audio.play().catch(() => {
          if (active && audio.paused) hint.textContent = 'Press Play to enable sound in this browser.';
        });
      };
      this.setPreviewAutoplay = enabled => { if (enabled) startAudio(); else audio.pause(); };
      const onVisibility = (): void => {
        if (document.hidden) audio.pause();
        else if (this.autoplay.checked) startAudio();
      };
      document.addEventListener('visibilitychange', onVisibility);
      this.disposePreview = () => {
        active = false;
        document.removeEventListener('visibilitychange', onVisibility);
        audio.pause(); audio.removeAttribute('src'); audio.load();
      };
      if (this.autoplay.checked && !document.hidden) startAudio();
      return;
    }
    if (preview.type === 'font' || preview.type === 'text') {
      const text = element('div', 'text-specimen', preview.text ?? (typeof item.text === 'string' ? item.text : 'Madrasi Dhaba\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 — Score: 1250'));
      stage.append(text);
      if (preview.type === 'font' && preview.url) {
        const face = new FontFace(`catalog-${item.id}`, `url("${assetUrl(preview.url)}")`);
        let active = true;
        void face.load().then(loaded => {
          if (!active) return;
          document.fonts.add(loaded);
          text.style.fontFamily = `"catalog-${item.id}"`;
        }).catch(() => { if (active) missing('The browser could not load this font export. Open Details for the exported file.'); });
        this.disposePreview = () => { active = false; document.fonts.delete(face); };
        this.detail.append(element('p', 'hint', 'Font specimen: unsupported or absent glyphs can fall back to the browser font. This is not a reconstruction of the original text layout.'));
      }
      return;
    }
    const vectorId=item.kind==='scene' ? -1000-Number(item.id.slice(6)) : item.symbolId;
    if (vectorId!==undefined && this.vectors.has(vectorId)) {
      this.renderVectorPreview(item,vectorId,stage);
      return;
    }
    const frames = preview.type === 'sequence' ? preview.frames ?? [] : preview.url ? [preview.url] : [];
    if (!frames.length) {
      missing('No preview frames are available for this resource. Open Details for metadata and nested resources.');
      return;
    }
    const image = element('img');
    image.alt = item.name || item.id;
    image.src = assetUrl(frames[0]!);
    stage.append(image);
    image.addEventListener('error', () => missing('This exported frame could not be loaded. Re-run the asset export and reload the catalogue.'));
    if (preview.type !== 'sequence') return;
    let frame = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const fps = preview.fps && preview.fps > 0 ? preview.fps : this.manifest.source.fps;
    const controls = element('div', 'animation-controls');
    const readout = element('output', 'frame-readout');
    const slider = element('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = String(frames.length);
    slider.value = '1';
    slider.setAttribute('aria-label', 'Preview frame');
    const update = (): void => {
      image.src = assetUrl(frames[frame]!);
      slider.value = String(frame + 1);
      readout.textContent = `${frame + 1} / ${frames.length}`;
      readout.title = `Preview frame ${frame + 1}`;
    };
    const pause = (): void => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      play.textContent = 'Play';
      play.setAttribute('aria-pressed', 'false');
    };
    const step = (delta: number): void => { pause(); frame = (frame + delta + frames.length) % frames.length; update(); };
    const startPlayback = (): void => {
      if (timer !== undefined || frames.length < 2 || document.hidden) return;
      play.textContent = 'Pause';
      play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => { frame = (frame + 1) % frames.length; update(); }, 1000 / fps);
    };
    const play = button('Play', () => { if (timer !== undefined) pause(); else startPlayback(); });
    play.setAttribute('aria-pressed', 'false');
    play.disabled = frames.length < 2;
    const previous = button('←', () => step(-1));
    previous.setAttribute('aria-label', 'Previous frame');
    const next = button('→', () => step(1));
    next.setAttribute('aria-label', 'Next frame');
    slider.addEventListener('input', () => { pause(); frame = Number(slider.value) - 1; update(); });
    this.setPreviewAutoplay = enabled => { if (enabled) startPlayback(); else pause(); };
    const onVisibility = (): void => {
      if (document.hidden) pause();
      else if (this.autoplay.checked) startPlayback();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.disposePreview = () => { pause(); document.removeEventListener('visibilitychange', onVisibility); };
    controls.append(play, previous, next, slider, readout);
    update();
    const note = element('p', 'hint', `${fps} fps · Exported frames only`);
    note.title = 'Preview follows authored frames. ActionScript stops, jumps, interaction and sound triggers are not executed.';
    this.detail.append(controls, note);
    if (this.autoplay.checked) startPlayback();
  }

  private renderVectorPreview(item: Resource, id: number, stage: HTMLElement): void {
    const canvas=element('canvas'); canvas.setAttribute('role','img');canvas.setAttribute('aria-label',item.name||item.id);stage.append(canvas);
    const bounds=this.vectors.bounds(id)!;
    let frame=1, timer:ReturnType<typeof setInterval>|undefined;
    const count=item.kind==='morphshape' ? 25 : item.preview?.frames?.length ?? 1;
    const fps=item.preview?.fps ?? this.manifest.source.fps;
    const readout=element('output','frame-readout');
    const slider=element('input');slider.type='range';slider.min='1';slider.max=String(count);slider.value='1';slider.setAttribute('aria-label','Preview frame');
    const draw=():void => {
      const ratio=devicePixelRatio||1, w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
      canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
      const scale=Math.min(1,(w-24)/Math.max(1,bounds.width),(h-24)/Math.max(1,bounds.height));
      const context=canvas.getContext('2d')!;
      context.setTransform(scale*ratio,0,0,scale*ratio,(w-bounds.width*scale)*ratio/2-bounds.x*scale*ratio,(h-bounds.height*scale)*ratio/2-bounds.y*scale*ratio);
      this.vectors.draw(context,id,identity(),frame,1,true,item.kind==='morphshape' ? (frame-1)/24 : 0);
      slider.value=String(frame);readout.textContent=`${frame} / ${count}`;
    };
    const pause=():void => {if(timer!==undefined)clearInterval(timer);timer=undefined;play.textContent='Play';play.setAttribute('aria-pressed','false');};
    const start=():void => {
      if(timer!==undefined||count<2||document.hidden)return;
      play.textContent='Pause';play.setAttribute('aria-pressed','true');
      timer=setInterval(()=>{frame=frame%count+1;draw();},1000/fps);
    };
    const play=button('Play',()=>{if(timer===undefined)start();else pause();});play.setAttribute('aria-pressed','false');
    const previous=button('←',()=>{pause();frame=(frame+count-2)%count+1;draw();});previous.setAttribute('aria-label','Previous frame');
    const next=button('→',()=>{pause();frame=frame%count+1;draw();});next.setAttribute('aria-label','Next frame');
    slider.addEventListener('input',()=>{pause();frame=Number(slider.value);draw();});
    if(count>1){const controls=element('div','animation-controls');controls.append(play,previous,next,slider,readout);this.detail.append(controls);}
    this.detail.append(element('p','hint',count>1?`Vector preview · ${fps} fps`:'Vector preview · original size'));
    const observer=new ResizeObserver(draw);observer.observe(canvas);
    const visibility=():void=>{if(document.hidden)pause();else if(this.autoplay.checked)start();};document.addEventListener('visibilitychange',visibility);
    this.setPreviewAutoplay=enabled=>{if(enabled)start();else pause();};
    this.disposePreview=()=>{pause();observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
    draw();if(this.autoplay.checked)start();
  }
}

async function start(): Promise<void> {
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) throw new Error('Catalogue mount point is missing.');
  const fullscreen = button('⛶', () => undefined);
  fullscreen.className = 'fullscreen-button';
  const displayStatus = element('p', 'display-status');
  displayStatus.hidden = true;
  displayStatus.setAttribute('role', 'status');
  document.querySelector('.masthead')!.append(fullscreen);
  document.body.append(displayStatus);
  connectFullscreen(fullscreen, displayStatus);
  try {
    const manifest = await resourceJson<Catalogue>('./assets/catalog.json');
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.items) || !manifest.source) {
      throw new Error('The resource index has an unsupported format.');
    }
    const data=await resourceJson<ConstructorParameters<typeof VectorArt>[0]>('./assets/vector/scene.json');
    if(data.sourceSha256!==manifest.source.sha256)throw new Error('Vector source checksum mismatch.');
    new ResourceCatalogue(manifest, new VectorArt(data), app);
  } catch (error) {
    app.replaceChildren(element('p', 'error', `Unable to open the catalogue. ${error instanceof Error ? error.message : String(error)} Build the application and generate assets/catalog.json, then reload.`));
  }
}

void start();
