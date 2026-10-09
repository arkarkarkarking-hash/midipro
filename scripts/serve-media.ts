// Dev-only stand-in for the R2 bucket: serves audio/<sourceFile> at /<file> with Range support.
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = Number(process.env.MEDIA_PORT ?? 4322);
const tracks: { file: string; sourceFile: string }[] = JSON.parse(readFileSync(join(ROOT, 'src/data/tracks.json'), 'utf8'));
const map = new Map(tracks.map((t) => [`/${t.file}`, join(ROOT, 'audio', t.sourceFile)]));

createServer((req, res) => {
  const path = map.get(decodeURIComponent((req.url ?? '').split('?')[0]));
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!path) return res.writeHead(404).end();
  const size = statSync(path).size;
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { 'Content-Type': 'audio/mpeg', 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' });
    return req.method === 'HEAD' ? res.end() : createReadStream(path, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': size, 'Accept-Ranges': 'bytes' });
  return req.method === 'HEAD' ? res.end() : createReadStream(path).pipe(res);
}).listen(PORT, () => console.log(`media on http://localhost:${PORT}`));
