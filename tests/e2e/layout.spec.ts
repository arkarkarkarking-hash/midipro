import { expect, test } from '@playwright/test';

test('mobile layout has fixed call keycap and no horizontal scroll', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone');
  await page.goto('/');
  const call = page.locator('.bottombar').getByRole('link', { name: '전화 상담' });
  await expect(call).toHaveAttribute('href', 'tel:0415583101');
  await expect(call).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('desktop shows side nav with every visible NAV item and hides teachers', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: '주 메뉴' });
  for (const label of ['홈', '입시 결과', '과정 소개', '음원', '오시는 길', '상담 안내'])
    await expect(nav.getByRole('link', { name: label })).toBeVisible();
  await expect(page.getByRole('link', { name: '강사진' })).toHaveCount(0);
});
