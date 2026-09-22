// Repeated controls bracket every matrix; all variants are development only.
export function componentRankingCases(kind = 'ranking') {
  const variants = kind === 'layers' ? [
    {name: 'retained-scene-start', presentation: 'extra', instrumentation: false},
    {name: 'retained-browser-layers', presentation: 'extra', layers: true, instrumentation: false},
    {name: 'retained-scene-end', presentation: 'extra', instrumentation: false},
  ] : kind === 'live' ? [
    {name: 'full-day-extra', presentation: 'extra', mode: 'live', measurementMs: 180000},
  ] : kind === 'scene' ? [
    {name: 'extra-start', presentation: 'extra', instrumentation: false},
    {name: 'retained-scene', presentation: 'extra', retainScene: true, instrumentation: false},
    {name: 'retained-scene-desynchronized', presentation: 'extra', retainScene: true, stageOptions: {desynchronized: true}, instrumentation: false},
    {name: 'extra-end', presentation: 'extra', instrumentation: false},
  ] : kind === 'trace' ? [
    {name: 'extra-trace', presentation: 'extra', legacyExtra: true, trace: true, measurementMs: 5000, instrumentation: false},
    {name: 'retained-scene-trace', presentation: 'extra', trace: true, measurementMs: 5000, instrumentation: false},
  ] : kind === 'pipeline' ? [
    {name: 'extra-uninstrumented-start', presentation: 'extra', instrumentation: false},
    {name: 'opaque-background', presentation: 'extra', opaqueBackground: true, instrumentation: false},
    {name: 'no-redundant-clear', presentation: 'extra', noClear: true, instrumentation: false},
    {name: 'retained-submissions', presentation: 'extra', retainSubmissions: true, instrumentation: false},
    {name: 'retained-desynchronized', presentation: 'extra', retainSubmissions: true, stageOptions: {desynchronized: true}, instrumentation: false},
    {name: 'retained-opaque', presentation: 'extra', retainSubmissions: true, opaqueBackground: true, noClear: true, instrumentation: false},
    {name: 'extra-uninstrumented-end', presentation: 'extra', instrumentation: false},
  ] : kind === 'transport' ? [
    {name: 'extra-start', presentation: 'extra'},
    {name: 'single-opaque-canvas', presentation: 'extra', workload: 'single-canvas'},
    {name: 'single-image-bitmap', presentation: 'extra', workload: 'single-bitmap'},
    {name: 'small-region', presentation: 'extra', workload: 'small-region'},
    {name: 'extra-desynchronized', presentation: 'extra', stageOptions: {desynchronized: true}},
    {name: 'extra-software-stage', presentation: 'extra', stageOptions: {willReadFrequently: true}},
    {name: 'extra-end', presentation: 'extra'},
  ] : kind === 'workload' ? [
    {name: 'extra-start', presentation: 'extra'},
    {name: 'extra-no-bitmap-paint', presentation: 'extra', workload: 'no-bitmap-paint'},
    {name: 'extra-no-text', presentation: 'extra', workload: 'no-text'},
    {name: 'extra-no-hit-tests', presentation: 'extra', workload: 'no-hit-tests'},
    {name: 'frozen-state-redrawn', presentation: 'extra', freezeState: true},
    {name: 'single-frozen-canvas', presentation: 'extra', workload: 'single-canvas'},
    {name: 'idle-painted-stage', presentation: 'extra', workload: 'idle-stage'},
    {name: 'extra-end', presentation: 'extra'},
    {name: 'extra-cpu-profile', presentation: 'extra', cpuProfile: true},
  ] : kind === 'profiles' ? [
    {name: 'classic-start', presentation: 'classic'},
    {name: 'extra', presentation: 'extra'},
    {name: 'classic-end', presentation: 'classic'},
    {name: 'extra-high-density', presentation: 'extra', width: 2970},
  ] : kind === 'background' ? [
    {name: 'baseline-start'},
    {name: 'no-stars', omit: 'stars'},
    {name: 'static-background', freeze: 'background'},
    {name: 'static-background-no-griddle-blur', freeze: 'background', griddleNoBlur: true},
    {name: 'baseline-end'},
  ] : kind === 'simplifications' ? [
    {name: 'baseline-start'},
    {name: 'static-griddle-steam', freeze: 'griddle-steam'},
    {name: 'griddle-without-blur', griddleNoBlur: true},
    {name: 'static-orders', freeze: 'orders'},
    {name: 'static-glasses', freeze: 'glasses'},
    {name: 'light-decor', omissions: ['griddle-steam', 'dosa-steam', 'glasses', 'traffic', 'radio'], freezes: ['orders']},
    {name: 'audio-suspended', audio: 'suspended'},
    {name: 'audio-running', audio: 'running'},
    {name: 'resolution-75', scale: .75},
    {name: 'resolution-50', scale: .5},
    {name: 'baseline-end'},
  ] : [
    {name: 'baseline-start'}, {name: 'no-orders', omit: 'orders'},
    {name: 'no-griddle-steam', omit: 'griddle-steam'}, {name: 'no-dosa-steam', omit: 'dosa-steam'},
    {name: 'no-glasses', omit: 'glasses'}, {name: 'baseline-middle'},
    {name: 'no-traffic', omit: 'traffic'}, {name: 'no-characters', omit: 'characters'},
    {name: 'no-radio', omit: 'radio'}, {name: 'no-background', omit: 'background'},
    {name: 'no-food', omit: 'food'}, {name: 'baseline-end'},
  ];
  return variants.map(variant => ({width: 2200, mode: 'ranking', warmupMs: 18000, measurementMs: 12000,
    ...(['workload','transport','pipeline','scene'].includes(kind)?{legacyExtra:true}:{}), ...variant}));
}
