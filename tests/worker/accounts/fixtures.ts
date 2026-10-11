import { vi } from 'vitest';
import { hashPassword } from '../../../worker/accounts/password';
import { handleAccounts } from '../../../worker/accounts/index';

export const T0 = 1_790_000_000; // fixed "now" (Unix seconds), 2026-09
export const ORIGIN = 'https://midipro.kr';

const realFetch = globalThis.fetch;
/** Turnstile siteverify stub: token 'ok' passes, anything else fails. Other requests go to the real fetch. */
export function stubTurnstile() {
  const calls: FormData[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith('https://challenges.cloudflare.com/')) {
      const form = init?.body as FormData;
      calls.push(form);
      return Response.json({ success: form.get('response') === 'ok' });
    }
    return realFetch(input as never, init);
  });
  return calls;
}

export async function createUser(
  db: any,
  { loginId, role = 'student', password = 'pass1234', name = '테스트', birthYear = null as number | null, status = 'active' }: { loginId: string; role?: string; password?: string; name?: string; birthYear?: number | null; status?: string },
): Promise<number> {
  const res = await db
    .prepare('INSERT INTO users (login_id, name, birth_year, role, password_hash, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
    .bind(loginId, name, birthYear, role, await hashPassword(password), status, T0)
    .run();
  return res.meta.last_row_id;
}

export const req = (path: string, init: RequestInit & { cookie?: string; origin?: string | null; json?: unknown } = {}) => {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set('cookie', init.cookie);
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  if (origin) headers.set('origin', origin);
  if (init.json !== undefined) headers.set('content-type', 'application/json');
  return new Request(`${ORIGIN}${path}`, {
    method: init.method ?? (init.json !== undefined ? 'POST' : 'GET'),
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
};

export async function login(env: any, loginId: string, password = 'pass1234', now = T0): Promise<string> {
  const res = await handleAccounts(req('/api/accounts/login', { json: { loginId, password, turnstileToken: 'ok' } }), env, now);
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  return res.headers.get('set-cookie')!.split(';')[0];
}
