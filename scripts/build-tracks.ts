// Scans audio/ and updates src/data/tracks.json + src/data/peaks/*.json.
// Existing entries keep their slug/title/etc.; duration and peaks are always recomputed.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from 'music-metadata';
import { MPEGDecoder } from 'mpg123-decoder';
import { parseFilename, type ParsedTrack } from './lib/parse-filename';
import { romanizeName, romanizeText } from './lib/romanize';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = [
  { dir: '입시곡', category: 'admissions' as const },
  { dir: '송캠프', category: 'songcamp' as const },
];
const SEASON: Record<string, string> = { 상반기: 'h1', 하반기: 'h2', '1분기': 'q1', '2분기': 'q2', '3분기': 'q3', '4분기': 'q4' };
const PEAKS = 120;

type Track = ParsedTrack & { slug: string; file: string; duration: number; featured: boolean; links: Record<string, string>; sourceFile: string };

function baseSlug(p: ParsedTrack, fileName: string): string {
  if (p.category === 'admissions') {
    const kind = /_(수시|정시)\.mp3$/.exec(fileName)?.[1];
    return `${p.year}-${romanizeName(p.artists[0])}${kind === '수시' ? '-susi' : kind === '정시' ? '-jeongsi' : ''}`;
  }
  const prefix = p.label === '싸이퍼' ? 'cypher' : p.label === '성인 송캠프' ? 'songcamp-adult' : 'songcamp';
  return `${prefix}-${p.year}-${SEASON[p.season ?? ''] ?? 'x'}-${romanizeText(p.title) || 'untitled'}`;
}

async function analyze(path: string): Promise<{ duration: number; peaks: number[] }> {
  const meta = await parseFile(path);
  const decoder = new MPEGDecoder();
  await decoder.ready;
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(readFileSync(path)));
  decoder.free();
  const ch = channelData[0];
  const duration = Math.round(meta.format.duration ?? ch.length / sampleRate);
  const size = Math.floor(ch.length / PEAKS);
  const rms = Array.from({ length: PEAKS }, (_, i) => {
    let sum = 0;
    for (let j = i * size; j < (i + 1) * size; j++) sum += ch[j] * ch[j];
    return Math.sqrt(sum / Math.max(size, 1));
  });
  const max = Math.max(...rms, 1e-9);
  return { duration, peaks: rms.map((v) => Math.round((v / max) * 1000) / 1000) };
}

const tracksPath = join(ROOT, 'src/data/tracks.json');
const existing: Track[] = existsSync(tracksPath) ? JSON.parse(readFileSync(tracksPath, 'utf8')) : [];
const bySource = new Map(existing.map((t) => [t.sourceFile, t]));
const used = new Set(existing.map((t) => t.slug));
mkdirSync(join(ROOT, 'src/data/peaks'), { recursive: true });

const result: Track[] = [];
let added = 0;
for (const { dir, category } of DIRS) {
  for (const fileName of readdirSync(join(ROOT, 'audio', dir)).filter((f) => f.endsWith('.mp3')).sort()) {
    const sourceFile = `${dir}/${fileName}`;
    let track = bySource.get(sourceFile);
    if (!track) {
      const parsed = parseFilename(category, fileName);
      let slug = baseSlug(parsed, fileName);
      for (let n = 2; used.has(slug); n++) slug = `${baseSlug(parsed, fileName)}-${n}`;
      used.add(slug);
      track = { slug, ...parsed, file: `${category}/${slug}.mp3`, duration: 0, featured: false, links: {}, sourceFile };
      added++;
    }
    const { duration, peaks } = await analyze(join(ROOT, 'audio', sourceFile));
    track.duration = duration;
    writeFileSync(join(ROOT, 'src/data/peaks', `${track.slug}.json`), JSON.stringify(peaks));
    result.push(track);
  }
}

result.sort((a, b) => b.year - a.year || (a.category === b.category ? 0 : a.category === 'admissions' ? -1 : 1) || a.title.localeCompare(b.title, 'ko'));
if (!result.some((t) => t.featured)) {
  const first = result.find((t) => t.category === 'admissions');
  if (first) first.featured = true;
}
writeFileSync(tracksPath, JSON.stringify(result, null, 2) + '\n');
console.log(`${result.length} tracks (${added} new)`);
