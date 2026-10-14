import { expect, test } from '@playwright/test';

const SLUG = '2026-10-14-mock-exam-august';
const TITLE = '8월 미디 입시 모의고사 — 실제 입시처럼 치러 본 하루';

test('blog list shows cards and filters by category', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('블로그');
  const cards = page.locator('[data-post]');
  expect(await cards.count()).toBeGreaterThanOrEqual(1);
  await expect(page.locator(`[data-post][href="/blog/${SLUG}"]`)).toContainText('2026.10.14');
  await expect(page.locator(`[data-post][href="/blog/${SLUG}"]`)).toContainText(TITLE);
  for (const name of ['전체', '현장', '정보']) await expect(page.getByRole('button', { name })).toBeVisible();
  await page.getByRole('button', { name: '정보' }).click();
  await expect(page.locator('[data-post][data-category="field"]:visible')).toHaveCount(0);
  await page.getByRole('button', { name: '현장' }).click();
  await expect(page.locator('[data-post][data-category="guide"]:visible')).toHaveCount(0);
  await expect(page.locator(`[data-post][href="/blog/${SLUG}"]`)).toBeVisible();
  await page.getByRole('button', { name: '전체' }).click();
  await expect(page.locator('[data-post]:visible')).toHaveCount(await cards.count());
});

test('blog post page has heading, call button, OG image and BlogPosting', async ({ page }) => {
  await page.goto(`/blog/${SLUG}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
  await expect(page.locator('main a[href="tel:0415583101"]')).toHaveCount(1);
  expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(`https://media.midipro.kr/blog/${SLUG}/01.jpg`);
  await expect(page.locator('main article img')).toHaveCount(5);
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('');
  expect(ld).toContain('"BlogPosting"');
  await expect(page.getByRole('navigation', { name: '위치' })).toContainText('블로그');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('every listed post (and only those) is in sitemap and RSS', async ({ page, request }) => {
  await page.goto('/blog');
  const listed = (await page.locator('[data-post]').evaluateAll((els) => els.map((e) => e.getAttribute('href')))).sort();
  const blogUrls = (xml: string) => [...new Set([...xml.matchAll(/https:\/\/midipro\.kr(\/blog\/[^<"\s]+)/g)].map((m) => m[1]))].sort();
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(blogUrls(sitemap)).toEqual(listed);
  const rss = await (await request.get('/rss.xml')).text();
  expect(blogUrls(rss)).toEqual(listed);
  expect(rss).toContain('<title>미디프로실용음악학원</title>');
  const og = await request.get(`/og/blog/${SLUG}.png`);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('first post is published', async ({ request }) => {
  expect((await request.get('/blog/2026-10-14-blog-start')).status()).toBe(200);
});
