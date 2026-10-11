import type { D1Database } from '@cloudflare/workers-types';
import type { Env } from './env';
import { fail, getCookie } from './http';

export type Role = 'admin' | 'teacher' | 'student';
export type SessionUser = { id: number; loginId: string; name: string; role: Role };

export const SESSION_COOKIE = 'mp_session';
export const SESSION_TTL = 7 * 24 * 60 * 60;

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function tokenHash(token: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))));
}

export const sessionCookie = (token: string) => `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL}`;
export const clearSessionCookie = () => `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

/** Creates a session and returns the raw token (only its hash is stored). */
export async function createSession(db: D1Database, userId: number, now: number): Promise<string> {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE user_id = ?1 AND expires_at <= ?2').bind(userId, now),
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)').bind(await tokenHash(token), userId, now + SESSION_TTL, now),
  ]);
  return token;
}

/** The session's user, or null when the token is unknown, expired, or the account is disabled. */
export async function getSessionUser(db: D1Database, token: string, now: number): Promise<SessionUser | null> {
  const row = await db
    .prepare(
      `SELECT u.id, u.login_id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?1 AND s.expires_at > ?2 AND u.status = 'active'`,
    )
    .bind(await tokenHash(token), now)
    .first<{ id: number; login_id: string; name: string; role: Role }>();
  return row ? { id: row.id, loginId: row.login_id, name: row.name, role: row.role } : null;
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await tokenHash(token)).run();
}

export async function deleteUserSessions(db: D1Database, userId: number): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(userId).run();
}

/** Session user from the cookie, or a 401 (not logged in) / 403 (wrong role) response. */
export async function requireUser(req: Request, env: Env, now: number, roles?: Role[]): Promise<SessionUser | Response> {
  const token = getCookie(req, SESSION_COOKIE);
  const user = token ? await getSessionUser(env.DB, token, now) : null;
  if (!user) return fail('로그인이 필요합니다.', 401);
  if (roles && !roles.includes(user.role)) return fail('권한이 없습니다.', 403);
  return user;
}
