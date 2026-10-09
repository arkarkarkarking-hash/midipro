import { afterEach, beforeEach, expect, test } from 'vitest';
import worker from '../../worker/index';
import { makeEnv } from './helpers';

let ctx: Awaited<ReturnType<typeof makeEnv>>;
beforeEach(async () => { ctx = await makeEnv(); });
afterEach(async () => { await ctx.dispose(); });

const post = (body: unknown, host = 'https://midipro.kr') =>
  worker.fetch(new Request(`${host}/api/call`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), ctx.env);

test('counts a call per day/path/host', async () => {
  expect((await post({ path: '/courses', ref: 'https://search.naver.com/x?q=1' })).status).toBe(204);
  await post({ path: '/courses', ref: 'https://search.naver.com/y' });
  const row = await ctx.env.DB.prepare('SELECT ref_host, count FROM call_clicks').first();
  expect(row).toEqual({ ref_host: 'search.naver.com', count: 2 });
});

test('empty or same-site referrer counts as direct', async () => {
  await post({ path: '/', ref: '' });
  await post({ path: '/', ref: 'https://midipro.kr/music' });
  const row = await ctx.env.DB.prepare('SELECT ref_host, count FROM call_clicks').first();
  expect(row).toEqual({ ref_host: 'direct', count: 2 });
});

test('rejects bad path and wrong method', async () => {
  expect((await post({ path: 'x', ref: '' })).status).toBe(400);
  expect((await post({ path: '/' + 'a'.repeat(250), ref: '' })).status).toBe(400);
  expect((await worker.fetch(new Request('https://midipro.kr/api/call'), ctx.env)).status).toBe(405);
});

test('preview host gets noindex, production does not', async () => {
  expect((await worker.fetch(new Request('https://midipro.foo.workers.dev/'), ctx.env)).headers.get('x-robots-tag')).toBe('noindex');
  expect((await worker.fetch(new Request('https://midipro.kr/'), ctx.env)).headers.get('x-robots-tag')).toBeNull();
});

test('www redirects to apex', async () => {
  const res = await worker.fetch(new Request('https://www.midipro.kr/music?a=1'), ctx.env);
  expect(res.status).toBe(301);
  expect(res.headers.get('location')).toBe('https://midipro.kr/music?a=1');
});
