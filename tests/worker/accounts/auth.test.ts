import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { handleAccounts } from '../../../worker/accounts/index';
import worker from '../../../worker/index';
import { makeEnv } from '../helpers';
import { T0, createUser, login, req, stubTurnstile } from './fixtures';

let ctx: Awaited<ReturnType<typeof makeEnv>>;
let turnstileCalls: FormData[];
beforeEach(async () => { ctx = await makeEnv(); turnstileCalls = stubTurnstile(); });
afterEach(async () => { vi.unstubAllGlobals(); await ctx.dispose(); });

const GENERIC = '아이디 또는 비밀번호가 올바르지 않습니다.';
const attempt = (loginId: string, password: string, now = T0, turnstileToken = 'ok') =>
  handleAccounts(req('/api/accounts/login', { json: { loginId, password, turnstileToken } }), ctx.env, now);
const me = (cookie: string, now = T0) => handleAccounts(req('/api/accounts/me', { cookie }), ctx.env, now);

test('login sets a HttpOnly session cookie and /me returns the user', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test', name: '김학생' });
  const res = await attempt(' STU_test ', 'pass1234');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ role: 'student', name: '김학생' });
  const cookie = res.headers.get('set-cookie')!;
  expect(cookie).toMatch(/^mp_session=[A-Za-z0-9_-]{43};/);
  for (const part of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=604800']) expect(cookie).toContain(part);
  const who = await me(cookie.split(';')[0]);
  expect(who.status).toBe(200);
  expect(await who.json()).toMatchObject({ loginId: 'stu_test', name: '김학생', role: 'student' });
  expect(turnstileCalls[0].get('secret')).toBe('test-turnstile-secret');
});

test('session token is stored only as a hash', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  const cookie = await login(ctx.env, 'stu_test');
  const row = await ctx.env.DB.prepare('SELECT token_hash FROM sessions').first();
  expect(row.token_hash).not.toBe(cookie.split('=')[1]);
});

test('wrong password, unknown id and disabled account give the same answer', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  await createUser(ctx.env.DB, { loginId: 'stu_off', status: 'disabled' });
  for (const [id, pw] of [['stu_test', 'nope1234'], ['nobody', 'pass1234'], ['stu_off', 'pass1234']]) {
    const res = await attempt(id, pw);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: GENERIC });
  }
});

test('5 failures lock the account for 15 minutes', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  for (let i = 0; i < 5; i++) expect((await attempt('stu_test', 'wrong', T0 + i)).status).toBe(401);
  const locked = await attempt('stu_test', 'pass1234', T0 + 10);
  expect(locked.status).toBe(429);
  expect(await locked.json()).toEqual({ error: '잠시 후 다시 시도해 주세요.' });
});

test('attempts during the lock do not extend it; login works when it ends', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  for (let i = 0; i < 5; i++) await attempt('stu_test', 'wrong', T0);
  expect((await attempt('stu_test', 'wrong', T0 + 899)).status).toBe(429);
  const row = await ctx.env.DB.prepare('SELECT locked_until FROM users').first();
  expect(row.locked_until).toBe(T0 + 900);
  expect((await attempt('stu_test', 'pass1234', T0 + 900)).status).toBe(200);
  const after = await ctx.env.DB.prepare('SELECT failed_count, locked_until, last_login_at FROM users').first();
  expect(after).toEqual({ failed_count: 0, locked_until: null, last_login_at: T0 + 900 });
});

test('success resets the failure count', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  for (let i = 0; i < 4; i++) await attempt('stu_test', 'wrong');
  expect((await attempt('stu_test', 'pass1234')).status).toBe(200);
  for (let i = 0; i < 4; i++) await attempt('stu_test', 'wrong');
  expect((await attempt('stu_test', 'pass1234')).status).toBe(200);
});

test('turnstile failure is 401 and does not count as a password failure', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  const res = await attempt('stu_test', 'wrong', T0, 'bad');
  expect(res.status).toBe(401);
  expect((await res.json()).error).not.toBe(GENERIC);
  expect((await ctx.env.DB.prepare('SELECT failed_count FROM users').first()).failed_count).toBe(0);
});

test('cross-origin or origin-less POST is 403', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  const body = { loginId: 'stu_test', password: 'pass1234', turnstileToken: 'ok' };
  expect((await handleAccounts(req('/api/accounts/login', { json: body, origin: 'https://evil.example' }), ctx.env, T0)).status).toBe(403);
  expect((await handleAccounts(req('/api/accounts/login', { json: body, origin: null }), ctx.env, T0)).status).toBe(403);
});

test('login only accepts POST', async () => {
  expect((await handleAccounts(req('/api/accounts/login'), ctx.env, T0)).status).toBe(405);
});

test('expired session is rejected', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  const cookie = await login(ctx.env, 'stu_test');
  expect((await me(cookie, T0 + 604799)).status).toBe(200);
  expect((await me(cookie, T0 + 604800)).status).toBe(401);
});

test('no cookie or garbage cookie is 401', async () => {
  expect((await handleAccounts(req('/api/accounts/me'), ctx.env, T0)).status).toBe(401);
  expect((await me('mp_session=garbage')).status).toBe(401);
});

test('logout deletes the session and clears the cookie', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  const cookie = await login(ctx.env, 'stu_test');
  const res = await handleAccounts(req('/api/accounts/logout', { method: 'POST', cookie }), ctx.env, T0);
  expect(res.status).toBe(204);
  expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  expect((await me(cookie)).status).toBe(401);
  expect((await ctx.env.DB.prepare('SELECT COUNT(*) n FROM sessions').first()).n).toBe(0);
});

test('API responses are not cached', async () => {
  expect((await handleAccounts(req('/api/accounts/me'), ctx.env, T0)).headers.get('cache-control')).toBe('no-store');
});

test('worker routes /api/accounts/* and unknown account paths are 404', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  const res = await worker.fetch(req('/api/accounts/login', { json: { loginId: 'stu_test', password: 'pass1234', turnstileToken: 'ok' } }), ctx.env);
  expect(res.status).toBe(200);
  expect((await worker.fetch(req('/api/accounts/nope'), ctx.env)).status).toBe(404);
});
