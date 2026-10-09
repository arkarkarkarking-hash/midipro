import { expect, test } from 'vitest';
import { joinMedia } from '../../src/lib/media';

test('joins base and file', () => {
  expect(joinMedia('https://media.example', 'admissions/2025-hwang-siyun.mp3')).toBe('https://media.example/admissions/2025-hwang-siyun.mp3');
  expect(joinMedia('https://media.example/', 'a.mp3')).toBe('https://media.example/a.mp3');
});

test('empty base throws', () => {
  expect(() => joinMedia('', 'a.mp3')).toThrow(/PUBLIC_MEDIA_BASE/);
});
