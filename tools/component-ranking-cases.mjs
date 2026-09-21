// Repeated controls bracket every matrix; all variants are development only.
export function componentRankingCases(kind = 'ranking') {
  const variants = kind === 'background' ? [
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
  return variants.map(variant => ({width: 2200, mode: 'ranking', warmupMs: 18000, measurementMs: 12000, ...variant}));
}
