// Keeps site accounts in step with the account memo on the academy's computer (the memo is the source of truth).
//
//   npx tsx scripts/accounts-sync.ts [메모 파일]            바뀔 내용을 보여 주고 y를 누르면 반영 (실제 사이트)
//   npx tsx scripts/accounts-sync.ts [메모 파일] --local    연습용 DB
//   npx tsx scripts/accounts-sync.ts --auto                 (자동 실행용) 메모가 잠잠해지면 확인 없이 반영, 결과는 알림으로
//   npx tsx scripts/accounts-sync.ts --install              메모 저장 시 자동 반영 켜기 + 바탕화면 아이콘 만들기
//   npx tsx scripts/accounts-sync.ts --uninstall            자동 반영 끄기
//
// Memo format: scripts/lib/parse-accounts.ts. Removed lines disable accounts; nothing is ever deleted.
// Passwords are never printed or logged; only PBKDF2 hashes leave this process.
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { hashPassword, verifyPassword } from '../worker/accounts/password';
import { seoulYear } from '../worker/accounts/validate';
import { checkGuards, describe, isEmpty, planSync, type DbUser, type SyncPlan } from './lib/account-sync';
import { ask, d1, d1File, die, sqlString as sql } from './lib/d1';
import { parseAccounts } from './lib/parse-accounts';

