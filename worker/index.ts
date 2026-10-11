import { handleAccounts } from './accounts/index';
import { handleCall } from './site/calls';
import type { Env } from './core/env';

const PRODUCTION_HOST = 'midipro.kr';

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const isProd = url.hostname === PRODUCTION_HOST || url.hostname === `www.${PRODUCTION_HOST}`;
  // robots.txt is answered on http too: some crawlers (e.g. Naver's checker) treat a redirect as "missing".
  const httpRobots = url.hostname === PRODUCTION_HOST && url.pathname === '/robots.txt';
  if (isProd && (url.hostname !== PRODUCTION_HOST || (url.protocol === 'http:' && !httpRobots))) {
    url.hostname = PRODUCTION_HOST;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname === '/api/call') return handleCall(req, env);
  if (url.pathname.startsWith('/api/accounts/')) return handleAccounts(req, env, Math.floor(Date.now() / 1000));
  if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
  return env.ASSETS.fetch(req as never) as Promise<Response>;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const res = await route(req, env);
    if (new URL(req.url).hostname === PRODUCTION_HOST || res.status === 301) return res;
    const out = new Response(res.body, res);
    out.headers.set('X-Robots-Tag', 'noindex');
    return out;
  },
};
