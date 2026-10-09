import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test.each(['logo.svg', 'mark.svg'])('%s is a clean outlined path', (f) => {
  const svg = readFileSync(new URL(`../../src/assets/${f}`, import.meta.url), 'utf8');
  expect(svg).not.toMatch(/NaN|undefined|<text|font-family/);
  expect(svg).toContain('<path');
});

test('wordmark spans all seven letters', () => {
  const svg = readFileSync(new URL('../../src/assets/logo.svg', import.meta.url), 'utf8');
  expect((svg.match(/M/g) ?? []).length).toBeGreaterThan(7);
  const width = Number(/viewBox="0 [\d.]+ ([\d.]+)/.exec(svg)?.[1]);
  expect(width).toBeGreaterThan(600);
});
