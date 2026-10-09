import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(
    ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /my', 'Disallow: /login', 'Disallow: /api/', '', 'Sitemap: https://midipro.kr/sitemap-index.xml', ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
