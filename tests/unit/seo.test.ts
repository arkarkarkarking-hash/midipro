import { expect, test } from 'vitest';
import { breadcrumbJsonLd, isoDuration, pageTitle, schoolJsonLd, trackJsonLd } from '../../src/lib/seo';
import { getSite } from '../../src/lib/content';
import { getTrack } from '../../src/lib/tracks';

test('titles', () => {
  expect(pageTitle()).toBe('미디프로실용음악학원 | 천안 불당동 미디 입시');
  expect(pageTitle('')).toBe('미디프로실용음악학원 | 천안 불당동 미디 입시');
  expect(pageTitle('입시 결과')).toBe('입시 결과 | 미디프로실용음악학원');
});

test('school JSON-LD', () => {
  const ld = schoolJsonLd(getSite()) as Record<string, any>;
  expect(ld['@type']).toEqual(['MusicSchool', 'LocalBusiness']);
  expect(ld.telephone).toBe('+82-41-558-3101');
  expect(ld.sameAs).toHaveLength(3);
  expect(ld.address).toMatchObject({ addressRegion: '충청남도', addressLocality: '천안시 서북구', streetAddress: '불당21로 65, 6층', addressCountry: 'KR' });
  expect(ld.openingHoursSpecification).toEqual([
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '13:00', closes: '22:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '09:00', closes: '18:00' },
  ]);
  expect(ld).not.toHaveProperty('geo');
});

test('track JSON-LD', () => {
  expect(isoDuration(168)).toBe('PT2M48S');
  expect(isoDuration(64)).toBe('PT1M4S');
  const t = getTrack('songcamp-2024-h2-janhyang')!;
  const ld = trackJsonLd(t, 'https://midipro.kr/music/x') as Record<string, any>;
  expect(ld['@type']).toBe('MusicRecording');
  expect(ld.name).toBe('잔향');
  expect(ld.byArtist).toHaveLength(3);
  expect(ld.datePublished).toBe('2024');
});

test('breadcrumbs', () => {
  const ld = breadcrumbJsonLd([{ name: '홈', url: 'https://midipro.kr/' }, { name: '음원', url: 'https://midipro.kr/music' }]) as any;
  expect(ld.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: '음원', item: 'https://midipro.kr/music' });
});

test('article JSON-LD', async () => {
  const { articleJsonLd } = await import('../../src/lib/seo');
  const post = { slug: '2026-10-19-blog-start', title: '블로그를 시작합니다', description: '설명', date: new Date('2026-10-19T00:00:00+09:00'), category: 'guide' as const, tags: [], draft: false };
  const org = { '@type': 'EducationalOrganization', name: '미디프로실용음악학원' };
  expect(articleJsonLd(post, 'https://midipro.kr/blog/2026-10-19-blog-start', '/og/blog/2026-10-19-blog-start.png')).toEqual({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: '블로그를 시작합니다',
    description: '설명',
    datePublished: '2026-10-19',
    image: 'https://midipro.kr/og/blog/2026-10-19-blog-start.png',
    author: org,
    publisher: org,
    mainEntityOfPage: 'https://midipro.kr/blog/2026-10-19-blog-start',
  });
});
