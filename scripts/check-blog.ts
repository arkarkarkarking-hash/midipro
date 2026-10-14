// Checks Naver manuscripts (content/blog/naver/*.md) and their site twins before preview. Exits 1 on any error.
// Usage: npm run check:blog [-- content/blog/naver/<slug>.md ...]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { BANNED, copyProblems } from './lib/copy-rules';
import { naverProblems, parseNaver } from './lib/naver';

const ROOT = new URL('..', import.meta.url).pathname;
const NAVER = join(ROOT, 'content/blog/naver');
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(NAVER).filter((f) => f.endsWith('.md')).map((f) => join(NAVER, f));

let failed = 0;
for (const file of files) {
  const slug = basename(file, '.md');
  let errors: string[] = [];
  let warnings: string[] = [];
  try {
    ({ errors, warnings } = naverProblems(parseNaver(readFileSync(file, 'utf8')), slug));
  } catch (e) {
    errors = [(e as Error).message];
  }
  const site = join(ROOT, 'content/blog', `${slug}.md`);
  if (!existsSync(site)) errors.push(`홈페이지 원고 없음: content/blog/${slug}.md`);
  else errors.push(...copyProblems(readFileSync(site, 'utf8'), BANNED).map((p) => `홈페이지 원고: ${p}`));
  if (errors.length) failed++;
  console.log(`${errors.length ? '✗' : '✓'} ${slug}`);
  for (const e of errors) console.log(`   error   ${e}`);
  for (const w of warnings) console.log(`   warning ${w}`);
}
console.log(`check-blog: ${failed} of ${files.length} manuscript(s) with errors`);
process.exit(failed ? 1 : 0);
