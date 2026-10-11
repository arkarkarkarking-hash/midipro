import type { Env } from '../core/env';
import { fail, json } from '../core/http';
import { seoulDay } from '../site/calls';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TOP = 10;

const shiftDay = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Phone-click summary from call_clicks (read only). Default: the last 30 days, Seoul time. */
export async function callSummary(req: Request, env: Env, now: number): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const to = q.get('to') ?? seoulDay(new Date(now * 1000));
  const from = q.get('from') ?? shiftDay(to, -29);
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to)) || from > to) {
    return fail('날짜 형식이 올바르지 않습니다.', 400);
  }
  const range = 'WHERE day BETWEEN ?1 AND ?2';
  const [byDay, byPath, byRef] = await env.DB.batch<{ key: string; count: number }>([
    env.DB.prepare(`SELECT day AS key, SUM(count) AS count FROM call_clicks ${range} GROUP BY day ORDER BY day DESC`).bind(from, to),
    env.DB.prepare(`SELECT path AS key, SUM(count) AS count FROM call_clicks ${range} GROUP BY path ORDER BY count DESC, path LIMIT ${TOP}`).bind(from, to),
    env.DB.prepare(`SELECT ref_host AS key, SUM(count) AS count FROM call_clicks ${range} GROUP BY ref_host ORDER BY count DESC, ref_host LIMIT ${TOP}`).bind(from, to),
  ]);
  const days = byDay.results;
  return json({
    from,
    to,
    total: days.reduce((n, r) => n + r.count, 0),
    byDay: days.map((r) => ({ day: r.key, count: r.count })),
    byPath: byPath.results.map((r) => ({ path: r.key, count: r.count })),
    byRef: byRef.results.map((r) => ({ refHost: r.key, count: r.count })),
  });
}
