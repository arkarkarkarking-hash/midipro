import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg } from '../../../lib/og';
import { CATEGORY_LABEL, dateLabel, type PostMeta } from '../../../features/blog/posts';
import { getPosts } from '../../../features/blog/collection';

export const getStaticPaths: GetStaticPaths = async () => (await getPosts()).map((post) => ({ params: { slug: post.slug }, props: { post } }));

export const GET: APIRoute = async ({ props }) => {
  const p = (props as { post: PostMeta }).post;
  const png = await renderOg({ eyebrow: `${dateLabel(p.date)} · ${CATEGORY_LABEL[p.category]}`, title: p.title, sub: '미디프로 블로그' });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
