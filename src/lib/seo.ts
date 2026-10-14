import type { Site } from './content';
import type { Track } from './tracks';
import { dateLabel, type PostMeta } from '../features/blog/posts';

export const ORIGIN = 'https://midipro.kr';
const SITE_NAME = '미디프로실용음악학원';

export const pageTitle = (title?: string): string => (title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | 천안 불당동 미디 입시`);

export const absolute = (path: string): string => `${ORIGIN}${path === '/' ? '/' : path}`;

export const isoDuration = (sec: number): string => `PT${Math.floor(sec / 60)}M${sec % 60}S`;

export function schoolJsonLd(site: Site): object {
  return {
    '@context': 'https://schema.org',
    '@type': ['MusicSchool', 'LocalBusiness'],
    name: site.name,
    url: `${ORIGIN}/`,
    logo: `${ORIGIN}/icon-512.png`,
    image: `${ORIGIN}/og/default.png`,
    telephone: site.phoneE164,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KR',
      addressRegion: '충청남도',
      addressLocality: '천안시 서북구',
      streetAddress: '불당21로 65, 6층',
    },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '13:00', closes: '22:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '09:00', closes: '18:00' },
    ],
    sameAs: [site.links.blog, site.links.instagram, site.links.youtube],
    ...(site.geo ? { geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng } } : {}),
  };
}

export function trackJsonLd(track: Track, url: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: track.title,
    url,
    duration: isoDuration(track.duration),
    datePublished: String(track.year),
    genre: track.label,
    byArtist: track.artists.map((name) => ({ '@type': 'Person', name })),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

export function articleJsonLd(p: PostMeta, url: string, image: string): object {
  const org = { '@type': 'EducationalOrganization', name: SITE_NAME };
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: dateLabel(p.date).replaceAll('.', '-'),
    image: image.startsWith('http') ? image : absolute(image),
    author: org,
    publisher: org,
    mainEntityOfPage: url,
  };
}
