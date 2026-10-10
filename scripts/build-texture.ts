// Generates seamless worn black-metal texture tiles (our own artwork, no stock images).
// Layers: large mottled blotches + medium grain + fine dust + faint multi-directional scratches.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const SIZE = 640;

function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function scratches(seed: number, count: number, opacity: number): string {
  const r = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = r() * SIZE, y = r() * SIZE;
    const len = 20 + r() ** 2 * 220;
    const a = (r() < 0.55 ? -0.35 + r() * 0.3 : r() * Math.PI);
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const light = r() < 0.7;
    const o = (opacity * (0.3 + r() * 0.7)).toFixed(3);
    const w = (0.4 + r() * 0.8).toFixed(2);
    // draw wrapped copies so the tile stays seamless
    for (const dx of [-SIZE, 0, SIZE]) for (const dy of [-SIZE, 0, SIZE])
      out.push(`<line x1="${(x + dx).toFixed(1)}" y1="${(y + dy).toFixed(1)}" x2="${(x2 + dx).toFixed(1)}" y2="${(y2 + dy).toFixed(1)}" stroke="${light ? '#fff' : '#000'}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`);
  }
  return out.join('');
}

export function textureSvg(opts: { base: string; blotch: number; grain: number; scratch: number; scratchCount: number; seed: number }): string {
  const { base, blotch, grain, scratch, scratchCount, seed } = opts;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <defs>
    <filter id="blotch" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="6" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${blotch * 2.2} 0 0 0 ${-blotch * 1.0}"/></filter>
    <filter id="dark" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="5" seed="${seed + 7}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${blotch * 5.0} 0 0 0 ${-blotch * 2.0}"/></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="${seed + 3}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${grain * 4} 0 0 0 ${-grain * 1.7}"/></filter>
    <filter id="mid" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="3" seed="${seed + 11}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${grain * 3.2} 0 0 0 ${-grain * 1.3}"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="${base}"/>
  <rect width="100%" height="100%" filter="url(#blotch)"/>
  <rect width="100%" height="100%" filter="url(#dark)"/>
  <rect width="100%" height="100%" filter="url(#mid)"/>
  <rect width="100%" height="100%" filter="url(#grain)"/>
  ${scratches(seed * 31 + 5, scratchCount, scratch)}
</svg>`;
}

export async function renderTexture(opts: Parameters<typeof textureSvg>[0]): Promise<Buffer> {
  const png = new Resvg(textureSvg(opts), { font: { loadSystemFonts: false } }).render().asPng();
  return sharp(png).webp({ quality: 72, smartSubsample: true, effort: 6 }).toBuffer();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'public/textures';
  mkdirSync(out, { recursive: true });
  const all = {
    subtle: { base: '#141416', blotch: 0.10, grain: 0.05, scratch: 0.05, scratchCount: 60, seed: 4 },
    worn: { base: '#151517', blotch: 0.18, grain: 0.08, scratch: 0.09, scratchCount: 140, seed: 4 },
    heavy: { base: '#161618', blotch: 0.28, grain: 0.11, scratch: 0.14, scratchCount: 260, seed: 4 },
  };
  // The site uses "worn" (chosen 2026-10-10); pass --all to render every variant for comparison.
  const variants = process.argv.includes('--all') ? all : { worn: all.worn };
  for (const [name, v] of Object.entries(variants)) {
    const buf = await renderTexture(v);
    writeFileSync(`${out}/metal-${name}.webp`, buf);
    console.log(name, Math.round(buf.length / 1024) + 'KB');
  }
}
