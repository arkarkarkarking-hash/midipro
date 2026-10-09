import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';

export async function makeEnv() {
  const persist = mkdtempSync(join(tmpdir(), 'midipro-d1-'));
  const proxy = await getPlatformProxy<{ DB: any }>({ configPath: 'wrangler.jsonc', persist: { path: persist } });
  const db = proxy.env.DB;
  for (const f of readdirSync('migrations').sort()) {
    for (const stmt of readFileSync(`migrations/${f}`, 'utf8').split(';').map((s) => s.trim()).filter(Boolean)) await db.prepare(stmt).run();
  }
  const ASSETS = { fetch: async (req: Request) => new Response(`asset ${new URL(req.url).pathname}`, { headers: { 'content-type': 'text/html' } }) };
  return {
    env: { DB: db, ASSETS } as any,
    dispose: async () => { await proxy.dispose(); rmSync(persist, { recursive: true, force: true }); },
  };
}
