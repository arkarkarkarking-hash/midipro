import sharp from 'sharp';
import { expect, test } from 'vitest';
import { renderOg } from '../../src/lib/og';

test('renders a 1200x630 PNG', { timeout: 30_000 }, async () => {
  const buf = await renderOg({ eyebrow: '2025 · 입시곡', title: '김승연 입시곡', sub: '김승연' });
  expect([...buf.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  const meta = await sharp(buf).metadata();
  expect([meta.width, meta.height]).toEqual([1200, 630]);
});
