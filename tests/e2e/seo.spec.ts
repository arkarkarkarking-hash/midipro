import { expect, test } from '@playwright/test';

test('head has canonical, og and json-ld', async ({ request }) => {
  const html = await (await request.get('/results')).text();
  expect(html).toContain('<link rel="canonical" href="https://midipro.kr/results">');
  expect(html).toContain('property="og:image"');
  expect(html).toContain('"MusicSchool"');
  expect(html).toContain('"BreadcrumbList"');
  expect(html).toContain('<meta name="theme-color" content="#16171a">');
});

test('robots and sitemap', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /admin');
  expect(robots).toContain('Sitemap: https://midipro.kr/sitemap-index.xml');
  const sm = await (await request.get('/sitemap-0.xml')).text();
  expect(sm).toContain('https://midipro.kr/music/songcamp-2024-h2-janhyang');
  expect(sm).not.toContain('/teachers');
  expect(sm).not.toContain('/404');
});

test('rss lists blog posts and tracks, newest 30, no trailing slash', async ({ request }) => {
  const rss = await (await request.get('/rss.xml')).text();
  expect((rss.match(/<item>/g) ?? []).length).toBe(30);
  expect(rss).toContain('https://midipro.kr/music/');
  expect(rss).not.toMatch(/<link>https:\/\/midipro\.kr\/[^<]+\/<\/link>/);
});
