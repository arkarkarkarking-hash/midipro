// Front-elevation pencil drawing of a studio desk: condenser mic, monitors, console with
// meter bridge, patch bay, keyboard and an outboard rack. Rendered once at build time as SVG.
// Light comes from the top left: right-hand faces are hatched, shadows fall to the right.

const INK = '#e8e3d9';
const SIG = '#f25c2a';
const PAPER = '#16171a';

type Attrs = Record<string, string | number>;
const el = (name: string, a: Attrs, inner = '') =>
  `<${name} ${Object.entries(a).map(([k, v]) => `${k}="${typeof v === 'number' ? +v.toFixed(2) : v}"`).join(' ')}${inner ? `>${inner}</${name}>` : '/>'}`;

// line weights: outline, secondary, detail
const W1 = 1.5, W2 = 0.9, W3 = 0.55;

export function studioDrawingSvg(): string {
  const out: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, w = W2, o = 1, extra: Attrs = {}) =>
    out.push(el('line', { x1, y1, x2, y2, 'stroke-width': w, 'stroke-opacity': o, ...extra }));
  const rect = (x: number, y: number, w: number, h: number, sw = W2, fill = 'none', o = 1, extra: Attrs = {}) =>
    out.push(el('rect', { x, y, width: w, height: h, 'stroke-width': sw, fill, 'stroke-opacity': o, ...extra }));
  const path = (d: string, sw = W2, fill = 'none', o = 1, extra: Attrs = {}) =>
    out.push(el('path', { d, 'stroke-width': sw, fill, 'stroke-opacity': o, ...extra }));
  const circle = (cx: number, cy: number, r: number, sw = W2, fill = 'none', o = 1) =>
    out.push(el('circle', { cx, cy, r, 'stroke-width': sw, fill, 'stroke-opacity': o }));

  const GROUND = 400;

  // ---- construction lines (drafting guides)
  for (const x of [118, 210, 450, 690, 786]) line(x, 40, x, GROUND + 22, W3, 0.12, { 'stroke-dasharray': '3 5' });
  for (const y of [150, 212, 262]) line(20, y, 880, y, W3, 0.1, { 'stroke-dasharray': '3 5' });

  // ---- ground + cast shadows (to the right)
  line(14, GROUND, 886, GROUND, W1, 0.9);
  path(`M690 ${GROUND} L742 ${GROUND} L716 372 L690 372 Z`, 0, 'url(#bp-h2)', 1, { stroke: 'none' });
  path(`M214 ${GROUND} L690 ${GROUND} L700 ${GROUND + 8} L224 ${GROUND + 8} Z`, 0, 'url(#bp-h1)', 0.8, { stroke: 'none' });

  // ---- console desk: front face, right side face (shaded), sloped top
  const dx = 26, dy = -14; // depth offset of the right face
  rect(210, 262, 480, 110, W1);
  path(`M690 262 L${690 + dx} ${262 + dy} L${690 + dx} ${372 + dy} L690 372 Z`, W1, 'url(#bp-h2)');
  path(`M190 262 L232 210 L668 210 L710 262 Z`, W1);
  path(`M710 262 L668 210 L${668 + dx} ${210 + dy} L${710 + dx} ${262 + dy} Z`, W2, 'url(#bp-h1)');
  rect(190, 262, 520, 9, W2, 'url(#bp-h3)');

  // channel strips on the slope: scribble strip, 3 knobs, fader slot + cap
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const xTop = 240 + t * 420, xBot = 204 + t * 492;
    const at = (f: number) => [xTop + (xBot - xTop) * f, 214 + 44 * f] as const;
    const [sx, sy] = at(0.06); rect(sx - 6, sy, 12, 3, W3, 'none', 0.6);
    for (const f of [0.2, 0.34, 0.48]) { const [kx, ky] = at(f); circle(kx, ky, 2.2, W3, 'none', 0.85); line(kx, ky, kx + 1.2, ky - 1.6, W3, 0.85); }
    const [a0x, a0y] = at(0.6), [a1x, a1y] = at(0.95); line(a0x, a0y, a1x, a1y, W3, 0.45);
    const ff = 0.66 + ((i * 7) % 9) / 36; const [fx, fy] = at(ff);
    rect(fx - 3.5, fy - 2, 7, 4, W2, PAPER);
  }

  // meter bridge with four VU meters (needles in signal orange)
  rect(318, 160, 264, 42, W1); rect(318, 160, 264, 42, 0, 'url(#bp-h3)', 1, { stroke: 'none' });
  path(`M582 160 L${582 + dx * 0.6} ${160 + dy * 0.6} L${582 + dx * 0.6} ${202 + dy * 0.6} L582 202 Z`, W2, 'url(#bp-h2)');
  for (let m = 0; m < 4; m++) {
    const x = 328 + m * 63;
    rect(x, 166, 54, 30, W2, PAPER);
    path(`M${x + 7} 190 A 21 21 0 0 1 ${x + 47} 190`, W3, 'none', 0.7);
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.88 - k * 0.095);
      line(x + 27 + Math.cos(a) * 17, 190 - Math.sin(a) * 17, x + 27 + Math.cos(a) * 20, 190 - Math.sin(a) * 20, W3, k > 6 ? 1 : 0.6, k > 6 ? { stroke: SIG } : {});
    }
    const a = Math.PI * (0.64 - m * 0.05);
    line(x + 27, 192, x + 27 + Math.cos(a) * 19, 192 - Math.sin(a) * 19, W2, 1, { stroke: SIG });
  }
  line(318, 202, 318, 210, W2); line(582, 202, 582, 210, W2);

  // front: patch bay (2 × 24 jacks), vents, keyboard drawer
  rect(232, 278, 436, 26, W2);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 24; i++) circle(244 + i * 17.8, 285 + r * 12, 2, W3, 'none', 0.8);
  for (let i = 0; i < 18; i++) line(248 + i * 22, 314, 262 + i * 22, 314, W2, 0.5);
  // keyboard: 3 octaves, black keys hatched
  rect(244, 330, 412, 30, W2, PAPER);
  const KEYS = 21;
  for (let k = 0; k <= KEYS; k++) line(244 + (k * 412) / KEYS, 330, 244 + (k * 412) / KEYS, 360, W3, 0.7);
  for (let k = 0; k < KEYS; k++) {
    if ([0, 1, 3, 4, 5].includes(k % 7)) rect(244 + ((k + 1) * 412) / KEYS - 4, 330, 8, 18, W3, 'url(#bp-h4)');
  }
  // legs
  rect(220, 372, 12, 28, W2, 'url(#bp-h2)'); rect(668, 372, 12, 28, W2, 'url(#bp-h2)');

  // ---- studio monitors on stands
  for (const x of [114, 742]) {
    rect(x, 142, 60, 96, W1);
    path(`M${x + 60} 142 L${x + 74} 134 L${x + 74} 230 L${x + 60} 238 Z`, W2, 'url(#bp-h2)');
    circle(x + 30, 206, 21, W1); circle(x + 30, 206, 15, W3, 'none', 0.7); circle(x + 30, 206, 6, W2, 'url(#bp-h4)');
    circle(x + 30, 163, 8, W2); circle(x + 30, 163, 3, W3);
    line(x + 30, 238, x + 30, 392, 2.2); line(x + 10, GROUND, x + 30, 392, W2); line(x + 50, GROUND, x + 30, 392, W2);
    path(`M${x + 30} ${GROUND} L${x + 62} ${GROUND} L${x + 44} 392 Z`, 0, 'url(#bp-h1)', 0.6, { stroke: 'none' });
  }

  // ---- large-diaphragm condenser mic in a shock mount on a boom stand (far left)
  line(56, GROUND, 56, 168, 1.8); line(40, GROUND, 56, 386, W2); line(72, GROUND, 56, 386, W2);
  line(30, 186, 150, 118, 1.6); rect(22, 182, 14, 12, W2, 'url(#bp-h2)'); // boom + counterweight
  circle(160, 112, 22, W2, 'none', 0.8); // shock-mount ring
  for (const [ax, ay] of [[140, 100], [180, 100], [140, 124], [180, 124]]) line(ax, ay, 160 + (ax - 160) * 0.35, 112 + (ay - 112) * 0.6, W3, 0.7);
  out.push(el('rect', { x: 150, y: 80, width: 20, height: 52, rx: 10, 'stroke-width': W1, fill: 'url(#bp-h5)' }));
  line(150, 104, 170, 104, W2); line(150, 108, 170, 108, W3, 0.7);
  rect(156, 132, 8, 10, W2, 'url(#bp-h2)');

  // ---- 19" outboard rack on the floor (right)
  rect(800, 284, 70, 116, W1);
  path(`M870 284 L884 276 L884 392 L870 400 Z`, W2, 'url(#bp-h2)');
  for (let u = 0; u < 5; u++) {
    const y = 290 + u * 21;
    rect(806, y, 58, 17, W2);
    circle(810, y + 4, 1.4, W3); circle(860, y + 4, 1.4, W3);
    for (let k = 0; k < 4; k++) circle(820 + k * 10, y + 9, 2.6, W3, 'none', 0.85);
    if (u === 1) line(852, y + 6, 858, y + 6, 1.4, 1, { stroke: SIG });
  }

  // ---- dimension line
  line(210, 420, 690, 420, W3, 0.6); line(210, 414, 210, 426, W3, 0.6); line(690, 414, 690, 426, W3, 0.6);
  out.push(el('text', { x: 450, y: 434, 'text-anchor': 'middle', fill: '#85827b', stroke: 'none', 'font-family': 'IBM Plex Mono, monospace', 'font-size': 9, 'letter-spacing': 1.2 }, '1640 MM · 3 OCT'));

  const hatch = (id: string, angle: number, gap: number, op: number, w = 0.6) =>
    `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><line x1="0" y1="0" x2="0" y2="${gap}" stroke="${INK}" stroke-width="${w}" stroke-opacity="${op}"/></pattern>`;
  const defs = `<defs>${hatch('bp-h1', 45, 4, 0.42)}${hatch('bp-h2', 45, 2.6, 0.7, 0.7)}${hatch('bp-h3', -45, 5, 0.28)}${hatch('bp-h4', 0, 2.2, 0.75)}${
    `<pattern id="bp-h5" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0L3 3M3 0L0 3" stroke="${INK}" stroke-width="0.45" stroke-opacity="0.6"/></pattern>`}</defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 440" fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="믹싱 콘솔, 모니터 스피커, 콘덴서 마이크, 건반, 랙 장비를 그린 스튜디오 설계도">${defs}${out.join('')}</svg>`;
}
