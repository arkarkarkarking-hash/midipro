import type { Env } from '../core/env';
import { empty, fail, json, readJson } from '../core/http';
import { deleteUserSessions, type SessionUser } from '../core/session';
import { hashPassword } from './password';
import { seoulYear, validatePassword, validateUserInput } from './validate';

type Row = { id: number; login_id: string; name: string; birth_year: number | null; role: string; status: string; last_login_at: number | null };

export async function listUsers(env: Env, now: number): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, login_id, name, birth_year, role, status, last_login_at FROM users
     ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'teacher' THEN 1 ELSE 2 END, status, name, login_id`,
  ).all<Row>();
  const year = seoulYear(now);
  return json({
    users: results.map((r) => ({
      id: r.id,
      loginId: r.login_id,
      name: r.name,
      birthYear: r.birth_year,
      age: r.birth_year ? year - r.birth_year : null,
      role: r.role,
      status: r.status,
      lastLoginAt: r.last_login_at,
    })),
  });
}

export async function createUser(req: Request, env: Env, now: number): Promise<Response> {
  const body = await readJson(req);
  if (!body) return fail('잘못된 요청입니다.', 400);
  const v = validateUserInput(body, seoulYear(now));
  if (!v.ok) return fail(v.error, 400);
  const { loginId, name, birthYear, role, password } = v.value;
  const exists = await env.DB.prepare('SELECT 1 FROM users WHERE login_id = ?1').bind(loginId).first();
  if (exists) return fail('이미 사용 중인 아이디입니다.', 409);
  const res = await env.DB.prepare('INSERT INTO users (login_id, name, birth_year, role, password_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(loginId, name, birthYear, role, await hashPassword(password), now)
    .run();
  return json({ id: res.meta.last_row_id }, 201);
}

const userExists = (env: Env, id: number) => env.DB.prepare('SELECT 1 FROM users WHERE id = ?1').bind(id).first();

export async function resetPassword(req: Request, env: Env, id: number): Promise<Response> {
  const body = await readJson(req);
  const pw = validatePassword(body?.password);
  if (!pw.ok) return fail(pw.error, 400);
  if (!(await userExists(env, id))) return fail('계정을 찾을 수 없습니다.', 404);
  await env.DB.prepare('UPDATE users SET password_hash = ?1, failed_count = 0, locked_until = NULL WHERE id = ?2').bind(await hashPassword(pw.value), id).run();
  await deleteUserSessions(env.DB, id);
  return empty();
}

export async function setStatus(req: Request, env: Env, actor: SessionUser, id: number): Promise<Response> {
  const body = await readJson(req);
  const status = body?.status;
  if (status !== 'active' && status !== 'disabled') return fail('상태 값이 올바르지 않습니다.', 400);
  if (status === 'disabled' && id === actor.id) return fail('자기 계정은 비활성화할 수 없습니다.', 400);
  if (!(await userExists(env, id))) return fail('계정을 찾을 수 없습니다.', 404);
  await env.DB.prepare('UPDATE users SET status = ?1, failed_count = 0, locked_until = NULL WHERE id = ?2').bind(status, id).run();
  if (status === 'disabled') await deleteUserSessions(env.DB, id);
  return empty();
}
