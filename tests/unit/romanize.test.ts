import { expect, test } from 'vitest';
import { romanizeName, romanizeText } from '../../scripts/lib/romanize';

test('names use common surname spellings', () => {
  expect(romanizeName('황시윤')).toBe('hwang-siyun');
  expect(romanizeName('이승연')).toBe('lee-seungyeon');
  expect(romanizeName('김선우')).toBe('kim-seonu');
  expect(romanizeName('목서연')).toBe('mok-seoyeon');
});

test('text becomes a slug', () => {
  expect(romanizeText('잔향')).toBe('janhyang');
  expect(romanizeText('burn up! (feat.신하영)')).toBe('burn-up-feat-sinhayeong');
  expect(romanizeText('We Don’t Give Up')).toBe('we-don-t-give-up');
});
