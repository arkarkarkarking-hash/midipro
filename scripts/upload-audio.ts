// Uploads every track in src/data/tracks.json to the R2 bucket, skipping files already there with the same size.
// Requires `npx wrangler login` and PUBLIC_MEDIA_BASE (the bucket's public URL) in the environment.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const BUCKET = 'midipro-audio';
const base = process.env.PUBLIC_MEDIA_BASE?.replace(/\/+$/, '');
if (!base) throw new Error('PUBLIC_MEDIA_BASE is not set');

const tracks: { file: string; sourceFile: string }[] = JSON.parse(readFileSync(join(ROOT, 'src/data/tracks.json'), 'utf8'));
let uploaded = 0;
let skipped = 0;
for (const t of tracks) {
  const local = join(ROOT, 'audio', t.sourceFile);
  const head = await fetch(`${base}/${t.file}`, { method: 'HEAD' });
  if (head.ok && Number(head.headers.get('content-length')) === statSync(local).size) {
    skipped++;
    continue;
  }
  execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${t.file}`, '--file', local,
    '--content-type', 'audio/mpeg', '--cache-control', 'public, max-age=31536000, immutable', '--remote'], { stdio: 'inherit' });
  uploaded++;
}
console.log(`uploaded ${uploaded}, skipped ${skipped}`);
