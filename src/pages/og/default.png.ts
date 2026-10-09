import type { APIRoute } from 'astro';
import { renderOg } from '../../lib/og';

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await renderOg({ eyebrow: 'MP-01 · CHEONAN BUNDANG', title: '곡으로 합격을 만드는 학원.', sub: '천안 불당동 미디 입시' })), { headers: { 'Content-Type': 'image/png' } });
