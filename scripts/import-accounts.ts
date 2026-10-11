// Creates accounts listed in a memo file (see scripts/lib/parse-accounts.ts for the format).
//
//   npx tsx scripts/import-accounts.ts <메모 파일>          (원격 = 실제 사이트)
//   npx tsx scripts/import-accounts.ts <메모 파일> --local  (내 컴퓨터의 연습용 DB)
//
// Nothing is written if any line has a problem. Ids that already exist are skipped (change those on the admin page).
// Passwords are never printed; only PBKDF2 hashes leave this process. Offers to delete the memo afterwards.
import { readFileSync, rmSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { hashPassword } from '../worker/accounts/password';
import { seoulYear } from '../worker/accounts/validate';
import { ask, d1, d1File, die, sqlString as sql } from './lib/d1';
import { parseAccounts } from './lib/parse-accounts';

const { values: args, positionals } = parseArgs({ options: { local: { type: 'boolean' } }, allowPositionals: true });
const local = !!args.local;
const ROLE_LABEL = { admin: '관리자', teacher: '강사', student: '수강생' } as const;

async function main() {
  const file = positionals[0];
  if (!file) die('사용법: npx tsx scripts/import-accounts.ts <메모 파일> [--local]');
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    die(`파일을 열 수 없습니다: ${file}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const { accounts, errors } = parseAccounts(text, seoulYear(now));
  if (errors.length) die(['메모에 고칠 곳이 있어 아무것도 반영하지 않았습니다.', ...errors.map((e) => `  ${e.line}번째 줄: ${e.message}`)].join('\n'));
  if (!accounts.length) die('메모에 계정이 없습니다.');

  const existing = new Set(
    d1(local, ['--command', `SELECT login_id FROM users WHERE login_id IN (${accounts.map((a) => sql(a.loginId)).join(', ')})`]).map((r) => String(r.login_id)),
  );
  const fresh = accounts.filter((a) => !existing.has(a.loginId));

  console.log(`\n${local ? '[연습용 DB]' : '[실제 사이트]'} 반영할 계정`);
  for (const a of accounts) {
    const skip = existing.has(a.loginId) ? '  ← 이미 있음, 건너뜀' : '';
    console.log(`  ${ROLE_LABEL[a.role]}  ${a.loginId}  ${a.name}${a.birthYear ? ` (${a.birthYear})` : ''}${skip}`);
  }
  if (!fresh.length) die('\n새로 만들 계정이 없습니다. 기존 계정의 비밀번호는 관리자 화면에서 바꿔 주세요.');
  if ((await ask(`\n${fresh.length}개 계정을 만들까요? (y/n) `)).trim().toLowerCase() !== 'y') die('취소했습니다.');

  const rows = await Promise.all(
    fresh.map(async (a) => `(${sql(a.loginId)}, ${sql(a.name)}, ${a.birthYear ?? 'NULL'}, ${sql(a.role)}, ${sql(await hashPassword(a.password))}, ${now})`),
  );
  d1File(local, `INSERT INTO users (login_id, name, birth_year, role, password_hash, created_at) VALUES\n${rows.join(',\n')};`);
  console.log(`${fresh.length}개 계정을 만들었습니다.`);

  if ((await ask(`\n비밀번호가 적힌 메모 파일(${file})을 지울까요? 권장합니다. (y/n) `)).trim().toLowerCase() === 'y') {
    rmSync(file);
    console.log('메모 파일을 지웠습니다.');
  } else {
    console.log('메모 파일을 남겨 두었습니다. 다른 사람이 보지 않도록 주의해 주세요.');
  }
}

void main();
