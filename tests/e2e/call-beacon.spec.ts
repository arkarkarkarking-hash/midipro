import { expect, test } from '@playwright/test';

test('tapping the phone keycap sends an anonymous beacon', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone');
  await page.addInitScript(() => {
    (window as any).__beacons = [];
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      (data as Blob).text().then((t) => (window as any).__beacons.push({ url: String(url), body: t }));
      return true;
    };
  });
  await page.route('tel:*', (r) => r.abort());
  await page.goto('/courses');
  await page.locator('.bottombar a[href^="tel:"]').click({ noWaitAfter: true }).catch(() => {});
  await expect.poll(() => page.evaluate(() => (window as any).__beacons.length)).toBe(1);
  const [b] = await page.evaluate(() => (window as any).__beacons);
  expect(b.url).toBe('/api/call');
  expect(JSON.parse(b.body)).toEqual({ path: '/courses', ref: '' });
});
