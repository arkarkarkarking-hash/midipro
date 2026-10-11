// Small helpers for running SQL on the midipro D1 database through wrangler.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

export const sqlString = (s: string) => `'${s.replaceAll("'", "''")}'`;

/** Runs `wrangler d1 execute` and returns the rows of the last statement. */
export function d1(local: boolean, extra: string[]): Record<string, unknown>[] {
  const res = spawnSync('npx', ['wrangler', 'd1', 'execute', 'midipro', local ? '--local' : '--remote', '--json', ...extra], { stdio: ['inherit', 'pipe', 'pipe'], encoding: 'utf8' });
  let out: unknown;
  try {
    out = JSON.parse(res.stdout);
  } catch {
    die(`D1 명령이 실패했습니다.\n${res.stdout}\n${res.stderr}`);
  }
  if (res.status !== 0 || !Array.isArray(out)) die(`D1 명령이 실패했습니다.\n${JSON.stringify(out)}`);
  return (out.at(-1) as { results?: Record<string, unknown>[] }).results ?? [];
}

/** Runs SQL that contains secrets (password hashes) through a private temp file, deleted right after. */
export function d1File(local: boolean, sql: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'midipro-sql-'));
  const file = join(dir, 'run.sql');
  try {
    writeFileSync(file, sql, { mode: 0o600 });
    d1(local, ['--file', file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Reads one line from the terminal; `hidden` hides what is typed. */
export function ask(prompt: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY) die('터미널에서 직접 실행해 주세요(입력이 필요합니다).');
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (c === '\u0003') process.exit(130); // Ctrl+C
        if (c === '\u007f' || c === '\b') {
          if (value && !hidden) process.stdout.write('\b \b');
          value = value.slice(0, -1);
        } else {
          value += c;
          if (!hidden) process.stdout.write(c);
        }
      }
    };
    stdin.on('data', onData);
  });
}
