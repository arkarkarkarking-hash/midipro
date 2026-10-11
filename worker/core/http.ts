export const json = (data: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const fail = (error: string, status: number): Response => json({ error }, status);

export const empty = (status = 204, headers: Record<string, string> = {}): Response =>
  new Response(null, { status, headers: { 'cache-control': 'no-store', ...headers } });

/** State-changing requests must come from our own pages: Origin host must equal the request host. */
export function checkOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin');
  if (!origin) return fail('forbidden', 403);
  try {
    if (new URL(origin).host === new URL(req.url).host) return null;
  } catch {
    // fall through
  }
  return fail('forbidden', 403);
}

/** Parses a JSON object body; null when the body is not a JSON object. */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = JSON.parse(await req.text());
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export function getCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
