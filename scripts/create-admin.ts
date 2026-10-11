// Creates the first admin account (or resets an account's password) in D1.
//
//   npx tsx scripts/create-admin.ts --login <id> --name <이름> [--birth <연도>]   (원격 = 실제 사이트)
//   npx tsx scripts/create-admin.ts --login <id> --reset                         (비밀번호 다시 정하기 + 잠금·비활성 해제)
//   ... --local                                                                   (내 컴퓨터의 연습용 DB)
//
// The password is typed hidden (twice) and only its PBKDF2 hash leaves this process,
// through a temporary SQL file that is deleted right after.
import { parseArgs } from 'node:util';
import { hashPassword } from '../worker/accounts/password';
import { seoulYear, validatePassword, validateUserInput } from '../worker/accounts/validate';
import { ask, d1, d1File, die, sqlString as sql } from './lib/d1';

const { values: args } = parseArgs({
  options: { login: { type: 'string' }, name: { type: 'string' }, birth: { type: 'string' }, reset: { type: 'boolean' }, local: { type: 'boolean' } },
});
const local = !!args.local;

// Local practice only: allow a password from the environment for scripted seeding.
const askPassword = (prompt: string) => (local && process.env.MIDIPRO_ADMIN_PASSWORD ? Promise.resolve(process.env.MIDIPRO_ADMIN_PASSWORD) : ask(prompt, true));

async function main() {
  if (!args.login) die('사용법: npx tsx scripts/create-admin.ts --login <아이디> --name <이름> [--birth <연도>] [--reset] [--local]');
  const password = await askPassword('비밀번호: ');
  if ((await askPassword('비밀번호 확인: ')) !== password) die('두 비밀번호가 다릅니다.');

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

  const exists = d1(local, ['--command', `SELECT id FROM users WHERE login_id = ${sql(loginId)}`]).length > 0;
  if (args.reset && !exists) die(`아이디 ${loginId} 를 찾지 못했습니다.`);
  if (!args.reset && exists) die('이미 있는 아이디입니다. 비밀번호를 바꾸려면 --reset 을 붙여 실행하세요.');

  d1File(local, statement);
  console.log(args.reset ? `비밀번호를 바꿨습니다: ${loginId}` : `관리자 계정을 만들었습니다: ${loginId}`);
}

void main();
