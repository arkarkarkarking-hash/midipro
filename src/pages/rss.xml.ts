import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getTracks } from '../lib/tracks';
import { subtitleOf } from '../lib/player/queue-items';
import { getPosts } from '../features/blog/collection';

export const GET: APIRoute = async () => {
  const posts = (await getPosts()).map((p) => ({ title: p.title, link: `/blog/${p.slug}`, description: p.description, pubDate: p.date }));
  const tracks = getTracks().map((t) => ({ title: t.title, link: `/music/${t.slug}`, description: `${subtitleOf(t)} — ${t.artists.join(', ')}`, pubDate: new Date(`${t.year}-01-01T00:00:00+09:00`) }));
  const items = [...posts, ...tracks].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()).slice(0, 30);
  return rss({
    title: '미디프로실용음악학원',
    description: '미디프로 블로그와 학생 음원',
    site: 'https://midipro.kr',
    items,
    trailingSlash: false,
    customData: '<language>ko</language>',
  });
};
