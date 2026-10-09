import { expect, test } from '@playwright/test';

test('results grouped by school in data order with years, no counts', async ({ page }) => {
  await page.goto('/results');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('입시 결과');
  const schools = await page.locator('[data-school]').allInnerTexts();
  expect(schools).toHaveLength(9);
  expect(schools[0]).toContain('동아방송예술대학교');
  await expect(page.getByText('김민규 (전자음악) 2023')).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(/\d+\s*(곳|건|명)/);
  await expect(page.locator('main a[href^="/music"]')).toHaveCount(0);
});

test('courses show five courses and no prices', async ({ page }) => {
  await page.goto('/courses');
  await expect(page.locator('[data-course]')).toHaveCount(5);
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\d[\d,]*\s*원/);
  expect(text).toContain('수강료는 상담 시 안내합니다');
});

test('contact has phone and no form', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('상담 안내');
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('main a[href="tel:0415583101"]')).toHaveCount(1);
});

test('location has address, hours and map apps', async ({ page }) => {
  await page.goto('/location');
  const main = page.locator('main');
  await expect(main).toContainText('충청남도 천안시 서북구 불당21로 65, 6층');
  await expect(main).toContainText('평일 13:00–22:00');
  await expect(main.locator('a[href^="https://map.naver.com/p/search/"]')).toHaveCount(1);
  await expect(main.locator('a[href^="https://map.kakao.com/link/search/"]')).toHaveCount(1);
});

test('privacy lists processed items', async ({ page }) => {
  await page.goto('/privacy');
  const text = await page.locator('main').innerText();
  for (const w of ['아이디', '이름', '출생연도', '평가 결과', '14세 미만', '2026-10-09']) expect(text).toContain(w);
});

test('unknown page renders branded 404 with player shell', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('페이지를 찾을 수 없습니다');
});
