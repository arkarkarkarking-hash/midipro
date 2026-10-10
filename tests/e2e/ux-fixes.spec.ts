import { expect, test } from '@playwright/test';

test('every track row has a visible play button on mobile', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone');
  await page.goto('/music');
  const first = page.locator('[data-track-row]').first().getByRole('button', { name: /재생/ });
  await expect(first).toBeVisible();
  const box = await first.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(36);
  expect(box!.height).toBeGreaterThanOrEqual(36);
});

test('queue sheet lists the current list and switches tracks', async ({ page }) => {
  await page.goto('/music');
  const rows = page.locator('#admissions [data-track-row]');
  const total = await rows.count();
  await rows.first().getByRole('button', { name: /재생/ }).click();
  await page.getByRole('button', { name: '재생 목록' }).click();
  const sheet = page.getByRole('dialog', { name: '재생 목록' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-queue-item]')).toHaveCount(total);
  const third = sheet.locator('[data-queue-item]').nth(2);
  const slug = await third.getAttribute('data-slug');
  await third.click();
  await expect.poll(() => page.evaluate(() => (document.querySelector('audio') as HTMLAudioElement).src)).toContain(`${slug}.mp3`);
  await expect(sheet.getByRole('link', { name: '음원 전체 보기' })).toHaveAttribute('href', '/music');
});

test('location page shows the address only once', async ({ page }) => {
  await page.goto('/location');
  const text = await page.locator('body').innerText();
  expect(text.split('불당21로 65').length - 1).toBe(1);
  expect(text.split('13:00–22:00').length - 1).toBe(1);
});

test('footer is a plain strip, not a rack module', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer.site-footer');
  await expect(footer).toBeVisible();
  await expect(footer.locator('.screw')).toHaveCount(0);
});
