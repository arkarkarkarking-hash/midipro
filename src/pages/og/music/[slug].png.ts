import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg } from '../../../lib/og';
import { getTracks, type Track } from '../../../lib/tracks';

export const getStaticPaths: GetStaticPaths = () => getTracks().map((track) => ({ params: { slug: track.slug }, props: { track } }));

export const GET: APIRoute = async ({ props }) => {
  const t = (props as { track: Track }).track;
  const png = await renderOg({ eyebrow: `${t.year} · ${t.label}`, title: t.title, sub: [t.team, t.artists.join(' · ')].filter(Boolean).join(' — ') });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
