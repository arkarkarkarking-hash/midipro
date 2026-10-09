// Outlines the MIDIPRO wordmark (Jost 500, tracking 0.42em) and the "M" mark into font-free SVGs.
// Glyph x offsets are rounded to 2 decimals: opentype.js's toPathData emitted NaN
// for some long float offsets (e.g. 377.40000000000003).
import { readFileSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';

const ROOT = new URL('..', import.meta.url).pathname;
const buf = readFileSync(`${ROOT}node_modules/@fontsource/jost/files/jost-latin-500-normal.woff`);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const SIZE = 100;
const BASELINE = SIZE * 0.8;

function outline(text: string, tracking: number) {
  let x = 0;
  const parts: string[] = [];
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    const d = g.getPath(Math.round(x * 100) / 100, BASELINE, SIZE).toPathData(2);
    if (/NaN|undefined/.test(d)) throw new Error(`bad outline for ${ch}`);
    parts.push(d);
    x += (g.advanceWidth ?? 0) * (SIZE / font.unitsPerEm) + tracking;
  }
  return { d: parts.join(''), width: x - tracking };
}

const word = outline('MIDIPRO', 0.42 * SIZE);
const top = SIZE * 0.08;
writeFileSync(`${ROOT}src/assets/logo.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top} ${Math.ceil(word.width)} ${BASELINE - top}" role="img" aria-label="MIDIPRO"><path fill="currentColor" d="${word.d}"/></svg>\n`);

const m = outline('M', 0);
const box = 100;
const scale = (0.62 * box) / m.width;
const capH = BASELINE - SIZE * 0.065;
const tx = (box - m.width * scale) / 2;
const ty = (box - capH * scale) / 2 - SIZE * 0.065 * scale;
writeFileSync(`${ROOT}src/assets/mark.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" role="img" aria-label="MIDIPRO"><path fill="currentColor" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})" d="${m.d}"/></svg>\n`);
console.log('logo width', Math.round(word.width));