const HOME = homedir();
export const MEMO_DIR = join(HOME, '미디프로_계정');
const DEFAULT_MEMO = join(MEMO_DIR, '계정.txt');
const OLD_MEMO = join(HOME, 'Desktop', '미디프로_계정', '계정.txt');
const LABEL = 'kr.midipro.accounts-sync';
const PLIST = join(HOME, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const LOG = join(HOME, 'Library', 'Logs', 'midipro-accounts.log');
const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');

const { values: args, positionals } = parseArgs({
  options: { local: { type: 'boolean' }, auto: { type: 'boolean' }, install: { type: 'boolean' }, uninstall: { type: 'boolean' } },
  allowPositionals: true,
});
const local = !!args.local;
const memoPath = resolve(positionals[0] ?? DEFAULT_MEMO);

const stamp = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
function notify(message: string) {
  const esc = (s: string) => s.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  spawnSync('osascript', ['-e', `display notification "${esc(message)}" with title "미디프로 계정"`]);
}
/** In auto mode problems go to a notification + the log; otherwise to the terminal. */
function stop(message: string): never {
  if (args.auto) {
    console.log(`${stamp()} 멈춤: ${message}`);
    notify(message.split('\n')[0]);
    process.exit(0);
  }
  die(message);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** TextEdit autosaves while typing: wait until the memo has not changed for a few seconds. */
async function waitUntilQuiet(path: string, quietMs = 8000, maxMs = 120_000) {
  const start = Date.now();
  let last = existsSync(path) ? statSync(path).mtimeMs : 0;
  let since = Date.now();
  while (Date.now() - start < maxMs) {
    await sleep(1000);
    const m = existsSync(path) ? statSync(path).mtimeMs : 0;
    if (m !== last) {
      last = m;
      since = Date.now();
    } else if (Date.now() - since >= quietMs) return;
  }
}

function sqlFor(plan: SyncPlan, hashes: Map<string, string>, now: number): string {
  const s: string[] = [];
  const id = (loginId: string) => `(SELECT id FROM users WHERE login_id = ${sql(loginId)})`;
  for (const a of plan.create) {
    s.push(`INSERT INTO users (login_id, name, birth_year, role, password_hash, created_at) VALUES (${sql(a.loginId)}, ${sql(a.name)}, ${a.birthYear ?? 'NULL'}, ${sql(a.role)}, ${sql(hashes.get(a.loginId)!)}, ${now});`);
  }
  for (const u of plan.update) s.push(`UPDATE users SET name = ${sql(u.name)}, birth_year = ${u.birthYear ?? 'NULL'}, role = ${sql(u.role)} WHERE login_id = ${sql(u.loginId)};`);
  for (const a of plan.password) {
    s.push(`UPDATE users SET password_hash = ${sql(hashes.get(a.loginId)!)}, failed_count = 0, locked_until = NULL WHERE login_id = ${sql(a.loginId)};`);
    s.push(`DELETE FROM sessions WHERE user_id = ${id(a.loginId)};`);
  }
  for (const loginId of plan.reactivate) s.push(`UPDATE users SET status = 'active', failed_count = 0, locked_until = NULL WHERE login_id = ${sql(loginId)};`);
  for (const loginId of plan.disable) {
    s.push(`UPDATE users SET status = 'disabled' WHERE login_id = ${sql(loginId)};`);
    s.push(`DELETE FROM sessions WHERE user_id = ${id(loginId)};`);
  }
  return s.join('\n');
}

async function sync() {
  if (args.auto) await waitUntilQuiet(memoPath);
  if (!existsSync(memoPath)) stop(`메모 파일이 없습니다: ${memoPath}`);
  const now = Math.floor(Date.now() / 1000);
  const { accounts, errors } = parseAccounts(readFileSync(memoPath, 'utf8'), seoulYear(now));
  if (errors.length) stop(['메모에 고칠 곳이 있어 반영하지 않았습니다.', ...errors.map((e) => `  ${e.line}번째 줄: ${e.message}`)].join('\n'));

  const site: DbUser[] = d1(local, ['--command', 'SELECT login_id, name, birth_year, role, status, password_hash FROM users']).map((r) => ({
    loginId: String(r.login_id),
    name: String(r.name),
    birthYear: (r.birth_year as number | null) ?? null,
    role: r.role as DbUser['role'],
    status: r.status as DbUser['status'],
    passwordHash: String(r.password_hash),
  }));
  const plan = await planSync(accounts, site, verifyPassword);
  const where = local ? '[연습용 DB]' : '[실제 사이트]';
  if (isEmpty(plan)) {
    if (!args.auto) console.log(`${where} 메모와 사이트가 같습니다. 바꿀 것이 없습니다.`);
    return;
  }
  const lines = describe(plan);
  const guard = checkGuards(accounts, plan, site);
  if (args.auto) {
    if (guard) stop(`${guard}\n바탕화면의 '계정 반영' 아이콘으로 확인해 주세요.`);
  } else {
    console.log(`\n${where} 바뀔 내용`);
    for (const l of lines) console.log(`  ${l}`);
    if (guard) console.log(`\n주의: ${guard}`);
    if ((await ask(`\n반영할까요? (y/n) `)).trim().toLowerCase() !== 'y') die('취소했습니다.');
  }

  const hashes = new Map<string, string>();
  for (const a of [...plan.create, ...plan.password]) hashes.set(a.loginId, await hashPassword(a.password));
  d1File(local, sqlFor(plan, hashes, now));
  const summary = `반영했습니다: ${lines.length}건`;
  if (args.auto) {
    console.log(`${stamp()} ${summary}\n${lines.map((l) => `  ${l}`).join('\n')}`);
    notify(`${summary} (${lines.slice(0, 3).join(', ')}${lines.length > 3 ? ' …' : ''})`);
  } else {
    console.log(summary);
  }
}

function writeCommand(name: string, body: string) {
  const file = join(HOME, 'Desktop', `${name}.command`);
  writeFileSync(file, `#!/bin/zsh\n${body}\n`);
  chmodSync(file, 0o755);
  return file;
}

function install() {
  mkdirSync(MEMO_DIR, { recursive: true, mode: 0o700 });
  if (!existsSync(DEFAULT_MEMO) && existsSync(OLD_MEMO)) {
    renameSync(OLD_MEMO, DEFAULT_MEMO);
    console.log(`메모를 옮겼습니다: ${OLD_MEMO} → ${DEFAULT_MEMO}`);
  }
  if (!existsSync(DEFAULT_MEMO)) writeFileSync(DEFAULT_MEMO, '-관리자-\nid :\n\n-강사-\nid :\n\n-수강생-\nid :\n', { mode: 0o600 });
  chmodSync(DEFAULT_MEMO, 0o600);

  const node = process.execPath;
  const xml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  const argv = [node, join(REPO, 'node_modules/tsx/dist/cli.mjs'), join(REPO, 'scripts/accounts-sync.ts'), DEFAULT_MEMO, '--auto'];
  mkdirSync(dirname(PLIST), { recursive: true });
  writeFileSync(
    PLIST,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key><array>${argv.map((a) => `<string>${xml(a)}</string>`).join('')}</array>
  <key>WorkingDirectory</key><string>${xml(REPO)}</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(dirname(node))}:/usr/bin:/bin</string></dict>
  <key>WatchPaths</key><array><string>${xml(MEMO_DIR)}</string></array>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>${xml(LOG)}</string>
  <key>StandardErrorPath</key><string>${xml(LOG)}</string>
</dict></plist>
`,
  );
  const uid = process.getuid!();
  spawnSync('launchctl', ['bootout', `gui/${uid}/${LABEL}`]);
  const res = spawnSync('launchctl', ['bootstrap', `gui/${uid}`, PLIST], { encoding: 'utf8' });
  if (res.status !== 0) die(`자동 반영을 켜지 못했습니다: ${res.stderr}`);

  writeCommand('계정 메모 열기', `open -e ${JSON.stringify(DEFAULT_MEMO)}`);
  writeCommand('계정 반영', `cd ${JSON.stringify(REPO)}\nexport PATH=${JSON.stringify(dirname(node))}:$PATH\nnpx tsx scripts/accounts-sync.ts ${JSON.stringify(DEFAULT_MEMO)}\necho\nread -k1 "?아무 키나 누르면 창을 닫습니다."`);
  console.log(`자동 반영을 켰습니다.
  메모: ${DEFAULT_MEMO}
  바탕화면: '계정 메모 열기', '계정 반영' 아이콘
  기록: ${LOG}`);
}

function uninstall() {
  spawnSync('launchctl', ['bootout', `gui/${process.getuid!()}/${LABEL}`]);
  rmSync(PLIST, { force: true });
  console.log('자동 반영을 껐습니다. 메모와 바탕화면 아이콘은 그대로 두었습니다.');
}

const run = args.install ? async () => install() : args.uninstall ? async () => uninstall() : sync;
run().catch((e: Error) => stop(e.message));
