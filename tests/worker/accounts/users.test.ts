import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { handleAccounts } from '../../../worker/accounts/index';
import { validateUserInput } from '../../../worker/accounts/validate';
import { makeEnv } from '../helpers';
import { T0, createUser, login, req, stubTurnstile } from './fixtures';

let ctx: Awaited<ReturnType<typeof makeEnv>>;
let admin: string;
let adminId: number;
beforeEach(async () => {
  ctx = await makeEnv();
  stubTurnstile();
  adminId = await createUser(ctx.env.DB, { loginId: 'admin_test', role: 'admin', name: '원장' });
  admin = await login(ctx.env, 'admin_test');
});
afterEach(async () => { vi.unstubAllGlobals(); await ctx.dispose(); });

const call = (path: string, init: Parameters<typeof req>[1] = {}, now = T0) => handleAccounts(req(path, { cookie: admin, ...init }), ctx.env, now);
const create = (body: Record<string, unknown>) => call('/api/accounts/admin/users', { json: { role: 'student', name: '김학생', password: 'pass1234', ...body } });
const list = async () => (await (await call('/api/accounts/admin/users')).json()).users;

test('student and teacher cookies get 403, no cookie 401', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  await createUser(ctx.env.DB, { loginId: 'tea_test', role: 'teacher' });
  for (const id of ['stu_test', 'tea_test']) {
    const cookie = await login(ctx.env, id);
    expect((await call('/api/accounts/admin/users', { cookie })).status).toBe(403);
    expect((await call('/api/accounts/admin/users', { cookie, json: { loginId: 'new_one', name: 'x', role: 'admin', password: 'pass1234' } })).status).toBe(403);
  }
  expect((await handleAccounts(req('/api/accounts/admin/users'), ctx.env, T0)).status).toBe(401);
});

test('creates a user with lowercased, trimmed loginId', async () => {
  const res = await create({ loginId: ' Kim_01 ', name: ' 김학생 ', birthYear: 2010 });
  expect(res.status).toBe(201);
  const { id } = await res.json();
  const row = await ctx.env.DB.prepare('SELECT login_id, name, birth_year, role, status FROM users WHERE id = ?1').bind(id).first();
  expect(row).toEqual({ login_id: 'kim_01', name: '김학생', birth_year: 2010, role: 'student', status: 'active' });
  expect(await login(ctx.env, 'kim_01')).toMatch(/^mp_session=/);
});

test('rejects a case-only duplicate', async () => {
  await create({ loginId: 'kim_01' });
  const res = await create({ loginId: 'KIM_01' });
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: '이미 사용 중인 아이디입니다.' });
});

test('rejects bad input with a message', async () => {
  for (const body of [{ loginId: 'ab' }, { loginId: 'kim-01' }, { loginId: 'kim_01', name: '' }, { loginId: 'kim_01', role: 'guest' }, { loginId: 'kim_01', password: '123' }, { loginId: 'kim_01', birthYear: 1900 }]) {
    const res = await create(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  }
});

test('lists users with age computed from birthYear (Seoul year)', async () => {
  await create({ loginId: 'kim_01', birthYear: 2010 });
  await create({ loginId: 'lee_01', name: '이학생' });
  const users = await list();
  const kim = users.find((u: any) => u.loginId === 'kim_01');
  expect(kim).toMatchObject({ name: '김학생', birthYear: 2010, age: 2026 - 2010, role: 'student', status: 'active', lastLoginAt: null });
  expect(users.find((u: any) => u.loginId === 'admin_test').lastLoginAt).toBe(T0);
  expect(users.find((u: any) => u.loginId === 'lee_01')).toMatchObject({ birthYear: null, age: null, lastLoginAt: null });
  expect(Object.keys(kim)).not.toContain('passwordHash');
  expect(JSON.stringify(users)).not.toContain('pbkdf2');
});

test('validateUserInput uses the given year as the upper bound', () => {
  const base = { loginId: 'kim_01', name: '김', role: 'student', password: 'pass1234' };
  expect(validateUserInput({ ...base, birthYear: 2026 }, 2026).ok).toBe(true);
  expect(validateUserInput({ ...base, birthYear: 2027 }, 2026).ok).toBe(false);
  expect(validateUserInput({ ...base, birthYear: '' }, 2026)).toMatchObject({ ok: true, value: { birthYear: null } });
});

test('disabling kills existing sessions immediately; enabling allows login again', async () => {
  const id = await createUser(ctx.env.DB, { loginId: 'stu_test' });
  const cookie = await login(ctx.env, 'stu_test');
  expect((await call(`/api/accounts/admin/users/${id}/status`, { json: { status: 'disabled' } })).status).toBe(204);
  expect((await handleAccounts(req('/api/accounts/me', { cookie }), ctx.env, T0)).status).toBe(401);
  await expect(login(ctx.env, 'stu_test')).rejects.toThrow();
  expect((await call(`/api/accounts/admin/users/${id}/status`, { json: { status: 'active' } })).status).toBe(204);
  expect(await login(ctx.env, 'stu_test')).toMatch(/^mp_session=/);
});

test('password reset sets the new password, clears lock and sessions', async () => {
  const id = await createUser(ctx.env.DB, { loginId: 'stu_test' });
  const cookie = await login(ctx.env, 'stu_test');
  await ctx.env.DB.prepare('UPDATE users SET failed_count = 3, locked_until = ?1 WHERE id = ?2').bind(T0 + 900, id).run();
  expect((await call(`/api/accounts/admin/users/${id}/password`, { json: { password: 'newpass9' } })).status).toBe(204);
  expect((await handleAccounts(req('/api/accounts/me', { cookie }), ctx.env, T0)).status).toBe(401);
  expect(await ctx.env.DB.prepare('SELECT failed_count, locked_until FROM users WHERE id = ?1').bind(id).first()).toEqual({ failed_count: 0, locked_until: null });
  await expect(login(ctx.env, 'stu_test', 'pass1234')).rejects.toThrow();
  expect(await login(ctx.env, 'stu_test', 'newpass9')).toMatch(/^mp_session=/);
});

test('password reset validates length', async () => {
  const id = await createUser(ctx.env.DB, { loginId: 'stu_test' });
  expect((await call(`/api/accounts/admin/users/${id}/password`, { json: { password: '12' } })).status).toBe(400);
});

test('admin cannot disable self', async () => {
  expect((await call(`/api/accounts/admin/users/${adminId}/status`, { json: { status: 'disabled' } })).status).toBe(400);
});

test('unknown user id is 404 and bad status is 400', async () => {
  expect((await call('/api/accounts/admin/users/999/status', { json: { status: 'disabled' } })).status).toBe(404);
  expect((await call('/api/accounts/admin/users/999/password', { json: { password: 'pass1234' } })).status).toBe(404);
  const id = await createUser(ctx.env.DB, { loginId: 'stu_test' });
  expect((await call(`/api/accounts/admin/users/${id}/status`, { json: { status: 'gone' } })).status).toBe(400);
});

test('admin writes need same-origin', async () => {
  expect((await call('/api/accounts/admin/users', { json: { loginId: 'kim_01', name: '김', role: 'student', password: 'pass1234' }, origin: 'https://evil.example' })).status).toBe(403);
});
