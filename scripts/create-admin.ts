// Creates the first admin account (or resets an account's password) in D1.
//
//   npx tsx scripts/create-admin.ts --login <id> --name <이름> [--birth <연도>]   (원격 = 실제 사이트)
//   npx tsx scripts/create-admin.ts --login <id> --reset                         (비밀번호 다시 정하기 + 잠금·비활성 해제)
//   ... --local                                                                   (내 컴퓨터의 연습용 DB)
//
// The password is typed hidden (twice) and only its PBKDF2 hash leaves this process,
// through a temporary SQL file that is deleted right after.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { hashPassword } from '../worker/accounts/password';
import { seoulYear, validatePassword, validateUserInput } from '../worker/accounts/validate';

const { values: args } = parseArgs({
  options: { login: { type: 'string' }, name: { type: 'string' }, birth: { type: 'string' }, reset: { type: 'boolean' }, local: { type: 'boolean' } },
});

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function askHidden(prompt: string): Promise<string> {
  // Local practice only: allow a password from the environment for scripted seeding.
  if (args.local && process.env.MIDIPRO_ADMIN_PASSWORD) return Promise.resolve(process.env.MIDIPRO_ADMIN_PASSWORD);
  if (!process.stdin.isTTY) die('터미널에서 직접 실행해 주세요(비밀번호 입력이 필요합니다).');
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
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on('data', onData);
  });
}

const sql = (s: string) => `'${s.replaceAll("'", "''")}'`;

/** Runs `wrangler d1 execute` and returns the rows of the last statement. */
function d1(extra: string[]): unknown[] {
  const res = spawnSync('npx', ['wrangler', 'd1', 'execute', 'midipro', args.local ? '--local' : '--remote', '--json', ...extra], { stdio: ['inherit', 'pipe', 'pipe'], encoding: 'utf8' });
  let out: unknown;
  try {
    out = JSON.parse(res.stdout);
  } catch {
    die(`D1 명령이 실패했습니다.\n${res.stdout}\n${res.stderr}`);
  }
  if (res.status !== 0 || !Array.isArray(out)) die(`D1 명령이 실패했습니다.\n${JSON.stringify(out)}`);
  return (out.at(-1) as { results?: unknown[] }).results ?? [];
}

async function main() {
  if (!args.login) die('사용법: npx tsx scripts/create-admin.ts --login <아이디> --name <이름> [--birth <연도>] [--reset] [--local]');
  const password = await askHidden('비밀번호: ');
  if ((await askHidden('비밀번호 확인: ')) !== password) die('두 비밀번호가 다릅니다.');

  const now = Math.floor(Date.now() / 1000);
  let statement: string;
  let loginId: string;
  if (args.reset) {
    const pw = validatePassword(password);
    if (!pw.ok) die(pw.error);
    loginId = args.login.trim().toLowerCase();
    statement = `UPDATE users SET password_hash = ${sql(await hashPassword(password))}, failed_count = 0, locked_until = NULL, status = 'active' WHERE login_id = ${sql(loginId)};
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE login_id = ${sql(loginId)});`;
  } else {
    const v = validateUserInput({ loginId: args.login, name: args.name, birthYear: args.birth, role: 'admin', password }, seoulYear(now));
    if (!v.ok) die(v.error);
    const u = v.value;
    loginId = u.loginId;
    statement = `INSERT INTO users (login_id, name, birth_year, role, password_hash, created_at) VALUES (${sql(u.loginId)}, ${sql(u.name)}, ${u.birthYear ?? 'NULL'}, 'admin', ${sql(await hashPassword(password))}, ${now});`;
  }

  const exists = d1(['--command', `SELECT id FROM users WHERE login_id = ${sql(loginId)}`]).length > 0;
  if (args.reset && !exists) die(`아이디 ${loginId} 를 찾지 못했습니다.`);
  if (!args.reset && exists) die('이미 있는 아이디입니다. 비밀번호를 바꾸려면 --reset 을 붙여 실행하세요.');

  const dir = mkdtempSync(join(tmpdir(), 'midipro-admin-'));
  const file = join(dir, 'admin.sql');
  try {
    writeFileSync(file, statement, { mode: 0o600 });
    d1(['--file', file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(args.reset ? `비밀번호를 바꿨습니다: ${loginId}` : `관리자 계정을 만들었습니다: ${loginId}`);
}

void main();
