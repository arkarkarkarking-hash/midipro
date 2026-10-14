// Post-build SEO and copy checks over dist/**/*.html. Exits 1 on any problem.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'node-html-parser';
import { BANNED, NUMERIC_SUMMARY } from './lib/copy-rules';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const tracks: { title: string; team?: string }[] = JSON.parse(readFileSync(join(ROOT, 'src/data/tracks.json'), 'utf8'));
const site = JSON.parse(readFileSync(join(ROOT, 'src/data/site.json'), 'utf8'));
// Track titles and team names are student work, not site copy: exempt them from the word ban.
const exempt = [...new Set(tracks.flatMap((t) => [t.title, t.team ?? '']).filter(Boolean))].sort((a, b) => b.length - a.length);
const PRIVATE = ['/admin', '/my', '/login'];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });

const problems: string[] = [];
const titles = new Map<string, string>();
const pages = walk(DIST);

for (const file of pages) {
  const rel = '/' + relative(DIST, file);
  const raw = readFileSync(file, 'utf8');
  const doc = parse(raw);
  const is404 = rel === '/404.html';
  const noindex = !!doc.querySelector('meta[name="robots"][content*="noindex"]');
  const fail = (msg: string) => problems.push(`${rel}: ${msg}`);

  if (/localhost|127\.0\.0\.1/.test(raw)) fail('contains a localhost URL');
  const title = doc.querySelector('title')?.text.trim();
  if (!title) fail('missing <title>');
  if (!is404) {
    if (!doc.querySelector('meta[name="description"]')?.getAttribute('content')) fail('missing meta description');
    if (!doc.querySelector('link[rel="canonical"]')) fail('missing canonical');
    if (!doc.querySelector('meta[property="og:image"]')) fail('missing og:image');
    if (title && !noindex) {
      if (titles.has(title)) fail(`duplicate title with ${titles.get(title)}`);
      titles.set(title, rel);
    }
  }

  const main = doc.querySelector('main');
  let text = main?.text ?? '';
  for (const e of exempt) text = text.split(e).join('');
  for (const w of BANNED) if (text.includes(w)) fail(`banned word "${w}"`);
  if (NUMERIC_SUMMARY.test(text)) fail('numeric result summary');

  if (!noindex) for (const a of doc.querySelectorAll('a[href]')) if (PRIVATE.some((p) => a.getAttribute('href') === p) && !a.hasAttribute('data-account-link')) fail(`links to private ${a.getAttribute('href')}`);
  for (const img of doc.querySelectorAll('img')) if (!img.hasAttribute('alt')) fail('img without alt');
}

const home = parse(readFileSync(join(DIST, 'index.html'), 'utf8')).text;
for (const must of [site.address, site.phone, '곡으로 합격을']) if (!home.includes(must)) problems.push(`/index.html: missing static text "${must}"`);
const homeTracks = tracks.filter((t) => home.includes(t.title)).length;
if (homeTracks < 4) problems.push(`/index.html: only ${homeTracks} track titles in static HTML`);

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`check-build: ${problems.length} problems`);
  process.exit(1);
}
console.log(`check-build: 0 problems in ${pages.length} pages`);
