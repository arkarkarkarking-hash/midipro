import type { D1Database, Fetcher } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  ASSETS: Pick<Fetcher, 'fetch'> | { fetch(req: Request): Promise<Response> };
}
