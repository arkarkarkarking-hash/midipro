// Outlines the MIDIPRO wordmark (Jost 500, tracking 0.42em) and the "M" mark into font-free SVGs.
import { readFileSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';

const ROOT = new URL('..', import.meta.url).pathname;
const buf = readFileSync(`${ROOT}node_modules/@fontsource/jost/files/jost-latin-500-normal.woff`);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const SIZE = 100;
const TRACK = 0.42 * SIZE;

function outline(text: string, tracking: number) {
  let x = 0;
  const parts: string[] = [];
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    parts.push(g.getPath(x, SIZE * 0.8, SIZE).toPathData(2));
    x += (g.advanceWidth ?? 0) * (SIZE / font.unitsPerEm) + tracking;
  }
  const width = x - tracking;
  return { d: parts.join(''), width };
}

const word = outline('MIDIPRO', TRACK);
const vbH = SIZE * 0.8;
writeFileSync(`${ROOT}src/assets/logo.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${SIZE * 0.06} ${Math.ceil(word.width)} ${vbH - SIZE * 0.06}" role="img" aria-label="MIDIPRO"><path fill="currentColor" d="${word.d}"/></svg>\n`);

const m = outline('M', 0);
const box = 100;
const scale = 0.62 * box / m.width;
const tx = (box - m.width * scale) / 2;
const ty = (box - SIZE * 0.72 * scale) / 2 - SIZE * 0.08 * scale;
writeFileSync(`${ROOT}src/assets/mark.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" role="img" aria-label="MIDIPRO"><path fill="currentColor" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})" d="${m.d}"/></svg>\n`);
console.log('logo width', Math.round(word.width));
