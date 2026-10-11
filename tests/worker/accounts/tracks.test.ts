import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import tracks from '../../../src/data/tracks.json';
import { handleAccounts } from '../../../worker/accounts/index';
import { makeEnv } from '../helpers';
import { T0, createUser, login, req, stubTurnstile } from './fixtures';

let ctx: Awaited<ReturnType<typeof makeEnv>>;
let admin: string;
let stuId: number;
const [a, b, c] = tracks;
beforeEach(async () => {
  ctx = await makeEnv();
  stubTurnstile();
  await createUser(ctx.env.DB, { loginId: 'admin_test', role: 'admin', name: '원장' });
  admin = await login(ctx.env, 'admin_test');
  stuId = await createUser(ctx.env.DB, { loginId: 'stu_test', name: '김학생' });
});
afterEach(async () => { vi.unstubAllGlobals(); await ctx.dispose(); });

const call = (path: string, init: Parameters<typeof req>[1] = {}) => handleAccounts(req(path, { cookie: admin, ...init }), ctx.env, T0);
const link = (userId: number, slugs: unknown) => call(`/api/accounts/admin/users/${userId}/tracks`, { json: { slugs } });
const linked = async (userId: number) => (await (await call(`/api/accounts/admin/users/${userId}/tracks`)).json()).tracks;

test('admin replaces a student\'s links and reads them back', async () => {
  expect((await link(stuId, [a.slug, b.slug])).status).toBe(204);
  expect((await linked(stuId)).map((t: any) => t.slug).sort()).toEqual([a.slug, b.slug].sort());
  expect((await link(stuId, [c.slug, c.slug])).status).toBe(204);
  expect(await linked(stuId)).toEqual([{ slug: c.slug, title: c.title, missing: false }]);
  expect((await link(stuId, [])).status).toBe(204);
  expect(await linked(stuId)).toEqual([]);
});

test('one track can be linked to several students', async () => {
  const other = await createUser(ctx.env.DB, { loginId: 'stu_two' });
  await link(stuId, [a.slug]);
  await link(other, [a.slug]);
  expect(await linked(stuId)).toHaveLength(1);
  expect(await linked(other)).toHaveLength(1);
});

test('unknown slug rejects the whole change', async () => {
  await link(stuId, [a.slug]);
  const res = await link(stuId, [b.slug, 'no-such-track']);
  expect(res.status).toBe(400);
  expect((await linked(stuId)).map((t: any) => t.slug)).toEqual([a.slug]);
  expect((await link(stuId, 'x')).status).toBe(400);
});

test('linking to a teacher account is 400, unknown user 404', async () => {
  const tea = await createUser(ctx.env.DB, { loginId: 'tea_test', role: 'teacher' });
  expect((await link(tea, [a.slug])).status).toBe(400);
  expect((await link(999, [a.slug])).status).toBe(404);
});

test('student sees only own tracks and ?userId is ignored', async () => {
  const other = await createUser(ctx.env.DB, { loginId: 'stu_two' });
  await link(stuId, [a.slug]);
  await link(other, [b.slug, c.slug]);
  const cookie = await login(ctx.env, 'stu_test');
  const res = await handleAccounts(req(`/api/accounts/my/tracks?userId=${other}`, { cookie }), ctx.env, T0);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.name).toBe('김학생');
  expect(body.tracks).toEqual([
    { slug: a.slug, title: a.title, subtitle: `${a.year} · ${a.label}`, label: a.label, year: a.year, src: `https://media.test/${a.file}`, duration: a.duration },
  ]);
});

test('student cannot call admin track APIs', async () => {
  const cookie = await login(ctx.env, 'stu_test');
  expect((await call(`/api/accounts/admin/users/${stuId}/tracks`, { cookie })).status).toBe(403);
  expect((await call(`/api/accounts/admin/users/${stuId}/tracks`, { cookie, json: { slugs: [a.slug] } })).status).toBe(403);
});

test('teacher gets 403 on my tracks; admin gets own (empty) list', async () => {
  await createUser(ctx.env.DB, { loginId: 'tea_test', role: 'teacher' });
  const tea = await login(ctx.env, 'tea_test');
  expect((await handleAccounts(req('/api/accounts/my/tracks', { cookie: tea }), ctx.env, T0)).status).toBe(403);
  const res = await handleAccounts(req('/api/accounts/my/tracks', { cookie: admin }), ctx.env, T0);
  expect(await res.json()).toEqual({ name: '원장', tracks: [] });
});

test('a slug removed from tracks.json is skipped for the student and flagged for admin', async () => {
  await link(stuId, [a.slug]);
  await ctx.env.DB.prepare("INSERT INTO user_tracks VALUES (?1, 'gone-slug')").bind(stuId).run();
  const cookie = await login(ctx.env, 'stu_test');
  const mine = await (await handleAccounts(req('/api/accounts/my/tracks', { cookie }), ctx.env, T0)).json();
  expect(mine.tracks.map((t: any) => t.slug)).toEqual([a.slug]);
  expect(await linked(stuId)).toContainEqual({ slug: 'gone-slug', title: '삭제된 곡', missing: true });
});
