import type { Env } from './env';

const PRODUCTION_HOST = 'midipro.kr';

export function seoulDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function refHost(ref: unknown): string {
  if (typeof ref !== 'string' || !ref) return 'direct';
  try {
    const host = new URL(ref).hostname;
    return host === PRODUCTION_HOST || host.endsWith('.workers.dev') ? 'direct' : host.slice(0, 100);
  } catch {
    return 'direct';
  }
}

export async function handleCall(req: Request, env: Env, now = new Date()): Promise<Response> {
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  let body: { path?: unknown; ref?: unknown };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const path = body.path;
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > 200) return new Response(null, { status: 400 });
  await env.DB.prepare(
    'INSERT INTO call_clicks (day, path, ref_host, count) VALUES (?1, ?2, ?3, 1) ON CONFLICT (day, path, ref_host) DO UPDATE SET count = count + 1',
  ).bind(seoulDay(now), path, refHost(body.ref)).run();
  return new Response(null, { status: 204 });
}
