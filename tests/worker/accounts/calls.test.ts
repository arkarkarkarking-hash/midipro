import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { handleAccounts } from '../../../worker/accounts/index';
import { makeEnv } from '../helpers';
import { T0, createUser, login, req, stubTurnstile } from './fixtures';

// T0 = 2026-09-21 (Seoul)
let ctx: Awaited<ReturnType<typeof makeEnv>>;
let admin: string;
beforeEach(async () => {
  ctx = await makeEnv();
  stubTurnstile();
  await createUser(ctx.env.DB, { loginId: 'admin_test', role: 'admin' });
  admin = await login(ctx.env, 'admin_test');
  const rows: [string, string, string, number][] = [
    ['2026-09-21', '/', 'direct', 2],
    ['2026-09-21', '/courses', 'search.naver.com', 3],
    ['2026-09-20', '/', 'search.naver.com', 1],
    ['2026-08-23', '/', 'direct', 4], // 30 days before T0: inside default window
    ['2026-08-22', '/', 'direct', 9], // 31 days before: outside
  ];
  for (const r of rows) await ctx.env.DB.prepare('INSERT INTO call_clicks VALUES (?1, ?2, ?3, ?4)').bind(...r).run();
});
afterEach(async () => { vi.unstubAllGlobals(); await ctx.dispose(); });

const get = (qs = '', cookie = admin) => handleAccounts(req(`/api/accounts/admin/calls${qs}`, { cookie }), ctx.env, T0);

test('default window is the last 30 days (Seoul) and aggregates by day, path and referrer', async () => {
  const res = await get();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    from: '2026-08-23',
    to: '2026-09-21',
    total: 10,
    byDay: [
      { day: '2026-09-21', count: 5 },
      { day: '2026-09-20', count: 1 },
      { day: '2026-08-23', count: 4 },
    ],
    byPath: [
      { path: '/', count: 7 },
      { path: '/courses', count: 3 },
    ],
    byRef: [
      { refHost: 'direct', count: 6 },
      { refHost: 'search.naver.com', count: 4 },
    ],
  });
});

test('explicit range is honoured; bad dates are 400', async () => {
  const body = await (await get('?from=2026-09-20&to=2026-09-20')).json();
  expect(body.total).toBe(1);
  expect((await get('?from=yesterday')).status).toBe(400);
  expect((await get('?from=2026-09-21&to=2026-09-01')).status).toBe(400);
});

test('student cannot read call stats', async () => {
  await createUser(ctx.env.DB, { loginId: 'stu_test' });
  expect((await get('', await login(ctx.env, 'stu_test'))).status).toBe(403);
});
