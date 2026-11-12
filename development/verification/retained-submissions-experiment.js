// Development-only command reuse. Preserve native Canvas order and clipping.
export function retainSubmissions(art, stage) {
  const entries = new Map(), methods = new Map();
  let recording, generation = 0, count = 0;
  const stats = {hits: 0, misses: 0, invalidations: 0, commands: 0};
  const invalidate = () => { generation++; entries.clear(); count = 0; stats.invalidations++; };
  for (const name of ['clearCache', 'removeTile', 'release']) {
    const original = art[name].bind(art);
    art[name] = (...args) => { invalidate(); return original(...args); };
  }
  const proxy = new Proxy(stage, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      if (typeof value !== 'function') return value;
      if (!methods.has(key)) methods.set(key, (...args) => {
        if (recording && !['getTransform', 'measureText', 'isPointInPath', 'isPointInStroke'].includes(key)) recording.push([key, args]);
        return value.apply(target, args);
      });
      return methods.get(key);
    },
    set(target, key, value) {
      if (recording) recording.push([key, value, true]);
      Reflect.set(target, key, value, target); return true;
    },
  });
  const draw = art.draw.bind(art);
  art.draw = (ctx, id, matrix, frame = 1, alpha = 1, useCache = true, ratio = 0, effects = {}) => {
    if (ctx !== stage || !useCache || effects.interpolate) return draw(ctx, id, matrix, frame, alpha, useCache, ratio, effects);
    const m = ctx.getTransform(), clock = (Math.max(1, Math.floor(frame)) - 1) % art.period(id);
    const key = JSON.stringify([id, matrix, clock, alpha, ratio, effects, m.a, m.b, m.c, m.d, m.e, m.f, ctx.globalAlpha, ctx.canvas.width, ctx.canvas.height]);
    const cached = entries.get(key);
    if (cached) {
      stats.hits++;
      for (const [name, args, property] of cached) {
        if (property) ctx[name] = args;
        else ctx[name](...args);
      }
      return true;
    }
    stats.misses++; const before = generation; recording = [];
    try {
      const result = draw(proxy, id, matrix, frame, alpha, useCache, ratio, effects);
      if (before === generation && recording.length <= 2048) {
        count += recording.length;
        entries.set(key, recording);
        while (entries.size > 256 || count > 16384) {
          const oldest = entries.keys().next().value; count -= entries.get(oldest).length; entries.delete(oldest);
        }
      }
      stats.commands = count;
      return result;
    } finally { recording = undefined; }
  };
  return stats;
}
