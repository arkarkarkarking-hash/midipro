import { expect, test } from 'vitest';
import { getCourses, getResults, getSite, getTeachers } from '../../src/lib/content';

test('site.json matches spec values', () => {
  const s = getSite();
  expect(s.phone).toBe('041-558-3101');
  expect(s.phoneE164).toBe('+82-41-558-3101');
  expect(s.address).toBe('충청남도 천안시 서북구 불당21로 65, 6층');
  expect(s.links.instagram).toBe('https://www.instagram.com/midipro__/');
  expect(s.showResultYears).toBe(true);
});

test('results.json holds the spec appendix A data in order', () => {
  const r = getResults();
  expect(r.map((x) => x.school)).toEqual([
    '동아방송예술대학교', '백석예술대학교', '국제예술대학교', '호원대학교', '백석대학교',
    '백제예술대학교', '백석문화대학교', '정화예술대학교', '한국영상대학교',
  ]);
  expect(r.flatMap((x) => x.entries)).toHaveLength(34);
  expect(r[1].entries[0]).toEqual({ name: '김현서', major: '뮤직테크놀로지', year: 2023 });
});

test('courses have no price field', () => {
  const c = getCourses();
  expect(c).toHaveLength(5);
  for (const x of c) expect(JSON.stringify(x)).not.toMatch(/\d\s*원|price|₩/);
});

test('teachers start empty', () => {
  expect(getTeachers()).toEqual([]);
});
