import { expect, test } from '@playwright/test';

test('home copy, slogan and no forbidden words or counts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('곡으로 합격을만드는 학원.');
  const text = await page.locator('main').innerText();
  for (const w of ['합격곡', '1등', '최고']) expect(text).not.toContain(w);
  expect(text).not.toMatch(/\d+\s*(곳|건|명)/);
  expect(text).toContain('그렇게 만든 입시곡을 그대로 공개합니다.');
  await expect(page.getByText('빛나는 곳에서 연주하기보단 내가 연주하는 곳이 빛나게 되길')).toBeVisible();
  await expect(page.locator('main').getByText('동아방송예술대학교')).toBeVisible();
});

test('music page lists all 78 tracks in HTML with category sections', async ({ request }) => {
  const html = await (await request.get('/music')).text();
  expect((html.match(/<li data-track-row/g) ?? []).length).toBe(78);
  expect(html).toContain('id="admissions"');
  expect(html).toContain('id="songcamp"');
});

test('track page has title, waveform, and no results link', async ({ page }) => {
  await page.goto('/music/2025-kim-seungyeon');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('김승연 입시곡');
  await expect(page.locator('[data-waveform="2025-kim-seungyeon"]')).toHaveCount(1);
  await expect(page.locator('main a[href^="/results"]')).toHaveCount(0);
});

test('songcamp track page shows team and members', async ({ page }) => {
  await page.goto('/music/songcamp-2024-h2-janhyang');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('잔향');
  await expect(page.locator('main')).toContainText('무드먼트');
  await expect(page.locator('main')).toContainText('이성민');
});
