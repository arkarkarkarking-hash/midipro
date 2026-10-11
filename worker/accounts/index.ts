import type { Env } from '../core/env';
import { empty, fail } from '../core/http';
import { login, logout, me } from './auth';

type Handler = (req: Request, env: Env, now: number, params: string[]) => Promise<Response>;
type Route = { method: 'GET' | 'POST'; path: RegExp; handler: Handler };

const routes: Route[] = [
  { method: 'POST', path: /^\/api\/accounts\/login$/, handler: (req, env, now) => login(req, env, now) },
  { method: 'POST', path: /^\/api\/accounts\/logout$/, handler: (req, env) => logout(req, env) },
  { method: 'GET', path: /^\/api\/accounts\/me$/, handler: (req, env, now) => me(req, env, now) },
];

/** Handles /api/accounts/*. `now` is Unix seconds (tests pass a fixed value). */
export async function handleAccounts(req: Request, env: Env, now: number): Promise<Response> {
  const { pathname } = new URL(req.url);
  let pathMatched = false;
  for (const r of routes) {
    const m = r.path.exec(pathname);
    if (!m) continue;
    pathMatched = true;
    if (r.method === req.method) return r.handler(req, env, now, m.slice(1));
  }
  return pathMatched ? empty(405) : fail('not found', 404);
}
