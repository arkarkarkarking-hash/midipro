import { describe, expect, test } from 'vitest';
import { naverBodyLength, naverProblems, parseNaver } from '../../scripts/lib/naver';

const SLUG = '2026-10-21-test';
const para = (n: number) => '가'.repeat(n);
const doc = (body: string, photos = 2) => `---\ntitle: "[천안 미디학원] 테스트"\ntags: [천안미디학원, 미디입시]\nphotos: ${photos}\n---\n${body}`;
const goodBody = (len = 900) =>
  ['## 하나', para(len - 300), '[[사진 01]]', '## 둘', para(100), '## 셋', para(100), '[[사진 02]]', para(100 - 1 - `https://midipro.kr/blog/${SLUG}`.length), `https://midipro.kr/blog/${SLUG}`].join('\n\n');
const check = (body: string, photos = 2) => naverProblems(parseNaver(doc(body, photos)), SLUG);

test('parseNaver reads front matter', () => {
  const n = parseNaver(doc('본문'));
  expect(n).toMatchObject({ title: '[천안 미디학원] 테스트', tags: ['천안미디학원', '미디입시'], photos: 2 });
  expect(n.body.trim()).toBe('본문');
});

test('naverBodyLength ignores markers and markdown', () => {
  expect(naverBodyLength('## 제목\n\n**굵게** 글\n\n[[사진 01]]')).toBe('제목\n굵게 글'.length);
});

describe('naverProblems', () => {
  test('good manuscript has no errors', () => expect(check(goodBody()).errors).toEqual([]));
  test('banned word 추천 is an error', () => expect(check(goodBody().replace('## 둘', '## 추천')).errors.join()).toContain('추천'));
  test('numeric summary and price are errors', () => {
    expect(check(goodBody() + '\n\n합격 3건').errors.length).toBeGreaterThan(0);
    expect(check(goodBody() + '\n\n월 300,000원').errors.length).toBeGreaterThan(0);
  });
  test('missing photo number is an error', () => expect(check(goodBody().replace('[[사진 02]]', '[[사진 03]]'), 3).errors.join()).toMatch(/사진/));
  test('duplicate photo number is an error', () => expect(check(goodBody().replace('[[사진 02]]', '[[사진 01]]')).errors.join()).toMatch(/사진/));
  test('external link is an error', () => expect(check(goodBody().replace(`https://midipro.kr/blog/${SLUG}`, 'https://blog.naver.com/x')).errors.join()).toMatch(/링크/));
  test('two links is an error', () => expect(check(goodBody() + `\n\nhttps://midipro.kr/blog/${SLUG}`).errors.join()).toMatch(/링크/));
  test('no link is allowed', () => expect(check(goodBody().replace(`https://midipro.kr/blog/${SLUG}`, '')).errors.filter((e) => e.includes('링크'))).toEqual([]));
  test('image markdown is an error', () => expect(check(goodBody() + '\n\n![a](https://media.midipro.kr/blog/x.jpg)').errors.length).toBeGreaterThan(0));
  test('700 chars is an error', () => expect(check(goodBody(700)).errors.join()).toMatch(/글자/));
  test('1300 chars is an error', () => expect(check(goodBody(1300)).errors.join()).toMatch(/글자/));
  test('two subheadings is only a warning', () => {
    const r = check(goodBody().replace('## 셋', '셋'));
    expect(r.errors).toEqual([]);
    expect(r.warnings.join()).toMatch(/소제목/);
  });
});

describe('naverHtml', async () => {
  const { naverHtml } = await import('../../scripts/lib/naver');
  test('headings, paragraphs, bold and photo markers only', () => {
    expect(naverHtml('## 소제목\n\n첫 줄\n둘째 **굵게**\n\n[[사진 01]]')).toBe('<h2>소제목</h2><p>첫 줄<br>둘째 <b>굵게</b></p><p>📷 사진 01</p>');
  });
  test('escapes html and adds no attributes', () => {
    const out = naverHtml('<script>alert(1)</script>\n\nhttps://midipro.kr/blog/x');
    expect(out).toContain('&lt;script&gt;');
    expect(out).not.toMatch(/class=|style=|<a /);
  });
  test('images only with the images option', () => {
    expect(naverHtml('![작업실](https://media.midipro.kr/blog/a/01.jpg)', { images: true })).toBe('<p><img alt="작업실" src="https://media.midipro.kr/blog/a/01.jpg"></p>');
    expect(naverHtml('![작업실](https://media.midipro.kr/blog/a/01.jpg)')).not.toContain('<img');
  });
});
