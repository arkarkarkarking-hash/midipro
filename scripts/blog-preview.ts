// Builds one review page for the week's Naver manuscripts (with copy buttons). The site version is reviewed on the site itself.
// Usage: npx tsx scripts/blog-preview.ts <slug> [<slug> ...] --out <file.html> [--photo-base <prefix>]
//   --photo-base: where NN.jpg live relative to the page (e.g. "" when the page sits in the photo folder, or "photos/<slug>/").
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { naverBodyLength, naverHtml, naverProblems, parseNaver } from './lib/naver';

const ROOT = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const opt = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const out = opt('--out');
const photoBase = opt('--photo-base');
if (!out || args.length === 0) throw new Error('usage: blog-preview.ts <slug> ... --out <file.html> [--photo-base <prefix>]');

const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const CATEGORY: Record<string, string> = { field: '현장', guide: '정보' };

const missing = args.filter((slug) => !existsSync(join(ROOT, 'content/blog/naver', `${slug}.md`)));
if (missing.length) throw new Error(`네이버 원고 없음: ${missing.map((s) => `content/blog/naver/${s}.md`).join(', ')}`);

const sections = args.map((slug, idx) => {
  const n = parseNaver(readFileSync(join(ROOT, 'content/blog/naver', `${slug}.md`), 'utf8'));
  const { errors, warnings } = naverProblems(n, slug);
  const copyHtml = naverHtml(n.body);
  const plain = copyHtml.replace(/<br>/g, '\n').replace(/<\/(p|h2)>/g, '\n\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
  const shown = photoBase === undefined ? copyHtml : copyHtml.replace(/<p>📷 사진 (\d+)<\/p>/g, (_, nn) => `<p><img src="${esc(photoBase)}${nn}.jpg" alt="사진 ${nn}"><br><small>📷 사진 ${nn}</small></p>`);
  const tagText = n.tags.map((t) => `#${t}`).join(' ');

  const sitePath = join(ROOT, 'content/blog', `${slug}.md`);
  let meta = slug;
  if (existsSync(sitePath)) {
    const fm = readFileSync(sitePath, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const f = (k: string) => fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1].trim() ?? '';
    meta = `${f('date')} · ${CATEGORY[f('category')] ?? f('category')}`;
  }
  const status = [...errors.map((e) => `<li class="err">✗ ${esc(e)}</li>`), ...warnings.map((w) => `<li>△ ${esc(w)}</li>`)].join('') || '<li>✓ 검사 통과</li>';
  return {
    data: { t: n.title, g: tagText, b: copyHtml, bp: plain },
    html: `<section class="post"><p class="lab">${esc(meta)} · 본문 ${naverBodyLength(n.body)}자 · 사진 ${n.photos}장</p><ul class="st">${status}</ul>
<div class="box"><p class="lab">제목</p><h1>${esc(n.title)}</h1><button data-i="${idx}" data-k="t">제목 복사</button></div>
<div class="box"><p class="lab">태그</p><p>${esc(tagText)}</p><button data-i="${idx}" data-k="g">태그 복사</button></div>
<div class="box"><p class="lab">본문 — 📷 자리에 같은 번호 사진을 끌어다 놓으세요</p><button data-i="${idx}" data-k="b">본문 복사</button>${shown}</div></section>`,
  };
});

const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>블로그 미리보기</title><style>
:root{--bg:#16171a;--tx:#e8e3d9;--mu:#8e8c87;--rule:rgba(232,227,217,.18);--sig:#F25C2A}
body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.75 -apple-system,"Apple SD Gothic Neo",sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 16px 80px}.lab{font:12px ui-monospace,Menlo,monospace;letter-spacing:.08em;color:var(--mu)}
.post{border-top:1px solid var(--rule);padding-top:20px;margin-bottom:48px}.box{border:1px solid var(--rule);padding:16px;margin:8px 0 16px}button{background:var(--sig);color:#16171a;border:0;font-weight:700;padding:8px 14px;cursor:pointer}
.st{list-style:none;padding:0;font-size:14px}.err{color:var(--sig)}img{max-width:100%;display:block;margin:8px 0}h1{font-size:20px;line-height:1.4}h2{font-size:18px;margin-top:28px}
</style></head><body><main><p class="lab">MIDIPRO · 블로그 미리보기</p>${sections.map((s) => s.html).join('')}</main><script>
const D=${JSON.stringify(sections.map((s) => s.data)).replace(/</g, '\\u003c')};const L={t:'제목 복사',g:'태그 복사',b:'본문 복사'};
document.querySelectorAll('button[data-k]').forEach(b=>b.onclick=async()=>{const d=D[b.dataset.i],k=b.dataset.k;try{if(k==='b')await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([d.b],{type:'text/html'}),'text/plain':new Blob([d.bp],{type:'text/plain'})})]);else await navigator.clipboard.writeText(d[k]);b.textContent='복사됨 ✓';setTimeout(()=>b.textContent=L[k],1500)}catch(e){alert('복사가 막혔어요. 글자를 직접 드래그해서 복사해 주세요.')}});
</script></body></html>`;
writeFileSync(out, page);
console.log(`preview: ${out} (${args.length} post(s))`);
