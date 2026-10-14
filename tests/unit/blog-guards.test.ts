import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { imageSrcProblem } from '../../scripts/lib/copy-rules';
import { BLOG_CACHE_CONTROL, sameObject } from '../../scripts/lib/r2';

test('only site-relative or media host images are allowed', () => {
  expect(imageSrcProblem('/og/blog/a.png')).toBeNull();
  expect(imageSrcProblem('https://media.midipro.kr/blog/a/01.jpg')).toBeNull();
  expect(imageSrcProblem('https://evil.example/y.jpg')).toMatch(/external image/);
  expect(imageSrcProblem('//evil.example/y.jpg')).toMatch(/external image/);
});

test('blog photos are not cached as immutable', () => expect(BLOG_CACHE_CONTROL).not.toContain('immutable'));

test('sameObject compares content hash, not size', () => {
  const a = Buffer.from('photo-a'), b = Buffer.from('photo-b');
  const md5 = createHash('md5').update(a).digest('hex');
  expect(sameObject(a, `"${md5}"`)).toBe(true);
  expect(sameObject(b, `"${md5}"`)).toBe(false);
  expect(sameObject(a, null)).toBe(false);
});
