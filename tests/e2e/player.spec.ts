import { expect, test } from '@playwright/test';

const audioState = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const el = document.querySelector('audio') as HTMLAudioElement;
    return { paused: el.paused, t: el.currentTime, src: el.src };
  });

test('no autoplay before user gesture', async ({ page }) => {
  await page.goto('/');
  expect((await audioState(page)).paused).toBe(true);
});

test('playback survives five navigations and back', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'navigation uses the desktop side nav');
  await page.goto('/music');
  await page.locator('[data-play-list]').first().click();
  await expect(page.getByTestId('mini-player')).toContainText('입시곡');
  await page.waitForFunction(() => (document.querySelector('audio') as HTMLAudioElement).currentTime > 0.3);
  const t0 = (await audioState(page)).t;
  const nav = page.getByRole('navigation', { name: '주 메뉴' });
  for (const label of ['입시 결과', '과정 소개', '오시는 길', '상담 안내', '음원']) {
    await nav.getByRole('link', { name: label }).click();
    await page.waitForURL(/./);
  }
  await page.goBack();
  const a = await audioState(page);
  expect(a.paused).toBe(false);
  expect(a.t).toBeGreaterThan(t0);
});

test('broken source shows error message and stays put', async ({ page }) => {
  await page.route('**/*.mp3', (r) => r.abort());
  await page.goto('/music');
  const first = await page.locator('[data-play-list]').first();
  await first.click();
  await expect(page.getByTestId('mini-player')).toContainText('재생할 수 없습니다');
});
