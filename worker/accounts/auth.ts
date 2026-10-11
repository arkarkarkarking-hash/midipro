import type { Env } from '../core/env';
import { checkOrigin, empty, fail, getCookie, json, readJson } from '../core/http';
import { SESSION_COOKIE, clearSessionCookie, createSession, deleteSession, requireUser, sessionCookie, type Role } from '../core/session';
import { DUMMY_HASH, verifyPassword } from './password';
import { verifyTurnstile } from './turnstile';

const MAX_FAILURES = 5;
const LOCK_SECONDS = 15 * 60;
const GENERIC = '아이디 또는 비밀번호가 올바르지 않습니다.';

type UserRow = { id: number; name: string; role: Role; password_hash: string; status: string; failed_count: number; locked_until: number | null };

export async function login(req: Request, env: Env, now: number): Promise<Response> {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const body = await readJson(req);
  if (!body) return fail(GENERIC, 400);
  const loginId = typeof body.loginId === 'string' ? body.loginId.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' && body.password.length <= 128 ? body.password : '';

  if (!(await verifyTurnstile(env.TURNSTILE_SECRET, body.turnstileToken, req.headers.get('cf-connecting-ip')))) {
    return fail('자동 입력 방지 확인에 실패했습니다. 다시 시도해 주세요.', 401);
  }

  const user = loginId
    ? await env.DB.prepare('SELECT id, name, role, password_hash, status, failed_count, locked_until FROM users WHERE login_id = ?1').bind(loginId).first<UserRow>()
    : null;
  if (user?.locked_until && user.locked_until > now) return fail('잠시 후 다시 시도해 주세요.', 429);

  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || user.status !== 'active' || !ok) {
    if (user && user.status === 'active') {
      const failures = user.failed_count + 1;
      const lock = failures >= MAX_FAILURES;
      await env.DB.prepare('UPDATE users SET failed_count = ?1, locked_until = ?2 WHERE id = ?3')
        .bind(lock ? 0 : failures, lock ? now + LOCK_SECONDS : null, user.id)
        .run();
    }
    return fail(GENERIC, 401);
  }

  await env.DB.prepare('UPDATE users SET failed_count = 0, locked_until = NULL, last_login_at = ?1 WHERE id = ?2').bind(now, user.id).run();
  const token = await createSession(env.DB, user.id, now);
  return json({ role: user.role, name: user.name }, 200, { 'set-cookie': sessionCookie(token) });
}

export async function logout(req: Request, env: Env): Promise<Response> {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const token = getCookie(req, SESSION_COOKIE);
  if (token) await deleteSession(env.DB, token);
  return empty(204, { 'set-cookie': clearSessionCookie() });
}

export async function me(req: Request, env: Env, now: number): Promise<Response> {
  const user = await requireUser(req, env, now);
  return user instanceof Response ? user : json(user);
}
