// Prepares one post's photos: picks files in order → 네이버용/01.jpg, 02.jpg … (upright, ≤1600px, EXIF/GPS removed),
// optionally blurs faces, and optionally uploads them to R2 as blog/<slug>/NN.jpg.
// Usage:
//   npm run blog:photos -- --src "<재료 폴더>" --slug <slug> --files a.jpg,b.HEIC,c.jpg
//        [--blur a.jpg,b.HEIC] [--nobody c.jpg] [--box "c.jpg=0.06,0,0.42,0.17"] [--upload]
//   --blur:   detect faces (and heads of seated people) and blur them
//   --nobody: blur only detected faces + --box areas (back views, where head guesses would blur hair)
//   --box:    extra area to blur, 0..1 from the top-left; repeatable; implies blur for that file
// Choosing which photos (and whether a face may be shown) is Claude's call from the memo; this script does not decide.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { processPhoto } from './lib/photo';

const ROOT = new URL('..', import.meta.url).pathname;
const BUCKET = 'midipro-audio';
const BASE = (process.env.PUBLIC_MEDIA_BASE ?? 'https://media.midipro.kr').replace(/\/+$/, '');

const argv = process.argv.slice(2);
const one = (k: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
const many = (k: string) => argv.flatMap((a, i) => (a === k ? [argv[i + 1]] : []));
const list = (k: string) => (one(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const src = one('--src');
const slug = one('--slug');
const files = list('--files');
if (!src || !slug || files.length === 0) throw new Error('usage: blog-photos --src <dir> --slug <slug> --files a,b,c [--blur a] [--nobody b] [--box "c=x,y,w,h"] [--upload]');
const missing = files.filter((f) => !existsSync(join(src, f)));
if (missing.length) throw new Error(`not in ${src}: ${missing.join(', ')}`);

const blur = new Set(list('--blur'));
const nobody = new Set(list('--nobody'));
const boxes = new Map<string, string[]>();
for (const b of many('--box')) {
  const [file, box] = b.split('=');
  boxes.set(file, [...(boxes.get(file) ?? []), box]);
}

// Compile the Swift face blur once into node_modules/.cache.
function blurTool(): string {
  const bin = join(ROOT, 'node_modules/.cache/blur-faces');
  const swift = join(ROOT, 'scripts/lib/blur-faces.swift');
  if (!existsSync(bin) || statSync(bin).mtimeMs < statSync(swift).mtimeMs) {
    mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true });
    execFileSync('swiftc', ['-O', swift, '-o', bin], { stdio: 'inherit' });
  }
  return bin;
}

const out = join(src, '네이버용');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'blog-photos-'));

for (const [i, file] of files.entries()) {
  const input = join(src, file);
  const nn = String(i + 1).padStart(2, '0');
  let readable = input;
  if (blur.has(file) || nobody.has(file) || boxes.has(file)) {
    readable = join(tmp, `${nn}-blur.jpg`);
    execFileSync(blurTool(), [input, readable, ...(boxes.get(file) ?? [])], { stdio: 'inherit', env: { ...process.env, ...(nobody.has(file) ? { NOBODY: '1' } : {}) } });
  } else if (/^\.hei[cf]$/i.test(extname(file))) {
    readable = join(tmp, `${nn}.jpg`);
    execFileSync('sips', ['-s', 'format', 'jpeg', input, '--out', readable], { stdio: 'ignore' });
  }
  writeFileSync(join(out, `${nn}.jpg`), await processPhoto(readFileSync(readable)));
  console.log(`${nn}.jpg ← ${file}`);
}
rmSync(tmp, { recursive: true, force: true });

if (argv.includes('--upload')) {
  for (const f of readdirSync(out).filter((f) => f.endsWith('.jpg')).sort()) {
    const key = `blog/${slug}/${f}`;
    const local = join(out, f);
    const head = await fetch(`${BASE}/${key}`, { method: 'HEAD' });
    if (head.ok && Number(head.headers.get('content-length')) === statSync(local).size) continue;
    execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', local,
      '--content-type', 'image/jpeg', '--cache-control', 'public, max-age=31536000, immutable', '--remote'], { stdio: 'inherit' });
  }
  for (const f of readdirSync(out).filter((f) => f.endsWith('.jpg')).sort()) console.log(`${BASE}/blog/${slug}/${f}`);
}
