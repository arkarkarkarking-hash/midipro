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

// resvg's feTurbulence does not wrap at the tile edge, so blend the tile with a copy
// shifted by half a tile: each copy is weighted to zero where its own seams fall.
export function makeSeamless(px: Uint8Array, w: number, h: number, ch: number): Uint8Array {
  // Horizontal then vertical pass: original weighted sin^2 (1 at centre, 0 at the edges),
  // half-shifted copy weighted 1 - sin^2, so each copy's seam is where its weight is zero.
  const pass = (src: Uint8Array, horizontal: boolean): Uint8Array => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = horizontal ? Math.sin((Math.PI * x) / w) ** 2 : Math.sin((Math.PI * y) / h) ** 2;
        const sx = horizontal ? (x + w / 2) % w : x;
        const sy = horizontal ? y : (y + h / 2) % h;
        for (let c = 0; c < ch; c++) {
          out[(y * w + x) * ch + c] = Math.round(src[(y * w + x) * ch + c] * t + src[(sy * w + sx) * ch + c] * (1 - t));
        }
      }
    }
    return out;
  };
  return pass(pass(px, true), false);
}

export function scratchSvg(seed: number, count: number, opacity: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${scratches(seed, count, opacity)}</svg>`;
}

export async function renderScratches(seed: number, count: number, opacity: number): Promise<Buffer> {
  const png = new Resvg(scratchSvg(seed, count, opacity), { font: { loadSystemFonts: false } }).render().asPng();
  return sharp(png).webp({ quality: 80, alphaQuality: 80, effort: 6 }).toBuffer();
}

// Mottled stains drawn by the browser (no download). Returned as a CSS url() value.
export function blotchCssUrl(blotch: number, seed: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='a' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.01' numOctaves='5' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${(blotch * 2.2).toFixed(3)} 0 0 0 ${(-blotch * 1.0).toFixed(3)}'/></filter><filter id='b' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='5' seed='${seed + 7}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${(blotch * 5).toFixed(3)} 0 0 0 ${(-blotch * 2).toFixed(3)}'/></filter><rect width='100%' height='100%' filter='url(%23a)'/><rect width='100%' height='100%' filter='url(%23b)'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, '%22')}")`;
}

export async function renderTexture(opts: Parameters<typeof textureSvg>[0]): Promise<Buffer> {
  const png = new Resvg(textureSvg(opts), { font: { loadSystemFonts: false } }).render().asPng();
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const seamless = makeSeamless(new Uint8Array(data), info.width, info.height, info.channels);
  return sharp(Buffer.from(seamless), { raw: { width: info.width, height: info.height, channels: info.channels } })
    .resize(480, 480).webp({ quality: 70, smartSubsample: true, effort: 6 }).toBuffer();
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
  if (process.argv.includes('--all')) {
    for (const [name, v] of Object.entries(variants)) {
      const buf = await renderTexture(v);
      writeFileSync(`${out}/metal-${name}.webp`, buf);
      console.log(name, Math.round(buf.length / 1024) + 'KB');
    }
  } else {
    const v = all.worn;
    const buf = await renderScratches(v.seed * 31 + 5, v.scratchCount, v.scratch * 1.15);
    writeFileSync(`${out}/scratches.webp`, buf);
    writeFileSync(new URL('../src/styles/texture.css', import.meta.url),
      `/* generated by scripts/build-texture.ts */\n:root {\n  --tex-blotch: ${blotchCssUrl(v.blotch, v.seed)};\n  --tex-scratch: url('/textures/scratches.webp');\n}\n`);
    console.log('scratches', Math.round(buf.length / 1024) + 'KB');
  }
}
