import type { D1Database, Fetcher } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  ASSETS: Pick<Fetcher, 'fetch'> | { fetch(req: Request): Promise<Response> };
  /** Cloudflare Turnstile secret key (wrangler secret). */
  TURNSTILE_SECRET?: string;
  /** Public base URL of the audio bucket, e.g. https://media.midipro.kr */
  MEDIA_BASE?: string;
}
