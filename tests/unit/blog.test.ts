import { describe, expect, test } from 'vitest';
import { BlogFrontmatter, postOgImage, publishedPosts, relatedPosts, type PostMeta } from '../../src/lib/blog';

const post = (slug: string, date: string, category: PostMeta['category'], extra: Partial<PostMeta> = {}): PostMeta => ({
  slug, title: slug, description: 'd', date: new Date(date), category, tags: [], draft: false, ...extra,
});

describe('publishedPosts', () => {
  test('drops drafts and sorts newest first', () => {
    const all = [post('a', '2026-10-19', 'guide'), post('b', '2026-10-23', 'field'), post('c', '2026-10-21', 'guide'), post('d', '2026-10-30', 'guide', { draft: true })];
    expect(publishedPosts(all).map((p) => p.slug)).toEqual(['b', 'c', 'a']);
  });
  test('same date falls back to slug order', () => {
    expect(publishedPosts([post('z', '2026-10-19', 'guide'), post('m', '2026-10-19', 'guide')]).map((p) => p.slug)).toEqual(['m', 'z']);
  });
});

describe('relatedPosts', () => {
  const posts = [post('f1', '2026-10-30', 'field'), post('f2', '2026-10-28', 'field'), post('f3', '2026-10-26', 'field'), post('g1', '2026-10-24', 'guide')];
  test('only guide post has no related', () => expect(relatedPosts(posts, posts[3])).toEqual([]));
  test('same category, excluding self, in order', () => expect(relatedPosts(posts, posts[0]).map((p) => p.slug)).toEqual(['f2', 'f3']));
});

test('postOgImage uses cover or generated image', () => {
  expect(postOgImage(post('a', '2026-10-19', 'guide'))).toBe('/og/blog/a.png');
  const cover = 'https://media.midipro.kr/blog/a/01.jpg';
  expect(postOgImage(post('a', '2026-10-19', 'guide', { cover }))).toBe(cover);
});

describe('BlogFrontmatter', () => {
  const base = { title: '제목', description: '설명', date: '2026-10-19', category: 'guide' };
  test('rejects unknown category', () => expect(BlogFrontmatter.safeParse({ ...base, category: 'notice' }).success).toBe(false));
  test('rejects external cover', () => expect(BlogFrontmatter.safeParse({ ...base, cover: 'https://example.com/x.jpg' }).success).toBe(false));
  test('coerces date and defaults draft/tags', () => {
    const r = BlogFrontmatter.parse(base);
    expect(r.date).toBeInstanceOf(Date);
    expect(r.draft).toBe(false);
    expect(r.tags).toEqual([]);
  });
});
