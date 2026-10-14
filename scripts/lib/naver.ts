// Naver manuscript (content/blog/naver/<slug>.md): parse and check.
import { copyProblems, NAVER_BANNED } from './copy-rules';

export interface NaverDoc { title: string; tags: string[]; photos: number; body: string }

export const MIN_LENGTH = 800;
export const MAX_LENGTH = 1200;
const PHOTO = /^\[\[사진 (\d+)\]\]$/gm;

export function parseNaver(src: string): NaverDoc {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('머리말(---)이 없습니다');
  const [, fm, body] = m;
  const field = (k: string) => fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1].trim() ?? '';
  const title = field('title').replace(/^"(.*)"$/, '$1');
  const tags = field('tags').replace(/^\[|\]$/g, '').split(',').map((t) => t.trim()).filter(Boolean);
  return { title, tags, photos: Number(field('photos')) || 0, body };
}

// Characters a reader sees: spaces and single line breaks count; photo markers and markdown symbols don't.
export const naverBodyLength = (body: string): number =>
  body.replace(PHOTO, '').replace(/^## /gm, '').replaceAll('**', '').replace(/\s*\n\s*/g, '\n').trim().length;

export function naverProblems(n: NaverDoc, slug: string): { errors: string[]; warnings: string[] } {
  const errors = copyProblems(`${n.title}\n${n.tags.join(' ')}\n${n.body}`, NAVER_BANNED);
  const warnings: string[] = [];
  if (!n.title) errors.push('제목이 없습니다');

  const links = n.body.match(/https?:\/\/[^\s)]+/g) ?? [];
  const home = `https://midipro.kr/blog/${slug}`;
  if (links.length > 1) errors.push(`링크는 1개까지 (${links.length}개)`);
  else if (links.length === 1 && links[0] !== home) errors.push(`링크는 ${home} 만 허용 (${links[0]})`);
  if (n.body.includes('![')) errors.push('이미지 마크다운(![) 대신 [[사진 NN]] 자리 표시를 쓰세요');

  const nums = [...n.body.matchAll(PHOTO)].map((m) => Number(m[1]));
  const want = Array.from({ length: n.photos }, (_, i) => i + 1);
  if (nums.length !== new Set(nums).size || [...nums].sort((a, b) => a - b).join() !== want.join())
    errors.push(`사진 자리 [${nums.join(', ')}] ≠ photos: ${n.photos} (01~${String(n.photos).padStart(2, '0')}을 한 번씩)`);

  const len = naverBodyLength(n.body);
  if (len < MIN_LENGTH || len > MAX_LENGTH) errors.push(`본문 글자 수 ${len}자 (${MIN_LENGTH}~${MAX_LENGTH}자 필수)`);
  const heads = (n.body.match(/^## /gm) ?? []).length;
  if (heads < 3 || heads > 4) warnings.push(`소제목 ${heads}개 (권장 3~4개)`);
  return { errors, warnings };
}

const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Clean HTML for pasting into Naver SmartEditor: only <h2> <p> <b> <br> (and <img> for the site preview), no attributes besides img src/alt.
export function naverHtml(body: string, opts: { images?: boolean } = {}): string {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const b = block.trim();
      const photo = b.match(/^\[\[사진 (\d+)\]\]$/);
      if (photo) return `<p>📷 사진 ${photo[1]}</p>`;
      const img = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (img && opts.images) return `<p><img alt="${esc(img[1])}" src="${esc(img[2])}"></p>`;
      if (b.startsWith('## ')) return `<h2>${esc(b.slice(3))}</h2>`;
      const lines = b.split('\n').map((l) => esc(l.trim().replace(/^- /, '• ')).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'));
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}
