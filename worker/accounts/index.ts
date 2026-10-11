import type { Env } from '../core/env';
import { checkOrigin, empty, fail } from '../core/http';
import { requireUser, type Role, type SessionUser } from '../core/session';
import { login, logout, me } from './auth';
import { createUser, listUsers, resetPassword, setStatus } from './users';

type Ctx = { req: Request; env: Env; now: number; params: string[]; user: SessionUser };
type Route = {
  method: 'GET' | 'POST';
  path: RegExp;
  /** Roles allowed; omitted = public route that handles auth itself. */
  roles?: Role[];
  handler: (c: Ctx) => Promise<Response>;
};

const ADMIN: Role[] = ['admin'];
const id = (c: Ctx) => Number(c.params[0]);

const routes: Route[] = [
  { method: 'POST', path: /^\/api\/accounts\/login$/, handler: (c) => login(c.req, c.env, c.now) },
  { method: 'POST', path: /^\/api\/accounts\/logout$/, handler: (c) => logout(c.req, c.env) },
  { method: 'GET', path: /^\/api\/accounts\/me$/, handler: (c) => me(c.req, c.env, c.now) },
  { method: 'GET', path: /^\/api\/accounts\/admin\/users$/, roles: ADMIN, handler: (c) => listUsers(c.env, c.now) },
  { method: 'POST', path: /^\/api\/accounts\/admin\/users$/, roles: ADMIN, handler: (c) => createUser(c.req, c.env, c.now) },
  { method: 'POST', path: /^\/api\/accounts\/admin\/users\/(\d{1,9})\/password$/, roles: ADMIN, handler: (c) => resetPassword(c.req, c.env, id(c)) },
  { method: 'POST', path: /^\/api\/accounts\/admin\/users\/(\d{1,9})\/status$/, roles: ADMIN, handler: (c) => setStatus(c.req, c.env, c.user, id(c)) },
];

/** Handles /api/accounts/*. `now` is Unix seconds (tests pass a fixed value). */
export async function handleAccounts(req: Request, env: Env, now: number): Promise<Response> {
  const { pathname } = new URL(req.url);
  let pathMatched = false;
  for (const r of routes) {
    const m = r.path.exec(pathname);
    if (!m) continue;
    pathMatched = true;
    if (r.method !== req.method) continue;
    let user = null as unknown as SessionUser;
    if (r.roles) {
      const u = await requireUser(req, env, now, r.roles);
      if (u instanceof Response) return u;
      user = u;
      if (r.method === 'POST') {
        const bad = checkOrigin(req);
        if (bad) return bad;
      }
    }
    return r.handler({ req, env, now, params: m.slice(1), user });
  }
  return pathMatched ? empty(405) : fail('not found', 404);
}
