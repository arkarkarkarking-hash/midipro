import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getTracks } from '../lib/tracks';
import { subtitleOf } from '../lib/player/queue-items';

export const GET: APIRoute = () => {
  const recent = [...getTracks()].sort((a, b) => b.year - a.year).slice(0, 20);
  return rss({
    title: '미디프로실용음악학원 음원',
    description: '미디프로 학생들이 만든 입시곡과 송캠프 곡',
    site: 'https://midipro.kr',
    items: recent.map((t) => ({ title: t.title, link: `/music/${t.slug}`, description: `${subtitleOf(t)} — ${t.artists.join(', ')}`, pubDate: new Date(`${t.year}-01-01T00:00:00+09:00`) })),
    customData: '<language>ko</language>',
  });
};
