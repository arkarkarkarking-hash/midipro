import { expect, test } from 'vitest';
import { CATEGORY_LABEL, getPeaks, getTrack, getTracks } from '../../src/lib/tracks';

test('catalog has 78 unique url-safe tracks with durations and peaks', () => {
  const t = getTracks();
  expect(t).toHaveLength(78);
  expect(new Set(t.map((x) => x.slug)).size).toBe(78);
  for (const x of t) {
    expect(x.slug).toMatch(/^[a-z0-9-]+$/);
    expect(x.duration).toBeGreaterThan(30);
    expect(getPeaks(x.slug)).toHaveLength(120);
  }
});

test('never says 합격 and keeps Korean titles', () => {
  expect(JSON.stringify(getTracks())).not.toContain('합격');
  expect(getTrack('2025-hwang-siyun')?.title).toBe('황시윤 입시곡');
});

test('sorted newest year first, exactly one featured', () => {
  const years = getTracks().map((x) => x.year);
  expect([...years].sort((a, b) => b - a)).toEqual(years);
  expect(getTracks().filter((x) => x.featured)).toHaveLength(1);
  expect(CATEGORY_LABEL.admissions).toBe('입시곡');
});
